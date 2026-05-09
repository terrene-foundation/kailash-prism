---
type: redteam-code-review
round: 3
phase: redteam
date: 2026-05-08
project: prism-0.6.0
release: 0.6.0
input_state: working tree post R2-L-1 fix (specs/components/filter-bar.yaml line 66 + lines 189-192 corrected)
verdict: CLEAN — 0 NEW findings; R2-L-1 properly resolved without regression; all Round 1 + Round 2 findings remain resolved
---

# Round 3 — Code Review

## Verdict line

**CLEAN** — 0 new findings of any class. R2-L-1 fix landed correctly. All prior Round 1 + Round 2 findings remain resolved.

## Confirmation that all prior findings remain resolved

| Finding | Class | Round 3 verification |
|---|---|---|
| MED-1 / V-M-2 (RT-PHANTOM) | code-review + value | `__rowType?: T \| undefined` at use-filter-bar-state.ts:99; runtime `__rowType: undefined` at line 198 — both present |
| MED-2 (SEARCHPLACEHOLDER) | security | `placeholder?.trim() \|\| "Search"` at filter-bar.tsx:293 — present |
| MED-3 (STALE-CAST) | code-review | `grep -rn "as T\[keyof T\]" web/src/` (excl. test/stories) returns 0 hits — gone |
| MED-4 (PHANTOM-TOKENS) | value | 13/13 spec-declared `--prism-*` tokens enumerate via `grep -oE "var\(--prism-[a-z0-9-]+" filter-bar.tsx \| sort -u` — exact match with `tokens.consumes` block |
| MED-5 / MED-6 / LOW-1 / LOW-4 / LOW-5 / LOW-6 | various | No regression — file states unchanged since Round 2 reconciliation |
| LOW-2 / LOW-3 / LOW-7 | various | Deferred per Round 2 disposition (documented trade-off / false-positive / historical record) |

## R2-L-1 fix verification

`grep -n "z-index" specs/components/filter-bar.yaml` → two hits:
- Line 66 (`props.sticky.description`): `"...applies position: sticky; top: 0; z-index: 10. Useful when the bar sits above a tall scrollable list. The z-index is currently a literal (web/src/molecules/filter-bar/filter-bar.tsx:129); a future iteration may introduce --prism-z-sticky for layered stacking control."` — literal value cited, file:line cross-reference present, forward-looking note scoped as future possibility (not current contract).
- Line 190 (adjacent comment block): `"# z-index is currently a literal \`10\` (web/src/molecules/filter-bar/filter-bar.tsx:129),"` — comment-block correction shipped alongside; previous "defaults to 1" misframing removed.

Source pin: `web/src/molecules/filter-bar/filter-bar.tsx:129` reads `zIndex: 10,` — spec citation resolves. The two remaining mentions of `--prism-z-sticky` are inside forward-looking prose (not citations of current behavior); per `spec-accuracy.md` exception 1 + the explicit "may introduce" qualifier, this is descriptive scoping, not phantom citation. No fresh phantom-token finding.

## Any new findings

None. Sweeps A–I (token resolution, mock data, stub detection, cast hygiene, fix-immediately compliance, type-guards / consumer-render, effective-fallback semantics, useEffect deps, test-coverage parity) all clean.

## Sweeps re-run (terse)

| Sweep | Command | Result |
|---|---|---|
| A. Spec-impl parity | `grep -oE "var\(--prism-[a-z0-9-]+" web/src/molecules/filter-bar/filter-bar.tsx \| sort -u` | 13 tokens, exact match with `tokens.consumes` |
| B. Mock data | `grep -rEn "MOCK_\|FAKE_\|DUMMY_\|SAMPLE_" web/src/ \| grep -v test \| grep -v stories \| grep -v __tests__` | 0 hits |
| C. Stub detection | `grep -rEn "TODO\|FIXME\|HACK\|STUB\|XXX\|NotImplementedError\|throw new Error\\('Not implemented" web/src/ \| grep -v test \| grep -v __tests__` | 0 hits |
| D. Cast hygiene | `grep -rn "as T\[keyof T\]" web/src/ \| grep -v test \| grep -v stories` | 0 hits |
| E. Fix-immediately | R2-L-1 fixed in same shard, not deferred — verified via `git diff specs/components/filter-bar.yaml` showing prose rewrite | OK |
| F. Type guards / consumer render | `__rowType` type at line 99, runtime at line 198 of `use-filter-bar-state.ts` | OK |
| G. Effective-fallback semantics | Spec `state_hook.contract.effective_fallback` matches `__rowType` materialisation prose | OK |
| H. useEffect deps | filter-bar state hook has no useEffect; stable | OK |
| I. Test coverage parity | `npx vitest run` → 30 files / 435 tests passed (filter-bar / use-filter-bar-state suites among them) | exit 0 |
| Type-check | `npx tsc --noEmit` (in `web/`) | exit 0 |
| Lint | `npm run lint` | exit 0 |
| Phantom z-sticky | `grep -rn "prism-z-sticky" web/ specs/` | 2 hits, both inside the corrected forward-looking prose at filter-bar.yaml:66 + :191 (descriptive future-possibility, not citation of current contract) |
| Bare BLOCKING-1/2 | `grep -rEn "BLOCKING-[12]" CHANGELOG.md` | 0 hits (continuation already qualified per Round 2) |

## Approach summary

Re-ran every sweep from Rounds 1+2 against post-R2-fix tree. R2-L-1 fix replaces phantom `var(--prism-z-sticky)` citation with literal `z-index: 10` plus source file:line and forward-looking tokenisation note. No regression introduced; 0 new findings; verdict CLEAN.
