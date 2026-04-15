# M-08: Resolve red team findings to convergence

## Priority: HIGH
## Scope: migrations + Prism

## Description

Iterate on M-07 findings until all HIGH and MEDIUM findings are either FIXED or explicitly DEFERRED with rationale. Loop: fix → re-test → re-verify → next round.

"Convergence" means: a second pass of `reviewer` + `security-reviewer` produces zero new HIGH findings.

## Acceptance criteria

1. Every HIGH finding from M-07 marked FIXED or DEFERRED-WITH-RATIONALE
2. Every MEDIUM finding from M-07 marked FIXED, DEFERRED-WITH-RATIONALE, or LOW (downgraded)
3. Second-pass red team shows zero new HIGH findings
4. Regression tests added for any bug fixed (web: `web/src/__tests__/regression/*.test.ts`, arbor: smoke tests if easy)
5. Prism CHANGELOG updated if any Prism-side changes were made
6. Arbor tarball re-packed and reinstalled if Prism changed
7. Dev server still runs cleanly after fixes

## Dependencies

- Requires: M-07 findings
- Blocks: M-09 (session wrap-up)

## Agent

- `react-specialist` / `reviewer` per finding
- `react-specialist` + `reviewer` + `security-reviewer` for second-pass review (background)

## Done when

- Red team doc has every finding dispositioned
- Second pass clean
- Both bespoke and prism routes still work
