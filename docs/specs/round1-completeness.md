# Red Team Round 1: COMPLETENESS Findings

**Scope**: Specs 01-10 for kailash-prism
**Date**: 2026-04-11
**Focus**: Anything promised but not specified; anything that should be specified but is missing entirely.

---

## Summary

55 findings total:
- CRITICAL: 8
- HIGH: 14
- MEDIUM: 18
- LOW: 15

---

## CRITICAL Findings

### C-01: No error/recovery behavior for data binding expressions

**Spec(s)**: 06 (Page Templates), 05 (Engine Specifications)
**Location**: All template YAML examples use `"bind:..."` and `"api:..."` expressions but no spec defines what happens when these fail.

**What is missing**: No definition of:
- What happens when `"bind:contacts.totalCount"` resolves to `undefined`
- What happens when `"api:/contacts"` returns 500
- What happens when `"api:/contacts"` returns empty `[]`
- What happens when `"api:/contacts"` times out
- Retry policy for `"api:..."` data sources
- Error propagation from data bindings to zone rendering
- Whether zone renders empty, shows error state, or blocks entire page

**Impact**: Every page template depends on data bindings. Without defined failure semantics, each engine implementation will invent its own behavior, creating inconsistent user experience.

**Proposed spec text** (add as Section 6.4: Data Binding Contract):

```markdown
## 6.4 Data Binding Contract

### 6.4.1 Binding Expression Syntax

| Expression | Meaning | Failure behavior |
|-----------|---------|-----------------|
| `"bind:{path}"` | Reactive reference to client state | Renders `undefined` as empty string; missing parent object logs console warning and renders fallback |
| `"api:{endpoint}"` | Server data fetch | Triggers engine loading/error state machine per engine contract |
| `"api:{METHOD} {endpoint}"` | Server mutation | Returns Promise; engine handles success/error via onSubmit/onSubmitError callbacks |

### 6.4.2 Failure States

When a `"api:..."` binding fails:
1. **Network error**: Zone renders the engine's `errorState` composition point with retry button. Retry uses exponential backoff: 1s, 2s, 4s, max 3 retries.
2. **HTTP 4xx**: Zone renders `errorState` with the status-appropriate message (401 -> redirect to auth, 403 -> permission denied, 404 -> not found). No automatic retry.
3. **HTTP 5xx**: Zone renders `errorState` with generic message + retry button. Retry per network error policy.
4. **Timeout**: Default timeout 10000ms. After timeout, zone transitions from `loadingState` to `errorState` with "Request timed out" + retry.
5. **Empty response** (`[]` or `null`): Zone renders the engine's `emptyState` composition point. This is NOT an error.

When a `"bind:..."` binding resolves to `undefined`:
1. Text contexts: render empty string `""`
2. Array contexts: render empty array `[]` (triggers empty state)
3. Boolean contexts: resolve to `false`
4. Number contexts: resolve to `0`
5. The binding system MUST NOT throw. Silent fallback with console.warn in development mode.
```

---

### C-02: No specification of the `"bind:..."` reactive system

**Spec(s)**: 06 (Page Templates), 05 (Engine Specifications)
**Location**: Template YAML uses `"bind:filters.period"`, `"bind:contacts.totalCount"`, etc.

**What is missing**: No spec defines:
- Where bind state lives (global store? page-local? URL params?)
- How `"bind:contact.status"` is initialized
- How one zone's bind updates propagate to another zone
- Whether bindings are synchronous or asynchronous
- How circular bindings are detected and prevented
- The namespace/scope of bind paths

**Impact**: The entire template composition model depends on inter-zone data flow. Without a binding specification, implementing templates is impossible.

**Proposed spec text** (add as Section 6.4.3):

```markdown
### 6.4.3 Binding State Model

Binding state is page-scoped. Each page instance has a reactive state tree initialized from:
1. Route parameters (e.g., `/contacts/:id` populates `bind:params.id`)
2. Initial API responses (e.g., `"api:/contacts/{id}"` result populates `bind:contact.*`)
3. User interactions (e.g., filter changes populate `bind:filters.*`)

**State tree shape**: Flat namespace with dot-path access. `"bind:contact.name"` accesses `state.contact.name`.

**Reactivity**: Binding changes propagate synchronously within the same render cycle. All zones observing a changed bind path re-render in the same frame.

**Initialization order**:
1. Route params resolved
2. Zones rendered in document order
3. API bindings trigger loading states
4. API responses populate state tree
5. Dependent zones re-render

**Circular binding detection**: The binding runtime MUST detect cycles (A.onChange updates B which updates A) and throw a development-mode error after 10 recursive updates within a single frame.
```

