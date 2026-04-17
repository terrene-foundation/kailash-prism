# @kailash/prism-web — Changelog

All notable changes to the Prism web engine package are documented here.

## 0.3.0 — 2026-04-18 — ServerDataSource removed (Shard 3 of 0.3.0 wave)

BREAKING: `ServerDataSource<T>`, `ServerFetchParams`, `ServerFetchResult`,
`adaptLegacy()`, and `isServerDataSource()` are removed from the public
surface. `DataTableConfig.data` now accepts only `T[] | DataTableAdapter<T>`.

### Why remove

`ServerDataSource` shipped in 0.1.x as a public type whose `fetchData`
method was never invoked by the engine (the M-02 / M-03 orphan finding).
0.2.0 wired the method as a stopgap. 0.2.2 introduced the canonical
`DataTableAdapter` and kept `ServerDataSource` as a deprecated shimmed
shape. 0.3.0 finishes the deprecation — Prism is pre-1.0, and per the
migration plan in `docs/specs/05-engine-specifications.md` § 5.1.1, minor
releases may break public API.

### Migration

The 0.2.2 CHANGELOG cheatsheet applies verbatim:
```diff
- const dataSource: ServerDataSource<Doc> = {
-   fetchData: async (params) => { /* ... */ return { items, totalCount }; },
- };
+ const adapter: DataTableAdapter<Doc> = {
+   getRowId: (row) => String(row.id),
+   capabilities: () => ({ serverPagination: true, globalSearch: true }),
+   fetchPage: async (query) => { /* ... */ return { rows, totalCount }; },
+ };
```

Field-name changes: `items` → `rows` (on the return shape); `fetchData`
→ `fetchPage` (method name). `params.sort` / `params.filters` /
`params.globalSearch` fields are unchanged. The engine's `getRowId`
fallback (`row['id']` → index) still applies when the adapter returns
null/undefined/empty, so forgetting to wire `getRowId` degrades gracefully
rather than breaking.

Consumers who need the `adaptLegacy()` shim in one-off migrations can
copy the 30-LOC helper from git history (`git show 8489bc9:web/src/engines/data-table/adapter.ts`)
into their own code. Having engine-side code path diverge from external
code path was the whole reason the shim existed — at this point every
new consumer writes a `DataTableAdapter` directly.

### Test suite

- Deleted `web/src/__tests__/regression/server-data-source-wiring.test.ts`
  in the SAME PR as the API removal (orphan-detection Rule 4 — test
  files that import removed symbols become collection-time orphans).
- Deleted 4 adaptLegacy-specific cases from `data-table-adapter.test.tsx`.
- Adapter test suite: 20 cases (down from 24 in 0.2.2); full suite:
  264 tests (down from 270).

### Not breaking

- Plain array data (`T[]`) — unchanged.
- `DataTableAdapter<T>` — unchanged from 0.2.2.
- Every component / engine besides DataTable — unchanged.
- Hook result shape (`useDataTable()`) — unchanged from 0.2.2.

## 0.2.2 — 2026-04-18 — DataTableAdapter (Shard 2 of 0.3.0 wave)

Adds the `DataTableAdapter<T, TId>` interface + `adaptLegacy` shim, closing
the M-02 / M-03 BLOCKING-1 finding. The deprecated `ServerDataSource` shape
is now internally lifted to the adapter form via a shim; external consumers
continue to work unchanged. `ServerDataSource` is removed in 0.3.0 (Shard 3).

The adapter parallels `FormAdapter` (§ 5.2.2) — required core + optional
extensions, all plain-async. One interface owns every dimension of a list
page: identity, capability declaration, paging, row/bulk actions, cache
invalidation.

### DataTable engine

- **D5 (feat)**: `DataTableAdapter<T, TId>` interface exported from
  `@kailash/prism-web`. Seven methods: `getRowId`, `capabilities`,
  `fetchPage` (required); `onRowActivate`, `rowActions`, `bulkActions`,
  `invalidate` (optional). `filterDimensions` and `subscribe` reserved
  for 0.4.0 when the faceted-filter UI / live-update pipeline land.
