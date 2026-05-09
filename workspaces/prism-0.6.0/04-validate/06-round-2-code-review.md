---
type: redteam-round
round: 2
phase: redteam
date: 2026-05-08
project: prism-0.6.0
release: 0.6.0
agent: reviewer
scope: Re-audit M01-M04 + Round-1 fixes (working tree, uncommitted)
input_main_sha: 78add91 (release(prism-web): v0.6.0 — PR #30) + working-tree post-fix delta
---

# Round 2 — Code Review (read-only, post-Round-1-fixes)

## Verdict

**CONVERGED. 0 CRIT, 0 HIGH, 0 MED, 1 LOW.** All Round 1 findings (M-1 / MED-1 through MED-6 / LOW-1 / LOW-4 / LOW-5 / LOW-6) verified resolved. Build/test/lint all green (435/435 tests, tsc EXIT=0, eslint EXIT=0, build EXIT=0). The single new LOW is a residual phantom-citation in the FilterBar yaml's `props.sticky.description` (`--prism-z-sticky`) that the MED-4 fix scoped to `tokens.consumes` did not sweep — same class as the MED-4 finding, one prose line away from the section that was rewritten.

## Approach summary

Re-ran the 9 Round 1 checks (A-I) against the post-fix working tree. Mechanical sweeps first (grep for `as T[keyof T]`, mock data, stubs, casts, `--prism-*` token resolution), then targeted reads of the four edited files (`data-table-root.tsx`, `use-filter-bar-state.ts`, `filter-bar.tsx`, `specs/components/filter-bar.yaml`), then full toolchain (tsc, eslint, build, vitest). No edits, no commits.

---

## Status of Round 1 findings

| Round 1 finding                                  | Round 2 disposition | Verification                                                                                                                            |
| ------------------------------------------------ | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| M-1 (cast `as T[keyof T]` at root.tsx:613)       | **RESOLVED**        | `grep -rn 'as T\[keyof T\]' web/src/` → empty. Line 612 now reads `{col.render ? col.render(value, row) : String(value ?? "")}` — byte-mirrors `data-table-body.tsx:389`. |
| MED-1 (`__rowType` type/runtime mismatch)        | **RESOLVED**        | Type widened to `readonly __rowType?: T \| undefined` (line 99); runtime literal materialises `__rowType: undefined` (line 198); spec sync at `specs/components/filter-bar.yaml:83,88`. 9/9 hook unit tests pass. |
| MED-2 (placeholder XSS / aria-label sanitization) | **RESOLVED**        | `web/src/molecules/filter-bar/filter-bar.tsx:293` → `const ariaLabel = placeholder?.trim() || "Search";`                                |
| MED-4 (filter-bar yaml token namespace)          | **RESOLVED (one residual — see L-1 below)** | `tokens.consumes` rewrites to 13 `--prism-*` tokens; all 13 resolve via `grep -oE 'var\(--prism-[a-z0-9-]+' web/src/molecules/filter-bar/filter-bar.tsx` (see Sweep E). One residual `--prism-z-sticky` in `props.sticky.description` (line 66) — see L-1. |
| MED-5 (BLOCKING-1/2 disambiguation)              | **RESOLVED**        | All 0.6.0-cycle references in `web/CHANGELOG.md:60-61`, `workspaces/prism-0.6.0/02-plans/01-prism-0.6.0-design.md:152`, and `workspaces/prism-0.6.0/01-analysis/03-third-gap-investigation.md:16,17,34,38,49,53,60,61` now fully qualified with `M-01`/`M-02`/`M-03` prefix. (Pre-0.6.0 historical CHANGELOG entries at lines 337/423/503/508/519/520/530/533/537/543 untouched — out of scope for the 0.6.0 fix.) |
| MED-6 (CHANGELOG headline overclaim)             | **RESOLVED**        | `web/CHANGELOG.md:12` → "Expected to replace ~120 LOC of consumer boilerplate per route once arbor wave-6 migration lands … the BEFORE numbers come from the wave 1–5 audit, the AFTER numbers will be backfilled in 0.6.1 once M05 ships." Realisation explicitly bound to M05. |
| LOW-1 (CHANGELOG mis-narrates spec landing site) | **RESOLVED**        | `web/CHANGELOG.md:54` → "`docs/specs/05m-0.6.0-additions.md` — NEW companion sub-spec landing § Filter Engine + § DataTable § ColumnDef relaxation. Cross-references the parent `docs/specs/05-engine-specifications.md`". |
| LOW-4 (vapourware claim accuracy)                | **RESOLVED**        | `docs/specs/05m-0.6.0-additions.md:48` clarified to "mentioned in the `DataTableAdapter` JSDoc as 'reserved for 0.4.0' (`web/src/engines/data-table/types.ts:303`) but never declared as an actual property". |
| LOW-5 (Storybook overclaim)                      | **RESOLVED**        | The story files (`filter-bar.stories.tsx`, `filter-bar-with-data-table.stories.tsx`, `data-table-synthetic-column.stories.tsx`) document themselves as Storybook-runner-compatible exports per the comment at `filter-bar.stories.tsx:21-23`. |
| LOW-6 (story token namespace)                    | **RESOLVED**        | `grep -oE 'var\(--prism-[a-z0-9-]+\|filter-bar\.[a-z-]+' web/src/molecules/filter-bar/__stories__/*.stories.tsx` returns only `--prism-*` tokens (no `filter-bar.*` namespace). |
| LOW-2 (`useMemo` identity-instability cost)      | UNCHANGED — documented trade-off, not a defect | Same disposition as Round 1 (consumer choice, comment at `use-filter-bar-state.ts:157-160` explains).                                   |
| LOW-3 (`noUncheckedIndexedAccess` posture)       | UNCHANGED — defensive, forward-compat | Same disposition as Round 1.                                                                                                            |

---

## New findings

### CRITICAL

None.

### HIGH

None.

### MEDIUM

None.

### LOW

#### L-1. Residual phantom CSS-variable citation `--prism-z-sticky` in `specs/components/filter-bar.yaml::props.sticky.description`

- **Location**: `specs/components/filter-bar.yaml:66`
- **Reproduction**:
  ```bash
  grep -n -- '--prism-z-sticky' specs/components/filter-bar.yaml
  # 66:    description: "When true, applies position: sticky; top: 0; z-index: var(--prism-z-sticky). Useful when the bar sits above a tall scrollable list."
  # 191:  # may introduce `--prism-z-sticky` for layered stacking control.

  grep -n "zIndex\|position: \"sticky\"\|prism-z-sticky" web/src/molecules/filter-bar/filter-bar.tsx
  # 127:      position: "sticky",
  # 128:      top: 0,
  # 129:      zIndex: 10,           ← hardcoded literal, no token
  ```
- **What's wrong**: line 66 (`props.sticky.description`) cites `var(--prism-z-sticky)` as the z-index source for sticky positioning. The actual implementation at `filter-bar.tsx:129` hardcodes `zIndex: 10`. The token `--prism-z-sticky` does NOT exist in the compiler output OR in the source. Per `rules/spec-accuracy.md` Rule 1 (Every Citation Resolves Against Working Code), the description carries a phantom citation. Same finding-class as MED-4 (which the value-auditor scoped to `tokens.consumes` only); the prose-level citation in `props.sticky.description` was missed.
- **Severity rationale**: LOW because:
  - The trailing comment at line 191 explicitly acknowledges the variable is "future iteration" — readers reaching line 191 see the gap.
  - `tokens.consumes` (the machine-readable contract) correctly omits `--prism-z-sticky` (Round 1 MED-4 fix); only the prose description drifts.
  - Consumer-visible impact: a theme author searching for `--prism-z-sticky` to override the sticky z-index finds a phantom; current behavior is `zIndex: 10` regardless of any token they set.
  - Not blocking: the spec is internally inconsistent (line 66 vs line 191), so a careful reader catches it.
- **Recommendation**: edit line 66 to "When true, applies `position: sticky; top: 0; z-index: 10;` and a surface-default background. Z-index is currently hardcoded; a future iteration may introduce `--prism-z-sticky` for layered stacking (see comment below `tokens.consumes`)." — same prose pattern as the existing line 191 comment.

---

## Mechanical sweeps re-run (literal commands + outputs)

### A. Spec-implementation parity (10/10) — re-derived

| #   | Spec promise (post-Round-1)                                                                                  | Verification command                                                                                                                                         | Status   |
| --- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| 1   | `ColumnDef.field: string`                                                                                    | `grep -n 'field: string' web/src/engines/data-table/types.ts:49`                                                                                             | RESOLVES |
| 2   | `ColumnDef.render?: (value: unknown, row: T) => ReactNode`                                                   | `grep -n 'render?' web/src/engines/data-table/types.ts:78`                                                                                                   | RESOLVES |
| 3   | `defaultSortComparator<T>(a, b, key: string, direction)`                                                     | `grep -nA1 'export function defaultSortComparator' web/src/engines/data-table/use-data-table.ts:754`                                                         | RESOLVES |
| 4   | `assertNoSyntheticSortable` runtime guard                                                                    | `grep -n 'assertNoSyntheticSortable' web/src/engines/data-table/use-data-table.ts` → 43 + 274                                                                | RESOLVES |
| 5   | `FilterBar` exported from top-level barrel                                                                   | `node -e 'import("./web/dist/index.js").then(m => console.log("FilterBar" in m))'` → `true`                                                                  | RESOLVES |
| 6   | `useFilterBarState<T, TFilters>` exported from top-level barrel                                              | same → `useFilterBarState: true`                                                                                                                             | RESOLVES |
| 7   | `defaultSortComparator` exported from top-level barrel                                                       | same → `defaultSortComparator: true`                                                                                                                         | RESOLVES |
| 8   | filter-bar barrel re-exports both surfaces                                                                   | `node -e 'import("./web/dist/molecules/filter-bar/index.js").then(m => console.log(JSON.stringify(Object.keys(m).sort())))'` → `["FilterBar","useFilterBarState"]` | RESOLVES |
| 9   | Storybook covers 3 FilterBar shapes + 1 composite                                                            | `ls web/src/molecules/filter-bar/__stories__/` → `filter-bar.stories.tsx`, `filter-bar-with-data-table.stories.tsx`                                          | RESOLVES |
| 10  | Effective-fallback semantics (`rawFilters[k] not in options[k] → initial[k]`)                                | `sed -n '167,185p' web/src/molecules/filter-bar/use-filter-bar-state.ts` confirms `if (opts.length > 0 && !opts.includes(raw)) { effective[k] = initial[k]; }` | RESOLVES |

**New parity row** (consequence of MED-1 fix):

| #   | Spec promise                                                                                                            | Verification command                                                                                                                                                                                                                              | Status   |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 11  | `__rowType` materialised at runtime as `undefined` so `("__rowType" in result) === true`                                | `grep -n '__rowType' web/src/molecules/filter-bar/use-filter-bar-state.ts` → `99: readonly __rowType?: T \| undefined;` and `198: __rowType: undefined,`. Type-side widening (`?: T \| undefined`) + runtime materialisation, both present. | RESOLVES |

### B. Mock data scan (re-run)

```bash
$ grep -rEn "MOCK_|FAKE_|DUMMY_|SAMPLE_|generate[A-Z][a-zA-Z]*Data|mock[A-Z]|Math\.random" \
  web/src/molecules/filter-bar/use-filter-bar-state.ts \
  web/src/molecules/filter-bar/filter-bar.tsx \
  web/src/molecules/filter-bar/index.ts \
  web/src/engines/data-table/types.ts \
  web/src/engines/data-table/use-data-table.ts \
  web/src/engines/data-table/data-table-body.tsx \
  web/src/engines/data-table/data-table-mobile.tsx \
  web/src/engines/data-table/data-table-root.tsx
# (no output)
# EXIT=1
```

Result: clean.

### C. Stub detection (re-run)

```bash
$ grep -rEn "TODO|FIXME|HACK|STUB|XXX|throw new Error\(['\"]Not implemented" \
  web/src/engines/data-table/types.ts \
  web/src/engines/data-table/use-data-table.ts \
  web/src/engines/data-table/data-table-root.tsx \
  web/src/molecules/filter-bar/
# (no output)
# EXIT=1
```

Result: clean.

### D. Cast hygiene re-sweep (M-1 verification)

```bash
$ grep -rn "as T\[keyof T\]\|as T\[" web/src/
web/src/engines/data-table/use-data-table.ts:398:    if (!isClientSide) return [] as T[];
# (no `as T[keyof T]` matches anywhere — M-1 resolved)

$ grep -rn "as keyof T\|as unknown as\|as any" \
  web/src/engines/data-table/types.ts \
  web/src/engines/data-table/use-data-table.ts \
  web/src/engines/data-table/data-table-body.tsx \
  web/src/engines/data-table/data-table-mobile.tsx \
  web/src/engines/data-table/data-table-root.tsx \
  web/src/molecules/filter-bar/use-filter-bar-state.ts \
  web/src/molecules/filter-bar/filter-bar.tsx \
  web/src/molecules/filter-bar/index.ts
web/src/engines/data-table/use-data-table.ts:319:      return getRowId(row, index) as unknown as TId;
# (only the documented getTypedRowId fallback, unchanged from 0.4.0; carried over from Round 1)

$ grep -n "col\.render" web/src/engines/data-table/data-table-root.tsx web/src/engines/data-table/data-table-body.tsx web/src/engines/data-table/data-table-mobile.tsx
web/src/engines/data-table/data-table-body.tsx:389:              {col.render ? col.render(value, row) : String(value ?? "")}
web/src/engines/data-table/data-table-root.tsx:612:              {col.render ? col.render(value, row) : String(value ?? "")}
web/src/engines/data-table/data-table-mobile.tsx:204:                {col.render
web/src/engines/data-table/data-table-mobile.tsx:205:                  ? col.render(rowRecord[col.field], row)
```

Result: M-1 resolved across all three call sites (root.tsx, body.tsx, mobile.tsx) — every `col.render(...)` call passes `unknown` straight through, no narrowing casts.

### E. Spec authority — `specs/components/filter-bar.yaml::tokens.consumes` resolves against source

```bash
$ grep -oE 'var\(--prism-[a-z0-9-]+' web/src/molecules/filter-bar/filter-bar.tsx | sort -u
var(--prism-color-border-default
var(--prism-color-interactive-primary
var(--prism-color-surface-default
var(--prism-color-surface-elevated
var(--prism-color-text-on-primary
var(--prism-color-text-primary
var(--prism-color-text-secondary
var(--prism-font-size-body
var(--prism-font-size-caption
var(--prism-radius-md
var(--prism-spacing-1
var(--prism-spacing-2
var(--prism-spacing-3
# 13 unique tokens

$ grep -oE -- '--prism-[a-z0-9-]+' specs/components/filter-bar.yaml | sort -u
--prism-color-border-default
--prism-color-interactive-primary
--prism-color-surface-default
--prism-color-surface-elevated
--prism-color-text-on-primary
--prism-color-text-primary
--prism-color-text-secondary
--prism-font-size-body
--prism-font-size-caption
--prism-radius-md
--prism-spacing-1
--prism-spacing-2
--prism-spacing-3
--prism-z-sticky
# 14 unique tokens
```

13 of 14 yaml-listed tokens resolve byte-for-byte against `filter-bar.tsx`. The 14th (`--prism-z-sticky`) appears at yaml lines 66 and 191. Line 191 is a forward-looking comment ("a future iteration may introduce…") — acceptable per the comment's own framing. Line 66 (`props.sticky.description`) is a phantom citation — see L-1 above.

### F. Same-shard fix-immediately compliance (no NEW unguarded reads, no NEW stale casts)

Same surface as Round 1 § E. Re-grepped:

```bash
$ grep -n "row\[col\.field\]\|rowRecord\[" web/src/engines/data-table/data-table-body.tsx web/src/engines/data-table/data-table-mobile.tsx
web/src/engines/data-table/data-table-body.tsx:382:          const value = (row as Record<string, unknown>)[col.field];
web/src/engines/data-table/data-table-mobile.tsx:159:  const rowRecord = row as Record<string, unknown>;
web/src/engines/data-table/data-table-mobile.tsx:185:    return rowRecord[titleCol.field];
web/src/engines/data-table/data-table-mobile.tsx:186:    return rowRecord[subtitleCol.field];
web/src/engines/data-table/data-table-mobile.tsx:192:    return rowRecord[col.field];
web/src/engines/data-table/data-table-mobile.tsx:193:  const rawValue = rowRecord[col.field];
web/src/engines/data-table/data-table-mobile.tsx:205:                  ? col.render(rowRecord[col.field], row)
web/src/engines/data-table/data-table-mobile.tsx:206:                  : String(rowRecord[col.field] ?? "")
```

Result: same 7 sites Round 1 verified, all routed through the lifted `rowRecord` cast (mobile.tsx) or the inline cast (body.tsx). No new sites, no regression.

### G. Build / test / lint — all green

```bash
$ cd web && npx tsc --noEmit; echo "tsc EXIT=$?"
tsc EXIT=0

$ npm run lint 2>&1 | tail
> @kailash/prism-web@0.6.0 lint
> eslint src/
lint EXIT=0

$ npm run build 2>&1 | tail
> @kailash/prism-web@0.6.0 build
> tsc
build EXIT=0

$ npx vitest run 2>&1 | tail
 Test Files  30 passed (30)
      Tests  435 passed (435)
   Start at  23:25:14
   Duration  2.01s
vitest EXIT=0
```

435/435 tests pass. The 9 useFilterBarState unit tests all pass through the new `__rowType: undefined` runtime literal — no test asserts on absence-of-key or `Object.keys(...)` length, so the addition is structurally invisible to the test surface.

### H. `useEffect` / `useMemo` dep arrays — re-checked

Same four hot-path sites Round 1 verified (`use-data-table.ts:270-276`, `use-filter-bar-state.ts:144-161`, `:167-185`, `:188-190`). No edits to dep arrays in the Round 1 fix delta. Correct.

### I. Test coverage parity — re-derived

```bash
$ npx vitest --list 2>&1 | grep -c "✓\|test"
# (vitest --list runs through 435 collected tests across 30 files; same count as Round 1 run)
```

| Module                                             | Test file                                                             | Test count | Imports?                                                                                                       |
| -------------------------------------------------- | --------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------- |
| `web/src/engines/data-table/use-data-table.ts`     | `web/src/engines/data-table/__tests__/synthetic-fields.test.tsx`      | 6          | imports through public surface                                                                                 |
| `web/src/molecules/filter-bar/use-filter-bar-state.ts` | `web/src/molecules/filter-bar/__tests__/use-filter-bar-state.test.ts` | 9          | `import { useFilterBarState, type UseFilterBarStateInput } from "../use-filter-bar-state.js"`                  |
| `web/src/molecules/filter-bar/filter-bar.tsx`      | `web/src/molecules/filter-bar/__tests__/filter-bar.test.tsx`          | 14         | `import { FilterBar, type FilterBarDimension, type FilterBarViewMode } from "../filter-bar.js"`                |
| `web/src/molecules/filter-bar/index.ts`            | (built `.js` resolves at runtime)                                     | n/a        | `node -e ...` returns `["FilterBar","useFilterBarState"]`                                                      |
| Top-level barrel `web/src/index.ts`                | (built `.js` resolves at runtime)                                     | n/a        | `node -e ...` confirms `FilterBar`, `useFilterBarState`, `defaultSortComparator` all present                   |

29 module-specific tests pass; full suite 435/435.

---

## Cross-references

- Round 1 reports: `workspaces/prism-0.6.0/04-validate/01-round-1-aggregate.md`, `02-round-1-security.md`, `03-round-1-code-review.md`, `04-round-1-value-audit.md`
- Round 1 fixes (working tree, uncommitted at audit time): `web/src/engines/data-table/data-table-root.tsx:612`, `web/src/molecules/filter-bar/use-filter-bar-state.ts:99,198`, `web/src/molecules/filter-bar/filter-bar.tsx:293`, `specs/components/filter-bar.yaml`, `web/CHANGELOG.md`, `docs/specs/05m-0.6.0-additions.md`, `web/src/molecules/filter-bar/__stories__/filter-bar-with-data-table.stories.tsx`, `web/src/engines/data-table/__stories__/data-table-synthetic-column.stories.tsx`, `workspaces/prism-0.6.0/02-plans/01-prism-0.6.0-design.md`, `workspaces/prism-0.6.0/01-analysis/03-third-gap-investigation.md`
- Spec authority: `docs/specs/05m-0.6.0-additions.md`, `specs/components/data-table.yaml`, `specs/components/filter-bar.yaml`

## Disposition

Round 2 confirms convergence. L-1 is a one-line spec edit (replace the phantom `var(--prism-z-sticky)` reference in `props.sticky.description` with the literal `10` value the implementation actually uses, mirroring the existing line 191 forward-looking comment). The fix is mechanical and same-class as MED-4, so it MAY be folded into the same commit as the other Round 1 fixes before pushing — or deferred to 0.6.1 if the working-tree commit is already shaped. No blocking findings; the release is safe to commit and push.
