# Round 1: Implementability Red Team

Reviewer perspective: **Implementer** -- can these specs actually be built?

Severity scale:
- **BLOCKING** -- cannot proceed without spec change; implementation will fail or contradict platform behavior
- **HIGH** -- implementable with significant deviation from spec; needs spec clarification or budget revision
- **MEDIUM** -- implementable but the spec makes an implicit assumption that will cause friction
- **LOW** -- minor inconsistency or gap; implementer can resolve without spec change

---

## 1. React / Next.js Feasibility

### FINDING 1.1 -- RSC boundary placement contradicts engine state requirements (HIGH)

**Spec 07, Section 7.3**: "Default rendering model: Server Components by default. Client boundary (`"use client"`) applied at organism level."

**Spec 05, all engines**: Every engine (DataTable, Form, Navigation, Layout, Theme, AI Chat) manages complex internal state (`useState`, `useReducer`, event handlers, WebSocket connections, `useQuery`, Zustand stores). Engines import and compose organisms, which compose molecules, which compose atoms.

**Problem**: If `"use client"` is at the organism level, then engines (which are ABOVE organisms in the import hierarchy per Spec 08 package boundaries) must also be client components. But the spec says atoms and static molecules "remain server components." This is correct in isolation, but once an engine imports an organism (which is `"use client"`), and that organism imports atoms, those atoms run in the client bundle regardless of whether they have `"use client"`. They are not "server components" in any meaningful sense -- they are client components imported by a client boundary.

**Impact**: The statement is technically accurate (atoms do not have `"use client"` directives) but misleading. It suggests atoms contribute to server-rendered HTML independently of engines. In practice, every atom used inside an engine is in the client bundle. The only atoms that truly run as server components are those used in `web/next/server/` RSC wrappers or in a static template zone that contains no engine.

**Required spec change**: Clarify that atoms and molecules are "server-component-compatible" (no `"use client"` directive, no hooks, no browser APIs), meaning they CAN be server components when used outside engine boundaries. Do not claim they ARE server components in all contexts.

### FINDING 1.2 -- Layout Engine as React context provider conflicts with RSC (MEDIUM)

**Spec 05, Section 5.4 Web Implementation Notes**: "Implemented as a React context provider (`PrismLayoutProvider`) that supplies breakpoint information to all children."

**Problem**: React context providers are client-side only. A `PrismLayoutProvider` wrapping page content forces the entire subtree to be a client component tree. This means no organism or engine within a layout can be a server component -- which is fine, because they are all client components anyway (Finding 1.1). But it also means the Layout Engine cannot wrap a page that has top-level server components rendering static content (e.g., a marketing page with no engines).

**Recommendation**: Split into two modes: (a) CSS-only layout (media queries, no JS provider) for server-renderable pages, and (b) the full `PrismLayoutProvider` for interactive pages. Or accept that all Prism pages are client-rendered.

### FINDING 1.3 -- React 19 Compiler and Zustand/React Hook Form compatibility (MEDIUM)

**Spec 07, Section 7.3**: Prescribes React Query + Zustand + React Hook Form.

**Problem**: The React 19 Compiler (React Forget) performs automatic memoization by tracking component purity. Zustand's `useStore` selector pattern and React Hook Form's `useFormContext` both use external mutable stores with subscription patterns that the compiler may not correctly analyze in all cases. As of mid-2025, the React Compiler has known limitations with external store subscriptions (the `useSyncExternalStore` pattern). Libraries are converging, but full compatibility is not yet guaranteed for all usage patterns.

**Impact**: Not blocking -- these libraries actively maintain React 19 support. But the spec should note that the React Compiler may need per-component opt-out (`"use no memo"`) for specific integration points. The blanket statement in the system prompt "React Compiler handles memoization -- avoid manual `useMemo`/`useCallback`" is optimistic. Manual memoization may still be needed in engine code that bridges external stores.

**Recommendation**: Add a note in Spec 07 Section 7.3 acknowledging that engine-level code interfacing with Zustand and React Hook Form may require manual memoization or compiler pragma overrides.

### FINDING 1.4 -- DataTable mobile card view requires undeclared column metadata (MEDIUM)

**Spec 05, Section 5.1 Responsive Contract**: On mobile, each row renders as a card with title (first column), subtitle (second column), 3 additional fields (3rd-5th columns), status (first column with `filterType: "select"`).

