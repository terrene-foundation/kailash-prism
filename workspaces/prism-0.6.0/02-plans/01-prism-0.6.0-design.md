---
phase: analyze
date: 2026-05-03
status: draft (for /todos)
release: 0.6.0
---

# Prism 0.6.0 Design

## Scope

Two features. No engine wiring beyond what's already shipped. Tight blast radius.

1. **`FilterBar` molecule** + `useFilterBarState` hook (issue #24)
2. **`ColumnDef.field` relaxation** + runtime `sortable + synthetic` guard (issue #25)

## Feature 1: `FilterBar` molecule

### File plan

```
web/src/molecules/filter-bar/
  index.ts                  # exports FilterBar, useFilterBarState, FilterBarProps, etc.
  filter-bar.tsx            # the molecule
  use-filter-bar-state.ts   # the state hook
  filter-bar.test.tsx       # Tier-1 unit tests
  filter-bar.stories.tsx    # Tier-2 storybook (3 shapes per acceptance criteria)
```

### API surface

```typescript
// State hook (consumer pattern)
function useFilterBarState<T, TFilters extends Record<string, string>>(input: {
  data: T[];
  initial: TFilters;
  searchInitial?: string;
  derive?: { [K in keyof TFilters]?: (rows: T[]) => string[] };
}): {
  search: string;
  setSearch: (v: string) => void;
  filters: TFilters; // effective values
  setFilter: <K extends keyof TFilters>(k: K, v: string) => void;
  options: { [K in keyof TFilters]: string[] };
};

// Molecule (declarative layout)
type FilterBarDimension = {
  key: string;
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  shape: "dropdown" | "chips";
};

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  dimensions?: FilterBarDimension[];
  viewMode?: {
    active: string;
    options: string[];
    onChange: (mode: string) => void;
  };
  className?: string;
  sticky?: boolean; // default false
}

declare function FilterBar(props: FilterBarProps): JSX.Element;
```

### Three storybook shapes (acceptance criteria from #24)

1. **search-only** (matches my-payslips-prism after migration)
2. **search + chip-row category** (matches documents-prism)
3. **search + dropdown sector + view-mode toggle** (matches clients-prism, employees-prism extends with status filter)

### Engine integration

Zero. FilterBar consumes existing `DataTableConfig.globalSearchValue` + `onGlobalSearchChange` (0.4.0 G-2). Filter dimensions stay outside the engine — consumer threads them into adapter dependency tuple as today, just centralised via `useFilterBarState`.

### Spec edits (deferred — land AFTER code per `spec-accuracy.md` Rule 5)

- `specs/components/filter-bar.yaml` — NEW
- `docs/specs/05-engine-specifications.md` — append § Filter Engine subsection
- `specs/_index.md` — register filter-bar.yaml entry

## Feature 2: `ColumnDef.field` relaxation

### Code changes (3 type-level + 1 runtime check)

```typescript
// web/src/engines/data-table/types.ts:23
field: string;                                          // was: string & keyof T

// web/src/engines/data-table/types.ts:52
render?: (value: unknown, row: T) => ReactNode;         // was: T[keyof T] | undefined

// web/src/engines/data-table/use-data-table.ts:673
export function defaultSortComparator<T>(
  a: T, b: T, key: string, direction: 'asc'|'desc',     // was: key: keyof T
): number;

// web/src/engines/data-table/use-data-table.ts (new — runtime guard)
function assertNoSyntheticSortable<T>(columns: ColumnDef<T>[], firstRow: T | undefined): void {
  if (!firstRow) return;
  for (const col of columns) {
    if (col.sortable && !(col.field in (firstRow as object))) {
      throw new Error(
        `column "${col.field}" has sortable: true but is a synthetic field ` +
        `(no row[field] lookup). Synthetic columns MUST set sortable: false. ` +
        `To sort by a derived value, pre-compute it into the row data before ` +
        `passing to DataTable.`
      );
    }
  }
}
```

Hook this into `useDataTable` setup (one call after first non-empty data render; idempotent).

### Spec edits (deferred — land AFTER code)

- `specs/components/data-table.yaml` § ColumnDef.field — relax type, document contract
- `docs/specs/05-engine-specifications.md` § DataTable § ColumnDef contract relaxation — append entry
- `specs/components/data-table.yaml` changelog — add 0.6.0 entry

### Tests

- Tier 1: `field: string` synthetic key with `sortable: false` renders without throw
- Tier 1: `field: string` synthetic key with `sortable: true` throws on first non-empty render
- Tier 1: existing `field: keyof T` keys continue to work (regression — preserve all 0.4.0 ColumnDef behavior)
- Tier 2: storybook story showing a Profile-completeness column (matches employees-prism scenario from issue #25)

## Backward-compatibility analysis

| Surface                           | Change                            | BC?                                       | Risk                                                                      |
| --------------------------------- | --------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------- |
| `ColumnDef.field`                 | string & keyof T → string         | Type-widening (additive)                  | Consumers using `keyof T`-narrowed downstream code may need explicit cast |
| `ColumnDef.render` value param    | T[keyof T] \| undefined → unknown | Type-narrowing for typed-render consumers | Consumers destructuring the typed value need cast or guard                |
| `defaultSortComparator` key param | keyof T → string                  | Type-widening (additive)                  | None                                                                      |
| `sortable + synthetic field`      | silent wrong-sort → throw         | Behavior change                           | Catches a latent bug — net positive                                       |
| FilterBar molecule                | new export                        | Additive                                  | None                                                                      |
| `useFilterBarState` hook          | new export                        | Additive                                  | None                                                                      |

**Net assessment:** type-checker breakage possible at consumer recompile (`render` callback widening). Migration path: accept `unknown` and `as` cast or guard. Document in CHANGELOG.

## Out of scope (per analysis 03)

- Form engine changes (BLOCKING-1, BLOCKING-2)
- Layout engine consumer migration (H-2)
- `DataTableAdapter.filterDimensions` engine wiring (vapourware stays vapourware)
- Card / CardGrid atoms
- Typed renderer library (BadgeRenderer / FormattedDateRenderer / etc.)

## Estimated shard plan (for `/todos`)

1. **Shard 1: ColumnDef relaxation** — 4 type changes + runtime guard + Tier-1 tests + Tier-2 storybook story (~150 LOC, 1 session)
2. **Shard 2: useFilterBarState hook** — state machine + derivation + effective-fallback + Tier-1 tests (~200 LOC, 1 session)
3. **Shard 3: FilterBar molecule** — layout + 3 storybook shapes + Tier-1 tests + a11y (~250 LOC, 1 session)
4. **Shard 4: spec authority + CHANGELOG** — `data-table.yaml` + `filter-bar.yaml` + `_index.md` + `05-engine-specifications.md` + CHANGELOG entry + version bump 0.5.0 → 0.6.0 (~100 LOC across files, 0.5 session)

Three independent code shards. Shards 1 + 2 can run in parallel (no shared files). Shard 3 depends on Shard 2 (consumes `useFilterBarState` types). Shard 4 lands after all three to keep spec authority green.

Total: ~700 LOC across web/src/, ~3-4 sessions for `/implement`.

## Approval gate

- [ ] `/analyze` → human review of this plan
- [ ] `/todos` → split shards above into todos with spec-cite-back acceptance criteria
- [ ] `/implement` → 3 code shards (1+2 parallel, then 3) + 1 spec shard
- [ ] `/redteam` → adversarial sweep — verify orphan-detection compliance + spec-accuracy + storybook coverage of all 3 shapes
- [ ] `/codify` → if patterns are cross-cutting, add journal entries

## Decisions deferred to `/todos`

(None remaining — `/analyze` resolved them.)

- ✅ FilterBar = NEW spec file (not extending filter-panel.yaml). See analysis 01 § "Decisions for /todos" point 1.
- ✅ Third candidate inclusion = NO. See analysis 03 § Recommendation.
- ✅ Runtime contract for `field` relaxation = throw at first-render time (not warn). See analysis 02 § "Why throw, not warn".
