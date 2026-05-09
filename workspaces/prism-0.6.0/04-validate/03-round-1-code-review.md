---
type: redteam-round
round: 1
phase: redteam
date: 2026-05-08
project: prism-0.6.0
release: 0.6.0
agent: reviewer
scope: M01-M04 merged shards (PRs #27, #28, #29, #30)
input_main_sha: 78add91 (release(prism-web): v0.6.0 — FilterBar + ColumnDef.field relaxation, PR #30)
---

# Round 1 — Code Review (read-only, M01-M04)

## Verdict

**CONVERGED on M01-M03; one MEDIUM and three LOW notes against the M04 release-merge surface.**

No CRITICAL or HIGH findings. Spec-implementation parity is complete (10/10 promises resolve). Same-shard fix-immediately compliance for journal/0004 Finding 1 is confirmed verbatim. Mock-data scan and stub scan are clean. Test-coverage parity is met for every new module; both filter-bar barrels resolve runtime against the built artifacts.

One MEDIUM finding: a 0.6.0-introduced cast `value as T[keyof T] | undefined` in `data-table-root.tsx:613` re-narrows the `unknown` parameter the spec promises to widen — a residual inconsistency with the Migration section of CHANGELOG 0.6.0 and `docs/specs/05m-0.6.0-additions.md`. Low-risk (TS-only, runtime no-op, accepts the wider input via subtyping) but contradicts the release narrative.

Verdict line: `CONVERGED (0 CRIT, 0 HIGH, 1 MED, 3 LOW)` — no blocking findings.

## Approach summary

Eight checks (A-I from the brief) executed read-only. Mechanical sweeps first (grep/grep -c/node import), then targeted reads of the four shards' diff surface (`types.ts`, `use-data-table.ts`, `data-table-body.tsx`, `data-table-mobile.tsx`, `filter-bar.tsx`, `use-filter-bar-state.ts`, both barrels) and the journals (0001-0008) that bracket the release. Spec-implementation parity built as a literal command + grep-output table. Cast hygiene scoped exclusively to 0.6.0-touched files. No edits, no tests run; build artifacts under `web/dist/` were exercised through `node -e 'import(...)'` to verify barrel runtime.

---

## Findings

### CRITICAL

None.

### HIGH

None.

### MEDIUM

#### M-1. `data-table-root.tsx:613` re-narrows widened render value via `as T[keyof T] | undefined`

- **Location**: `web/src/engines/data-table/data-table-root.tsx:613` (default card-grid body renderer's per-column branch)
- **Reproduction**:
  ```bash
  grep -n "as T\[keyof T\]" web/src/engines/data-table/data-table-root.tsx
  # 613:                ? col.render(value as T[keyof T] | undefined, row)
  git blame -L 610,615 web/src/engines/data-table/data-table-root.tsx
  # commit 78add91 (PR #30, 2026-05-03 — the 0.6.0 release merge)
  ```
- **What's wrong**: 0.6.0 widens `ColumnDef.render`'s `value` parameter from `T[keyof T] | undefined` to `unknown` (`types.ts:78`) and the CHANGELOG + `docs/specs/05m-0.6.0-additions.md` § "Migration: render callback" promise that the engine henceforth passes `unknown`. The default-card-body call site re-narrows the value via `as T[keyof T] | undefined` before invoking `col.render`. TS still compiles (the cast is to a subtype of `unknown`, so `col.render` accepts it), but:
  1. The cast is now redundant against the relaxed signature.
  2. It silently re-asserts the OLD typing contract the release explicitly removed.
  3. It's the only `as T[keyof T]` cast surviving in `web/src/engines/data-table/` after the relaxation — `data-table-body.tsx:382` and `data-table-mobile.tsx:185-205` correctly use `(row as Record<string, unknown>)[col.field]` and pass the resulting `unknown` straight through.
- **Severity rationale**: MEDIUM, not HIGH, because:
  - Type-system-only divergence; no runtime behavior change (TS erases casts).
  - Synthetic-field cards still render correctly (the `value` will be `undefined` and the cast accepts that).
  - But the inconsistency is consumer-visible if a downstream typed-render callback inspects the parameter type via TypeScript tooling, and it contradicts the migration narrative.
- **Recommendation**: drop `as T[keyof T] | undefined`. The line should read `col.render(value, row)` — same shape as `data-table-body.tsx:389`. Three-character delete; no semantic change. (No edit performed in this review per scope.)

### LOW

#### L-1. CHANGELOG 0.6.0 § Internal claims `docs/specs/05-engine-specifications.md` got the FilterBar + ColumnDef appendices but the release also shipped `docs/specs/05m-0.6.0-additions.md` as a separate file

- **Location**: `web/CHANGELOG.md:54` ("appended § Filter Engine + § DataTable § ColumnDef relaxation"), vs `docs/specs/05m-0.6.0-additions.md` which IS the additions file.
- **Reproduction**:
  ```bash
  grep -n "0.6.0\|appended" docs/specs/05-engine-specifications.md | head -5
  ls docs/specs/05m-0.6.0-additions.md
  # docs/specs/05m-0.6.0-additions.md exists; it's the actual landing site
  ```
- **What's wrong**: the CHANGELOG narrative says the additions were appended to `05-engine-specifications.md`; the actual landing was a sibling file (`05m-0.6.0-additions.md`) that cross-references the parent. Not a spec-accuracy violation (the additions file IS authoritative), but the CHANGELOG sentence misdescribes the layout.
- **Recommendation**: edit CHANGELOG to "Companion file `docs/specs/05m-0.6.0-additions.md` appended § Filter Engine + § DataTable § ColumnDef relaxation; parent file unchanged."

#### L-2. `useFilterBarState` `useMemo` filters dep array references `initial` directly, not its identity

- **Location**: `web/src/molecules/filter-bar/use-filter-bar-state.ts:184` (`}, [rawFilters, options, initial]);`)
- **Reproduction**:
  ```bash
  sed -n '160,185p' web/src/molecules/filter-bar/use-filter-bar-state.ts
  ```
- **What's wrong**: the `filters` memo depends on `initial` for its key set AND for fallback values. Consumers passing an inline-literal `initial: { sector: "All" }` get a fresh identity on every parent render, which invalidates the memo every render. The hook is documented (line 156-159) as expecting "a stable object literal" and the comment explicitly accepts the recompute-on-unstable-input behavior. So this is a **documented** trade-off, not a defect — but it is also not a structurally enforced invariant. A consumer that wraps inputs with `useMemo`/`useCallback` is fine; a naïve consumer hits the recompute every render.
- **Severity rationale**: LOW because the cost is one O(dimensions) loop per parent render and behavior is correct either way. Documented in code; not a bug.
- **Recommendation**: optional — store the dimension-key set in a ref the first time it's seen (or memoize with `JSON.stringify(Object.keys(initial))` as a key) so callers don't pay the recompute toll. No correctness fix needed.

#### L-3. `noUncheckedIndexedAccess` not visibly enabled, so the `opts === undefined || raw === undefined` guard at `use-filter-bar-state.ts:176-178` is defensive against a strict-mode posture not currently active

- **Location**: `web/src/molecules/filter-bar/use-filter-bar-state.ts:170-178`
- **Reproduction**:
  ```bash
  grep -n "noUncheckedIndexedAccess" web/tsconfig.json
  # (no match)
  ```
- **What's wrong**: the comment at `use-filter-bar-state.ts:170-173` explicitly anticipates `noUncheckedIndexedAccess` (`"makes these `string[] | undefined`"`). The flag is NOT in `web/tsconfig.json`, so `options[k]` and `rawFilters[k]` resolve as `string[]` and `string` — the guard is dead under current strictness. Code is still correct; the guard is forward-compatible defense.
- **Severity rationale**: LOW — defensive code that becomes load-bearing the day strict-indexed-access flips on. Worth recording; not blocking.
- **Recommendation**: either flip `noUncheckedIndexedAccess: true` in tsconfig (separately scoped change, beyond 0.6.0) or annotate the guard with `// kept for noUncheckedIndexedAccess parity — see issue #N`.

---

## Mechanical sweeps

### A. Spec-implementation parity (literal command + grep output table)

| #   | Spec promise (source: `docs/specs/05m-0.6.0-additions.md` + `specs/components/{data-table,filter-bar}.yaml`) | Verification command                                                                                                                                                                                          | Status   |
| --- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | `ColumnDef.field: string` (was `string & keyof T`)                                                           | `grep -n 'field: string' web/src/engines/data-table/types.ts:49` → `49:  field: string;`                                                                                                                      | RESOLVES |
| 2   | `ColumnDef.render?: (value: unknown, row: T) => ReactNode`                                                   | `grep -n 'render?' web/src/engines/data-table/types.ts:78` → `78:  render?: (value: unknown, row: T) => ReactNode;`                                                                                           | RESOLVES |
| 3   | `defaultSortComparator<T>(a, b, key: string, direction)` (was `keyof T`)                                     | `grep -nA1 'export function defaultSortComparator' web/src/engines/data-table/use-data-table.ts:754-757` → `key: string,`                                                                                     | RESOLVES |
| 4   | `assertNoSyntheticSortable` runtime guard with verbatim error message                                        | `grep -n 'assertNoSyntheticSortable' web/src/engines/data-table/use-data-table.ts` → `43:function assertNoSyntheticSortable<T...>` + `274: assertNoSyntheticSortable(columns, firstRow);`                     | RESOLVES |
| 5   | `FilterBar` molecule exported from `@kailash/prism-web` top-level barrel                                     | `node -e 'import("./web/dist/index.js").then(m => console.log("FilterBar" in m))'` → `true`                                                                                                                   | RESOLVES |
| 6   | `useFilterBarState<T, TFilters>` hook exported from top-level barrel                                         | same → `useFilterBarState: true`                                                                                                                                                                              | RESOLVES |
| 7   | `defaultSortComparator` exported from top-level barrel                                                       | same → `defaultSortComparator: true`                                                                                                                                                                          | RESOLVES |
| 8   | filter-bar barrel `web/src/molecules/filter-bar/index.ts` re-exports both surfaces                           | `node -e 'import("./web/dist/molecules/filter-bar/index.js").then(m => console.log(Object.keys(m).sort()))'` → `[ 'FilterBar', 'useFilterBarState' ]`                                                         | RESOLVES |
| 9   | Storybook covers 3 FilterBar shapes + 1 composite (FilterBar + DataTable)                                    | `ls web/src/molecules/filter-bar/__stories__/` → `filter-bar.stories.tsx`, `filter-bar-with-data-table.stories.tsx`; `ls web/src/engines/data-table/__stories__/` → `data-table-synthetic-column.stories.tsx` | RESOLVES |
| 10  | Effective-fallback semantics (`rawFilters[k] not in options[k] → initial[k]`)                                | `sed -n '166,184p' web/src/molecules/filter-bar/use-filter-bar-state.ts` confirms `if (opts.length > 0 && !opts.includes(raw)) { effective[k] = initial[k]; }`                                                | RESOLVES |

### B. Mock data scan (production code)

```bash
grep -rEn "MOCK_|FAKE_|DUMMY_|SAMPLE_|generate[A-Z][a-zA-Z]*Data|mock[A-Z]|Math\.random" \
  web/src/molecules/filter-bar/use-filter-bar-state.ts \
  web/src/molecules/filter-bar/filter-bar.tsx \
  web/src/molecules/filter-bar/index.ts \
  web/src/engines/data-table/types.ts \
  web/src/engines/data-table/use-data-table.ts \
  web/src/engines/data-table/data-table-body.tsx \
  web/src/engines/data-table/data-table-mobile.tsx
# (no output)
```

Result: zero matches across all 0.6.0 production surfaces. Stories under `__stories__/` may use synthetic data per the brief's allowance and are out of scope.

### C. Stub detection

```bash
grep -rEn "TODO|FIXME|HACK|STUB|XXX|throw new Error\(['\"]Not implemented" \
  web/src/engines/data-table/types.ts \
  web/src/engines/data-table/use-data-table.ts \
  web/src/molecules/filter-bar/
# (no output)
```

Result: clean. No deferred-implementation markers in 0.6.0 changes.

### D. Cast hygiene (0.6.0 surface)

```bash
grep -rn "as keyof T\|as unknown as\|as any" \
  web/src/engines/data-table/types.ts \
  web/src/engines/data-table/use-data-table.ts \
  web/src/engines/data-table/data-table-body.tsx \
  web/src/engines/data-table/data-table-mobile.tsx \
  web/src/engines/data-table/data-table-root.tsx \
  web/src/molecules/filter-bar/use-filter-bar-state.ts \
  web/src/molecules/filter-bar/filter-bar.tsx \
  web/src/molecules/filter-bar/index.ts
# web/src/engines/data-table/use-data-table.ts:319:      return getRowId(row, index) as unknown as TId;
```

Plus the additional `as T[keyof T]` sweep:

```bash
grep -rn "as T\[keyof T\]\|as T\[" web/src/
# web/src/engines/data-table/data-table-root.tsx:613:                ? col.render(value as T[keyof T] | undefined, row)
# web/src/engines/data-table/use-data-table.ts:398:    if (!isClientSide) return [] as T[];
```

Findings:

- `use-data-table.ts:319` — `as unknown as TId` is the documented `getTypedRowId` fallback when no adapter declares a typed id. Documented in source (lines 305-321) and unchanged from 0.4.0; not a 0.6.0 cast.
- `data-table-root.tsx:613` — see Finding M-1 above.
- `use-data-table.ts:398` — `[] as T[]` is an empty-array cast, structural and unchanged from 0.4.0; benign.

### E. Same-shard fix-immediately compliance (journal/0004 Finding 1)

Journal/0004 surfaced 7 unguarded `row[col.field]` reads in `data-table-body.tsx` + `data-table-mobile.tsx` and reported them fixed in M01 commit 1.

```bash
grep -n "row\[col\.field\]\|rowRecord\[" \
  web/src/engines/data-table/data-table-body.tsx \
  web/src/engines/data-table/data-table-mobile.tsx
# data-table-body.tsx:382:          const value = (row as Record<string, unknown>)[col.field];
# data-table-mobile.tsx:159:  const rowRecord = row as Record<string, unknown>;
# data-table-mobile.tsx:185-206:  rowRecord[titleCol.field] / rowRecord[subtitleCol.field] / rowRecord[col.field]
```

Result: the 7 sites are fixed. Body uses inline `(row as Record<string, unknown>)[col.field]` (1 site, line 382). Mobile lifts `const rowRecord = row as Record<string, unknown>` once per render (line 159) then reads through `rowRecord` 6 times (lines 185, 186, 192, 193, 205, 206). Implementation matches journal/0004 Finding 1's described disposition verbatim.

### F. Type guards / consumer render callbacks

```bash
grep -rn "render: (value\|render: (_value\|render(value\|render(_value\|render: ([a-zA-Z_]\+, [a-zA-Z_]\+)" web/src/ \
  | grep -v "\.test\.\|__tests__\|__stories__"
# (only test/story occurrences — no production-code render callbacks in web/src/)
```

Result: no internal production code in `web/src/` declares `render` callbacks (only the engine itself and consumer code under `__stories__/` / `__tests__/`). Spot-check of templates (`web/src/templates/*.tsx`) shows none of them author per-column `render` callbacks; templates accept `columns` as opaque props. The `unknown` widening is therefore a pure consumer-side TypeScript change with zero `web/src/` callsite impact. Build is green per orchestrator pre-check; no spot-check necessary because there are no in-tree consumer callsites to spot-check.

### G. Effective-fallback semantics (use-filter-bar-state.ts vs journal/0002)

Journal/0002 § "Effective-filter fallback (default-on)" specifies: "if the raw value is not in `options[K]`, fall back to `input.initial[K]`."

```typescript
// web/src/molecules/filter-bar/use-filter-bar-state.ts:166-184
const filters = useMemo<TFilters>(() => {
  const effective = { ...rawFilters } as TFilters;
  for (const k of Object.keys(initial) as Array<keyof TFilters>) {
    const opts = options[k];
    const raw = rawFilters[k];
    if (opts === undefined || raw === undefined) continue;
    if (opts.length > 0 && !opts.includes(raw)) {
      effective[k] = initial[k]; // ← exact spec
    }
  }
  return effective;
}, [rawFilters, options, initial]);
```

Result: implementation matches journal/0002 spec. Subtle: when `opts.length === 0` (no `derive` callback supplied for that dimension), the raw value passes through unchanged — the consumer owns option authority in that case. This matches the spec's "default-on per journal 0002 § For Discussion #2" rule and is exercised by `use-filter-bar-state.test.ts:67-77` ("returns initial values when no data and no derive"). Confirmed via the unit test running through the same code path as `effective`.

### H. `useEffect` dep array correctness

`use-data-table.ts:270-276` (assertNoSyntheticSortable wiring):

```typescript
useEffect(() => {
  const firstRow = clientData[0] ?? serverRows[0];
  if (firstRow === undefined) return;
  if (validatedColumnsRef.current === columns) return;
  assertNoSyntheticSortable(columns, firstRow);
  validatedColumnsRef.current = columns;
}, [columns, clientData, serverRows]);
```

Closure variables: `clientData`, `serverRows`, `columns`, `validatedColumnsRef`. `validatedColumnsRef` is a `useRef` (stable, exempt from deps per React canon). `clientData`, `serverRows`, `columns` are all in the dep array. Correct.

`use-filter-bar-state.ts:143-160` (`options` memo):

```typescript
const options = useMemo(() => {
  // ...
  for (const k of Object.keys(initial) as Array<keyof TFilters>) {
    const fn = derive?.[k];
    // ...
  }
}, [data, derive, initial]);
```

Closure: `data`, `derive`, `initial` — all three present. Correct.

`use-filter-bar-state.ts:166-184` (`filters` memo):

```typescript
}, [rawFilters, options, initial]);
```

Closure: `rawFilters`, `options`, `initial` — all three present. Correct. (See L-2 for the documented identity-instability cost.)

`use-filter-bar-state.ts:187-189` (`setFilter`):

```typescript
const setFilter = useCallback(<K extends keyof TFilters>(k: K, v: string) => {
  setRawFilters((prev) => ({ ...prev, [k]: v }));
}, []);
```

Empty deps — uses `setRawFilters` (stable) and the parameter `k`/`v`. Correct.

Result: all four hot-path effects/memos have correct dep arrays. No missing or extraneous deps.

### I. Test coverage parity

For every new module, an importing test exists.

| Module                                                                                  | Test file                                                             | Test count | Imports?                                                                                                                 |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| `web/src/engines/data-table/use-data-table.ts` (new `assertNoSyntheticSortable` helper) | `web/src/engines/data-table/__tests__/synthetic-fields.test.tsx`      | 6          | imports `DataTable, ColumnDef` from barrel, exercises through public surface (verified at line 27)                       |
| `web/src/molecules/filter-bar/use-filter-bar-state.ts`                                  | `web/src/molecules/filter-bar/__tests__/use-filter-bar-state.test.ts` | 9          | `import { useFilterBarState, type UseFilterBarStateInput } from "../use-filter-bar-state.js"`                            |
| `web/src/molecules/filter-bar/filter-bar.tsx`                                           | `web/src/molecules/filter-bar/__tests__/filter-bar.test.tsx`          | 14         | `import { FilterBar, type FilterBarDimension, type FilterBarViewMode } from "../filter-bar.js"`                          |
| `web/src/molecules/filter-bar/index.ts` (barrel)                                        | (built `.js` resolves at runtime)                                     | n/a        | `node -e 'import("./web/dist/molecules/filter-bar/index.js")'` returns `[ 'FilterBar', 'useFilterBarState' ]`            |
| Top-level barrel `web/src/index.ts`                                                     | (built `.js` resolves at runtime)                                     | n/a        | `node -e 'import("./web/dist/index.js")'` confirms `FilterBar`, `useFilterBarState`, `defaultSortComparator` all present |

Total new-shard tests: 6 + 9 + 14 = 29 tests across three files (plus the existing `data-table-engine.wiring.test.tsx` with 6 cases continues to pass through the relaxed types). Result: every new module has importing-test coverage. Both filter-bar barrels (sub-package and top-level) resolve at runtime against the built artifacts.

---

## Cross-references

- Brief: `workspaces/prism-0.6.0/briefs/0001-prism-0.6.0-design-cycle.md`
- Plan: `workspaces/prism-0.6.0/02-plans/01-prism-0.6.0-design.md`
- Implementation journals: `workspaces/prism-0.6.0/journal/0004-DISCOVERY-implementation-surfaces-latent-type-guards-and-eslint-gap.md` (Finding 1 disposition verified), `0005-DECISION-implement-cycle-complete-pending-npm-publish.md`
- Spec authority: `docs/specs/05m-0.6.0-additions.md`, `specs/components/data-table.yaml` (changelog entry @ line 11-19), `specs/components/filter-bar.yaml`
- CHANGELOG: `web/CHANGELOG.md` (0.6.0 section @ line 5-63)
- PRs: #27 (M01 ColumnDef relaxation), #28 (M02 hook), #29 (M03 molecule), #30 (M04 release-merge, commit 78add91)

## Disposition

This is a Round 1 result. Finding M-1 should be addressed in Round 2 or as a 0.6.1 patch — its severity does not block the release that already shipped, but the inconsistency between the relaxed signature and a residual narrowing cast is a clean target for a one-line follow-up. L-1 / L-2 / L-3 are documentation- or strict-mode-posture concerns, deferable.
