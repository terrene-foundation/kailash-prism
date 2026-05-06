# DataTable Engine (§5.1)

> Spec version: 0.1.0 | Status: DRAFT | Parent: [05 Engine Specifications](05-engine-specifications.md)

---

## 5.1 DataTable Engine

**Purpose**: Renders tabular data with sorting, filtering, pagination, selection, bulk actions, and virtual scrolling — fully configured from a column schema and data source.

### Props/Configuration

```typescript
interface DataTableConfig {
  // Column definitions
  columns: ColumnDef[];

  // Data source
  data: DataSource;

  // Sorting
  sorting?: {
    enabled: boolean; // Default: true
    mode: "single" | "multi"; // Default: "single"
    strategy: "client" | "server"; // Default: "client"
    defaultSort?: { field: string; direction: "asc" | "desc" };
  };

  // Filtering
  filtering?: {
    enabled: boolean; // Default: true
    globalSearch: boolean; // Default: true
    debounceMs: number; // Default: 300
    strategy: "client" | "server"; // Default: "client"
  };

  // Pagination
  pagination?: {
    enabled: boolean; // Default: true
    mode: "pages" | "infinite"; // Default: "pages"
    pageSizeOptions: number[]; // Default: [10, 25, 50, 100]
    defaultPageSize: number; // Default: 25
  };

  // Selection
  selection?: {
    enabled: boolean; // Default: false
    mode: "single" | "multi"; // Default: "multi"
    showSelectAll: boolean; // Default: true (only when mode: "multi")
  };

  // Bulk actions (shown when rows are selected)
  bulkActions?: BulkAction[];

  // Row behavior
  onRowClick?: "navigate" | "select" | "expand" | "none"; // Default: "none"
  expandable?: boolean; // Default: false
  expandContent?: (row: Row) => Component; // Render function for expanded row

  // Visual
  striped?: boolean; // Default: false
  bordered?: boolean; // Default: false
  compact?: boolean; // Default: false (reduces row height from 52px to 40px)
  stickyHeader?: boolean; // Default: true
  stickyColumns?: number; // Default: 0 (number of left columns pinned during horizontal scroll)

  // Column management
  resizableColumns?: boolean; // Default: false
  reorderableColumns?: boolean; // Default: false
  columnVisibility?: boolean; // Default: false (toggle column visibility menu)

  // Empty/loading/error
  emptyState?: Component; // Custom empty state. Default: EmptyState organism.
  loadingState?: Component; // Custom loading state. Default: Skeleton rows.
  errorState?: Component; // Custom error state. Default: AlertBanner.

  // Row identity (since 0.2.0)
  getRowId?: (row: Row, index: number) => string; // Stable id extractor. Fallback: row['id'] then index.
}

// Since 0.2.0: DataTableRow relaxed from `Record<string, unknown>` to
// `object` so typed interfaces without an `[key: string]: unknown` index
// signature are accepted directly.

interface ColumnDef<T extends object> {
  field: string & keyof T; // Data field key (typed).
  header: string; // Display header text.
  width?: number | "auto"; // Column width in px. "auto" fills remaining space.
  minWidth?: number; // Minimum width in px. Default: 80.
  maxWidth?: number; // Maximum width in px.
  sortable?: boolean; // Default: true when sorting.enabled is true.
  filterable?: boolean; // Default: true when filtering.enabled is true.
  filterType?:
    | "text"
    | "select"
    | "date"
    | "dateRange"
    | "number"
    | "numberRange"
    | "boolean";
  filterOptions?: string[]; // For "select" filterType: list of options.
  render?: (value: T[keyof T] | undefined, row: T) => Component; // Custom cell renderer. Since 0.2.0: `value` is typed as the field's value, not `unknown`.
  align?: "left" | "center" | "right"; // Default: "left".
  pinned?: "left" | "right" | null; // Pin column to left or right edge.
  hidden?: boolean; // Default: false. Initially hidden (user can toggle).
  priority?: number; // Default: 0. Controls responsive column hiding. Lower number = higher priority (shown on smaller viewports). Columns with priority >= the viewport threshold are hidden. Tablet threshold: 3. Mobile: all columns collapse to card view regardless of priority.
}

interface BulkAction {
  label: string;
  icon?: string;
  variant: "primary" | "destructive" | "ghost";
  onExecute: (selectedRows: Row[]) => void;
  confirmMessage?: string; // If set, shows confirmation dialog before executing.
}

type DataSource<T extends DataTableRow, TId = string> =
  | T[] // Static array — engine sorts/filters/paginates client-side
  | DataTableAdapter<T, TId>; // Since 0.3.0: capability-declaring adapter; engine forwards declared ops via fetchPage

// Canonical TypeScript surface — see `web/src/engines/data-table/types.ts:308`.
interface DataTableAdapter<T extends DataTableRow, TId = string> {
  // Stable identity for a row. Required. MUST be stable across paginations,
  // unique across the entire result set, and serializable to string.
  getRowId(row: T): TId;

  // Declare which query operations the backend supports natively. Required.
  // Read ONCE at mount; an adapter that needs to change capabilities at
  // runtime MUST be replaced with a new instance.
  capabilities(): DataTableCapabilities;

  // Single-page query — engine calls on mount and on every query state
  // change. Operations declared via capabilities() are forwarded as part of
  // the query; operations NOT declared are computed client-side from the
  // most recent fetchPage result. AbortSignal is supplied on `query.signal`
  // for fetch cancellation; stale responses are discarded by the engine.
  fetchPage(query: DataTableQuery): Promise<DataTablePage<T>>;
}

// `DataTableCapabilities`, `DataTableQuery`, `DataTablePage<T>` shapes —
// see `web/src/engines/data-table/types.ts` for the canonical TypeScript
// surface (capabilities-declaration model, paged-query semantics, page
// envelope with totalCount + cursor).
```