- **D6 (feat)**: `DataSource<T>` union widened to
  `T[] | ServerDataSource<T> | DataTableAdapter<T>`. The legacy
  `ServerDataSource` is shimmed internally via `adaptLegacy()` so the
  hook's body only handles two cases (array / adapter).
- **D7 (feat)**: `adapter.rowActions` renders a trailing actions column
  when declared. Each action is an `<a>` (if `href` supplied) or
  `<button>` (if `onExecute` supplied). Keyboard focus order matches
  declaration order; `visible` / `disabled` predicates honored per row.
  Action clicks call `event.stopPropagation()` so they don't trigger
  `onRowActivate` / `onRowClick`.
- **D8 (feat)**: `adapter.bulkActions` merged with
  `DataTableConfig.bulkActions` in the bulk-action toolbar — adapter's
  actions come first, then config's, so consumers can EXTEND (not
  override) the adapter's declared set.
- **D9 (feat)**: `adapter.onRowActivate` takes precedence over
  `DataTableConfig.onRowClick`. Both fire on row click and Enter keyboard
  activation.
- **D10 (feat)**: Row-action / bulk-action `onExecute` returns (sync or
  Promise). Engine awaits the promise, calls `adapter.invalidate?.()`,
  then forces a refetch by bumping the internal retry tick.
- **D11 (public)**: New public exports —
  `adaptLegacy(source: ServerDataSource<T>): DataTableAdapter<T>`,
  `isDataTableAdapter(data)`, `isServerDataSource(data)`,
  `resolveDataSource(data)`. Consumers migrating incrementally can lift
  their ServerDataSource manually via `adaptLegacy(source)` before the
  0.3.0 removal.
- **D12 (safety)**: Engine sanitizes `action.href(row, id)` return values
  before rendering as `<a href=...>`. Allowed schemes: `http:`, `https:`,
  `mailto:`, `tel:`, relative paths (`/`, `?`, `#`). All other schemes
  (including `javascript:`, `data:`, and whitespace-padded variants)
  rewrite to `#` so a compromised backend field flowing through
  `href: row => row.externalUrl` cannot trigger click-to-XSS.
- **D13 (safety)**: `adaptLegacy` assigns stable synthetic row ids via a
  per-shim WeakMap when `row['id']` is null/undefined. Legacy rows without
  an `id` field no longer collapse to the same selection key — each row
  object gets a distinct synthetic id that survives re-fetches as long as
  the row object identity is preserved.
- **D14 (safety)**: `adapter.invalidate()` rejections are caught and
  surfaced through `serverError` (bounded to 500 chars). The refetch
  still fires so the UI never strands with stale rows + no error signal.
  `adapter.fetchPage` errors are also truncated to 500 chars before
  entering the error banner.

### Migration notes

- **No breaking changes in 0.2.2.** `ServerDataSource<T>` marked
  `@deprecated` via JSDoc with a pointer to `DataTableAdapter`.
- **Legacy-to-adapter migration cheatsheet** (one-shot refactor per page):
  ```diff
  - const dataSource: ServerDataSource<Doc> = {
  -   fetchData: async (params) => { /* ... */ return { items, totalCount }; },
  - };
  + const adapter: DataTableAdapter<Doc> = {
  +   getRowId: (row) => String(row.id),
  +   capabilities: () => ({ serverPagination: true, globalSearch: true }),
  +   fetchPage: async (query) => { /* ... */ return { rows, totalCount }; },
  +   rowActions: [{ id: 'preview', label: 'Preview', href: (row, id) => `/docs/${id}` }],
  + };
  ```
- **`data-table.yaml` bumped to 0.2.2** — changelog entry + new prop
  (adapter accepted via `data:`).
- **Hook result new fields**: `UseDataTableResult` gains `onRowActivate`,
  `rowActions`, `adapterBulkActions`, `executeRowAction`,
  `executeBulkAction`. Consumers pattern-matching on the hook result via
  `Object.keys(result)` will see five new keys; typed consumers get them
  in autocomplete.

