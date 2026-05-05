# DataTableAdapter — Rationale (§5.1.1 cont.)

> Spec version: 0.1.0 | Status: DRAFT | Parent: [05 Engine Specifications](05-engine-specifications.md)

---

### Method Justifications

Each method's inclusion is justified by a concrete LOC saving from the M-02 or M-03 migration, plus the failure mode it prevents.

| Method               | Required? | M-02 evidence                           | M-03 evidence                          | LOC saved (est) | Failure mode prevented                                                                 |
| -------------------- | --------- | --------------------------------------- | -------------------------------------- | --------------- | -------------------------------------------------------------------------------------- |
| `getRowId`           | Required  | M-02 §"Renamed `payslip_id → id`" (L58) | M-03 §"No `id` field type safety" (L165) | ~8 LOC          | View-model rename hack; selection unstable across pages.                               |
| `capabilities`       | Required  | M-02 §sketch §"capabilities" (L160-211) | (M-03 only fetches once, still benefits)| ~25 LOC         | Engine cannot decide client/server fallback; consumer hand-rolls sort inside fetcher.   |
| `fetchPage`          | Required  | M-02 §sketch (L165-170, L246)           | M-03 §sketch (L201)                    | ~40 LOC         | Page state managed in consumer (`useState`/`useEffect`/`useCallback`) instead of engine.|
| `onRowActivate`      | Optional  | M-02 §"Row-click vs action-button" (L116-124) | (not surfaced)                  | ~10 LOC         | `e.stopPropagation()` boilerplate; busy-state managed manually.                        |
| `rowActions`         | Optional  | M-02 §"download column" (L121, L247)    | M-03 §"No DataTable action column" (L169) | ~25 LOC      | `field: "id"` faux-column; ad-hoc Link+Button styling; broken keyboard group nav.       |
| `bulkActions`        | Optional  | (not surfaced)                          | M-03 §sketch (L218)                    | ~10 LOC         | Bulk shape lives on engine config, not adapter — diverges from rowActions shape.        |
| `filterDimensions`   | Optional  | (not surfaced)                          | M-03 §sketch (L226), §faceted filter (L290-320) | ~80 LOC | Hardcoded category list; consumers re-implement chip-row + select UI per page.          |
| `subscribe`          | Optional  | M-02 §sketch (L189-192)                 | (not surfaced; useful for live uploads)| ~0 LOC today    | No graceful path for SSE/WebSocket-driven refresh.                                      |
| `invalidate`         | Optional  | (M-02's "refresh after download" implicit) | M-03 §sketch (L228)                | ~5 LOC          | Consumers manually re-trigger fetch after mutation.                                     |

`mapRow` (proposed by M-02) was DROPPED — see Design Decision 6. Its LOC contribution is absorbed by the relaxed `DataTableRow` constraint that M-04's BLOCKING-3 fix introduces.

### Comparison to ChatAdapter

`ChatAdapter` (`web/src/engines/ai-chat/types.ts:128-144`) has 5 methods: `listConversations`, `loadMessages`, `sendMessage`, `deleteConversation`, `renameConversation`. `DataTableAdapter` has 9 (3 required + 6 optional).

**Similarities preserved:**

- **Plain async methods, not builders.** No `query.build().sort().filter()` chains; the adapter takes a single shape (`DataTableQuery`).
- **One method per user concern.** `onRowActivate` matches "click row"; `rowActions` matches "buttons in the row"; `bulkActions` matches "bar above the table when N selected".
- **Extension via implementation, not config flags.** Consumers extend `DataTableAdapter` the way `ArborAdvisoryAdapter implements ChatAdapter` does. No subclassing required, no decorators, no global registry.
- **Transport-agnostic.** REST, GraphQL, SSE, WebSocket, in-memory fixture, FileSystem — every transport implements the same interface.

**Intentional differences:**

- **`capabilities()` exists on DataTableAdapter, not on ChatAdapter.** Chat operations are universal (every chat API can list conversations, load messages, send a message); table operations vary enormously (some backends sort server-side, some don't; some paginate by offset, some by cursor, some return everything in one call). Without `capabilities()` the engine cannot know whether to apply a client-side fallback after the adapter returns rows. This is the single biggest design difference.
- **`rowActions` / `bulkActions` are arrays of declarative actions, not methods.** Chat operations are imperative ("delete this conversation"); table actions are templates that the engine renders into UI. The shape declares aria, keyboard order, and visibility once instead of forcing the engine to introspect a method's return type.
- **`subscribe` is COARSE refetch, not per-message stream.** Chat has `ChatStreamHandle` for token-by-token streaming because that's the user's actual mental model. Table rows are not streamed token-by-token; the right granularity for "this row changed" is "refetch the page."
- **`filterDimensions` has no chat analogue.** Chat doesn't faceted-filter messages; tables routinely do.
- **Cursor pagination is a first-class capability.** Chat conversations are typically loaded in one `loadMessages(conversationId)` call, then appended via streaming. Tables routinely page through 10K-row datasets and need both offset and cursor strategies. The capability flag + `nextCursor` field cover both without two interfaces.

### Relationship to ServerDataSource (historical — completed in 0.3.0)

**Status**: COMPLETED. `ServerDataSource<T>`, `ServerFetchParams`, `ServerFetchResult`, `adaptLegacy()`, and `isServerDataSource()` were removed from the public surface in 0.3.0 per the migration plan below. `DataTableConfig.data: T[] | DataTableAdapter<T>`.

Origin: `ServerDataSource<T>` shipped in 0.1.x as an orphan API (declared on `DataTableConfig.data`'s union but `useDataTable` never invoked `fetchData`). M-02 §"BLOCKING-1" (L271-272) and M-03 §"BLOCKING-1" (L446-473) independently surfaced this. Both migrations agreed: delete and replace.

**Migration path (executed across three releases):**

1. **0.2.0 (M-04, engine wiring fix):** Wired `ServerDataSource.fetchData` into `useDataTable` so the existing API actually ran. Unblocked consumers who had already written a `ServerDataSource`, without changing the type surface.

2. **0.2.2 (M-06 / Shard 2, adapter introduction):** Added `DataTableAdapter<T>` as a THIRD accepted shape on `DataTableConfig.data`. Engine internally adapted `ServerDataSource` → `DataTableAdapter` via a thin shim (`adaptLegacy`). All new code paths inside the engine consumed the adapter shape; the union was purely a public-API compatibility layer. `ServerDataSource` marked `@deprecated`.

3. **0.3.0 (Shard 3, removal):** `ServerDataSource`, `ServerFetchParams`, `ServerFetchResult`, `adaptLegacy`, `isServerDataSource` removed from the public surface. The internal shim deleted. `DataTableConfig.data: T[] | DataTableAdapter<T>`. Regression test `web/src/__tests__/regression/server-data-source-wiring.test.ts` deleted in the SAME commit (orphan-detection Rule 4 — test files importing removed symbols become collection-time orphans).

Consumers who need the 30-LOC `adaptLegacy` helper in a one-off migration can copy it from git history: `git show 8489bc9:web/src/engines/data-table/adapter.ts`.

This satisfied `rules/orphan-detection.md` MUST Rule 3 ("Removed = Deleted, Not Deprecated") with a two-release deprecation window (0.2.2 → 0.3.0) — defensible because (a) Prism is pre-1.0 so minor releases may break public API, (b) the deprecation came paired with a working replacement, not a vapor warning, (c) the adaptLegacy shim kept 0.2.x consumer code working until their one-shot migration commit.

### Design Decisions

The 8 questions raised by the M-05 brief, answered with rationale tied to the migration findings.

#### DD-1: One adapter or composition (mixins)?

**Decision: ONE interface with optional methods.**

Considered: split `DataTableAdapter` (required core) from `FilterableAdapter`, `SubscribableAdapter`, `BulkActionableAdapter` mixins so a minimal adapter implements only `getRowId + capabilities + fetchPage`. Rejected for three reasons:

1. **Discoverability.** A single interface in IDE autocomplete shows every capability. With mixins the consumer must know to look up `FilterableAdapter` separately.
2. **TypeScript intersection ergonomics.** `DataTableAdapter<T> & FilterableMixin<T> & SubscribableMixin<T>` is uglier than optional methods on one interface and requires every consumer to spell out the intersection.
3. **All optional methods are independent.** Mixins are useful when methods cluster (e.g. CRUD = create+read+update+delete travel together). Here `bulkActions`, `filterDimensions`, `subscribe`, `invalidate` are independent — declaring one does not imply the others. Optional fields express that more honestly than mixins.

The `?` on optional methods is the entire enforcement layer; consumers pay nothing for capabilities they don't use, and `ChatAdapter` proves the pattern works at this scale (5 methods, all required; we have 3 required + 6 optional, similar density).

#### DD-2: Capabilities vs auto-detection

**Decision: EXPLICIT `capabilities()` declaration.**

The alternative — engine always sends the full `DataTableQuery` and the adapter handles client/server split internally — was rejected because:

1. **Fallback is the engine's job.** When the server can't sort, the engine has the rows in hand and can sort them. Pushing that responsibility into the adapter duplicates sort logic across every adapter implementation.
2. **Engine cannot know it failed silently.** If the adapter ignores `query.sort` because the backend doesn't support it, the engine renders unsorted rows but the column header still shows the sort indicator. A user who sees "Name ↓" on rows that aren't actually sorted by name has no way to discover the bug. Capabilities make the contract auditable: the engine asks "do you sort?", the adapter says no, the engine sorts client-side and the indicator means what it says.
3. **M-02 named this as the #1 saving.** L160-211 — explicit capabilities would have eliminated the hand-rolled sort inside `makePayslipsServerDataSource`.

`capabilities()` is read once at mount. An adapter whose capabilities change at runtime (rare) is replaced with a new instance.

#### DD-3: `rowActions` as array vs function

**Decision: STATIC ARRAY with predicate-based per-row visibility/enablement** (M-03's shape).

M-02 proposed `rowActions?: (row: T) => DataTableRowAction[]` (a function that returns a fresh array per row). M-03 proposed `rowActions?: ReadonlyArray<DataTableRowAction>` with `visible?(row)` and `disabled?(row)` predicates inside each action.

The static array wins because:

1. **Stable focus order.** With a function returning a fresh array per row, focus traversal between rows can land on different actions in different positions ("Download" is first on row 1 but "Share" is first on row 2 because the function returned them in different orders). Predicate-based hiding keeps the action *order* stable; only visibility flips.
2. **Engine can pre-build menu structure.** Static actions let the engine compute the actions column width once instead of measuring per-row.
3. **Aria grouping is honest.** Screen readers announce "actions group with 3 buttons; 1 disabled" once for the column. With per-row arrays the announcement varies by row, which is harder for users to predict.
4. **The escape hatch is still available.** A consumer who genuinely needs row-specific actions (e.g. "Approve" only on rows in 'pending' state, "Reject" only on rows in 'pending' state, "Re-open" only on 'closed' rows) writes both actions and uses `visible: (row) => row.status === 'pending'` predicates. The static array handles this.

#### DD-4: `filterDimensions` complexity — adapter or sibling `FilterAdapter`?

**Decision: ON THE SAME `DataTableAdapter` as an optional field.**

A separate `FilterAdapter` was considered to keep `DataTableAdapter` slim. Rejected because:

1. **Filter values flow through `query.dimensions` into `fetchPage`.** Splitting filter dimensions onto a sibling adapter would force the consumer to either (a) hold a reference to the FilterAdapter inside the DataTableAdapter to consult its declared dimensions, or (b) duplicate the dimension declarations in two places. Both are worse than one method on one adapter.
2. **The async option loader is the only "complexity."** Once you accept that filterDimensions is just `Array<{ id, label, options }>` with options optionally being a function — a shape no more complex than `bulkActions` — there is no architectural reason to split it.
3. **M-03's analysis (L226-291) treats it as an adapter concern.** The migration that hit this friction wanted it on the same interface; respecting that is appropriate.

The implementation MAY split internal state management (`useFilterDimensions(adapter)` hook separate from `useDataTable(config)` hook) for code organisation, but the EXTERNAL interface stays unified.

#### DD-5: Deprecation plan for `ServerDataSource` (executed)

**Decision: TWO-RELEASE DEPRECATION WINDOW.** Completed in 0.3.0. See "Relationship to ServerDataSource" above for the full historical narrative. Executed summary:

- **0.2.0 (M-04)**: wired the orphan so existing consumers got correct behavior.
- **0.2.2 (M-06 / Shard 2)**: shipped `DataTableAdapter`, accepted all three shapes via union, marked `ServerDataSource` `@deprecated`, shipped migration cheatsheet.
- **0.3.0 (Shard 3)**: removed `ServerDataSource` and the internal shim entirely.

A pure same-release delete was considered but rejected: it would have forced any consumer who wrote against M-04's wired `ServerDataSource` to immediately rewrite. The two-release window (0.2.2 deprecation → 0.3.0 removal) was the smallest defensible deprecation given `rules/orphan-detection.md` MUST Rule 3 and Prism's pre-1.0 status.

A `@deprecated`-only path (mark deprecated, never delete) was rejected because `rules/orphan-detection.md` is explicit: "Removed = Deleted, Not Deprecated. Deprecation banners are easy to miss; consumers continue importing the symbol and silently shipping insecure code."

#### DD-6: `DataTableRow` constraint interaction (and the dropped `mapRow`)

**Decision: ADAPTER ENFORCES ID VIA `getRowId(row)`. NO `mapRow`. Rows can have any shape.**

Once M-04 relaxes `DataTableRow = Record<string, unknown>` to `DataTableRow = object` (or removes the constraint entirely — see M-03 BLOCKING-3), the adapter no longer needs to bridge the row shape. The consumer's row type flows through unchanged.

`getRowId(row)` is the SOLE source of identity. There is no convention that row shape must contain a literal `id` field. Rows with composite keys, no PK, or PK named anything (`payslip_id`, `document_uuid`, `slug`, `__synthetic_idx`) all work — `getRowId` returns whatever string identifies the row.

`mapRow` (proposed by M-02 to handle the `Payslip → PayslipRow` transformation) is DROPPED. The transformation belongs in `fetchPage`'s implementation: the adapter fetches `Payslip[]` from the backend, maps to `PayslipRow[]` inside `fetchPage`, and returns. There's no need for a separate `mapRow` method when `fetchPage` already controls what shape comes out.

This means M-02's `__raw: Payslip` hack disappears (the adapter returns the right shape directly), AND the `[key: string]: unknown` index signature on view-models disappears (M-04 BLOCKING-3 fix relaxes the constraint).

#### DD-7: Streaming / live-update semantics

**Decision: COARSE `subscribe(onChange)` only.**

Considered: fine-grained `onRowUpdated(id, row)`, `onRowInserted(row)`, `onRowDeleted(id)` callbacks. Rejected because:

1. **The engine has to refetch anyway.** Even if the adapter pushes a fine-grained delta, the engine cannot trust that the delta hasn't crossed a sort/filter boundary — a row that "updated" might now match a filter it didn't before, or sort to a different page. The only safe response to a delta is "consider the page invalid; refetch." Coarse and fine-grained are equivalent in observable behavior.
2. **Delta protocols are backend-specific.** Fine-grained callbacks would push protocol assumptions into the interface (does inserting at position N mean offset shifts? what if inserting on a different page?). Coarse refetch is protocol-agnostic.
3. **Adapter-side cache patching is fine.** An adapter that DOES receive fine-grained deltas (say, from a CRDT or a Redux-style store) can patch its internal cache and signal coarsely. The engine doesn't see the delta; the adapter benefits from it on the next refetch.
4. **Symmetry with ChatAdapter.** Chat doesn't have fine-grained "this message changed" callbacks either; updates flow through the next loadMessages call.

If a future consumer truly needs fine-grained updates (e.g. an in-grid live editor showing other users' cursors), that's a different engine, not a richer DataTableAdapter.

#### DD-8: Page-size boundaries — offset vs cursor

**Decision: ONE INTERFACE, capability flag distinguishes.**

`capabilities().paginationMode: 'offset' | 'cursor'` declares which model. `DataTableQuery.cursor` is present iff `paginationMode === 'cursor'`. `DataTablePage.nextCursor` is required for cursor mode (when more pages exist), forbidden for offset.

Two separate interfaces (`OffsetAdapter` vs `CursorAdapter`) were considered. Rejected because:

1. **Engine still has to handle both.** Even with split interfaces, `useDataTable` would need to branch on adapter type to render the correct pager (numbered for offset, "Load more" for cursor). The capability flag does the same branching with fewer types.
2. **Backends mix the modes.** Many real APIs offer offset for small datasets and cursor for large ones, sometimes on the same endpoint. A single adapter can declare its current mode and switch (by replacing the adapter instance).
3. **`totalCount: -1` covers the "cursor without a count" case.** Cursor backends often can't cheaply count; the sentinel says "I don't know" without complicating the page shape.

The pager UI behavior is documented in § 5.1 (existing Pagination spec) and updated to read `totalCount === -1` as the trigger for "Load more" rendering.

### Open Questions (deferred to implementation)

These are intentionally unresolved — the M-06 implementer should decide based on the actual code shape:

- **Prop naming on `DataTableConfig`.** Is the union `data: T[] | DataTableAdapter<T>` or do we add `adapter?: DataTableAdapter<T>` as a separate field with `data` reserved for arrays? The latter is clearer at the type level but adds a config field; the former preserves the existing API. M-06 chooses based on TypeScript ergonomics in real consumer call sites.
- **Should `capabilities()` be a property or a method?** A method allows adapters to compute capabilities lazily (e.g. probe the backend on first call); a property is simpler and matches `ChatAdapter`'s lack of equivalent. Default to method for symmetry with `getRowId(row)`; reconsider if no consumer needs lazy capabilities.
- **AbortSignal threading.** `DataTableQuery.signal` is declared but the engine's exact cancellation strategy (debounce window, "discard stale results vs cancel in-flight") is an implementation detail. M-06 should benchmark and pick the strategy that minimises user-visible flicker on rapid filter changes.
- **`rowActions` rendering when there are too many.** The engine MAY render the trailing N actions inside an overflow menu when the visible count exceeds a threshold; the threshold (3? 5?) and the menu component (Menu? Popover?) are implementation choices.
- **Live-update debounce.** When `subscribe`'s `onChange` fires rapidly (a row updating 30 times per second), the engine should batch refetches. The batch window is an implementation detail.

### Expected LOC Savings (rolled up from migration findings)

| Wave | Baseline | Adapter-driven (estimated) | Savings |
| ---- | -------- | -------------------------- | ------- |
| M-02 `/my-payslips` (datasource + page + columns) | 418 + 186 = 604 LOC | ~30 (adapter) + ~50 (page shell) + 92 (columns unchanged) = 172 LOC | ~430 LOC (~71%) |
| M-03 `/documents` (page + datasource + card) | 456 + 80 + 179 = 715 LOC | ~50 (adapter) + ~80 (page shell with view toggle) + 179 (card unchanged, until CardGrid molecule) = 309 LOC | ~410 LOC (~57%) |
| **Combined** | **~1,140 LOC** | **~480 LOC** | **~660 LOC saved (~58%)** |

These are upper bounds: actual savings depend on (a) M-04 BLOCKING fixes landing first, (b) the `Card` + `CardGrid` molecules from M-03 §"New Prism atoms/molecules needed" landing in a parallel wave, (c) the adapter's `filterDimensions` → engine-rendered `FilterBar` molecule landing.

For new pages built directly against the adapter (no migration baseline), the expected per-page ratio is ~80 LOC of consumer code (adapter + page shell + columns) for a list-shaped page that would have taken ~400-600 LOC of bespoke React+useState+useEffect.

---