---

### C-03: Multi-sort priority and stable sort behavior undefined

**Spec(s)**: 05 (Engine Specifications), Section 5.1 DataTable
**Location**: `sorting.mode: "multi"` is declared but multi-sort semantics are undefined.

**What is missing**:
- Sort priority order (is the first-clicked column primary or secondary?)
- Maximum number of sort columns
- Visual indicator of sort priority (1st, 2nd, 3rd)
- How to remove a single sort from a multi-sort set
- Whether the sort is stable (equal rows maintain their original order)
- Client-side sort algorithm for multi-sort (compare first column, then second on tie, etc.)

**Impact**: Multi-sort is a key data table feature. Without defined priority semantics, implementations will behave unpredictably.

**Proposed spec text** (add to Section 5.1 after sorting config):

```markdown
**Multi-sort semantics** (when `sorting.mode: "multi"`):
- Columns are sorted in the order they were activated by the user. First-clicked column is primary sort, second-clicked is secondary, etc.
- Maximum sort columns: 3. Adding a 4th sort removes the oldest (first) sort column.
- Visual indicator: sort icon shows priority number (1, 2, 3) next to the arrow.
- Removing a sort: Click a sorted column's header a third time (asc -> desc -> unsorted). Remaining sorts shift priority up.
- Stability: The sort MUST be stable. Rows that compare equal on all active sort columns retain their original data source order.
- Client-side algorithm: Lexicographic comparison chain. Compare by primary column first; on tie, compare by secondary; on tie, compare by tertiary. If all compare equal, maintain original index order.
- Sort state in URL: Encoded as `?sort=field1:asc,field2:desc` for deep linking.
```

---

### C-04: No offline/network-disconnected behavior specified

**Spec(s)**: All engine specs (05), all templates (06)
**Location**: Engines assume network connectivity for data fetching and mutations.

**What is missing**:
- What happens when the network drops during a form submission
- What happens to streaming AI chat when WebSocket disconnects
- Whether offline-first caching is supported
- How the UI communicates "offline" state to users
- Whether Tauri desktop apps support offline mode
- Retry/queue semantics for mutations attempted while offline

**Impact**: Users encounter network issues regularly. Without defined offline behavior, applications fail silently or crash.

**Proposed spec text** (add as Section 5.7: Offline Behavior Contract):

```markdown
## 5.7 Offline Behavior Contract

### Detection
- Web: `navigator.onLine` + `online`/`offline` events
- Flutter: `connectivity_plus` package
- Tauri: Rust-side network monitoring via system events

### Visual Indicator
When offline, a persistent banner appears at the top of the content area (below navigation header):
- AlertBanner variant: `warning`
- Message: "You're offline. Changes will be saved when you reconnect."
- Dismiss: Not dismissable while offline

### Engine Behavior When Offline

| Engine | Read behavior | Write behavior |
|--------|--------------|----------------|
| DataTable | Shows cached data (if previously loaded). Shows offline banner. Disables refresh. | Mutations queued locally. Visual indicator on queued items. |
| Form | Shows current values. Validation runs locally. | onSubmit queues mutation. Shows "Saved locally" toast. Syncs on reconnect. |
| Navigation | Navigation works (client-side routing). Badge counts frozen. | N/A |
| Chat | Shows cached conversation. New messages cannot be sent. | Input disabled with "Offline" indicator. Reconnection attempts every 5s. |
| Theme | Fully functional (tokens are local). | Preference save queued. |

### Reconnection
On reconnect: queued mutations replay in FIFO order. Conflicts (server state changed) surface via engine `conflict` state. User resolves conflicts manually.
```

---

### C-05: RTL (Right-to-Left) layout behavior not specified

**Spec(s)**: 04 (Layout Grammar), 03 (Component Contracts), 05 (Engines)
**Location**: i-harden checklist (10) mentions RTL but no layout primitive, component contract, or engine contract defines RTL behavior.

**What is missing**:
- Whether Row `reverse` prop interacts with `dir="rtl"`
- How Split panel positions swap in RTL
- Whether navigation sidebar moves to the right in RTL
- How icons with directional meaning (arrows, chevrons) mirror
- How text alignment defaults change
- Whether Scroll horizontal direction reverses
- How the layout grammar expresses `start`/`end` vs `left`/`right`

**Impact**: RTL support is referenced in the quality gates (10.2 Category 2) but has no implementation specification. Builders cannot implement RTL without this.

**Proposed spec text** (add as Section 4.5: Directionality):