## 0.2.1 — 2026-04-18 — FormAdapter (Shard 1 of 0.3.0 wave)

Adds the `FormAdapter<TValues, TResult>` interface, closing the M-01
BLOCKING-2 finding. Forms with a post-submit result display (calculators,
"generate" endpoints, any request/response shape) no longer require the
consumer to re-implement the `{values, result}` state machine around
`onSubmit`. Non-breaking — `onSubmit` remains supported.

### Form engine

- **F5 (feat)**: `FormAdapter<TValues, TResult>` interface exported from
  `@kailash/prism-web`. Five methods: `initialValues?()`, `validate?()`,
  `submit()`, `renderResult?()`, `onReset?()`. Parallel to `ChatAdapter` —
  one interface, optional methods express capability.
- **F6 (feat)**: `FormConfig.adapter?: FormAdapter` accepts a domain
  adapter. When present, Form calls `adapter.initialValues?()` on mount
  to seed defaults, runs `adapter.validate?()` as async cross-field
  validation, invokes `adapter.submit()` on submission, caches the
  `{values, result}` internally, and renders `adapter.renderResult?()`
  below the form. Editing after a successful submit clears the cached
  result automatically.
- **F7 (feat)**: `FormConfig.onSubmit` is now optional. Forms MUST supply
  either `onSubmit` OR `adapter`; passing neither throws a dev-mode
  Error with actionable message. Passing both emits a dev-mode
  `console.warn` (at most once per instance) and the adapter wins
  (adapter path is never silently skipped).
- **F8 (safety)**: `adapter.submit` / `adapter.validate` post-await
  branches are unmount-safe. If the component unmounts mid-submit (slow
  payroll endpoints, user navigates away), the engine bails out before
  dispatching on a stale reducer or writing to a detached DOM node.
- **F9 (safety)**: Submit-error messages surfaced to the banner are
  sanitized by the engine — ASCII control characters stripped (prevents
  aria-live log-injection), messages truncated to 500 chars with
  trailing ellipsis. Adapter errors still propagate verbatim to the
  catch; consumers can layer domain-specific sanitation on top.
- **F10 (safety)**: `adapter.initialValues()` rejections emit a dev-mode
  `console.error` instead of silently falling back. The form still
  renders with field defaults so the user has a usable input surface.
- **F11 (safety)**: `adapter.initialValues()` is resolved exactly once
  per Form instance (useRef guard). Inline-adapter consumers
  (`<Form adapter={new MyAdapter()} />`) no longer generate a request
  loop on every parent render.

### Migration notes

- Existing `onSubmit`-only forms continue to work with zero source
  changes. The three TypeScript compatibility impacts:
  1. `FormConfig.onSubmit` narrowed from required to optional; callers
     that destructure `onSubmit` from a `FormConfig` will get
     `((values) => void | Promise<void>) | undefined` instead of the
     required form. This is source-compatible for every construct-site
     in the wild.
  2. `FormState.submission: FormSubmission | null` is a new state field.
     Tests that snapshot the full state object MUST add `submission:
     null` to their expected shape; typed consumers of `FormState` will
     see the new field in autocomplete but existing code compiles.
  3. The `SET_SUBMISSION` reducer action is new. Consumers that
     pattern-match on `FormAction` via `switch` without a `default`
     clause MUST add a handler — TypeScript's exhaustiveness checker
     flags the gap.

## 0.2.0 — 2026-04-14 — M-04 arbor pilot remediation

Remediation pass for three parallel arbor migrations (M-01 calculators,
M-02 my-payslips, M-03 documents). Fixes the `ServerDataSource` orphan
surfaced independently by M-02 and M-03, plus the minimum set of Form and
DataTable API refinements required to unblock future pilots.

### DataTable engine

