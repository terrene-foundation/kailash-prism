---
phase: analyze
date: 2026-05-03
related: brief 0001 § Investigation scope
---

# Third-Gap Investigation: Should 0.6.0 Bundle a Third Feature?

## Sweep results (5 substantive candidates)

(Source: agent-C sweep across `workspaces/fe-codegen-platform/journal/0001-0029-*` + `04-validate/migration-m0[1-3]-findings.md` + `01-analysis/arbor-wave4-route-selection.md`.)

| Candidate                                      | Source             | Consumers                 | Verdict                                                                                                                                                                                                                           |
| ---------------------------------------------- | ------------------ | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **G-1: numeric PK stringify**                  | journal 0004, 0016 | 2+ (payslips, clients)    | DEFER — workaround acceptable; G-1 closed implicitly via `getRowId` config hook in 0.2.0                                                                                                                                          |
| **BLOCKING-1: ServerDataSource never invoked** | M-02, M-03         | 0 (workaround successful) | **STALE** — `ServerDataSource` was removed in 0.3.0 (per `data-table.yaml` changelog line 22). Finding pre-dates the removal. Current state: `DataSource = T[] \| DataTableAdapter<T>` only; the wiring problem no longer exists. |
| **BLOCKING-2: Form result render slot**        | M-01               | 1 (calculators)           | DEFER — FormAdapter design exists in journal 0004; implementation is M-05 scope; bundling requires Form engine work which doubles release surface.                                                                                |
| **H-2: Layout engine zero consumers**          | journal 0021       | 0                         | DEFER — architectural debt (consumer migration), not API gap. Out of scope for an API-feature release.                                                                                                                            |
| **R19: `data ?? []` useMemo wrap**             | journal 0029       | 4+ (all `*-prism` routes) | DEFER — pattern, not API. Codify in migration recipe + lint rule. Does not require Prism change.                                                                                                                                  |

## Two unfiled patterns flagged by agent-A

| Pattern                             | Consumers                         | Filed? | Verdict                                                                     |
| ----------------------------------- | --------------------------------- | ------ | --------------------------------------------------------------------------- |
| **Derive filter options from data** | 3 (documents, clients, employees) | NO     | **ABSORB INTO #24** — properly the `derive?` config of `useFilterBarState`. |
| **Effective-filter fallback**       | 2 (documents, clients)            | NO     | **ABSORB INTO #24** — properly an internal property of `useFilterBarState`. |

Two pairs of pattern-instances + a third in flight (employees). FilterBar's API (per analysis 01) absorbs both as natural properties. They are not separate gaps; they are FilterBar features.

## Recommendation: ship 0.6.0 with #24 + #25 only

**Rationale:**

1. **No third candidate is structurally ready.** BLOCKING-1 is stale (already resolved by 0.3.0 removal). G-1 has a config hook. BLOCKING-2 needs Form engine work that's its own session. H-2 is migration debt. R19 is doc/lint, not API.

2. **The "effective fallback + derived options" patterns are properly inside FilterBar's scope.** They are not separate features; they are what FilterBar IS. Absorbing them avoids fragmenting a coherent molecule into three issues.

3. **Wave-6 will tell us the next gap.** Shipping 0.6.0 tight (two features, narrow blast radius) frees wave-6 to surface either (a) FilterBar refinements based on real consumer use, or (b) a new substantive third — most likely Form-side (custom field renders, result slot) given BLOCKING-2 was the most-flagged Form gap in M-01.

4. **0.6.0 → 0.6.1 is acceptable.** The brief named "ping-pong" risk; we accept it. A clean two-feature 0.6.0 with a known wave-6 third-gap-candidate beats a three-feature 0.6.0 where the third is rushed or speculative.

## What ships in 0.6.0

- **Issue #24** — `FilterBar` molecule + `useFilterBarState<T, TFilters>()` hook, layered on existing `globalSearchValue` (no engine plumbing). Internally handles derived options + effective fallback.
- **Issue #25** — `ColumnDef.field: string` + `defaultSortComparator(key: string)` + `render: (value: unknown, …)` + runtime `sortable + synthetic` throw at construction time.

## What is explicitly NOT shipping in 0.6.0

- BLOCKING-2 Form result slot (deferred to FormAdapter cycle / 0.7.0)
- `DataTableAdapter.filterDimensions` engine wiring (stays vapourware until consumer demands)
- Layout engine consumer migration (architectural; separate workstream)
- Card / CardGrid atoms (M-03 finding; documented but unprioritised)
- Form custom field render escape hatch (BLOCKING-1 in M-01; FormAdapter scope)
- Typed renderer library (`BadgeRenderer`, `FormattedDateRenderer`, etc. — agent-A finding; can be a separate molecule package, not 0.6.0)

## Watchlist for wave-6 → 0.6.1 / 0.7.0

The strongest candidates for the next release after 0.6.0:

1. **Form result render slot (BLOCKING-2)** — if any wave-6 route does form-with-result.
2. **Form custom field render (BLOCKING-1)** — if any wave-6 route needs combobox / currency / autocomplete.
3. **Typed renderer library** — if a 5th consumer hand-rolls a badge / date / nullable renderer.