```markdown
## 4.5 Directionality

### Global Direction
Layout direction is set at the page root: `dir="rtl"` (web) or `Directionality(textDirection: TextDirection.rtl)` (Flutter).

### Layout Primitive Adaptation

| Primitive | LTR behavior | RTL behavior |
|-----------|-------------|--------------|
| Stack | No change | No change (vertical axis is direction-independent) |
| Row | Children flow left-to-right | Children flow right-to-left. `justify: "start"` = right edge. |
| Grid | Columns fill left-to-right | Columns fill right-to-left |
| Split | Left panel = first, right = second | Right panel = first, left = second. `collapseTarget` semantics invert. |
| Layer | `position: "left"` = left edge | `position: "left"` becomes `position: "right"` (logical mapping) |
| Scroll | Horizontal scroll starts at left | Horizontal scroll starts at right |

### Logical vs Physical Properties
All layout primitives use LOGICAL properties (`start`/`end`) not PHYSICAL (`left`/`right`). When `align: "start"` is specified:
- LTR: `start` = left
- RTL: `start` = right

### Component Mirroring
- Icons with directional meaning (arrow-left, arrow-right, chevron-left) MUST mirror in RTL
- Icons without directional meaning (search, settings, user) MUST NOT mirror
- Component contracts that specify `iconLeft`/`iconRight` map to `iconStart`/`iconEnd` respectively
```

---

### C-06: No specification of the token compiler CLI interface

**Spec(s)**: 02 (Token Architecture), 08 (Repo Architecture)
**Location**: Token compiler is central to the system but its CLI interface is unspecified.

**What is missing**:
- Command syntax (e.g., `npx prism-compiler compile --input ... --target ...`)
- Available commands (compile, validate, convert, diff)
- Input/output argument format
- Exit codes (0 = success, 1 = validation failure, 2 = parse error)
- Watch mode for development
- Incremental compilation support
- Error output format (JSON? human-readable? both?)
- Integration with CI (machine-readable output)

**Impact**: The compiler is referenced by quality gates (10.3), the change protocol (1.5.2), and the build system (8). Without a CLI specification, the compiler cannot be implemented or integrated into CI.

**Proposed spec text** (add as Section 2.6: Compiler CLI Interface):

```markdown
## 2.6 Compiler CLI Interface

### Commands

| Command | Purpose | Exit code on failure |
|---------|---------|---------------------|
| `prism-compiler compile <input> --target <web\|flutter\|all>` | Compile design-system.yaml to platform outputs | 1 |
| `prism-compiler validate <input>` | Run all constraint checks without producing output | 1 if FAIL, 0 if all PASS/WARN |
| `prism-compiler convert <input> --to <yaml\|markdown>` | Bidirectional conversion | 1 if input invalid |
| `prism-compiler diff <file1> <file2>` | Show token differences between two design system files | 0 (always succeeds; exit 1 only on parse failure) |
| `prism-compiler watch <input> --target <web\|flutter\|all>` | Watch input file, recompile on change | N/A (long-running) |

### Output Format

`--format json` flag produces machine-readable output:
```json
{
  "status": "error",
  "errors": [
    { "code": "CONSTRAINT_VIOLATION", "path": "color.text.secondary", "expected": "contrast >= 4.5:1", "actual": "3.8:1", "theme": "light" }
  ],
  "warnings": [],
  "output_files": []
}
```

Default (no flag): human-readable colored terminal output.

### Exit Codes
- 0: Success (compile) or all pass (validate)
- 1: Validation/constraint failure (errors present)
- 2: Parse error (input file is malformed YAML/Markdown)
- 3: I/O error (file not found, permission denied)
```

---

### C-07: No specification for how engines integrate with Kailash Nexus/DataFlow

**Spec(s)**: 05 (Engine Specifications), 07 (Cross-Platform Strategy)
**Location**: Hooks `use-nexus.ts` and `use-dataflow.ts` are listed in the repo architecture; DataFlow and Nexus providers exist in Flutter. But no spec defines the integration contract.

**What is missing**:
- How `"api:/contacts"` data source maps to a Nexus endpoint
- How DataFlow model definitions map to DataTable column schemas
- Whether column types are inferred from DataFlow model field types
- How Nexus authentication tokens are passed to engines
- How DataFlow access controls affect which rows/columns are visible
- How Nexus pagination maps to engine pagination
- How Nexus error responses map to engine error states

**Impact**: Kailash SDK integration is the differentiating value of Prism. Without defined integration points, the engines are generic UI components with no SDK advantage.

**Proposed spec text** (add as Section 5.8: Kailash SDK Integration):

