#!/usr/bin/env python3
"""
dream-gather.py — deterministic harness for the "dreaming" memory-consolidation flow.

It does the cheap, mechanical part (NO LLM, NO tokens):
  1. Resolve a project's memory store + its session transcripts.
  2. Pick the transcripts inside the window (since last dream, else --days).
  3. Distill each transcript to its conversational spine + error signals,
     stripping the noise (local-command wrappers, command stdout, thinking,
     bulky tool outputs) but KEEPING real user turns and tool failures.
  4. Snapshot the current memory store (frontmatter + the MEMORY.md index).
  5. Emit ONE compact markdown bundle for the agent to reason over.

The reasoning (pattern detection) and any writes to the vault happen later,
in the /dreaming skill, behind a human approval gate. This script never
modifies the memory store.

Usage:
    dream-gather.py [--project ENCODED_DIR] [--days N] [--since ISO|last]
                    [--max-sessions N] [--per-session-chars N] [--out PATH]

--project defaults to "-Users-macbookpro" (the home-global scope).
Pass the encoded project dir name as it appears under ~/.claude/projects/.
"""

import argparse
import datetime as dt
import json
import os
import re
import sys
from pathlib import Path

PROJECTS_ROOT = Path.home() / ".claude" / "projects"

# User-string turns that are not real user typing (harness/command noise).
NOISE_PREFIXES = ("<local-command-caveat>", "<command-name>", "<command-message>",
                  "<command-args>", "<local-command-stdout>", "<bash-",
                  "<user-prompt-submit-hook>", "Caveat:")
NOISE_MARKERS = ("<command-name>", "<local-command-stdout>", "<local-command-caveat>")


def parse_ts(s):
    if not s:
        return None
    try:
        return dt.datetime.fromisoformat(s.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


def resolve_project(project):
    """Return (memory_dir, transcripts_dir) for an encoded project name."""
    proj_dir = PROJECTS_ROOT / project
    if not proj_dir.exists():
        sys.exit(f"error: project dir not found: {proj_dir}\n"
                 f"available:\n  " + "\n  ".join(sorted(
                     p.name for p in PROJECTS_ROOT.iterdir()
                     if p.is_dir() and (p / "memory").exists())))
    mem = proj_dir / "memory"
    if not mem.exists():
        sys.exit(f"error: no memory/ under {proj_dir}")
    return mem, proj_dir


def load_state(mem_dir):
    f = mem_dir / ".dream" / "state.json"
    if f.exists():
        try:
            return json.loads(f.read_text())
        except json.JSONDecodeError:
            return {}
    return {}


def window_start(mem_dir, days, since, force_days=False):
    """Compute the inclusive lower bound for session selection."""
    if force_days:
        return dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=days)
    if since and since != "last":
        t = parse_ts(since)
        if t:
            return t
    if since == "last" or since is None:
        st = load_state(mem_dir)
        last = parse_ts(st.get("last_dream_ts"))
        if last:
            return last
    return dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=days)