- **D1 (fix)**: `useDataTable` now actually invokes
  `ServerDataSource.fetchData()` on mount and on every state change
  (page / sort / filter / search). Previously the type surface declared a
  server adapter contract but the hook only processed array data. Fix
  includes:
  - Loading and error lifecycle auto-managed via `serverLoading` /
    `serverError` / `retryServerFetch` fields on `useDataTable` return.
  - `AbortController` cancellation on param change, with monotonic
    sequence filtering so stale responses never overwrite live state.
  - Automatic page clamping when the server's `totalCount` shrinks below
    the current page offset.
  - New regression test
    `web/src/__tests__/regression/server-data-source-wiring.test.ts`
    (4 test cases). Refs M-02 BLOCKING-1, M-03 BLOCKING-1.
- **D2 (feat)**: `DataTableConfig.getRowId?: (row, index) => string` config
  hook. The default falls back to `row['id']` then to the row index
  (unchanged behaviour for existing consumers). Unblocks consumers with
  `payslip_id`, `document_uuid`, or composite primary keys. Refs
  M-02 BLOCKING-2.
- **D3 (BREAKING)**: `ColumnDef.render` signature tightened from
  `(value: unknown, row: T) => ReactNode` to
  `(value: T[keyof T] | undefined, row: T) => ReactNode`. Existing
  callbacks that accept `value: unknown` remain compatible via parameter
  contravariance; callbacks can now take advantage of field-typed
  narrowing without the `Number(value as unknown)` coercion pattern.
  Refs M-02 Friction #2.
- **D4 (breaking-soft)**: `DataTableRow` relaxed from
  `Record<string, unknown>` to `object`. Consumers no longer need to add
  `[key: string]: unknown` to every typed row interface. The engine
  coerces field access internally at its boundaries. Refs M-03 BLOCKING-3,
  M-02 NON-BLOCKING-1.
- `ServerFetchParams` gained an optional `signal: AbortSignal` field so
  adapters that forward to `fetch()` can honour cancellation.

### Form engine

- **F1 (feat)**: `FieldDef.render?: (ctx: FieldRenderContext) => ReactNode`
  custom renderer hook. When present, replaces the built-in field input
  while the label / help / error wrapper still renders around it. Context
  exposes `value`, `onChange`, `onBlur`, `error`, `touched`, `disabled`,
  full `values`, and DOM ids. Refs M-01 BLOCKING-1.
- **F2 (feat)**: `FormConfig.renderActions?: (state) => ReactNode` slot for
  replacing the default submit/reset button row. Receives the full action
  state with `submit()` and `reset()` callbacks. Refs M-01 BLOCKING-3.
- **F3 (feat)**: `FormConfig.submitDisabledWhen?: (state) => boolean`
  predicate. Runs in addition to the built-in "disabled while submitting"
  rule — if either returns true, the submit button is disabled. Refs
  M-01 BLOCKING-4.
- **F4 (feat)**: `FormConfig.classNames?: FormClassNames` per-element
  override map for branded styling. Keys: `form`, `section`, `field`,
  `label`, `input`, `error`, `helpText`, `actions`, `submitButton`,
  `resetButton`. When an override is present the corresponding inline
  `--prism-*` style fallback is skipped so consumer CSS wins without
  specificity fights. Refs M-01 BLOCKING-5.

### Migration notes

- Callers using `render: (value: unknown, row: T) => ReactNode` continue
  to compile under the tighter D3 signature — no source changes required
  unless you want to take advantage of the narrower typing.
- Callers with `interface MyRow { id: number; name: string }` — the
  previous required `[key: string]: unknown` index signature may be
  removed under D4. Existing rows with the index signature still work.
- Consumers passing `data: serverSource` that previously saw an empty
  table will now see live data. Review the loading / error UI in
  affected pages; the engine will surface `serverLoading` / `serverError`
  automatically via the `loading` / `error` display paths.

## 0.1.0 — initial release

Initial engines: DataTable, Form, Navigation, Theme, Layout, AI Chat,
AI Chat Sidebar. Atoms, molecules, templates, and Tauri / Next.js
bindings.
