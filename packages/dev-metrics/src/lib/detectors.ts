/**
 * Strict file-path classifiers for the spec-flow impact analyzer.
 *
 * These exist because of a concrete measurement bug: a naive substring match on
 * "test" classified feature files like `apps/api/src/routes/test.ts` (a quiz
 * route) as test files, inflating the measured test-coupling rate to a false
 * 85%. Every matcher here demands STRUCTURAL evidence — a real test extension, a
 * dedicated test directory, or a language test-naming convention — never a bare
 * substring. Better to miss an oddly-named test than to manufacture a fake one.
 *
 * See ADR-0014 (medición de impacto spec-flow), anti-trap rule (a).
 */

/**
 * A real test file. Matches, in order:
 *  - `*.test.ts|tsx|js|jsx`            e.g. `foo.test.tsx`
 *  - `*.spec.ts|tsx|js|jsx`            e.g. `foo.spec.ts`
 *  - anything under a `__tests__/` dir e.g. `web/__tests__/unit/x.test.tsx`
 *  - anything under a `test/` or `tests/` dir
 *  - anything under a `Tests/` dir      SwiftPM / xUnit convention (capital T)
 *  - `test_*.py`                       pytest convention
 *  - `*_test.<ext>`                    go / python convention
 *  - `*Test.swift` / `*Tests.swift`    Swift (XCTest / Swift Testing) convention
 *
 * Deliberately does NOT match a file literally named `test.ts` outside a test
 * dir, nor a Swift source like `Latest.swift` (the `Test` marker is
 * case-sensitive, so lowercase "test" substrings never match).
 */
const TEST_FILE_RE =
  /(\.test\.[tj]sx?$|\.spec\.[tj]sx?$|(^|\/)__tests__\/|(^|\/)tests?\/|(^|\/)Tests\/|(^|\/)test_[^/]+\.py$|_test\.[A-Za-z]+$|Tests?\.swift$)/;

/**
 * A decision record or spec document. Requires the file to live in a dedicated
 * `adr/` or `spec(s)/` directory AND be a markdown file, so `src/Spec.tsx` or a
 * stray `adronaut.ts` never match.
 */
const ADR_OR_SPEC_RE = /(\/adr\/[^/]*\.md$|(^|\/)specs?\/[^/]*\.md$)/i;

/** True when `path` is a real test file (strict — see module doc). */
export function isTestFile(path: string): boolean {
  return TEST_FILE_RE.test(path);
}

/** True when `path` is an ADR or spec markdown document. */
export function isAdrOrSpecFile(path: string): boolean {
  return ADR_OR_SPEC_RE.test(path);
}
