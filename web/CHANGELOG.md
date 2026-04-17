# @kailash/prism-web — Changelog

All notable changes to the Prism web engine package are documented here.

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
