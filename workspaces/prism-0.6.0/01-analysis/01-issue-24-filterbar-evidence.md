---
phase: analyze
date: 2026-05-03
related_issue: terrene-foundation/kailash-prism#24
---

# Issue #24 — `FilterBar` Molecule: Evidence + Design Surface

## Consumer evidence (4 routes shipped)

| Route               | Wave | Inline filter CSS                                                            | External `useState`                       | Adapter rebuild trigger                            |
| ------------------- | ---- | ---------------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------- |
| `documents-prism`   | 3    | ~135 LOC (lines 64-198)                                                      | view, activeCategory, search              | `(templates, effectiveCategory, search)` keystroke |
| `my-payslips-prism` | 3    | 0 LOC (Tailwind only)                                                        | totalCount, retryTick                     | `retryTick` (no filter UI)                         |
| `clients-prism`     | 4    | ~122 LOC (lines 304-425)                                                     | view, activeSector, search, showAddForm   | `(clients, search, effectiveSector)` keystroke     |
| `employees-prism`   | 5    | (just merged 98e2634; not in agent's branch — extrapolate from journal 0029) | search + status filter (per journal 0029) | adapter rebuild on filter delta                    |

(Sources: agent-A sweep against `/Users/esperie/repos/terrene/contrib/arbor` apps/web routes; journal `workspaces/fe-codegen-platform/journal/0026-0029-*`.)

## Common pattern (3+ consumers)

```
[search input ─────────────][category chip-row OR sector dropdown][view-mode toggle]
        ↓                              ↓                                  ↓
  setSearch(...)                setActiveX(...)                     setView(...)
        └─────────────── useMemo([... filterTuple ...]) ───────────────────┘
                              ↓
                        new adapter identity
                              ↓
                       DataTable refetch
```

Every consumer hand-rolls the layout, the input styling, the chip/dropdown component, and the adapter dependency tuple. Per-route inline CSS is near-identical (135 vs 122 LOC; same flexbox, same gap, same border tokens applied inline rather than via classNames).

## Two recurring sub-patterns the molecule should absorb

### Sub-pattern A: derive filter options from data (3 consumers)

```typescript
// documents-prism:483
const categories = useMemo(() => deriveCategories(templates), [templates]);
// clients-prism:448
const sectors = useMemo(() => deriveSectors(clients), [clients]);
```

Both: walk the dataset, collect unique values for one field, sort. ~20 LOC of `Set` + sort + `["All", ...]` boilerplate per consumer.

### Sub-pattern B: effective-filter fallback (2 consumers)

```typescript
// documents-prism:488-490
const effectiveCategory = categories.includes(activeCategory)
  ? activeCategory
  : "All";
// clients-prism:453-455
const effectiveSector = sectors.includes(activeSector) ? activeSector : "All";
```

Both: if active filter value disappears from data (e.g. last document of a category deleted), silently fall through to "All" without `setState`. Avoids stuck-empty-state bug.

These two sub-patterns are NOT separate gaps. They are properties of **what `FilterBar` should do internally** — derive options from data + protect against orphaned selection.

## Engine surface that FilterBar attaches to

(Source: agent-B sweep against `web/src/engines/data-table/`.)

- **Already shipped (0.4.0 G-2):** `DataTableConfig.globalSearchValue` + `onGlobalSearchChange` — controlled-mode global search. (`types.ts:438-458`, `use-data-table.ts:131-203`.)
- **Vapourware (declared, not wired):** `DataTableAdapter.filterDimensions` — declared in spec at v0.2.2, reserved for 0.4.0, **zero call sites in the engine** per orphan-detection rule. (`types.ts:274-277`, `rg "filterDimensions" web/src` returns only the comment.)
- **Per-column inline filters (current):** `data-table-header.tsx:211-222` renders a text input under each filterable column header. Different surface from the molecule we're designing — those are per-column filters; FilterBar is the page-header bar.
- **Molecules dir:** `web/src/molecules/` is empty (only `.gitkeep`). FilterBar lands at `web/src/molecules/filter-bar/`.

## FilterBar API shape (proposed for `/todos` to refine)

```typescript
// State hook — typed dimensions, derives options from data, handles effective fallback
function useFilterBarState<T, TFilters extends Record<string, string>>(input: {
  data: T[];                                  // source for derivation
  initial: TFilters;                          // initial filter values (default per dim)
  searchInitial?: string;                     // initial search query
  derive?: {                                  // optional per-dim derivation
    [K in keyof TFilters]?: (rows: T[]) => string[];  // unique values for this dim
  };
}): {
  search: string;
  setSearch: (v: string) => void;
  filters: TFilters;                          // effective values (with fallback applied)
  setFilter: <K extends keyof TFilters>(key: K, value: string) => void;
  options: { [K in keyof TFilters]: string[] }; // derived option lists
};

// Molecule — declarative layout
<FilterBar
  search={state.search}
  onSearchChange={state.setSearch}
  searchPlaceholder="Search clients…"
  dimensions={[
    { key: "sector", label: "Sector", options: state.options.sector,
      value: state.filters.sector, onChange: (v) => state.setFilter("sector", v),
      shape: "dropdown" /* or "chips" */ },
  ]}
  viewMode={{ active: view, options: ["grid","list"], onChange: setView }}
/>
```

## Decisions for `/todos`

1. **`FilterBar` is a NEW spec file** (`specs/components/filter-bar.yaml`), NOT an extension of `filter-panel.yaml`. Different shape (collapsible form-field panel vs. horizontal bar with search+chips+toggle), different composition. FilterPanel stays for the per-column-faceted-filter use case.

2. **Option A scope for 0.6.0**: ship FilterBar molecule + `useFilterBarState` hook. Engine plumbing (wiring `filterDimensions` into adapter cycle) stays vapourware until a consumer demands it. This unblocks all 4 known consumers at zero engine-surface risk.

3. **Engine integration**: FilterBar consumes the existing `globalSearchValue`/`onGlobalSearchChange` for the search field. Filter dimensions live OUTSIDE the engine — consumer threads them into `useMemo` adapter dependency, same pattern as today (just centralised in `useFilterBarState`).

## What does NOT change in 0.6.0

- `DataTableAdapter.filterDimensions` stays vapourware (per orphan-detection rule, do not implement until consumer demands).
- `FilterPanel` (existing organism, v0.1.0) stays as-is for collapsible faceted-form use case.
- Per-column header text-input filters stay as-is (`data-table-header.tsx:211-222`).
