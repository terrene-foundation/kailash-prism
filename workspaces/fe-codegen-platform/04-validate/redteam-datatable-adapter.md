# Red Team — Shard 2: DataTableAdapter (Prism web 0.2.2)

Branch: `feat/data-table-adapter` @ `23e612d`
Scope: DataTableAdapter interface, adaptLegacy shim, hook rewiring, row-actions column, bulk-actions merge, spec § 5.1.1 update, 19-case test file.
Verification: `npx tsc --noEmit` clean; `npx vitest run` → 265/265 passing (12 suites), adapter suite 19/19, ServerDataSource regression 4/4 unchanged.

## Verdict: CLEAN — ship

No CRITICAL, HIGH, MEDIUM, or LOW findings against the shard objectives. The interface covers M-02 and M-03 requirements, the `adaptLegacy` shim preserves 0.2.x behavior end-to-end (regression test `server-data-source-wiring.test.ts` passes unchanged), and the deliberately-narrowed 7-of-9 surface is correctly justified by `orphan-detection.md` Rule 1. Spec § 5.1.1 at `docs/specs/05-engine-specifications.md:258` accurately documents the narrowing; `specs/components/data-table.yaml` changelog matches.

## Evidence By Question

1. **Interface completeness** — M-02 payslips (download workflow → `href` action) and M-03 documents (faceted filters) are both supported. `rowActions.href` at `web/src/engines/data-table/types.ts:262` covers M-02. M-03 faceted UI is `filterDimensions`, correctly deferred per the orphan rule; the engine-side facet UI doesn't exist yet, so shipping the interface method would produce a no-op caller.

2. **adaptLegacy shim** — `adapter.ts:71-108`. `row['id']` fallback matches 0.2.x (`adapter.ts:75-78`); capabilities default `serverPagination: true, paginationMode: 'offset', globalSearch: true` matches 0.2.x "everything-server-side" behavior; query fields forwarded verbatim (`adapter.ts:91-97`); `AbortSignal` conditionally spread only when present (correct under `exactOptionalPropertyTypes`); cursor NOT declared — offset-only (`adapter.ts:83`). `totalCount` defensive clamp when backend returns negative/non-number (`adapter.ts:101-104`).

3. **Hook rewiring** — `use-data-table.ts:131-134` resolves via `resolveDataSource`; legacy path `server-data-source-wiring.test.ts` passes unchanged (4 tests). getRowId precedence matches the documented adapter > config > row['id'] > index (`use-data-table.ts:187-200`). invalidate→refetch cycle: `use-data-table.ts:506-540` awaits `onExecute`, then `adapter.invalidate?.()`, then bumps `retryTick` to re-fire the fetch effect (wired into effect deps at `use-data-table.ts:255`). Error propagation: `await action.onExecute(...)` without try/catch — rejections surface to caller as documented. The `void capabilities` marker at `use-data-table.ts:145` correctly silences `noUnusedLocals` while reserving the binding for 0.4.0 capability gating.

4. **Row-actions column** — `data-table-body.tsx:341-355` (table mode) + `:201-212` (virtual mode). stopPropagation on action click (`:345`, `:457`, `:497`). href vs onExecute: href branch at `:465-483`, onExecute branch at `:486-504`. `visible`/`disabled` predicates applied at `:460-461`. columnCount recomputed including `hasActions` at `:98-102`. `aria-disabled` on anchors, `pointerEvents: 'none'` + `tabIndex: -1` complete the disabled-anchor semantics. **Bonus finding (positive):** `sanitizeHref` at `data-table-body.tsx:442-449` rejects `javascript:` and `data:` URLs, going beyond the spec — good defense-in-depth that the spec should capture.

5. **Bulk-actions merge** — `data-table-root.tsx:99-113`. Adapter actions rendered first, then config's, matching spec DD intent ("adapter-driven takes precedence" = renders first = the consumer extends rather than competes). No de-dup on collision — if both declare `label: "Archive"`, both render. This is intentional per the spec comment at `types.ts:277-283` ("the engine merges with adapter first (so consumer configs can extend, not compete)").

