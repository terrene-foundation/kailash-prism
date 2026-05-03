---
shard: 1
release: 0.6.0
issue: terrene-foundation/kailash-prism#25
estimated_loc: 150
specialist: react-specialist
worktree: .claude/worktrees/0.6.0-shard1
branch: feat/prism-0.6.0-shard1-columndef-relaxation
parallel_with: M02
---

# M01 — `ColumnDef.field` Synthetic Computed Columns

## Goal

Relax `ColumnDef.field` from `string & keyof T` to `string` so consumers can declare synthetic computed columns (Profile-completeness, aggregate badges, derived totals, cross-field labels). Add runtime guard that throws when a synthetic field is marked sortable.

## Tasks

### Build

- [ ] **T01** — `web/src/engines/data-table/types.ts:23` — change `field: string & keyof T` to `field: string`. Update JSDoc to document the dual contract: "If `field` is a key of `T`, the engine reads `row[field]` and passes it as `value` to render. If `field` is a synthetic id, no value lookup occurs; `sortable` MUST be `false`; `render` receives `undefined` as `value`."
- [ ] **T02** — `web/src/engines/data-table/types.ts:52` — widen `render?: (value: T[keyof T] | undefined, row: T) => ReactNode` to `render?: (value: unknown, row: T) => ReactNode`. Update JSDoc to note the type widening for synthetic-field support.
- [ ] **T03** — `web/src/engines/data-table/use-data-table.ts:673` — change `defaultSortComparator<T>(a, b, key: keyof T, direction)` to `defaultSortComparator<T>(a, b, key: string, direction)`. The body's `key as string` cast becomes a no-op (delete the cast). Update JSDoc.
- [ ] **T04** — `web/src/engines/data-table/use-data-table.ts:375` — at the call site that does `sort.field as keyof T`, drop the `as keyof T` cast (now unnecessary).
- [ ] **T05** — `web/src/engines/data-table/use-data-table.ts` — add new internal helper `assertNoSyntheticSortable<T>(columns: ColumnDef<T>[], firstRow: T | undefined): void` that iterates columns; for each column where `col.sortable === true && firstRow !== undefined && !(col.field in (firstRow as object))`, throw:
  ```
  Error: column "${col.field}" has sortable: true but is a synthetic field
  (no row[field] lookup). Synthetic columns MUST set sortable: false.
  To sort by a derived value, pre-compute it into the row data before
  passing to DataTable.
  ```
  Helper is idempotent and cheap (O(columns × 1)).
- [ ] **T06** — Wire `assertNoSyntheticSortable` into `useDataTable` so it runs once per first non-empty render. Use a `useRef<boolean>` flag to ensure single execution per DataTable mount; reset only when `columns` identity changes (consumer recomposed columns array).

### Test (Tier 1 unit)

- [ ] **T07** — `web/src/engines/data-table/__tests__/synthetic-fields.test.tsx` (new file) — test cases:
  - `field: keyof T` keys continue to work (regression — single test loading 0.4.0-style consumer)
  - `field: "_synthetic"` with `sortable: false` and `render: () => ...` renders without throw
  - `field: "_synthetic"` with `sortable: true` throws on first non-empty render with the exact error message from T05
  - `field: "_synthetic"` with `sortable: true` does NOT throw on empty `data: []` (defers until first non-empty)
  - `field: "_synthetic"` with `sortable: true` throws ONCE per mount (not on every re-render)
  - `defaultSortComparator(a, b, "_synthetic", "asc")` does not crash; returns `0` for both-undefined comparison
- [ ] **T08** — Verify all existing DataTable tests still pass (regression sweep). NO existing test should require modification — all consumer call sites already cast to `Record<string, unknown>` per agent-B sweep.

### Test (Tier 2 storybook)

- [ ] **T09** — `web/src/engines/data-table/__stories__/data-table-synthetic-column.stories.tsx` (new file) — Profile-completeness scenario matching arbor wave-5 employees-prism use case:
  - 6 typed `Employee` fields (name, email, department, designation, employment_type, start_date)
  - 1 synthetic `_profile` column with `render: (_v, row) => <div>{computeCompleteness(row)}%</div>` and `sortable: false`
  - Story title: "DataTable / Synthetic Columns / Profile completeness"

### Coordination

- [ ] **T10** — DO NOT edit `web/package.json`, `web/CHANGELOG.md`, or any spec file (`specs/**`, `docs/specs/**`). Those land in M04. The agent prompt MUST explicitly forbid these edits.

### Commit discipline

- [ ] After T01–T06: `git commit -m "feat(data-table): relax ColumnDef.field for synthetic computed columns"`
- [ ] After T07–T08: `git commit -m "test(data-table): regression + synthetic-field cases for ColumnDef.field"`
- [ ] After T09: `git commit -m "test(data-table): Profile-completeness synthetic-column storybook"`

## Acceptance criteria

- [ ] All Tier-1 tests pass
- [ ] All existing DataTable tests pass (regression)
- [ ] Storybook story renders the Profile-completeness column
- [ ] No edits to package.json / CHANGELOG / specs
- [ ] Branch is `feat/prism-0.6.0-shard1-columndef-relaxation`

## Risks

- **Type narrowing on `render` callback** — consumers destructuring the typed `value` parameter will see TS errors after upgrade. M04's CHANGELOG documents the migration. Not addressed in this shard.
- **Throw timing edge case** — if a consumer renders a DataTable with `data: []` then sortable+synthetic column, then later populates data, the throw fires at first populated render (correct). The test covers this.

## References

- Brief: `briefs/0001-prism-0.6.0-design-cycle.md`
- Analysis: `01-analysis/02-issue-25-synthetic-columns-surface.md`
- Plan: `02-plans/01-prism-0.6.0-design.md` § Feature 2
- Issue: terrene-foundation/kailash-prism#25

## Verification

- **Merged**: PR #27 (squash commit `b509b22` on main, 2026-05-03)
- **Commits on feat/prism-0.6.0-shard1-columndef-relaxation**:
  - `f8f76f9` feat(data-table): relax ColumnDef.field for synthetic computed columns
  - `322f84f` test(data-table): regression + synthetic-field cases for ColumnDef.field
  - `2bf4017` test(data-table): Profile-completeness synthetic-column storybook
- **Plan match**: per `02-plans/01-prism-0.6.0-design.md` § Feature 2 — type widening (3 sites), runtime guard, 6 unit cases, Profile-completeness storybook ✓
- **Tests**: 6 new + all 27-file/409-test data-table suite pass; tsc --noEmit clean
- **Journal constraints**: journal/0003 trade-off (clean type narrowing without deprecation cycle) honoured — no parameterised `<T, V>` shim added
- **Discovery**: 7 latent unguarded `row[col.field]` reads surfaced + fixed same-shard per autonomous-execution Rule 4 (journal/0004 Finding 1)
- **Coordination**: zero edits to package.json / CHANGELOG / specs (M04 owns)