**Problem**: The ColumnDef interface has no `priority` field, but the tablet responsive behavior says "Columns with `priority < 3` hidden." The mobile card layout derives from column order (first = title, second = subtitle), which is fragile. A table with "Checkbox" as the first column and "ID" as the second would generate a nonsensical card layout.

**Required spec change**: Add an explicit `mobilePriority` or `role` field to ColumnDef (e.g., `role: "title" | "subtitle" | "status" | "detail" | "hidden"`) to control the mobile card layout rather than relying on column order. Also add the `priority` field that is referenced in the tablet responsive behavior but missing from the ColumnDef interface.

---

## 2. Flutter Feasibility

### FINDING 2.1 -- Layout grammar `Stack` name conflicts with Flutter `Stack` widget (HIGH)

**Spec 04, Section 4.1.1**: Defines a `Stack` layout primitive that arranges children vertically (equivalent to CSS `flex-direction: column`).

**Problem**: Flutter already has a `Stack` widget that overlays children on the Z-axis (equivalent to CSS `position: absolute`). The spec maps its `Stack` primitive to Flutter's `Column` widget. But the naming in the spec and in generated code will cause persistent confusion. The spec says widgets use the `K` prefix (e.g., `KButton`), so the implementation would be `KStack`, but the layout grammar YAML files and template definitions reference `Stack` as a layout primitive. Every developer reading a template YAML who knows Flutter will expect Z-axis stacking behavior.

**Recommendation**: Either (a) rename the layout primitive to `VStack` (vertical stack) -- which also distinguishes from a horizontal `HStack` (though the spec uses `Row`) -- or (b) document prominently that `Stack` in Prism layout grammar maps to `Column` in Flutter, not `Stack`. Option (a) is safer because it eliminates ambiguity at the spec level rather than relying on documentation.

### FINDING 2.2 -- Split resizable divider needs custom implementation (MEDIUM)

**Spec 04, Section 4.1.4**: Defines `Split` with `resizable: true` using a draggable divider.

**Problem**: Flutter has no built-in resizable split pane widget. The `Row` + `Expanded` + `GestureDetector` approach in the spec sketch works, but implementing smooth resizing with min/max constraints, cursor feedback, and responsive ratio persistence is a non-trivial custom widget (easily 200+ lines). The spec pseudocode understates the Flutter implementation complexity.

**Impact**: Not blocking, but the implementation estimate for the Split primitive in Flutter is 3-5x what the spec implies. This should be flagged for planning.

### FINDING 2.3 -- GridView.count does not support spanning (MEDIUM)

**Spec 04, Section 4.1.7**: Grid children can span multiple columns using a `span` prop.

**Flutter implementation note**: The spec says "Implemented via `StaggeredGrid` or manual column calculation." `GridView.count` (used in Section 4.1.3) does not natively support column spanning. The `flutter_staggered_grid_view` package does, but it is a third-party dependency not mentioned in the technology stack (Spec 07 Section 7.4). The alternative -- manual column calculation -- is complex and error-prone.

**Recommendation**: Explicitly list `flutter_staggered_grid_view` (or equivalent) as a required Flutter dependency in Spec 07 Section 7.4, or acknowledge that Grid column spanning on Flutter will use a custom layout algorithm.

### FINDING 2.4 -- WillPopScope is deprecated (LOW)

**Spec 05, Section 5.2 Flutter Implementation Notes**: "Unsaved changes warning via `WillPopScope`."

**Problem**: `WillPopScope` was deprecated in Flutter 3.12 in favor of `PopScope` with the `canPop` parameter. Since the spec requires Flutter 3.x, this should reference the current API.

**Required spec change**: Replace `WillPopScope` with `PopScope`.

---

## 3. Tauri Feasibility

### FINDING 3.1 -- IPC type generation from Rust requires a build tool that does not exist in the ecosystem (HIGH)

**Spec 07, Section 7.5 IPC Type Safety**: "Build script extracts command signatures and generates TypeScript type definitions."