def text_from_content(content):
    """Extract plain assistant/user text from a message.content (str or blocks)."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for b in content:
            if not isinstance(b, dict):
                continue
            if b.get("type") == "text" and b.get("text"):
                parts.append(b["text"])
        return "\n".join(parts)
    return ""


def error_signals_from_content(content):
    """Pull short tool-failure signals out of a user (tool_result) message."""
    sigs = []
    if isinstance(content, list):
        for b in content:
            if isinstance(b, dict) and b.get("type") == "tool_result" and b.get("is_error"):
                c = b.get("content")
                if isinstance(c, list):
                    c = " ".join(x.get("text", "") for x in c if isinstance(x, dict))
                sigs.append(str(c)[:180].replace("\n", " "))
    return sigs


def is_noise_user(s):
    s = s.lstrip()
    return any(m in s[:400] for m in NOISE_MARKERS) or s.startswith(NOISE_PREFIXES)


def distill_transcript(path, lower):
    """Return a distilled dict for one session, or None if empty/out-of-window."""
    user_turns, assistant_turns, errors = [], [], []
    first_ts = last_ts = None
    title = None
    branch = cwd = None
    try:
        with path.open(encoding="utf-8", errors="replace") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    o = json.loads(line)
                except json.JSONDecodeError:
                    continue
                ts = parse_ts(o.get("timestamp"))
                if ts:
                    first_ts = first_ts or ts
                    last_ts = ts
                title = title or o.get("aiTitle")
                branch = branch or o.get("gitBranch")
                cwd = cwd or o.get("cwd")
                typ = o.get("type")
                msg = o.get("message") or {}
                content = msg.get("content")
                if typ == "user":
                    txt = text_from_content(content)
                    if isinstance(content, str) or (isinstance(content, list) and txt):
                        if txt and not is_noise_user(txt):
                            user_turns.append((ts, txt.strip()))
                    errors.extend(error_signals_from_content(content))
                elif typ == "assistant":
                    txt = text_from_content(content).strip()
                    if txt:
                        assistant_turns.append((ts, txt))
    except OSError:
        return None

    # Window filter: keep the session if its last activity is within the window.
    if last_ts and lower and last_ts < lower:
        return None
    if not user_turns and not errors:
        return None
    return {
        "session": path.stem,
        "title": title,
        "branch": branch,
        "cwd": cwd,
        "first_ts": first_ts.isoformat() if first_ts else None,
        "last_ts": last_ts.isoformat() if last_ts else None,
        "user_turns": user_turns,
        "assistant_turns": assistant_turns,
        "errors": errors,
    }


def read_frontmatter(md_path):
    """Cheap YAML-ish frontmatter parse (flat keys + one-level metadata)."""
    fm = {"metadata": {}}
    try:
        txt = md_path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return fm, 0
    body_len = len(txt)
    if txt.startswith("---"):
        end = txt.find("\n---", 3)
        if end != -1:
            block = txt[3:end]
            in_meta = False
            for raw in block.splitlines():
                if not raw.strip():
                    continue
                if re.match(r"^metadata\s*:", raw):
                    in_meta = True
                    continue
                m = re.match(r"^(\s*)([\w-]+)\s*:\s*(.*)$", raw)
                if not m:
                    in_meta = False
                    continue
                indent, key, val = m.group(1), m.group(2), m.group(3).strip()
                if in_meta and indent:
                    fm["metadata"][key] = val
                else:
                    in_meta = False
                    fm[key] = val
            body_len = len(txt) - end
    return fm, body_len


def snapshot_memory(mem_dir):
    mems = []
    for md in sorted(mem_dir.glob("*.md")):
        if md.name == "MEMORY.md":
            continue
        fm, body_len = read_frontmatter(md)
        mems.append({
            "file": md.name,
            "name": fm.get("name", md.stem),
            "description": fm.get("description", ""),
            "type": fm.get("metadata", {}).get("type", "?"),
            "created": fm.get("metadata", {}).get("created", "?"),
            "updated": fm.get("metadata", {}).get("updated", ""),
            "body_len": body_len,
        })
    index = ""
    idx_path = mem_dir / "MEMORY.md"
    if idx_path.exists():
        index = idx_path.read_text(encoding="utf-8", errors="replace")
    return mems, index


def render_bundle(project, mem_dir, lower, mems, index, sessions,
                  per_session_chars):
    out = []
    now = dt.datetime.now(dt.timezone.utc).isoformat()
    out.append(f"# DREAMING BUNDLE — {project}")
    out.append(f"generated: {now}")
    out.append(f"memory_dir: {mem_dir}")
    out.append(f"window_since: {lower.isoformat() if lower else 'ALL'}")
    out.append(f"memories: {len(mems)}   sessions_in_window: {len(sessions)}")
    out.append("")
    out.append("---")
    out.append("## MEMORY STORE (current)")
    out.append("")
    out.append("| file | type | created | updated | chars | description |")
    out.append("|------|------|---------|---------|-------|-------------|")
    for m in mems:
        desc = (m["description"] or "").replace("|", "\\|")[:140]
        out.append(f"| {m['file']} | {m['type']} | {m['created']} | "
                   f"{m['updated'] or '—'} | {m['body_len']} | {desc} |")
    out.append("")
    out.append("### MEMORY.md index (verbatim)")
    out.append("```markdown")
    out.append(index.strip())
    out.append("```")
    out.append("")
    out.append("---")
    out.append("## RECENT SESSIONS (distilled)")
    out.append("")
    for s in sessions:
        out.append(f"### session {s['session'][:8]} — {s.get('title') or '(sin título)'}")
        meta = []
        if s.get("last_ts"):
            meta.append(f"last: {s['last_ts'][:16]}")
        if s.get("branch"):
            meta.append(f"branch: {s['branch']}")
        if s.get("cwd"):
            meta.append(f"cwd: {s['cwd']}")
        out.append("  ·  ".join(meta))
        out.append("")
        budget = per_session_chars
        if s["user_turns"]:
            out.append("**User turns:**")
            for ts, t in s["user_turns"]:
                t = re.sub(r"\s+", " ", t).strip()
                if not t:
                    continue
                snip = t[:600]
                out.append(f"- ({ts.isoformat()[:16] if ts else '?'}) {snip}")
                budget -= len(snip)
                if budget <= 0:
                    out.append("- …(truncated)")
                    break
        if s["errors"]:
            out.append("")
            out.append("**Tool errors (signals):**")
            for e in s["errors"][:8]:
                out.append(f"- {e}")
        # A little assistant context: only the last substantive reply.
        if s["assistant_turns"]:
            last_a = s["assistant_turns"][-1][1]
            last_a = re.sub(r"\s+", " ", last_a).strip()[:400]
            if last_a:
                out.append("")
                out.append(f"**Assistant (last reply, trimmed):** {last_a}")
        out.append("")
        out.append("---")
        out.append("")
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", default="-Users-macbookpro")
    ap.add_argument("--days", type=int, default=14)
    ap.add_argument("--since", default="last")
    ap.add_argument("--force-days", action="store_true",
                    help="ignore last-dream state; use the --days window")
    ap.add_argument("--max-sessions", type=int, default=40)
    ap.add_argument("--per-session-chars", type=int, default=4000)
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    mem_dir, proj_dir = resolve_project(args.project)
    lower = window_start(mem_dir, args.days, args.since, args.force_days)

    transcripts = sorted(proj_dir.glob("*.jsonl"),
                         key=lambda p: p.stat().st_mtime, reverse=True)
    sessions = []
    for path in transcripts:
        # cheap pre-filter by mtime, then confirm by in-file timestamps
        mtime = dt.datetime.fromtimestamp(path.stat().st_mtime, dt.timezone.utc)
        if lower and mtime < lower:
            continue
        d = distill_transcript(path, lower)
        if d:
            sessions.append(d)
        if len(sessions) >= args.max_sessions:
            break
    sessions.sort(key=lambda s: s.get("last_ts") or "", reverse=True)

    mems, index = snapshot_memory(mem_dir)
    bundle = render_bundle(args.project, mem_dir, lower, mems, index,
                           sessions, args.per_session_chars)

    out_path = Path(args.out) if args.out else (
        mem_dir / ".dream" / "bundle-latest.md")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(bundle, encoding="utf-8")

    print(json.dumps({
        "project": args.project,
        "memory_dir": str(mem_dir),
        "window_since": lower.isoformat() if lower else None,
        "memories": len(mems),
        "sessions_in_window": len(sessions),
        "bundle": str(out_path),
        "bundle_chars": len(bundle),
    }, indent=2))


if __name__ == "__main__":
    main()
