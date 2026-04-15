# M-03: Migrate arbor /documents to Prism DataTable engine (grid/list toggle)

## Priority: HIGH (DataTable second real consumer — grid/list pattern)
## Scope: arbor repo — `~/repos/terrene/contrib/arbor/apps/web/`
## Engine under test: `@kailash/prism-web` DataTable engine + card grid render mode

## Description

Arbor has a document template library at `/documents` (309 LOC). It has **two view modes**: a list view (table) and a card grid view (tile cards with preview/generate buttons). Category filters, search, and view toggle are present.

This is the **second real consumer of the Prism DataTable engine**. Where M-02 exercises the simplest possible case (read-only list), M-03 exercises the most complex: grid vs list mode toggle, faceted filters, card-style rendering. Two consumers side-by-side lets us see what a `DataTableAdapter` needs to cover.

**Anticipated Prism gap**: DataTable may NOT have a built-in card grid render mode. If it doesn't, this migration will document the gap explicitly and either (a) extend DataTable to support it, or (b) route around it via a `ListTemplate` composition. The decision is part of the findings.

## Migration pattern

1. Build side-by-side `/documents-prism` route
2. Keep existing `/documents` untouched
3. Use DataTable + filter + view-mode-toggle pattern from `@kailash/prism-web`
4. Wire `ServerDataSource.fetchData()` directly to arbor documents API

## Acceptance criteria

1. `/documents-prism` compiles under Turbopack with zero TS errors
2. Renders the document template library with working data
3. List view mode shows a table with columns (name, category, updated)
4. Grid view mode shows cards with preview + generate buttons
5. View-mode toggle works (list ↔ grid)
6. Category filter works (filters to one category)
7. Global search works
8. Loading, empty, and error states all render correctly
9. Preview and generate buttons navigate to the right routes
10. Visual parity with bespoke route
11. No mock data — live API calls end-to-end

## Gaps-surfacing deliverables

Write down in `workspaces/fe-codegen-platform/04-validate/migration-m03-findings.md`:
- Does DataTable support a card-grid render mode? If not, how did you work around it?
- If the workaround used `ListTemplate` + custom card component, document why DataTable couldn't do it alone
- Faceted filter UI: what's missing vs what's there?
- **Proposed `DataTableAdapter` interface** (compare with M-02's sketch)
- Any new atoms needed (Card atom? CardGrid molecule?)
- What should go into a DocumentLibrary composition if we built one

## Files to touch (arbor)

- `apps/web/src/app/(dashboard)/documents-prism/page.tsx` — NEW
- `apps/web/src/lib/prism-documents-datasource.ts` — NEW
- Do NOT touch existing `/documents` route

## Files to read (arbor, bespoke reference)

- `apps/web/src/app/(dashboard)/documents/page.tsx` (309 LOC)
- `apps/web/src/lib/api/documents.ts` — documents API client

## Files to read (prism)

- `web/src/engines/data-table/*` — DataTable engine
- `web/src/templates/list-template.tsx` — ListTemplate
- `web/src/engines/layout.tsx` — Grid primitive for card layout fallback
- `docs/specs/05-engine-specifications.md` § DataTable engine

## Dependencies

- None — independent of M-01 and M-02
- Findings feed into M-05 (DataTableAdapter codification)

## Agent

- `react-specialist` for the implementation
- `isolation: "worktree"`

## Done when

- `/documents-prism` works in both list and grid mode
- Filters and search work
- TS build passes
- Findings doc filled in with concrete DataTableAdapter interface sketch AND a yes/no on whether DataTable needs a built-in card-grid mode
