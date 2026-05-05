# Engine Cross-Cutting Concerns (§5.7-5.9)

> Spec version: 0.1.0 | Status: DRAFT | Parent: [05 Engine Specifications](05-engine-specifications.md)

---

## 5.7 Error Boundary and Recovery Patterns

### Error Boundary Placement

Error boundaries are placed at the **zone level**. Each zone in a page template is wrapped in an error boundary so that a crash in one zone does not take down the entire page. Adjacent zones continue functioning normally.

**Web**: React `ErrorBoundary` component wraps each zone's content.
**Flutter**: Each zone widget is wrapped in a `Builder` with `FlutterError.onError` handler scoped to the zone.

### Fallback UI

When a zone's content throws an unhandled exception, the error boundary renders a fallback:

| Severity | Fallback UI | Recovery |
|----------|-------------|----------|
| Recoverable (render error) | `AlertBanner(variant: "error")` with message "Something went wrong in this section" + "Retry" button | Retry button re-mounts the zone content |
| Unrecoverable (data corruption) | Same AlertBanner + "Reload page" link | Full page reload |

### Error Reporting

When an error boundary catches an exception:
1. The error, component stack, and zone name are logged to the console (development)
2. In production, the error is sent to the configured error reporting endpoint (if `ThemeEngineConfig.errorReportingEndpoint` is set)
3. The payload includes: error message, component stack trace, zone name, template name, active breakpoint, theme, and timestamp

### Retry Semantics

- Retry re-mounts the zone content from scratch (resets component state, re-fetches data)
- Maximum 3 automatic retries with 1s, 2s, 4s exponential backoff
- After 3 failed retries, the fallback shows "This section is unavailable" with only "Reload page" option
- Data-fetch errors within an engine use React Query's retry mechanism (3 retries, exponential backoff) before surfacing to the error boundary

---

## 5.8 Kailash SDK Integration

### Nexus Integration

The `useNexusQuery` hook (web) / `NexusProvider` (Flutter) bridges Prism engines to Kailash Nexus endpoints.

**Data source resolution**:
- `"api:/contacts"` resolves to `nexus.get("/contacts", { params })`
- `"api:POST /contacts"` resolves to `nexus.post("/contacts", { body })`
- The Nexus base URL is configured at the ThemeEngine/Provider level via `nexusBaseUrl`

**Type generation**: The `@kailash/prism-compiler` generates TypeScript interfaces from Nexus endpoint schemas. These types are consumed by `useNexusQuery<T>` and `useNexusMutation<T>` hooks, providing end-to-end type safety from API schema to rendered component.

**Hooks**:
```typescript
// Read data with caching, deduplication, and background refresh
const { data, isLoading, error } = useNexusQuery<Contact[]>("/contacts", { page, pageSize, filters });

// Mutate data with optimistic updates and error rollback
const { mutate, isPending } = useNexusMutation<Contact>("POST", "/contacts");
```

**Pagination mapping**:
- Engine pagination `{ page, pageSize }` maps to Nexus query params `?page={page}&limit={pageSize}`
- Nexus response `{ data: Row[], meta: { total, page, limit } }` maps to engine state `{ rows, totalCount, currentPage, pageSize }`

**Authentication**:
- Nexus auth token provided via context/provider (not per-request)
- 401 responses trigger `onAuthExpired` callback (configurable: redirect to login or refresh token)

### DataFlow Integration

The `useDataFlow` hook (web) / `DataFlowProvider` (Flutter) enables model-aware CRUD page generation.

**Column inference** (DataTable):
- A DataFlow model definition can auto-generate `ColumnDef[]` for DataTableEngine
- Field types map: `String` -> `filterType: "text"`, `Integer/Float` -> `filterType: "number"`, `Date` -> `filterType: "date"`, `Boolean` -> `filterType: "boolean"`, `Enum` -> `filterType: "select"` with options from enum values

**Form field inference** (Form):
- A DataFlow model definition can auto-generate `FieldDef[]` for FormEngine
- Field types map similarly; `required` inferred from `nullable: false`

**Access control**:
- DataFlow model-level access controls determine which fields appear in column/field definitions
- Fields the current user cannot read are excluded from generated schemas
- Fields the current user cannot write are set to `readOnly: true` in form fields

**Type bridge**: The `@kailash/prism-compiler` reads DataFlow model definitions and generates TypeScript interfaces matching each model's field schema. These interfaces are shared between Nexus endpoint types and DataTable/Form engine configurations.

### Kaizen Integration (AI Chat Engine)

The AI Chat Engine is purpose-built to consume Kailash Kaizen streaming responses.

- The `endpoint` prop in `ChatEngineConfig` points to a Kaizen agent's streaming endpoint
- Kaizen's streaming protocol (SSE with `event: token`, `event: tool_call`, `event: citation`) maps directly to the engine's `MessageType` union
- The `onToolCallStart` / `onToolCallEnd` events correspond to Kaizen's tool execution lifecycle
- The `onActionPlanResponse` callback sends approval/rejection back to the Kaizen agent via the configured Nexus endpoint

---

## 5.9 Offline Behavior Contract

### Detection
- Web: `navigator.onLine` + `online`/`offline` events, with React Query's `onlineManager`
- Flutter: `connectivity_plus` package
- Tauri: Rust-side network monitoring via system events

### Visual Indicator
When offline, a persistent banner appears at the top of the content area (below navigation header):
- AlertBanner variant: `warning`
- Message: "You're offline. Changes will be saved when you reconnect."
- Not dismissable while offline

### Engine Behavior When Offline

| Engine | Read behavior | Write behavior |
|--------|--------------|----------------|
| DataTable | Shows cached data (React Query cache). Shows offline banner. Refresh disabled. | Mutations queued locally via React Query's `MutationCache`. Visual indicator on queued items. |
| Form | Shows current form values. Validation runs locally. | onSubmit queues mutation. Shows "Saved locally" toast. Syncs on reconnect. |
| Navigation | Client-side routing works. Badge counts frozen at last known values. | N/A |
| AI Chat | Shows cached conversation. New messages cannot be sent. | Input disabled with "Offline" indicator. Reconnection attempts every 5s with exponential backoff. |
| Theme | Fully functional (tokens are local). | Preference save queued. |

### Reconnection
On reconnect: queued mutations replay in FIFO order. React Query's `focusManager` triggers background refetches for stale queries. Conflicts (server state changed during offline period) surface via engine `onConflict` callback. User resolves conflicts manually.

### Service Worker Caching (Web)
- Static assets (JS, CSS, fonts): cache-first strategy via service worker
- API responses: network-first with stale-while-revalidate fallback
- Design system tokens: precached on first load

---