```markdown
## 5.8 Kailash SDK Integration

### Nexus Integration

The `useNexus` hook (web) / `NexusProvider` (Flutter) bridges Prism engines to Kailash Nexus endpoints.

**Data source resolution**:
- `"api:/contacts"` resolves to `nexus.get("/contacts", { params })`
- `"api:POST /contacts"` resolves to `nexus.post("/contacts", { body })`
- The Nexus base URL is configured at the ThemeEngine/Provider level

**Pagination mapping**:
- Engine pagination `{ page, pageSize }` maps to Nexus query params `?page={page}&limit={pageSize}`
- Nexus response `{ data: Row[], meta: { total, page, limit } }` maps to engine state `{ rows, totalCount, currentPage, pageSize }`

**Authentication**:
- Nexus auth token provided via context/provider (not per-request)
- 401 responses trigger `onAuthExpired` callback (configurable: redirect to login or refresh token)

### DataFlow Integration

The `useDataFlow` hook (web) / `DataFlowProvider` (Flutter) enables model-aware data operations.

**Column inference**:
- A DataFlow model definition can auto-generate `ColumnDef[]` for DataTableEngine
- Field types map: `String` -> `filterType: "text"`, `Integer/Float` -> `filterType: "number"`, `Date` -> `filterType: "date"`, `Boolean` -> `filterType: "boolean"`, `Enum` -> `filterType: "select"` with options from enum values

**Form field inference**:
- A DataFlow model definition can auto-generate `FieldDef[]` for FormEngine
- Field types map similarly; `required` inferred from `nullable: false`

**Access control**:
- DataFlow model-level access controls determine which fields appear in column/field definitions
- Fields the current user cannot read are excluded from generated schemas
- Fields the current user cannot write are set to `readOnly: true` in form fields
```

---

### C-08: No specification for concurrent user scenarios

**Spec(s)**: 05 (Engine Specifications), 06 (Page Templates)
**Location**: Quality gates (10.2 Category 4) mention "concurrent updates" but no engine spec defines the behavior.

