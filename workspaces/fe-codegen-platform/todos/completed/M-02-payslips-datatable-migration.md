# M-02: Migrate arbor /my-payslips to Prism DataTable engine

## Priority: HIGH (DataTable engine first real consumer)
## Scope: arbor repo — `~/repos/terrene/contrib/arbor/apps/web/`
## Engine under test: `@kailash/prism-web` DataTable engine

## Description

Arbor has a personal payslip history at `/my-payslips` (425 LOC). It's a **read-only list** — the simplest possible DataTable consumer. Perfect minimal-surface migration target: list + sort + paginate + row-click to download, that's it.

This is the **first real consumer of the Prism DataTable engine**. Since DataTable has NO adapter interface today, this migration will write raw `ServerDataSource.fetchData()` wiring — on purpose. The friction and patterns it surfaces become the input to codifying a `DataTableAdapter` interface later (after M-03 also ships, so we have two real consumers to compare).

## Migration pattern

1. Build side-by-side `/my-payslips-prism` route
2. Keep existing `/my-payslips` untouched
3. Use `DataTable` (or `ListTemplate` + DataTable) from `@kailash/prism-web`
4. Wire `ServerDataSource.fetchData()` directly to the arbor payslip API — no adapter layer

## Acceptance criteria

1. `/my-payslips-prism` compiles under Turbopack with zero TS errors
2. Page renders a `DataTable` showing payslips (period, gross, net, status, download action)
3. Sorting works on at least: period, gross amount
4. Pagination works (page size + total count)
5. Row click downloads the payslip PDF (matches existing behavior)
6. Loading state shows while fetching
7. Empty state shows when user has no payslips
8. Error state shows with retry if API fails
9. Visual parity with bespoke route (same columns, same actions)
10. No mock data — live API calls end-to-end

## Gaps-surfacing deliverables

Write down in `workspaces/fe-codegen-platform/04-validate/migration-m02-findings.md`:
- Every `ServerDataSource.fetchData` parameter that felt awkward
- Every column render that needed custom JSX (and what a cleaner API would look like)
- Response mapping friction (arbor API shape → `DataTableRow`)
- **Proposed `DataTableAdapter` interface sketch** based on what would have saved you code
- Whether `useDataTable` state management met needs
- Missing capabilities: inline row actions, download handlers, status badges as first-class column types

## Files to touch (arbor)

- `apps/web/src/app/(dashboard)/my-payslips-prism/page.tsx` — NEW
- `apps/web/src/lib/prism-payslips-datasource.ts` — NEW (ServerDataSource implementation)
- Do NOT touch existing `/my-payslips`

## Files to read (arbor, bespoke reference)

- `apps/web/src/app/(dashboard)/my-payslips/page.tsx` (425 LOC)
- `apps/web/src/lib/api/payroll.ts` — payslip API client

## Files to read (prism)

- `web/src/engines/data-table/types.ts` — DataTableConfig, ServerDataSource, ColumnDef
- `web/src/engines/data-table/data-table-root.tsx` — DataTable component
- `web/src/engines/data-table/use-data-table.ts` — state management hook
- `web/src/templates/list-template.tsx` — ListTemplate layout scaffold
- `docs/specs/05-engine-specifications.md` § DataTable engine

## Dependencies

- None — independent of M-01 and M-03
- Findings feed into M-05 (DataTableAdapter codification)

## Agent

- `react-specialist` for the implementation
- `isolation: "worktree"`

## Done when

- `/my-payslips-prism` renders a working DataTable with real arbor data
- Sort, paginate, row-click-download all work
- TS build passes
- Findings doc filled in with concrete DataTableAdapter interface sketch
