# Security Redteam — DataTable Adapter (Shard 2 of Prism 0.3.0)

Branch: `feat/data-table-adapter` vs `main`. Scope: `DataTableAdapter` interface, `adaptLegacy` shim, row-actions column. Files audited: `web/src/engines/data-table/adapter.ts`, `data-table-body.tsx`, `use-data-table.ts`, `data-table-states.tsx`, `data-table-root.tsx`.

## HIGH

### HIGH-1 — `javascript:` / `data:` URL scheme XSS via consumer-supplied `action.href`

`data-table-body.tsx:443-461` renders `<a href={action.href(row, idForAction)}>` with no URL-scheme validation. React auto-escapes text content but does NOT validate href schemes; a consumer returning `javascript:alert(document.cookie)` (or `data:text/html,...`) ships a click-to-XSS straight into the user's browser session, executing in the first-party origin of the embedding app.

The engine is a platform primitive — a mis-wired consumer row action (e.g., `href: (row) => row.url` where `row.url` is attacker-controlled data from the backend) is exactly the failure mode the engine should block by construction. The equivalent engine-side defense is a one-line scheme allowlist (`http:`, `https:`, `mailto:`, relative `/...` / `#...` / `?...`) applied inside `RowActionsCell` before interpolating into `href`. Any other scheme → render as disabled `<span>` or drop the action + emit a dev-mode warning.

Fix: in `RowActionsCell`, wrap the href:

```ts
const SAFE_SCHEMES = /^(https?:|mailto:|tel:|\/|#|\?)/i;
const rawHref = action.href(row, idForAction);
const href = SAFE_SCHEMES.test(rawHref) ? rawHref : '#';
// (optionally: if (href === '#') logger.warn('data_table.unsafe_href', action_id=action.id))
```

This is the same defense React's `href` prop is missing by design and that every engine that renders consumer-supplied URLs ships. Severity HIGH because the surface is public API (`DataTableAdapter.rowActions[].href`) and the exploit is a single consumer bug.

## MEDIUM

### MED-1 — `adaptLegacy` `getRowId` empty-string collapse on null id

`adapter.ts:75-78`: `getRowId` returns `''` when `row['id']` is null/undefined. Combined with the engine's selection logic (`selectedIds: Set<string>`), every row with a missing id collapses to the same selection key. Consequences:

- A bulk-delete action invoked on "row 1" with a null id selects every null-id row simultaneously.
- `selectedRows` filter in `use-data-table.ts:340` matches multiple physically distinct rows.
- Expansion state (`expandedIds`) collides identically.

This is a correctness bug with security implications: a user thinks they're acting on one row, the engine dispatches the action against N. For a destructive bulk action (delete, archive, deactivate), the blast radius is every visible null-id row.

Fix: replace `''` fallback with `String(rowIndex)` (matches `RowActionsCell` line 441) OR throw a typed `AdapterRowIdError` when `multiSelect` capability is enabled and id is null. The engine's own `getRowId` in `use-data-table.ts:187-200` already falls back to `String(index)` — the shim is the outlier.

## LOW

### LOW-1 — `executeRowAction` / `executeBulkAction` inconsistent state on `invalidate()` failure

`use-data-table.ts:506-540`: if `action.onExecute` succeeds but `adapter.invalidate()` throws, the mutation is committed server-side, the refetch never fires, and the UI displays stale rows while the error propagates to the caller. Not a direct security issue (no data leak), but it's a robustness gap: the retry UI (`serverError` / `retryServerFetch`) is not engaged on this path because `invalidate()` rejection is not routed into `setServerError`. Suggest wrapping `invalidate()` + refetch in a `try` that surfaces the error via `setServerError` while still re-raising to the caller.

### LOW-2 — `adaptLegacy` accepts non-Error rejection payloads without sanitization

`use-data-table.ts:248`: `err instanceof Error ? err.message : String(err)` into `setServerError`. If a consumer's legacy `fetchData` rejects with a non-Error object (e.g., `{ password: '...' }`), `String(err)` yields `"[object Object]"` — safe, not leaky. If it rejects with a string containing newlines / ANSI escape codes, those pass through to the `<p>{error}</p>` render. React escapes HTML metacharacters but does NOT strip control characters. Not exploitable (no injection surface in a text node), but worth bounding message length (e.g., `.slice(0, 500)`) to prevent a runaway adapter error message from breaking the table layout.

## PASSED CHECKS

- **No hardcoded secrets** — verified absent across audited files.
- **No SQL / no eval / no `innerHTML` / no `dangerouslySetInnerHTML`** — verified absent across `data-table/*`.
- **Action labels + icons** — rendered as React children; engine-side XSS surface is zero (icons are consumer-controlled ReactNodes, same trust boundary as any prop).
- **adaptLegacy query forwarding** — `query.sort`, `query.filters`, `query.globalSearch` forwarded as structured values to the legacy source; no injection surface at the engine boundary (legacy source owns its own backend-side validation).
- **Error rendering path** — `DataTableError` renders `error` as a React text child (auto-escaped, no HTML sinks).
- **Data cell rendering** — default render path uses `String(value ?? '')` into a React text child (auto-escaped); custom `render` is consumer-controlled by design.
- **CSRF / SSRF** — engine adds AbortSignal but owns no URL; consumer's `fetchPage` is the trust boundary.
- **Error message sanitization** — `err.message` is text-node-rendered; no XSS vector on the engine side.
- **Cross-SDK inspection** — frontend-only surface; no kailash-py/rs equivalent to mirror.

## Recommended disposition

- HIGH-1: fix before merge (one-line allowlist in `RowActionsCell`).
- MED-1: fix before merge (align `adaptLegacy` fallback with engine default).
- LOW-1 / LOW-2: follow-up todo; not merge-blocking.
