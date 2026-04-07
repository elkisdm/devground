#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const targetDir = process.cwd();

function log(msg) {
  console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
}

function warn(msg) {
  console.log(`  \x1b[33m!\x1b[0m ${msg}`);
}

// Copy AGENTS.md to project root
const source = path.join(__dirname, 'AGENTS.md');
const dest = path.join(targetDir, 'AGENTS.md');

if (fs.existsSync(dest)) {
  warn('AGENTS.md already exists — overwriting');
}

fs.copyFileSync(source, dest);
log('Created AGENTS.md');

// Create symlinks for each AI agent
const symlinks = [
  { target: 'AGENTS.md', link: 'CLAUDE.md' },
  { target: 'AGENTS.md', link: '.cursorrules' },
  { target: path.join('..', 'AGENTS.md'), link: path.join('.github', 'copilot-instructions.md') },
  { target: path.join('..', 'AGENTS.md'), link: path.join('.gemini', 'styleguide.md') },
];

for (const { target, link } of symlinks) {
  const linkPath = path.join(targetDir, link);
  const linkDir = path.dirname(linkPath);

  // Ensure parent directory exists
  if (!fs.existsSync(linkDir)) {
    fs.mkdirSync(linkDir, { recursive: true });
  }

  // Remove existing file/symlink if present
  try {
    const stat = fs.lstatSync(linkPath);
    if (stat) fs.unlinkSync(linkPath);
  } catch {
    // File doesn't exist — nothing to remove
  }

  try {
    fs.symlinkSync(target, linkPath);
    log(`Symlinked ${link} → ${target}`);
  } catch (err) {
    // On Windows without symlink permissions, fall back to copy
    const resolvedTarget = path.resolve(targetDir, target);
    fs.copyFileSync(resolvedTarget, linkPath);
    warn(`Copied ${link} (symlink not supported — using copy)`);
  }
}

console.log('\n  AGENTS.md installed with symlinks for Claude, Cursor, Copilot, and Gemini.\n');