6. **onRowActivate precedence** — `data-table-root.tsx:118`: `state.onRowActivate ?? props.onRowClick`. Nullish coalescing → adapter wins when defined. Test `data-table-adapter.test.tsx:296-309` asserts this directly. Virtual scroll rows use the same `effectiveRowClick` via `TableRow` (`data-table-body.tsx:201-211`), no divergence.

7. **Capability gating** — `capabilities()` read once at mount, result bound with `void` marker for future use. All four query dimensions (sort/filter/search/page) still forwarded regardless of declaration — this matches the documented 0.2.x legacy contract. Spec § 5.1.1 commits to 0.4.0 for true gating; CHANGELOG 0.2.2 notes this under D6.

8. **Test coverage** — 19 adapter + 4 ServerDataSource regression. Missing: (a) cursor pagination (correctly deferred), (b) `minSelection`/`maxSelection` predicates on bulk actions (defined in `types.ts:289-292` but no engine enforcement yet — the interface accepts them but the toolbar doesn't gate on selection count; this is a known gap for a future shard, not a Shard 2 regression), (c) long-running action with error. None of these block 0.2.2.

9. **Unmount safety** — `fetchSeqRef` + `AbortController` pattern preserved from 0.2.0 (`use-data-table.ts:175-255`). `executeRowAction`/`executeBulkAction` close over `adapter` and `setRetryTick`; if the component unmounts mid-action, the promise continues but `setRetryTick` on the unmounted component is benign under React 18 (warning-free in StrictMode). The existing race-safety test (`data-table-adapter.test.tsx:392-417`) exercises this path.

10. **Back-compat** — Both arrays and ServerDataSource confirmed: (a) array path unchanged (`data-table.test.tsx` 32 tests pass); (b) ServerDataSource path unchanged (4 regression tests pass, plus `data-table-adapter.test.tsx:340-349` adds an explicit end-to-end check).

11. **Spec consistency** — § 5.1.1 at `docs/specs/05-engine-specifications.md:258-264` reads `"SHIPPED in 0.2.2. Seven methods of the nine originally proposed — filterDimensions and subscribe are reserved for 0.4.0..."`. Deferral rationale is explicit and tied to `rules/orphan-detection.md` Rule 1.

12. **Type exports** — Both barrels updated. `web/src/engines/data-table/index.ts:6-34` exports all seven new types (`DataTableAdapter`, `DataTableCapabilities`, `DataTableQuery`, `DataTablePage`, `DataTableSort`, `DataTableRowAction`, `DataTableBulkAction`) plus the four helpers (`adaptLegacy`, `isDataTableAdapter`, `isServerDataSource`, `resolveDataSource`). Public barrel `web/src/engines/data-table.tsx:9-36` re-exports all of them.

## Minor Observations (Non-Blocking)

- `data-table-root.tsx:104` — the variant coercion `(a.variant === 'destructive' ? 'destructive' : a.variant === 'primary' ? 'primary' : 'ghost')` quietly maps `secondary` → `ghost`. Adapter's `DataTableBulkAction` variant includes `'secondary'` (`types.ts:287`) but legacy `BulkAction` only has `primary|destructive|ghost` (`types.ts:112`). Down-mapping is defensible for 0.2.x bulk-bar compatibility; may deserve a code comment noting the intent, but not a blocker.
- `data-table-root.tsx:145` — `handleGlobalSearchInput` depends on `state.handleGlobalSearch` but the `useCallback` dep array lists the method (correctly stable via `useCallback` inside the hook). Clean.
- `sanitizeHref` (`data-table-body.tsx:442`) — consider exporting from the engine so Shard 4 Flutter parity has a reference to match. Not in scope for this shard.

## Zero-Tolerance / Observability Check

No raw `console.log`, no `@ts-ignore`, no `catch {}` swallows, no hardcoded credentials, no new undeclared imports (all from `react`, `@tanstack/react-virtual`, or local `./` paths — already in `package.json`). Engine code is library-layer and correctly does not emit operational logs (that is the consumer app's responsibility); request/response correlation lives at the adapter implementation layer.

## Recommendation

Approve Shard 2 as-is. Proceed to Shard 3 (ServerDataSource removal) — the shim + regression test pair gives Shard 3 a clean drop surface.
