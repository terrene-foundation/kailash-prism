---
type: DISCOVERY
phase: implement
date: 2026-05-03
shipped: arbor#28 (open), prism#25 (open)
related: 0026, 0027, 0028
---

# Wave-5 shipped + two Prism 0.6.0 design candidates emerge from waves 4-5

## What shipped

**arbor#28** — `feat(web): Prism wave-5 — /employees-prism (multi-DataTable + predicate-gated rowActions)`. Branch `feat/prism-wave5-employees`. Five files (~850 LOC): datasource + recreated arbor badges + employee-columns + invitation-columns + page. Bespoke `/employees` (1,233 LOC, 4 surfaces) untouched per side-by-side pilot pattern.

**prism#25** — `feat(web): relax ColumnDef.field for synthetic computed columns`. Filed because wave-5's `/employees` Profile-completeness column (0-100% bar derived from 6 `Employee` fields) cannot be expressed cleanly in Prism 0.5.0 — `ColumnDef.field` is typed `string & keyof T`, so synthetic field-keys are rejected. Forced to drop Profile column from wave-5.

## Wave-5 signals — 4 ✅ + 1 ⚠

1. **Two DataTables on one page coexist cleanly** — separate React Query caches, separate adapters, no state leakage.
2. **`DataTableRowAction.visible` predicate** works as documented for Copy/Resend/Revoke (each with distinct visibility predicate).
3. **Promise-returning `onExecute`** = engine-managed per-row busy state. Replaces consumer-managed `actionLoading: string | null` cycle with zero boilerplate.
4. **`adapter.invalidate` ties cleanly into React Query** — engine refetch drives `queryClient.invalidateQueries(['invitations'])`; new adapter identity propagates fresh data.
5. **Surfaced**: `ColumnDef.field` strictness blocks synthetic computed columns (recurring class: derived %, aggregate badges, computed totals, cross-field labels). Filed prism#25.

## Wave-4 plan correction

The wave-4 plan §"/employees" claimed `Invitation.id: string` (UUID), proposing /employees as a "mixed-TId stress test". **Wrong.** Both `Employee.id` and `Invitation.id` are `number`. Wave-5's mixed-TId axis was vacuous; coverage value still high on the multi-table + predicate + invalidate axes. Future cross-references to "mixed-TId test" in the wave-4 plan are stale.

## Two Prism 0.6.0 design candidates queued

After waves 4 and 5, two substantive Prism API gaps are in flight:

| Gap                                                                  | Filed             | Origin                                            | Recurring?                                                                                                                    |
| -------------------------------------------------------------------- | ----------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **FilterBar molecule** for external-search rebuild pattern           | prism#24 (wave-4) | G-2 documented workaround                         | Yes — three consumers (documents, payslips, clients) and now four (employees) hit the adapter-rebuild-on-string-delta pattern |
| **Synthetic computed columns** (relax `ColumnDef.field` to `string`) | prism#25 (wave-5) | Profile-completeness column couldn't be expressed | Yes — derived %, aggregate badges, computed totals, cross-field labels are a broad class                                      |

**Pattern**: each migration wave surfaces ~1 substantive Prism gap. Five waves shipped (1+2+3+4+5), two gaps queued. Suggests Prism 0.6.0 should bundle these + any wave-6 surfacing into a single design+release cycle, then resume migrations on the new surface.

## Reusable migration recipe (extended from 0026)

The four-file recipe holds across waves 4 + 5:

1. **Datasource module** — `apps/web/src/lib/prism-<name>-datasource.ts`
2. **Column modules** — `apps/web/src/app/(dashboard)/<name>-prism/elements/columns.tsx` (or split per table when multi-DataTable: `employee-columns.tsx` + `invitation-columns.tsx`)
3. **Domain badges/helpers** — `apps/web/src/app/(dashboard)/<name>-prism/elements/badges.tsx` (when migrating private-to-route helpers; recreated, not extracted, to keep bespoke route untouched)
4. **Page module** — `apps/web/src/app/(dashboard)/<name>-prism/page.tsx`

Confirmed twice. Promote to `co-setup/12-consumer-migration-pattern.md` after one more wave OR if wave-6 confirms with no further drift.

## Same-shard discipline check

Two R19 `exhaustive-deps` warnings (`employees`/`invitations` `?? []` in useMemo deps) surfaced and **fixed inline** per `autonomous-execution.md` MUST Rule 4 — same bug class as arbor#22, within shard budget. Pattern: every new -prism page that uses `useQuery<T[]>` + `data ?? []` MUST wrap the fallback in its own `useMemo(() => data ?? [], [data])` to stabilise array identity for downstream useMemos. Worth codifying in the migration recipe step 4.

## For Discussion

1. Wave-6 = continue migration cadence OR pivot to a Prism 0.6.0 design+release cycle? Two queued candidates is enough for a meaningful release; bundling wave-6's likely-third gap might be cleaner than releasing 0.6.0 with two and immediately needing 0.6.1.
2. If wave-6 = migration: candidates from `01-analysis/arbor-wave4-route-selection.md` § Out-of-scope are `/employees` invite-modal split (wave-6a) or `/policies` accordion (wave-6b, Prism-first). Or a fresh route not in the plan (e.g. `/leave`, `/payroll`, `/recruitment`).
3. Codify `data ?? []` useMemo wrap in the migration recipe now (preventive) or wait for the third occurrence to confirm pattern (reactive)?