### Internal State

| State               | Type                                        | Description                                                 |
| ------------------- | ------------------------------------------- | ----------------------------------------------------------- |
| `rows`              | `Row[]`                                     | Currently visible rows (post-filter, post-sort, post-page). |
| `totalCount`        | `number`                                    | Total row count (pre-pagination).                           |
| `currentPage`       | `number`                                    | Current page number (1-indexed).                            |
| `pageSize`          | `number`                                    | Current page size.                                          |
| `sortState`         | `SortState[]`                               | Active sort columns with directions.                        |
| `filterState`       | `Record<string, FilterValue>`               | Active filter values keyed by field.                        |
| `globalSearchQuery` | `string`                                    | Current global search string.                               |
| `selectedRowIds`    | `Set<string>`                               | Currently selected row identifiers.                         |
| `expandedRowIds`    | `Set<string>`                               | Currently expanded row identifiers.                         |
| `loadingState`      | `"idle" \| "loading" \| "error" \| "empty"` | Data fetch state.                                           |
| `columnWidths`      | `Record<string, number>`                    | Current column widths (when resizable).                     |
| `columnOrder`       | `string[]`                                  | Current column order (when reorderable).                    |
| `visibleColumns`    | `Set<string>`                               | Currently visible column fields.                            |

### Events/Callbacks

| Event               | Payload                                           | When Emitted                                                      |
| ------------------- | ------------------------------------------------- | ----------------------------------------------------------------- |
| `onSort`            | `{ field: string; direction: "asc" \| "desc" }[]` | User clicks a sortable column header.                             |
| `onFilter`          | `Record<string, FilterValue>`                     | User changes any filter. Debounced by `filtering.debounceMs`.     |
| `onGlobalSearch`    | `string`                                          | User types in global search. Debounced by `filtering.debounceMs`. |
| `onPageChange`      | `{ page: number; pageSize: number }`              | User navigates to a different page or changes page size.          |
| `onSelectionChange` | `Row[]`                                           | Selection changes (row click, select all, deselect).              |
| `onRowClick`        | `Row`                                             | User clicks a row body (not action buttons).                      |
| `onRowExpand`       | `{ row: Row; expanded: boolean }`                 | User toggles row expansion.                                       |
| `onColumnResize`    | `{ field: string; width: number }`                | User finishes dragging a column resize handle.                    |
| `onColumnReorder`   | `string[]`                                        | User finishes dragging a column to a new position.                |
| `onBulkAction`      | `{ action: string; rows: Row[] }`                 | User executes a bulk action (after confirmation if configured).   |

### Composition Points

| Slot                  | Purpose                                                                    | Default                                            |
| --------------------- | -------------------------------------------------------------------------- | -------------------------------------------------- |
| `headerActions`       | Actions rendered in the table header bar (above the table, right-aligned). | None.                                              |
| `cellRenderer[field]` | Custom renderer for a specific column's cells.                             | Text display of field value.                       |
| `expandedRowContent`  | Content rendered below an expanded row.                                    | None (expandable must be true).                    |
| `emptyState`          | Replaces the default empty state.                                          | `EmptyState` organism with "No data" message.      |
| `loadingState`        | Replaces the default loading skeleton.                                     | 5 skeleton rows matching column layout.            |
| `errorState`          | Replaces the default error banner.                                         | `AlertBanner` with error message and retry button. |
| `bulkActionBar`       | Replaces the default bulk action toolbar shown when rows are selected.     | Row of `BulkAction` buttons with selection count.  |
| `footerContent`       | Additional content in the table footer alongside pagination.               | None.                                              |

### Performance Contract

- **Virtual scrolling**: Opt-in via the `virtualScroll={true}` prop (default `false`). When enabled, renders only visible rows plus `overscan` buffer (default 5 rows above and below viewport). Recommended for tables with > 100 rows; consumers control the activation threshold to avoid unexpected layout-shift or keyboard-navigation behavior changes when crossing the boundary. The Flutter implementation differs — see § Flutter Implementation Notes (`SliverList.builder` virtualizes automatically).
- **Row render budget**: Each visible row with default cell renderers MUST render in < 5ms (measured as React commit time or Flutter build time). Custom `cellRenderer` functions that exceed this budget are the consumer's responsibility, but the engine logs a warning when a cell render exceeds 10ms.
- **Sort/filter latency**: Client-side sort or filter on up to 10,000 rows MUST complete in < 100ms. Beyond 10,000 rows, the engine MUST use server-side strategy.
- **Selection**: Select All on 100,000 rows MUST complete in < 50ms (operates on IDs, not row data).
- **Initial render**: Table with 25 visible rows MUST render in < 50ms (excluding data fetch).
- **Horizontal scroll**: Pinned columns MUST remain visible during horizontal scroll without repaint jank.