**Problem**: There is no widely adopted, production-ready tool that automatically generates TypeScript types from `#[tauri::command]` function signatures. `tauri-specta` exists in the ecosystem and provides this capability, but it is not mentioned in the spec. Without specifying the concrete tool, implementers will either (a) build a custom Rust proc-macro or build script (significant effort), or (b) manually maintain TypeScript types alongside Rust commands (defeating the spec's type-safety guarantee).

**Required spec change**: Either specify `tauri-specta` (or the chosen tool) as the type generation mechanism, or acknowledge that the IPC type bridge requires a custom build script and estimate the effort accordingly (at least 1-2 sessions for the build tooling alone).

### FINDING 3.2 -- Tauri 2 plugin model changes affect hook design (MEDIUM)

**Spec 07, Section 7.5**: Lists native APIs (file system, tray, notifications, clipboard, shortcuts, updater) as custom Rust commands.

**Problem**: In Tauri 2.x, most of these capabilities are provided as official plugins (`@tauri-apps/plugin-fs`, `@tauri-apps/plugin-notification`, `@tauri-apps/plugin-clipboard-manager`, etc.) with their own TypeScript APIs. Writing custom Rust commands that duplicate plugin functionality is unnecessary and creates a maintenance burden when plugins update.

**Recommendation**: Replace custom commands with Tauri 2 official plugin wrappers where possible. The hooks (`useFs`, `useNotify`, `useClipboard`, etc.) should wrap plugin APIs, not raw `invoke()` calls. The Rust crate should only contain commands for genuinely custom functionality (window state persistence, app preferences) that no plugin covers.

---

## 4. Performance Feasibility

### FINDING 4.1 -- <2ms per DataTable row render is unrealistically tight (HIGH)

**Spec 05, Section 5.1 Performance Contract**: "Each visible row MUST render in < 2ms (measured as React commit time or Flutter build time)."

**Analysis**: A React component commit for a single table row with 6-10 columns, each containing text, badges, or action buttons, typically measures 0.5-3ms depending on column complexity. The 2ms budget is achievable for simple text-only cells but becomes very tight with:
- Custom `cellRenderer` functions (even trivial ones add overhead)
- Checkbox selection column (additional state subscription)
- Row click handlers with event delegation
- Conditional rendering (expandable rows, pinned columns)

In Firefox, React commit times are typically 1.5-2x slower than Chrome. A 2ms budget in Chrome becomes a missed budget in Firefox.

**Flutter**: A single row `build()` in 2ms is achievable with const constructors but tight when using `Theme.of(context)` for token access (which is a runtime lookup, not a const).

**Recommendation**: Change to "<3ms per row render in Chrome/Safari, <5ms in Firefox." Or "<2ms for default cell renderers" with an explicit carve-out that custom renderers are the consumer's responsibility (which the spec already partially states but contradicts with the hard MUST).

### FINDING 4.2 -- <5ms per streaming token render is feasible but needs batching spec (MEDIUM)

**Spec 05, Section 5.6 Streaming Contract**: "Re-render budget per token: < 5ms. If a burst of tokens arrives (> 10 in < 16ms), they are batched into a single render."

**Analysis**: 5ms per token is achievable for appending text to a string and re-rendering a Markdown component. The batching rule (>10 tokens in <16ms) is well-specified. However, the spec says "Markdown parsing runs incrementally" -- incremental markdown parsing is non-trivial. `react-markdown` re-parses the entire string on every render. True incremental parsing requires a streaming-aware markdown parser (not available off-the-shelf for React).

**Impact**: With batching (accumulate tokens, render at most once per 16ms frame), the 5ms budget is met because you are rendering one frame per batch. Without true incremental markdown parsing, the render of a 3000-character message will take 10-30ms as the message grows, but since this happens at most once per frame, it does not cause jank. The spec's concern is valid but the implementation path is "batch and re-parse," not "incrementally parse."

**Recommendation**: Clarify that "incremental markdown parsing" means "re-parse the full buffer each render cycle, but render at most once per animation frame" rather than a true incremental parser, which does not exist in the React ecosystem.

### FINDING 4.3 -- Token resolution in <5ms for ~250 tokens is feasible (LOW)

**Spec 05, Section 5.5 Performance Contract**: "Resolving all ~250 tokens for a theme + mode combination MUST complete in < 5ms."

**Analysis**: 250 object property lookups with cascade resolution is trivially fast (sub-1ms in JS, sub-2ms in Dart). This budget is realistic.

### FINDING 4.4 -- CSS variable injection in <2ms is feasible (LOW)

Setting ~250 CSS custom properties on `document.documentElement` using `style.setProperty()` takes roughly 0.5-1.5ms in modern browsers. Feasible.

---

## 5. Bundle Size Feasibility

### FINDING 5.1 -- 25 atoms + 22 molecules in <50KB gzipped is achievable but tight (HIGH)

**Spec 07, Section 7.3 Bundle Size Budget**: "All atoms + molecules: <50KB gzipped."

**Rough calculation**:

| Category | Count | Avg unminified size per component | Total unminified | Minified (~40%) | Gzipped (~30% of minified) |
|----------|-------|----------------------------------|-----------------|-----------------|---------------------------|
| Atoms | 25 | ~2-4KB (JSX + props + a11y) | ~75KB | ~30KB | ~9KB |
| Molecules | 22 | ~4-8KB (compose atoms + logic) | ~132KB | ~53KB | ~16KB |
| **Subtotal** | 47 | | ~207KB | ~83KB | ~25KB |

This does NOT include:
- Tailwind CSS utility classes used by these 47 components
- Runtime dependencies (e.g., class-variance-authority, clsx, Radix UI primitives for Select/Popover/Tooltip)

With dependencies factored in:
- Radix UI primitives for Select, Popover, Tooltip, Dialog, DropdownMenu: ~15-25KB gzipped total (shared primitives deduplicate)
- Tailwind CSS (purged, only used classes): ~5-10KB gzipped for 47 components
- Utility libraries (clsx, cva): ~1KB gzipped

**Estimated total**: 46-61KB gzipped.

**Verdict**: The 50KB budget is achievable if (a) components use no Radix/headless UI library and implement accessibility from scratch (reduces deps but increases implementation effort), or (b) the budget is raised to 65KB to accommodate headless UI primitives for accessible Select, Popover, Tooltip, Dialog, and DropdownMenu molecules.

The spec follows a "Shadcn/ui model" (Spec 07 Section 7.3: "Components copied into project, not imported from node_modules"). Shadcn/ui depends on Radix UI primitives. If Prism follows this model, Radix primitives are in the bundle.

**Required spec change**: Either (a) raise the budget to 65KB, or (b) specify that atoms and molecules MUST NOT depend on Radix/headless UI (meaning accessibility for complex components like Select, Popover, and DropdownMenu must be implemented from scratch), or (c) exclude shared headless UI primitives from the budget (measure component code only, not shared deps).

### FINDING 5.2 -- Single engine <30KB gzipped is tight for DataTable (MEDIUM)

**Spec 07 Bundle Size Budget**: "Single engine (e.g., DataTable): <30KB."

**Analysis**: The DataTable engine uses `@tanstack/table` (~13KB gzipped) + `@tanstack/virtual` (~3KB gzipped) + custom engine code (~8-12KB gzipped). Total: ~24-28KB gzipped.

This is feasible but leaves almost no room for the AI Chat engine, which needs `react-markdown` (~8KB), `remark-gfm` (~3KB), `rehype-highlight` (~12KB for highlight.js core + languages), and `rehype-katex` (~25KB for KaTeX). The Chat engine alone would be ~60-80KB gzipped.

**Required spec change**: The 30KB budget applies to DataTable and Form engines but is completely unrealistic for the AI Chat engine. Add per-engine budgets: DataTable <30KB, Form <25KB, Navigation <15KB, Layout <10KB, Theme <10KB, AI Chat <100KB (or make markdown/syntax-highlighting/LaTeX lazy-loaded and excluded from the initial budget).

---

## 6. State Management Conflicts

### FINDING 6.1 -- React Query + React Hook Form overlap on form submission state (MEDIUM)

**Spec 05, Section 5.2**: Form Engine uses React Hook Form for form state and React Query's `useMutation` for submission.

**Problem**: React Hook Form has its own `isSubmitting` state and `onSubmit` handler. Using `useMutation` for submission creates two sources of truth for submission state: RHF's `formState.isSubmitting` and React Query's `mutation.isPending`. They can briefly disagree (RHF says submitting, mutation has not started yet, or mutation finished but RHF's callback has not returned).

**Impact**: Not blocking. The standard pattern is to delegate `isSubmitting` entirely to the mutation's `isPending` and ignore RHF's built-in submission tracking. But the spec should specify which is the source of truth for UI display (e.g., disable button when `mutation.isPending`, not when `formState.isSubmitting`).

### FINDING 6.2 -- Zustand and React Query boundary is underspecified (MEDIUM)

**Spec 07, Section 7.3**: React Query for server state, Zustand for global client state.

**Problem**: The Navigation Engine (Spec 05, Section 5.3) has state like `sidebarCollapsed`, `expandedGroups`, and `badgeCounts`. `sidebarCollapsed` is client-only (Zustand), but `badgeCounts` are fetched from an API (React Query). The engine internally mixes both. The spec does not define a pattern for engines that need both Zustand and React Query -- specifically, how an engine's internal state provider composes them.

**Recommendation**: Add a "State composition pattern" subsection to Spec 07 showing how an engine creates a combined provider from a Zustand store (for client state) and React Query queries (for server state). This is a standard pattern but not obvious to every implementer.

### FINDING 6.3 -- No known incompatibilities between React Query, Zustand, and React Hook Form (LOW)

These three libraries are architecturally independent and commonly used together. No known conflicts exist. React 19 compatibility is actively maintained by all three library maintainers. This part of the spec is sound.

---

## 7. Tree-Shaking Verification

### FINDING 7.1 -- Barrel index files in atoms/ and molecules/ defeat per-component tree-shaking (HIGH)

**Spec 08, Section 8.1**: Each category has a barrel file: `atoms/index.ts`, `molecules/index.ts`, `organisms/index.ts`, `engines/index.ts`.

**Spec 08, Section 8.4 package.json exports**:
```json
"./atoms": "./dist/atoms/index.js",
"./molecules": "./dist/molecules/index.js"
```

**Problem**: When a consumer writes `import { Button } from '@kailash/prism-web/atoms'`, the bundler loads `atoms/index.js` which re-exports all 25 atoms. Modern bundlers (Rollup, Vite, esbuild) CAN tree-shake unused named exports from barrels IF `sideEffects: false` is set (which the spec does require). However:

1. **CSS side effects**: If any atom registers Tailwind classes or has module-level side effects (class-variance-authority's `cva()` calls at module scope are NOT pure in all bundlers), tree-shaking breaks. Rollup marks `cva()` calls as side-effect-free only with `/*#__PURE__*/` annotations.
2. **Barrel re-export chains**: The barrel `export { Button } from './button'` pattern works for tree-shaking in Rollup but historically causes issues in webpack 4 and older Next.js versions. The spec targets Next.js 15+, which uses Turbopack/webpack 5 -- these handle barrel re-exports correctly.
3. **Engine isolation**: The critical guarantee is "Import 1 atom, verify no engine code in bundle." Since engines are in a separate subpath (`./engines`) and atoms do not import engines (enforced by package boundary rules), this guarantee holds regardless of barrel behavior.

**The 0-byte guarantee for unused engines IS achievable** because engines live in a separate entry point. The risk is within a category: importing `{ Button }` may pull in `Spinner`, `Badge`, etc. if the barrel is not perfectly tree-shakeable.

**Recommendation**: Add per-component subpath exports as an alternative to barrel imports:
```json
"./atoms/button": "./dist/atoms/button.js",
"./atoms/input": "./dist/atoms/input.js"
```
This provides a guaranteed escape hatch when barrel tree-shaking fails. Many design system libraries (Radix, Chakra, MUI) provide both patterns.

### FINDING 7.2 -- Flutter tree-shaking is sound as specified (LOW)

Dart AOT compilation tree-shakes unused classes and methods. The barrel `kailash_prism.dart` exports everything, but Dart's tree-shaker eliminates unreferenced symbols. The spec's approach is correct for Flutter.

---

## 8. Cross-Cutting Concerns

### FINDING 8.1 -- Lockstep versioning across 4 packages on 3 registries is operationally expensive (MEDIUM)

**Spec 07, Section 7.6**: All four packages share one version number. A breaking change in ANY bumps MAJOR for ALL.

**Problem**: A breaking change in the Tauri Rust crate's internal command API forces a MAJOR version bump on the Flutter pub.dev package, which has zero changes. Downstream Flutter users see a major version bump, expect breaking changes, and spend time reviewing migration guides for changes that do not affect them.

**Impact**: Not a spec implementation blocker, but a project operations concern. The alternative (independent versioning) has its own problems (compatibility matrix). The spec's approach is simpler and common for multi-platform design systems.

**Recommendation**: Keep lockstep but add a changelog convention: "BREAKING (tauri-rs): ..." so consumers of other packages can quickly see that the major bump does not affect them.

### FINDING 8.2 -- No internationalization (i18n) strategy for components (MEDIUM)

**Problem**: None of the 5 specs define how components handle right-to-left (RTL) languages, date/number formatting, or pluralization. The Layout Engine (Spec 05, Section 5.4) has no `dir` or `locale` prop. The Form Engine (Spec 05, Section 5.2) supports `locale` in DatePicker but not at the engine level.

**Impact**: Adding RTL support after implementation requires rethinking layout primitives (Row direction, Split panel order, navigation position). This is much cheaper to specify now than to retrofit.

**Recommendation**: Add an i18n section to Spec 07 covering: (a) `dir: "ltr" | "rtl"` support in layout primitives, (b) locale-aware formatting for DatePicker, number inputs, and currency fields, (c) string externalization strategy for component-internal labels ("Cancel", "Submit", "No results", "Page X of Y").

### FINDING 8.3 -- Spec references `priority` on ColumnDef but never defines it (BLOCKING)

**Spec 05, Section 5.1 Responsive Contract, tablet behavior**: "Columns with `priority < 3` hidden."

The `ColumnDef` interface (Spec 05, Section 5.1) has no `priority` field. An implementer cannot build the tablet responsive behavior as specified.

**Required spec change**: Add `priority?: number` to `ColumnDef` with documentation (e.g., "1 = always visible, 5 = hide first"). Define which default priority value columns receive when not specified.

---

## Summary Table

| # | Finding | Severity | Spec | Action Required |
|---|---------|----------|------|----------------|
| 1.1 | RSC boundary claim is misleading | HIGH | 07 | Clarify "server-component-compatible" vs "is server component" |
| 1.2 | LayoutProvider forces client tree | MEDIUM | 05 | Split CSS-only and JS-provider modes |
| 1.3 | React Compiler + external stores | MEDIUM | 07 | Add compiler opt-out note for engine code |
| 1.4 | Mobile card view needs column metadata | MEDIUM | 05 | Add `role` or `mobilePriority` to ColumnDef |
| 2.1 | Stack name conflicts with Flutter Stack | HIGH | 04 | Rename to VStack or add prominent documentation |
| 2.2 | Split resizable needs custom Flutter widget | MEDIUM | 04 | Flag effort; not a spec change |
| 2.3 | GridView.count has no column spanning | MEDIUM | 04, 07 | Add flutter_staggered_grid_view to deps |
| 2.4 | WillPopScope is deprecated | LOW | 05 | Replace with PopScope |
| 3.1 | IPC type generation tool unspecified | HIGH | 07 | Specify tauri-specta or equivalent |
| 3.2 | Tauri 2 plugins duplicate custom commands | MEDIUM | 07 | Use official plugin wrappers |
| 4.1 | <2ms row render is too tight | HIGH | 05 | Relax to <3ms Chrome, <5ms Firefox |
| 4.2 | Incremental markdown parsing does not exist | MEDIUM | 05 | Clarify batched re-parse strategy |
| 5.1 | 50KB budget for atoms+molecules is tight | HIGH | 07 | Raise to 65KB or exclude shared deps |
| 5.2 | 30KB per engine fails for AI Chat | MEDIUM | 07 | Add per-engine budgets |
| 6.1 | RHF + React Query dual submission state | MEDIUM | 05 | Specify source of truth |
| 6.2 | Engine state composition pattern missing | MEDIUM | 07 | Add Zustand + RQ composition example |
| 6.3 | No library conflicts | LOW | 07 | No change needed |
| 7.1 | Barrel files risk incomplete tree-shaking | HIGH | 08 | Add per-component subpath exports |
| 7.2 | Flutter tree-shaking is sound | LOW | 07 | No change needed |
| 8.1 | Lockstep versioning operational cost | MEDIUM | 07 | Add changelog convention |
| 8.2 | No i18n/RTL strategy | MEDIUM | All | Add i18n section to Spec 07 |
| 8.3 | ColumnDef missing `priority` field | BLOCKING | 05 | Add `priority` to ColumnDef interface |

**BLOCKING**: 1 finding (missing `priority` field -- implementer literally cannot build the specified behavior)
**HIGH**: 7 findings (require spec changes before implementation starts)
**MEDIUM**: 12 findings (require clarification or adjustment during implementation)
**LOW**: 4 findings (implementer can resolve independently)
