# Migration M-03 — Documents page → Prism DataTable (findings)

**Scope**: Side-by-side migration of arbor's `/documents` (employment template
library) to `/documents-prism` using `@kailash/prism-web` 0.1.0. The bespoke
page stays untouched.

**Target repo**: `~/repos/terrene/contrib/arbor/apps/web/`
**Files created**:

- `src/app/(dashboard)/documents-prism/page.tsx` (456 LOC)
- `src/lib/prism-documents-datasource.ts` (80 LOC)
- `src/components/prism-document-card.tsx` (179 LOC)

**Type check**: `npx tsc --noEmit` — zero errors in the three new files.
(Pre-existing errors exist in `src/lib/prism-calculator-configs.ts` from the
parallel M-01 migration; those are the sibling agent's work and out of scope.)

---

## View-mode decision — Option A, and it was forced

**Picked**: Option A — use `DataTable` for list mode, bail out to a custom
card grid (Prism `Grid` primitive + local `PrismDocumentCard` molecule) for
grid mode. Both modes read from the same in-memory array, so toggling the
view never refetches.

**Why the other options failed**:

**Option B (extend DataTable's `ColumnDef` to support a card render mode)** —
ruled out by scope. M-03 is forbidden from editing Prism source; that is
M-04's job. Even if it were in scope, the fact that `useDataTable` ignores
its declared `ServerDataSource` contract entirely (see BLOCKING-1 below)
means Prism has bigger DataTable problems than a missing card mode. Fixing
the engine properly is a significant effort that M-04 should sequence
behind BLOCKING-1/2.

**Option C (single-column DataTable where each row is a card)** — this
"works" syntactically but breaks as soon as you want a responsive N-column
grid, because DataTable's table layout uses `tableLayout: fixed` with
column widths expressed in pixels. A card-grid fundamentally needs CSS
Grid's responsive columns, not a table's fixed columns. Any attempt to
shoehorn it produces a 1-column "grid" that collapses on mobile the wrong
way, plus you inherit table semantics (`role="grid"`, aria-rowcount,
header row) that lie about the content. Option C is genuine hack territory
and I rejected it on semantic grounds.

**Bonus Option D that I considered and rejected: hide the table body entirely
and render a sibling div.** Same problem as Option C — you're paying the
DataTable state-machine tax (sort, filter, pagination, selection) while
deliberately not using it for rendering. The cleaner architecture is to
separate "same data" from "same renderer" — let the data flow be shared
and let rendering be per-mode.

---

## Should DataTable have a built-in card-grid render mode?

**Recommendation: NO — composition with Grid primitives is the right
architecture, but Prism needs a `Card` atom and `CardGrid` molecule to make
that composition ergonomic.**

Rationale:

1. **Separation of concerns.** A DataTable's job is tabular state (sort,
   filter, paginate, select) over a rectangular dataset. A card grid's job
   is responsive spatial layout over a flat collection. They share "a list
   of things" but diverge on every other axis: a table wants fixed columns
   and row selection; a grid wants responsive column counts and per-card
   interaction. Merging them either bloats DataTable's API or forces the
   card-grid into table semantics that confuse screen readers.

2. **The coupling would be one-directional and wasted.** If DataTable owned
   a card-grid mode, every consumer that wanted a card grid would drag in
   the entire DataTable state machine (useDataTable: 369 LOC of
   sort/filter/select/page handlers). In the documents case we disabled
   DataTable's global search and filtering because the page already has its
   own filter UI — the state machine was dead weight even for list mode.

3. **What's actually missing is the atoms.** The painful part of writing
   grid mode wasn't "DataTable doesn't support it" — it was "I had to write
   200 LOC of card styling and grid composition from scratch because Prism
   ships no `Card` atom and no `CardGrid` molecule." If those existed, the
   grid-mode branch in `documents-prism/page.tsx` would be a 10-line
   `<CardGrid items={rows} renderCard={(r) => <DocCard t={r}/>} />`.

4. **The adapter interface benefits from the split.** Sketching the
   DataTableAdapter (below) was much cleaner knowing that the adapter only
   has to feed row data and action handlers — not a render-mode parameter.

**Architectural conclusion**: DataTable stays tabular. A new `Card` atom
and `CardGrid` molecule land in Prism (see "New Prism atoms/molecules
needed"). The page composes whichever it wants and shares the datasource.
This matches how the whole Prism engine model works — small atoms, small
molecules, bigger engines only where state machines are genuinely shared.

---

## What worked

- **`DataTable.columns[].render`** — the per-cell render callback is
  perfect for injecting `Badge`, `Button`, and multi-line content without
  stringifying. Row actions (Preview/Generate Link+Button) slotted into the
  `id` column's `render` cleanly.
- **`Grid` layout primitive with ResponsiveValue** — `columns={{ mobile:
1, tablet: 2, desktop: 3 }}` gave us the exact bespoke-grid responsive
  behavior with zero CSS.
- **Client-side `data={T[]}` path** — fetching once in the page and handing
  DataTable a plain array means the list view and the grid view see
  identical filtered data with no coordination work.
- **`Badge` + `Button` atoms** — drop-in replacements for arbor's bespoke
  `AppButton`/span-as-chip. They consume theme tokens, so the page looks
  consistent with the rest of a Prism-themed app automatically.
- **`VStack` / `Row` spacing primitives** — cleaner than ad-hoc
  `className="space-y-6"` and survive arbor's Tailwind config changes
  because they use inline style + tokens.

## What didn't

- **`ServerDataSource<T>` is declared but dead.** The biggest friction
  point: `DataTableConfig.data` is typed as `T[] | ServerDataSource<T>`,
  so a naive reading of the type says "pass me a fetcher, I'll fetch."
  But `useDataTable` literally does `const isClientSide =
Array.isArray(data); const clientData = isClientSide ? data : [];` and
  NEVER calls `fetchData`. If you pass a `ServerDataSource`, the table
  silently shows "0 of 0" forever. Had to invent my own fetcher module
  outside DataTable and hand DataTable an array. See BLOCKING-1.

- **No loading / error / empty-with-filter gradient from DataTable.**
  DataTable's `loading`, `error`, and `emptyState` props exist, but they
  only render inside the table chrome. For grid mode I needed to render the
  same three states OUTSIDE a DataTable — which means the states have to
  live at the PAGE level, not the engine level. The page ended up owning
  all three states and DataTable's built-in states went unused. A reusable
  `DataStates` component (or an `emptyState`/`loadingState` slot exported
  separately from DataTable) would solve this.

- **View-toggle state management — engine got in the way.** DataTable keeps
  its sort/filter/page state INSIDE `useDataTable`, not in the config. That
  means when the user toggles from list to grid, the sort state vanishes
  because the DataTable unmounts. For the documents case that's
  acceptable — you don't sort a card grid — but if the user expects the
  sort to survive the toggle, you have to lift state out of the engine
  first, which isn't supported today. `useDataTable` doesn't take an
  initial sort from props and doesn't expose a way to reset.

- **Global search lives in two places.** DataTable renders its own search
  input when `filtering.globalSearch !== false`. For this page I wanted the
  search UI in the filter bar alongside the category chips (unified filter
  row), so I had to set `filtering={{ enabled: false, globalSearch: false
}}` and wire my own search input to an external filter pipeline. That
  left DataTable's internal `globalSearch` state machine running but
  unused — wasted work. A "bring your own filter bar" pattern would help.

- **Column `field: string & keyof T` with typed rows.** `DataTableRow =
Record<string, unknown>` is too permissive: a `ColumnDef<T>` where `T` is
  a typed interface without an index signature is NOT assignable to
  `ColumnDef<T & Record<string, unknown>>` without explicitly widening T.
  I worked around it by declaring `type DocumentTemplateRow =
DocumentTemplate & DataTableRow` — a type intersection rather than a
  cast. It compiles cleanly but forces every consumer to know this trick.
  A looser constraint (`T extends object`) would be nicer.

- **No `id` field type safety.** DataTable's `getRowId` prefers `row['id']`
  if present, otherwise uses the index. `DocumentTemplate.id` is a
  `number`, which becomes `String(1)` internally — fine, but there's no
  way to tell DataTable "this is the PK, use it" declaratively. For a
  typed API this is an avoidable surprise.

- **No DataTable "action column" affordance.** The Actions column is just
  a render callback. There's no concept of per-row action buttons as a
  first-class column type, so I ended up styling a flex-row of `Link +
Button` by hand. A `rowActions: Action[]` slot on `DataTableConfig` would
  collapse ~30 LOC and standardize keyboard nav (right now each row has
  two focusable buttons that aren't announced as a group).

---

## Proposed `DataTableAdapter` interface sketch (compare with M-02)

Based on both the documents case and what I expect M-02 (payslips) to
surface, here's the adapter contract I'd propose:

```typescript
/**
 * DataTableAdapter<T> — consumed by a DataTable engine the way
 * ChatAdapter is consumed by ConversationTemplate. One interface, so every
 * list-shaped page in an app gets the same fetch/filter/action surface.
 */
export interface DataTableAdapter<T, TId = string | number> {
  /**
   * Fetch a page of rows.
   *
   * - params.page / params.pageSize drive pagination
   * - params.sort encodes multi-column sort state (field + direction)
   * - params.filters is the typed column filter map
   * - params.globalSearch is a free-text query
   * - params.category / params.tag / arbitrary dimension filters go into
   *   `params.dimensions` so the adapter can translate to backend-specific
   *   query params without leaking backend shape
   */
  fetchPage(params: DataTableFetchParams): Promise<DataTablePage<T>>;

  /** Stable row-id extractor (replaces DataTable's `row['id']` guessing) */
  getRowId(row: T): TId;

  /**
   * Declarative per-row actions. Engine renders these in an "actions"
   * column OR on a card's footer, depending on render mode. No more
   * open-coded render callbacks with Link + Button pairs.
   */
  rowActions?: ReadonlyArray<DataTableRowAction<T, TId>>;

  /**
   * Declarative bulk actions. Engine shows a bulk-action bar when rows are
   * selected. Exists on DataTable today; moving it to the adapter means
   * the same shape describes both single-row and multi-row operations.
   */
  bulkActions?: ReadonlyArray<DataTableBulkAction<T, TId>>;

  /**
   * Filter dimensions the adapter supports. Drives a generated filter
   * bar (chips or dropdowns) that the consumer can render via the engine,
   * or replace wholesale with a custom filter UI. Either way the engine
   * knows what dimensions the adapter understands.
   */
  filterDimensions?: ReadonlyArray<FilterDimension>;

  /** Invalidate caches — used by rowAction handlers after mutation */
  invalidate?(): Promise<void>;
}

export interface DataTableFetchParams {
  page: number;
  pageSize: number;
  sort: ReadonlyArray<{ field: string; direction: "asc" | "desc" }>;
  filters: Readonly<Record<string, string>>;
  globalSearch: string;
  dimensions: Readonly<Record<string, string>>;
}

export interface DataTablePage<T> {
  items: ReadonlyArray<T>;
  totalCount: number;
  /** Optional cursor for cursor-based pagination backends */
  nextCursor?: string;
}

export interface DataTableRowAction<T, TId> {
  /** Stable id — used for aria + keyboard nav */
  id: string;
  /** Display label */
  label: string;
  /** Icon (optional) */
  icon?: ReactNode;
  /** Visual variant */
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  /** Navigation target (renders as link) — takes precedence over onExecute */
  href?: (row: T) => string;
  /** Imperative handler (renders as button) */
  onExecute?: (row: T, id: TId) => void | Promise<void>;
  /** Conditionally hide per-row (e.g. "Delete" hidden on system rows) */
  visible?: (row: T) => boolean;
  /** Conditionally disable per-row */
  disabled?: (row: T) => boolean;
}

export interface DataTableBulkAction<T, TId> {
  id: string;
  label: string;
  variant: "primary" | "secondary" | "ghost" | "destructive";
  onExecute: (rows: ReadonlyArray<T>, ids: ReadonlyArray<TId>) => void | Promise<void>;
  /** Minimum/maximum selection to enable the action */
  minSelection?: number;
  maxSelection?: number;
}

export interface FilterDimension {
  /** Unique id used in fetch params (`dimensions[id] = selectedValue`) */
  id: string;
  /** Display label */
  label: string;
  /** "All" sentinel — when selected, dimension is omitted from fetch params */
  allLabel?: string;
  /**
   * Option source. Either a static list OR a loader (so categories can
   * come from a real API instead of being hardcoded).
   */
  options: ReadonlyArray<string> | (() => Promise<ReadonlyArray<string>>);
  /** UI hint: "chips" for small N, "select" for larger N, "search" otherwise */
  ui?: "chips" | "select" | "search";
}
```

### How the documents page would have looked with this adapter

```typescript
const adapter: DataTableAdapter<DocumentTemplate, number> = {
  fetchPage: async ({ dimensions, globalSearch }) => {
    const all = await documentsApi.listTemplates(dimensions.category);
    const filtered = applySearch(all.templates, globalSearch);
    return { items: filtered, totalCount: filtered.length };
  },
  getRowId: (t) => t.id,
  filterDimensions: [
    {
      id: "category",
      label: "Category",
      allLabel: "All",
      options: async () => deriveCategories(await documentsApi.listTemplates()),
      ui: "chips",
    },
  ],
  rowActions: [
    { id: "preview", label: "Preview", variant: "ghost",
      href: (t) => `/documents/${t.id}/preview` },
    { id: "generate", label: "Generate", variant: "primary",
      href: (t) => `/documents/${t.id}/generate` },
  ],
};
```

That's ~30 LOC of adapter + ~20 LOC of page shell instead of the ~450 LOC
we had to write today. The page-level filter/search/view state becomes a
small controller around `adapter + useDataTable`.

### Things the documents case revealed that payslips (M-02) probably won't

- **Dimension filters with async options.** Payslips are probably filtered
  by date range and status — known static domains. Documents need the
  category list derived from real data (we cannot hardcode because arbor
  may add a new category server-side and we'd silently drop it).
- **View mode as a first-class concern.** Payslips want a list only.
  Documents want both. The adapter above deliberately does NOT encode view
  mode — it's a page concern. The adapter feeds the data; the page picks
  the renderer.
- **Per-row actions with navigation (not just imperative).** Payslips may
  have "Download" as a pure-imperative action. Documents need both
  "Preview" (nav) and "Generate" (nav to a form) — supporting `href` as
  well as `onExecute` on row actions is required.

---

## New Prism atoms / molecules needed

### 1. `Card` atom (NEW)

Shape:

```typescript
export interface CardProps {
  /** Accessible label (used if no title) */
  "aria-label"?: string;
  /** Optional title — rendered as h-level determined by `level` prop */
  title?: ReactNode;
  /** Optional subtitle / category */
  subtitle?: ReactNode;
  /** Optional leading visual (icon, avatar, thumbnail) */
  media?: ReactNode;
  /** Main body content */
  children: ReactNode;
  /** Optional footer slot for actions */
  actions?: ReactNode;
  /** Heading level for the title. Default: 3 */
  level?: 2 | 3 | 4 | 5 | 6;
  /** Variant: standard, outlined, elevated. Default: outlined */
  variant?: "standard" | "outlined" | "elevated";
  /** Click handler — if present, entire card becomes a button */
  onClick?: () => void;
  /** Link target — if present, entire card becomes a link */
  href?: string;
  className?: string;
}
```

Justification: we re-implemented this in `prism-document-card.tsx`. Every
list/grid page needs it. The cards in arbor's `/documents`, `/advisory`
conversation list, `/contracts` list, `/my-payslips` are all variations of
the same shape. A single atom collapses ~150 LOC per consumer to ~30 LOC.

### 2. `CardGrid` molecule (NEW)

Shape:

```typescript
export interface CardGridProps<T> {
  items: ReadonlyArray<T>;
  renderCard: (item: T, index: number) => ReactNode;
  /** Responsive column count */
  columns?: number | ResponsiveValue<number>;
  /** Gap between cards */
  gap?: number;
  /** Empty state slot */
  emptyState?: ReactNode;
  /** Loading state slot */
  loadingState?: ReactNode;
  /** Error state slot */
  errorState?: ReactNode;
  /** Current state. Default: infer from items */
  status?: "idle" | "loading" | "empty" | "error";
  /** Key extractor — required because items are generic */
  getKey: (item: T, index: number) => string | number;
  "aria-label"?: string;
  className?: string;
}
```

Justification: Prism's `Grid` primitive handles columns beautifully but
knows nothing about items, keys, or state. Every card-grid consumer
duplicates the `{items.map(renderCard)}` pattern AND the empty/loading/
error branches. CardGrid owns that pattern and matches DataTable's
state-machine contract for consistency.

### 3. `FilterBar` molecule (NEW, stretch)

Shape:

```typescript
export interface FilterBarProps {
  /** Filter dimensions — drives chip rows, selects, or search */
  dimensions: ReadonlyArray<FilterDimension>;
  /** Current dimension values */
  values: Readonly<Record<string, string>>;
  /** Called when any dimension changes */
  onChange: (values: Record<string, string>) => void;
  /** Global search query */
  globalSearch?: string;
  /** Called when search changes */
  onGlobalSearchChange?: (query: string) => void;
  /** Show the search input. Default: true */
  showSearch?: boolean;
  /** Search placeholder */
  searchPlaceholder?: string;
  className?: string;
}
```

Justification: today every Prism page that needs filtering re-implements
chip rows + search input. Moving the whole filter bar into a molecule AND
aligning it with the DataTableAdapter's `filterDimensions` means a page
can be "adapter + template + filter bar, done."

---

## Prism blocking gaps (M-04)

### [BLOCKING-1] `useDataTable` ignores `ServerDataSource.fetchData`

**What's broken**: `DataTableConfig.data` accepts `T[] | ServerDataSource<T>`,
but `useDataTable` does:

```typescript
const isClientSide = Array.isArray(data);
const clientData = isClientSide ? data : [];
```

If the consumer passes a `ServerDataSource`, the hook treats it as "empty
array" and `fetchData` is never invoked. No warning, no error, no loading
state — just silent "0 of 0". This is a Rule 2 stub from
`zero-tolerance.md`: a declared API that ships with no implementation.

**Fix**: `useDataTable` MUST call `fetchData` when `!isClientSide`. On
mount, on sort change, on filter change, on page change, on global search
change, with all four in the params. Result goes into local state;
`loading` / `error` surfaced via the existing `loading` / `error` config
fields (or auto-managed when the data source is server-side). A small
abort controller should cancel in-flight requests on param change to
avoid race conditions.

The documents page works around this today by fetching in the page
component and handing DataTable a concrete array. That workaround is
acceptable for one page but blocks every page that wants
server-paginated data (which is all of them at scale).

### [BLOCKING-2] DataTable state is not liftable

**What's broken**: sort, filter, pagination, selection state all live
inside `useDataTable`. Consumers cannot:

- Set an initial sort from an external source (e.g. URL search params)
- Read out the current sort (for deep-linking)
- Reset state programmatically
- Share state between two DataTable instances (e.g. a primary table and a
  "selected items" preview)

DataTable emits `onSort` / `onFilter` / `onPageChange` / `onSelectionChange`
as fire-and-forget callbacks, but there's no way to drive the state the
other direction. The documents page doesn't need this today, but the
view-mode toggle issue is a symptom of the same root cause: state lives
where it can't be reached.

**Fix**: split `useDataTable` into a pure state hook
(`useDataTableState`) and a config-bound version
(`useDataTable(config)`). Expose `state` and `setState` from
`useDataTableState` so consumers can lift state up, persist to URL, or
coordinate across trees.

### [BLOCKING-3] Typed row types require intersection workaround

**What's broken**: `ColumnDef<T extends DataTableRow>` where `DataTableRow
= Record<string, unknown>` rejects any concrete interface without an
index signature. Consumers must write `type XRow = X & DataTableRow` to
get type-safe rendering. See "Column `field: string & keyof T`" under
"What didn't."

**Fix**: loosen the constraint to `T extends object` OR remove the index
signature requirement from `DataTableRow` entirely. `render(value: unknown,
row: T)` already gives the consumer the typed row; widening the generic is
safe.

---

## Prism non-blocking gaps (/codify)

### [NON-BLOCKING-1] No `Card` atom or `CardGrid` molecule

Covered above under "New Prism atoms/molecules needed." Not a blocker
because consumers CAN write their own card components; every migration
that uses grid mode just duplicates ~150 LOC. Codify should track this as
"required for M-04 wave 2" (after the engine fixes land).

### [NON-BLOCKING-2] No declarative `rowActions` on DataTable columns

Today actions are `render` callbacks returning Link+Button markup.
Declarative `rowActions: DataTableRowAction<T>[]` (see adapter sketch)
would standardize keyboard nav, accessibility, and visual rhythm across
every list page. Not blocking because the render-callback escape hatch
works.

### [NON-BLOCKING-3] DataTable search and FilterBar duplication

DataTable ships its own global search, but pages with their own filter
bar (documents, payslips likely, advisory tables) disable it and re-wire
manually. Either DataTable should expose a "bring your own filter bar"
prop (`externalFilters: boolean`) or the FilterBar molecule proposal
should ship, making the search a fully external concern. Not blocking
today — `filtering={{ enabled: false, globalSearch: false }}` is the
workaround.

### [NON-BLOCKING-4] Loading / error / empty states are DataTable-internal

For grid mode you have to re-render the same three states outside a
DataTable. A reusable `DataStates` component (or a shared hook
`useDataState({ status, onRetry, emptyMessage })`) would eliminate the
copy-paste. Not blocking — the three states are ~30 LOC total.

### [NON-BLOCKING-5] `DataTableConfig.className` not passed to <table>

Consumers who want to style the table via CSS class (not inline style)
find that `className` is applied to the outer wrapper, not the table
element. Not blocking because the atoms consume theme tokens and the
wrapper gets the class, but it's a surprise.

### [NON-BLOCKING-6] `onPageSizeChange` resets to page 0 silently

`useDataTable.handlePageSizeChange` calls `setPage(0)` without firing
`onPageChange` first. Consumers persisting the page to URL will observe a
phantom "page went to 0" that wasn't the user's explicit action. Benign,
but worth documenting.

---

## Closing note

The DataTable engine is close to production-ready for typed, paginated
list pages — but the server-side fetch is the primary blocker, and
without it the entire type-level ServerDataSource contract is vapor.
M-04 should treat BLOCKING-1 as the first fix, BLOCKING-2 second
(because lifting state unblocks URL-state integration and view-mode
persistence), and BLOCKING-3 third (because every typed consumer wants
it). The Card/CardGrid/FilterBar molecules come in a second M-04 wave
after the engine stabilizes.

The documents migration itself is functional at `/documents-prism` and
matches the bespoke `/documents` for list + grid + filter + search +
navigation. The only regression is that DataTable doesn't carry
compliance-note callouts in list mode (the bespoke list also doesn't),
so no visual loss.

---

## Behaviour deviations (added 2026-04-14, M-08 convergence)

Per `rules/specs-authority.md` MUST Rule 6, documents-page behaviour deltas
between the bespoke `/documents` and the prism `/documents-prism` routes are
logged here.

### Row-click navigation in list view (H3 from wave-2 red team) — FIXED

- **Pre-fix**: Bespoke list view wraps each row in `<Link href=.../preview>` so clicking anywhere on the row navigates to preview. The prism list view left `onRowClick` unset, making the row body inert — users had to click the "Preview" or "Generate" button specifically.
- **Fix landed**: `documents-prism/page.tsx` passes `onRowClick={(row) => router.push(/documents/${row.id}/preview)}` to `<DataTable>`. Imports `useRouter` from `next/navigation`.
- **Disposition**: parity restored. Clicking the row body now navigates to preview; the action buttons remain individually focusable for keyboard users.

### Search scope reverted to name + description (M4 from wave-2 red team) — FIXED

- **Pre-fix**: `applyClientFilters` matched `name | description | category`. Searching "Contracts" matched every row in the Contracts category, not just rows whose name/description mentioned contracts — a silent widening vs bespoke.
- **Fix landed**: `prism-documents-datasource.ts::applyClientFilters` drops the `category` field from the substring match. Category filtering remains available via the chip row.
- **Disposition**: parity restored. Users comparing the two routes see identical search results for the same query.

### Category filter order — curated first (M5 from wave-2 red team) — FIXED

- **Pre-fix**: `deriveCategories` returned `All, ...sorted alphabetically`. Bespoke hard-codes `["All", "Contracts", "Policies", "Letters", "Forms"]`.
- **Fix landed**: `deriveCategories` now emits `["All", ...known in CURATED_CATEGORY_ORDER, ...unknown alphabetical]`. Known categories match bespoke order; unknown categories (future backend additions) are appended alphabetically as a safety net.
- **Disposition**: parity restored. Filter row matches bespoke; new categories still show up without code changes.

### Error message sanitisation (S2 from wave-2 security red team) — FIXED

- **Pre-fix**: `fetchAllDocumentTemplates` rejection surfaced `err.message` verbatim.
- **Fix landed**: `documents-prism/page.tsx` uses `sanitizeErrorMessage(err)`.
- **Disposition**: backend error bodies never reach the UI banner.
