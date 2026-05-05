---
type: DECISION
phase: implement
date: 2026-05-02
shipped: arbor#26 (open), prism#24 (open)
related: 0026, 0027
---

# Wave-4 `/clients-prism` shipped — Form engine first arbor use, G-2 threshold reached

## What shipped

**arbor#26** — `feat(web): Prism wave-4 — /clients-prism (DataTable + card-grid + Form engine first-use)`. Branch `feat/prism-wave4-clients`. Three new files (885 LOC) under the side-by-side pilot pattern: bespoke `/clients` (582 LOC) untouched; new `/clients-prism` runs in parallel.

PR diff also includes 2 unrelated Python backend fixes (LLMJudge Ollama fallback + pytest collection unblock) bundled on the same branch — squash-merge collapses to a clean wave-4 commit on main.

**prism#24** — `feat(web): FilterBar molecule for external search/sector filter (G-2 → 0.6.0)`. Filed because three independent arbor consumers now hit the adapter-rebuild-on-search workaround pattern; threshold for promoting documented workaround → first-class Prism API.

## Wave-4 signals — all 4 plan questions answered

Per `01-analysis/arbor-wave4-route-selection.md` § "Expected wave-4 signals":

1. **Form + DataTable coexistence on one page** — ✅ no state leakage. Separate context per engine; React Query `setQueryData` handles row insertion on form submit; DataTable does not refetch.
2. **`renderCard` generalises beyond document-shaped entities** — ✅ worked for organisation-shaped client cards with zero Prism API change. Card slot is genuinely domain-agnostic.
3. **0.5.0 G-1 typed numeric PK** — ✅ `DataTableAdapter<ClientRow, number>` propagates cleanly through callbacks. Zero `String(id)` coercion needed on a third independent consumer.
4. **G-2 external-search workaround** — ⚠️ comfortable mechanically (works, doc'd, well-understood) BUT signals "promote to first-class API" threshold reached. Three consumers (documents, payslips, clients) all rebuild the adapter on search-string change; the rebuild-on-string-delta pattern is heavy enough that a `FilterBar` molecule is now justified for 0.6.0.

## First Form engine use — what we learned

The Prism Form engine API was sufficient for arbor's add-client surface on the first try. Specifically:

- 4 fields (text/text/select/number) with required-field validation worked end-to-end without API gaps.
- `validation: [{ rule: "required", message: "..." }]` per-field rule shape ergonomically clean.
- `onSubmit: async (values) => { ... }` — re-throwing a sanitised error surfaces in the engine's submit-error banner cleanly. No custom error UI needed.
- `submitLabel`, `resetLabel`, `showReset`, `onReset` — all worked as documented; the cancel-via-reset pattern is more idiomatic than the wave-3 toggle-bool-and-render-or-not pattern.
- `layout: "two-column"` produced the right grid-by-default behaviour for a 4-field admin form.

Edge that surfaced and needs Prism docs follow-up (low priority): `useMemo(buildAddClientFields, [])` (function reference) trips the React 19 `react-hooks/use-memo` rule which wants an inline arrow. Documenting the inline-arrow pattern in the Form engine's example code would prevent every future consumer from rediscovering this. Not urgent.

## Reusable pattern (codified for wave-5+)

The wave-3+wave-4 migration recipe now stable:

1. **Datasource module** at `apps/web/src/lib/prism-<name>-datasource.ts` — fetch + filter + derive helpers + create/update entry points.
2. **Columns module** at `apps/web/src/app/(dashboard)/<name>-prism/elements/columns.tsx` — `buildXColumns(): ColumnDef<XRow>[]` factory.
3. **Page module** at `apps/web/src/app/(dashboard)/<name>-prism/page.tsx` — `<LayoutProvider>` + content component using React Query for fetch lifecycle, adapter rebuilt on filter-state change, and engine composition for organisation.

Three files per route. Bespoke route stays untouched until pilot ships.

## Footnotes

- The wave-4 PR's commit was authored before this session's autonomize-driven planning landed in chat. Likely a parallel session (account 7) or manual local commit captured the work between agent turns. Result identical.
- arbor's pre-existing 83 lint findings (arbor#22) unchanged by this PR — zero introduced.
- The Form engine's first arbor use surfaced no Prism gaps, only one minor docs improvement.

## For Discussion

1. Promote the three-file recipe (datasource + columns + page) to a `co-setup` template at `docs/specs/12-consumer-migration-pattern.md` so wave-5+ doesn't have to re-derive? Or keep as project-journal pattern until 5+ migrations confirm it doesn't drift?
2. Wave-5 candidate selection — `/employees` (scoped to employees-table only) or `/policies` (Card+accordion exercise) or a different route entirely now that the engine composition story is proven?
3. Prism#24 FilterBar molecule — schedule for 0.6.0 with concrete API design, or accumulate consumers until 4-5 then design from data?