**What is missing**:
- What happens when two users edit the same record simultaneously
- Optimistic update semantics (show immediately, rollback on conflict)
- Conflict detection mechanism (ETags? version fields? timestamps?)
- Conflict resolution UI (which engine handles it, what it looks like)
- Real-time update propagation (do other users' changes appear live?)
- Locking semantics (optimistic vs pessimistic)

**Impact**: Multi-user applications are the primary use case for enterprise SaaS. Without concurrency semantics, data loss is inevitable.

**Proposed spec text** (add to Form Engine and DataTable Engine):

```markdown
### Concurrency Handling

**Optimistic concurrency** (default):
1. On form load, capture entity version (`_version` field or `ETag` header)
2. On submit, send version with mutation: `If-Match: {version}`
3. On 409 Conflict response:
   - Form engine emits `onConflict` event with `{ localValues, serverValues, conflictFields }`
   - Default UI: Modal showing "This record was modified by another user. Your changes: {localValues}. Current values: {serverValues}. [Keep Mine] [Accept Theirs] [Merge]"
   - "Keep Mine": re-submits with force flag (server overwrite)
   - "Accept Theirs": reloads form with server values, discarding local changes
   - "Merge": opens side-by-side diff view for manual field-by-field resolution

**Real-time updates** (opt-in):
- `realtime: { enabled: true, channel: "entity:{id}" }` in engine config
- DataTable: new/updated/deleted rows appear automatically with highlight animation
- Form: if another user saves while form is open, a non-blocking banner appears: "This record was updated. [Refresh] [Keep editing]"
```

---

## HIGH Findings

### H-01: No Kanban or Calendar template zone definitions

**Spec(s)**: 06 (Page Templates), 08 (Repo Architecture)
**Location**: Repo architecture lists `kanban-layout.tsx` and `calendar-layout.tsx`. Spec 06 covers 9 templates but omits Kanban and Calendar.

**What is missing**: Complete zone schemas, responsive transformations, and YAML composition examples for Kanban and Calendar templates.

---

### H-02: No error boundary specification

**Spec(s)**: 05 (Engine Specifications)
**Location**: Engines define internal error states but no spec defines the error boundary pattern (what happens when a component throws an unhandled exception).

**What is missing**:
- Error boundary placement (per-zone? per-engine? per-page?)
- Fallback UI when a zone crashes
- Error reporting mechanism (what data is captured)
- Recovery action (retry zone render? reload page?)
- Whether adjacent zones continue functioning when one crashes

---

### H-03: No specification for Toast stacking and queuing

**Spec(s)**: 03 (Component Contracts)
**Location**: Toast molecule defined in Spec 01 and 03, but stacking behavior undefined.

**What is missing**:
- Maximum visible toasts simultaneously
- Stacking direction (newest on top or bottom?)
- Queue behavior when maximum is reached (delay new? replace oldest?)
- Position on screen (top-right? bottom-right? configurable?)
- Z-index relative to other layers
- Animation for enter/exit/shift-down

---

### H-04: No specification for Popover/Dropdown positioning logic

**Spec(s)**: 03 (Component Contracts)
**Location**: Select uses dropdown menu, Tooltip uses positioning, Popover molecule exists -- but no spec defines the collision detection and repositioning algorithm.

**What is missing**:
- Preferred placement (bottom, top, left, right)
- Flip behavior when insufficient space (e.g., dropdown near viewport bottom flips to top)
- Shift behavior (slide along axis to stay in viewport)
- Arrow positioning relative to trigger
- Distance from trigger (offset in px)
- Behavior when BOTH directions are insufficient (shrink? scroll?)
- Virtual boundary (viewport? scroll container? specific element?)

---

### H-05: DataTable column `priority` field referenced but never defined

**Spec(s)**: 05 (Engine Specifications)
**Location**: Section 5.1 Responsive Contract says "Columns with `priority < 3` hidden" on tablet, but `priority` is not a field in `ColumnDef`.

**What is missing**: The `ColumnDef` interface has no `priority` field. Must add `priority?: number` with semantics: lower number = higher priority = shown on smaller screens. Define default priority assignment when not specified.

---

### H-06: No specification for command palette search algorithm

**Spec(s)**: 05 (Engines), 08 (Repo Architecture)
**Location**: Command palette listed as an organism; Navigation Engine mentions it.

**What is missing**:
- Search matching algorithm (fuzzy? prefix? substring? weighted?)
- Result ranking criteria
- Data sources searchable (routes, actions, recent items, entities)
- Keyboard shortcuts for activation (`Cmd+K`)
- Maximum results displayed
- Performance budget for search (latency target)
- Grouping of results by category

---

### H-07: No specification for file upload progress, cancellation, and resumption

**Spec(s)**: 05 (Engine Specifications, Form Engine)
**Location**: Form engine defines `file` field type and `FileUploadState` but lacks detail.

**What is missing**:
- Upload protocol (multipart? chunked? presigned URL?)
- Cancel behavior (what happens to partially uploaded file?)
- Resume capability (can interrupted uploads continue?)
- Maximum concurrent uploads
- What happens when upload fails mid-way (retry? start over?)
- Preview generation for images
- Virus/malware scan integration point

---

### H-08: No specification for keyboard shortcut conflicts

**Spec(s)**: 05 (Engine Specifications, all engines), 03 (Component Contracts)
**Location**: Multiple engines define keyboard shortcuts. The AI Chat Engine uses `Ctrl+K` for search; Command Palette also uses `Ctrl+K`.

**What is missing**:
- Global keyboard shortcut registry
- Conflict resolution when multiple engines/components claim the same shortcut
- Priority order (page-level > engine-level > component-level)
- Whether shortcuts are contextual (only active when component is focused)
- Documentation of all reserved shortcuts

---

### H-09: No internationalization (i18n) integration specification

**Spec(s)**: All specs
**Location**: Quality gates (10.2 Category 2) require i18n support. Next.js middleware includes i18n routing. But no engine or component spec defines how translated strings are provided.

**What is missing**:
- How translated labels reach components (context? props? key-based lookup?)
- How engines handle pluralization
- How number/date formatting integrates with engine display
- Default language fallback behavior
- How the token system handles font stacks for CJK/Arabic/Devanagari

---

### H-10: No specification for image loading states and optimization

**Spec(s)**: 03 (Component Contracts)
**Location**: Image atom has states (loading, loaded, error) but lacks detail.

**What is missing**:
- Placeholder during load (skeleton? blurred preview? solid color?)
- Lazy loading threshold (how far below fold before loading starts?)
- Responsive image srcset/sizes strategy
- WebP/AVIF format negotiation
- Aspect ratio enforcement (prevent CLS)
- Maximum dimensions / file size warnings
- CDN/optimization URL pattern

---

### H-11: No performance budget for Flutter engine initial app startup

**Spec(s)**: 07 (Cross-Platform Strategy), 05 (Engine Specifications)
**Location**: Web has Lighthouse/LCP budgets. Flutter has no equivalent cold-start or frame budget.

**What is missing**:
- Cold start time budget (app launch to first frame)
- Hot reload preservation guarantees
- Widget rebuild budget (maximum rebuilds per frame)
- Memory budget (peak memory for reference app)
- Frame render budget (16ms / 60fps)

---

### H-12: No specification for Form Engine dirty state persistence across navigation

**Spec(s)**: 05 (Engine Specifications, Form Engine)
**Location**: `confirmDiscard` is mentioned but the mechanism for detecting navigation away is incomplete.

**What is missing**:
- What counts as "navigation away" (route change? tab close? back button?)
- Whether dirty form state persists to sessionStorage on accidental navigation
- Recovery flow (user accidentally navigates away, comes back -- is data recovered?)
- Interaction with browser back/forward (history API)
- Mobile: swipe-to-go-back gesture on iOS

---

### H-13: DataTable server-side strategy protocol undefined

**Spec(s)**: 05 (Engine Specifications)
**Location**: DataTable supports `strategy: "server"` for sorting and filtering, but the request/response protocol between engine and server is unspecified.

**What is missing**:
- URL parameter format for server-side sort (e.g., `?sort=name:asc,created:desc`)
- URL parameter format for server-side filter (e.g., `?filter[status]=active&filter[created][gte]=2026-01-01`)
- Expected response shape (must return `{ data: Row[], meta: { total } }` or similar)
- How server communicates available filter options
- Debounce/batching when multiple sort+filter changes happen quickly

---

### H-14: No specification for skeleton loading patterns per component

**Spec(s)**: 03 (Component Contracts), 05 (Engines)
**Location**: Skeleton atom exists, engines define `loadingState` composition point, but no mapping of "what skeleton shape" for each component/engine.

**What is missing**:
- DataTable loading: exact skeleton shape (how many columns? header present? row count?)
- Form loading: field-shaped skeletons or section-shaped?
- Card loading: aspect ratio, inner structure
- Chat loading: message bubble shapes?
- How long to show skeleton before transitioning to error (timeout threshold)

---

## MEDIUM Findings

### M-01: Breakpoint values inconsistent between specs

**Spec(s)**: 02 (Token Architecture), 04 (Layout Grammar)
**Details**: Token spec (2.1.7) says tablet MUST be in [640, 768], desktop in [1024, 1280]. Layout grammar (4.2.1) uses `MOBILE_MAX: 639`, `TABLET_MIN: 640`, `DESKTOP_MIN: 1024`, `WIDE_MIN: 1280`. The token spec says wide must be in [1440, 1920], but layout grammar says 1280+. These ranges conflict.

---

### M-02: No specification for focus management on route change

**Spec(s)**: 05 (Layout Engine)
**Details**: Layout Engine accessibility contract says "focus moves to main content area" on route change but doesn't specify: which element receives focus? What if main content has no focusable element? What about skip-link interaction?

---

### M-03: No specification for animation interruption

**Spec(s)**: 02 (Token Architecture, motion), 05 (Engines)
**Details**: Motion tokens define durations but no spec addresses what happens when an animation is interrupted (e.g., user clicks during a modal entrance animation). Does it snap to end state? Reverse? Continue?

---

### M-04: No specification for scroll position restoration

**Spec(s)**: 04 (Layout Grammar), 05 (Navigation Engine)
**Details**: When navigating back to a previously visited page (browser back button), should scroll position be restored? The Scroll primitive and Navigation Engine don't address this.

---

### M-05: Grid child overflow behavior undefined

**Spec(s)**: 04 (Layout Grammar)
**Details**: When a Grid child's content exceeds its cell width (e.g., long unbreakable URL), the spec doesn't define whether the cell overflows, truncates, scrolls, or breaks the grid.

---

### M-06: No specification for Select with very long option lists

**Spec(s)**: 03 (Component Contracts)
**Details**: Select component defines `searchable` but doesn't specify: maximum height of dropdown, virtual scrolling threshold for options, grouping/sectioning of options, async option loading (type-ahead search hitting server).

---

### M-07: No specification for theme transition during streaming

**Spec(s)**: 05 (Theme Engine, AI Chat Engine)
**Details**: If user switches theme while AI response is streaming, what happens? Does the in-progress message re-render with new theme tokens? Is there a flash? Is theme switch queued until stream completes?

---

### M-08: No specification for Layer dismissal order

**Spec(s)**: 04 (Layout Grammar)
**Details**: Multiple layers at the same tier stack in document order, but spec doesn't define: pressing Escape dismisses which one? Always the topmost? What if the topmost layer has `backdropDismiss: false`?

---

### M-09: No specification for DatePicker locale and calendar system

**Spec(s)**: 03 (Component Contracts)
**Details**: DatePicker molecule is listed but has no contract. Missing: supported calendar systems (Gregorian only? Hijri? Buddhist?), week start day (Monday vs Sunday), date format input parsing, min/max date constraints.

---

### M-10: No specification for DataTable column resize minimum/maximum

**Spec(s)**: 05 (Engine Specifications)
**Details**: `resizableColumns` is a boolean but the spec doesn't define: minimum column width during resize (to prevent zero-width), maximum column width, how other columns compensate when one is resized, persistence of custom widths across sessions.

---

### M-11: No specification for page template maximum content width behavior

**Spec(s)**: 05 (Layout Engine), 06 (Page Templates)
**Details**: Layout Engine has `maxContentWidth` defaulting to 1440px. But spec doesn't define: what fills the space beyond max width on ultra-wide monitors? Is it background color? Is the navigation sidebar inside or outside the max width constraint?

---

### M-12: Token compiler incremental compilation not specified

**Spec(s)**: 02 (Token Architecture)
**Details**: Compilation is defined as all-or-nothing. No specification for incremental compilation (only recompile changed tokens) which is important for development experience with watch mode.

---

### M-13: No specification for TextArea auto-grow maximum height

**Spec(s)**: 03 (Component Contracts)
**Details**: TextArea has `autoGrow` and `maxRows` but doesn't specify: what happens visually at maxRows (does it scroll? show a scrollbar? clip?), how the transition from growing to scrolling is animated.

---

### M-14: No specification for Badge overflow (large numbers)

**Spec(s)**: 03 (Component Contracts)
**Details**: Badge component has `count` type but doesn't define: maximum display value (e.g., "99+"), formatting for thousands (1.2K?), minimum width to prevent layout shift when count changes from 9 to 10.

---

### M-15: No specification for Tab overflow (too many tabs)

**Spec(s)**: 03 (Component Contracts), 06 (Templates)
**Details**: Tab molecule exists but doesn't define behavior when tabs exceed container width: horizontal scroll? Overflow menu? Priority-based hiding?

---

### M-16: Tauri auto-updater user experience undefined

**Spec(s)**: 07 (Cross-Platform Strategy)
**Details**: `useUpdater()` hook is listed but no specification of: update check frequency, user notification UI, forced vs optional updates, background download behavior, restart requirement, rollback on failed update.

---

### M-17: No specification for form field dependency/cascading validation

**Spec(s)**: 05 (Form Engine)
**Details**: `ConditionExpression` handles visibility but not cascading validation. Example: "end date must be after start date" requires cross-field validation. No spec for: cross-field validation rules, when cross-field validation triggers, error message placement for cross-field errors.

---

### M-18: No specification for navigation badge count zero state

**Spec(s)**: 05 (Navigation Engine)
**Details**: Badge `type: "count"` with `source` for count -- but what happens when count is 0? Is badge hidden? Shown as "0"? What about negative counts (data error)?

---

## LOW Findings

### L-01: No specification for Divider "with-label" variant content

**Spec(s)**: 03 (Component Contracts)
**Details**: Divider has `with-label` variant but no props for: label text content, label position (left, center, right), label styling, maximum label length.

---

### L-02: No specification for Kbd component platform adaptation

**Spec(s)**: 03 (Component Contracts)
**Details**: Kbd atom shows keyboard shortcuts but doesn't specify: whether "Ctrl" displays as "Cmd" on macOS, whether platform detection is automatic, whether both variants can be shown simultaneously.

---

### L-03: No specification for StatusDot size variants

**Spec(s)**: 03 (Component Contracts)
**Details**: StatusDot has color variants but no size definition. Token set shows sizes for other atoms (avatar, spinner) but not StatusDot.

---

### L-04: No specification for ProgressBar indeterminate pattern

**Spec(s)**: 03 (Component Contracts)
**Details**: ProgressBar has `default`, `success`, `error` variants but the spec doesn't define indeterminate (unknown progress) behavior: animation style, when to use indeterminate vs spinner, transition from indeterminate to determinate.

---

### L-05: Spinner accessibility (live region) not specified

**Spec(s)**: 03 (Component Contracts)
**Details**: Spinner atom is a display-only component but has no accessibility specification. Screen readers need: aria-label, role="status" or role="progressbar", live region announcement.

---

### L-06: No specification for Link external indicator

**Spec(s)**: 03 (Component Contracts)
**Details**: Link component doesn't define: visual indicator for external links (icon?), `target="_blank"` with `rel="noopener noreferrer"`, different behavior for internal vs external, download link variant.

---

### L-07: No specification for typography truncation/clamping

**Spec(s)**: 03 (Component Contracts)
**Details**: Typography atom doesn't define: single-line truncation with ellipsis, multi-line clamping (e.g., max 3 lines), "Read more" expansion pattern, how truncation interacts with RTL text.

---

### L-08: Stitch MCP integration specification is thin

**Spec(s)**: 01 (Design System Protocol)
**Details**: Stitch integration (Path B) references `extract_design_context` tool but doesn't specify: the exact output schema from Stitch, normalization rules beyond "snap to 4px grid", failure mode when Stitch is unavailable.

---

### L-09: No specification for Toast action button

**Spec(s)**: 03 (Component Contracts)
**Details**: Toast has auto-dismiss variants but doesn't specify: optional action button (e.g., "Undo"), action button placement, action button variant constraints, whether action dismisses the toast.

---

### L-10: No specification for Avatar group/stack component

**Spec(s)**: 03 (Component Contracts)
**Details**: Avatar atom has individual variants but no specification for: overlapping avatar stack (showing team members), "+3" overflow indicator, maximum visible avatars, click behavior on overflow.

---

### L-11: No specification for DataTable empty column sorting

**Spec(s)**: 05 (Engine Specifications)
**Details**: DataTable sort doesn't specify: where null/undefined/empty values sort (top or bottom?), whether nulls-first/nulls-last is configurable per column.

---

### L-12: No specification for form autofill interaction

**Spec(s)**: 05 (Form Engine), 03 (Component Contracts)
**Details**: Browser autofill (address, payment, login) interacts with custom form components. No spec for: which fields support autofill (`autocomplete` attributes), how autofill styling interacts with token system, whether autofill triggers onChange/validation.

---

### L-13: No specification for print stylesheet

**Spec(s)**: 07 (Cross-Platform Strategy)
**Details**: Web engine has no specification for `@media print` behavior: which components hide (navigation, toasts, tooltips), how colors adapt for print (force high contrast), page break rules for DataTable/Form.

---

### L-14: No specification for high-contrast mode beyond WCAG AA

**Spec(s)**: 02 (Token Architecture), 10 (Quality Gates)
**Details**: Quality gates mention "high contrast mode supported" for score 5 but no spec defines: how high-contrast theme differs from dark theme, Windows High Contrast Mode detection, forced-colors media query support.

---

### L-15: No specification for responsive image/media within chat messages

**Spec(s)**: 05 (AI Chat Engine)
**Details**: Chat engine markdown rendering supports inline images but doesn't specify: maximum image dimensions within a message, lightbox on click, image loading placeholder, image error fallback within chat context.

---

## Cross-Reference Issues

### X-01: Breakpoint boundary conflict (Spec 02 vs Spec 04)

Spec 02 (Token Architecture) section 2.1.7 defines:
- tablet: [640, 768]
- desktop: [1024, 1280]
- wide: [1440, 1920]

Spec 04 (Layout Grammar) section 4.2.1 defines:
- TABLET_MIN: 640, TABLET_MAX: 1023
- DESKTOP_MIN: 1024, DESKTOP_MAX: 1279
- WIDE_MIN: 1280

The token spec allows `wide` to start at 1440-1920, but layout grammar assumes 1280. If a theme sets `wide: 1440` per the token spec, the layout grammar's 1280 breakpoint creates a 160px gap (1280-1439) where wide layout applies but wide tokens don't.

**Resolution needed**: Either constrain token spec to match layout grammar exactly, or define how the mismatch is handled.

### X-02: Component count mismatch between Spec 03 and Spec 02/08

Spec 02 (Token Architecture) section 2.3.2 lists 25 atoms, 22 molecules, 22 organisms.
Spec 03 (Component Contracts) only provides full contracts for a handful of atoms (Button, IconButton, TextInput, TextArea, Select, Checkbox, Radio -- 7 of 25 atoms visible in the read).
Spec 08 (Repo Architecture) lists implementation files for all components.

Missing: Complete contracts for the remaining ~18 atoms, ~22 molecules, ~22 organisms. Without contracts, implementations have no specification to implement against.

### X-03: CSS variable naming conflict between Spec 02 and Spec 05

Spec 02 (section 2.4.1) uses naming: `--color-interactive-primary`, `--spacing-xs`
Spec 05 (Theme Engine section 5.5) uses naming: `--prism-color-interactive-primary`, `--prism-spacing-component-padding`

One uses a `--prism-` prefix; the other doesn't. These must be reconciled.