### Accessibility Contract

- **Role**: `role="table"` (web), semantics table (Flutter).
- **Column headers**: `role="columnheader"` with `aria-sort="ascending|descending|none"` on sortable columns.
- **Keyboard navigation**: Arrow keys move between cells. Enter activates the current cell's action (sort header, select row, expand row). Tab moves to next interactive element within a cell.
- **Sort announcement**: Screen reader announces "Sorted by {column}, {direction}" when sort changes.
- **Selection**: Checkbox column uses standard checkbox semantics. Select All uses `aria-checked="mixed"` (indeterminate) when partial selection.
- **Filter**: Filter inputs have `aria-label` describing the column they filter. Global search has `aria-label="Search all columns"`.
- **Pagination**: Page navigation uses `nav` landmark with `aria-label="Pagination"`. Current page announced as "Page {n} of {total}".
- **Loading**: Table region has `aria-busy="true"` during data fetch. Screen reader announces "Loading data" and "Data loaded, {n} rows" on completion.
- **Empty**: Empty state has `role="status"` with descriptive message.

### Responsive Contract

| Breakpoint              | Behavior                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `wide` (1440px+)        | Full table with all visible columns. Horizontal scroll if columns exceed container width.                                                                                                                                                                                                                                                                                                        |
| `desktop` (1024-1439px) | Full table. Low-priority columns (configured via `hidden` at this breakpoint) may be hidden.                                                                                                                                                                                                                                                                                                     |
| `tablet` (768-1023px)   | Table with reduced columns. Columns with `priority >= 3` hidden (lower number = higher priority = shown). Horizontal scroll enabled.                                                                                                                                                                                                                                                             |
| `mobile` (0-767px)      | **Card list view**. Each row renders as a card showing: primary field as card title, secondary field as subtitle, up to 3 additional fields as label:value pairs, status field as badge, actions as icon buttons. The card layout is derived from column definitions: the first column becomes the title, the second becomes the subtitle, columns marked `pinned: "left"` appear as key fields. |

The mobile card layout schema:

```typescript
interface MobileCardLayout {
  title: string; // field name of first column
  subtitle: string; // field name of second column
  fields: string[]; // up to 3 additional field names (3rd through 5th columns)
  status?: string; // field name rendered as Badge (first column with filterType: "select")
  actions?: string[]; // action buttons from bulkActions
}
```

### Web Implementation Notes

- Built on `@tanstack/table` for headless table state management.
- Virtual scrolling via `@tanstack/virtual`.
- Data fetching via React Query (`useQuery` for reads, `useMutation` for bulk actions).
- Sorting/filtering state synced to URL search params for deep linking.
- Column resize via pointer events on resize handles; minimum drag distance: 4px.
- Column reorder via HTML drag-and-drop API with drop indicators.

### Flutter Implementation Notes

- Data displayed via custom `SliverList.builder` (not Flutter's built-in `DataTable` which does not virtualize).
- Virtual scrolling is automatic via `SliverList.builder` with `itemExtent` when row heights are uniform.
- Sort/filter state managed via Riverpod `StateNotifier`.
- Mobile card view uses `Card` widget with `ListTile`-derived layout.
- Column resize via `GestureDetector` on divider widgets.
- Horizontal scroll via nested `SingleChildScrollView(scrollDirection: Axis.horizontal)` wrapping the table body, while the header scrolls in sync via `ScrollController` linking.

---

### Change log

- **2026-05-06** — Spec accuracy correction: `DataSource<T>` union updated to reflect the 0.3.0 removal of `ServerDataSource<T>` and introduction of `DataTableAdapter<T, TId>`. The legacy `ServerFetchParams` interface was also removed in 0.3.0; queries now flow through `DataTableQuery` per `web/src/engines/data-table/types.ts:308`. Migration shim `adaptLegacy` is preserved at git ref `8489bc9:web/src/engines/data-table/adapter.ts` for pre-0.3.0 consumer port. Surfaced by `/sweep` Sweep 5 supplemental, 2026-05-06 (`SWEEP-2026-05-06.md`).
- **2026-05-06** — Spec accuracy correction: virtual scrolling reframed from "MUST activate when row count > 100" (auto-activate) to opt-in via `virtualScroll={true}` prop. The auto-activate MUST never matched shipped behavior — the prop default has been `false` since at least 0.2.0; consumers control activation to avoid unexpected layout-shift. Flutter behavior unchanged (`SliverList.builder` virtualizes automatically). Surfaced by `/sweep` Sweep 5 supplemental, 2026-05-06 (`SWEEP-2026-05-06.md`).
