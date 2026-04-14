# Spec 07: Cross-Platform Strategy

**Spec version**: 0.1.0
**Governs**: Two-engine model, shared/divergent boundaries, platform-specific extensions, package structure

---

## 7.1 Two-Engine Model

### Theorem: Four Targets = Two Implementations

Prism targets four deployment surfaces. These reduce to exactly two component implementations because Tauri and Next.js are extensions of the same React component tree, not independent renderers.

**Proof by construction:**

| Target | Runtime | Component source | Extension layer |
|--------|---------|------------------|-----------------|
| React SPA | Browser (Vite dev, static prod) | Web engine React components | None |
| Next.js | Node.js + Browser (App Router) | Web engine React components | RSC wrappers, metadata, middleware |
| Tauri | Webview + Rust backend | Web engine React components | IPC hooks, window management, native APIs |
| Flutter | Dart VM / AOT compiled | Flutter engine widgets | Platform-adaptive (iOS/Android/Desktop) |

**Key identity**: Next.js components ARE React components with server annotations. Tauri webview components ARE React components with Rust bridge calls. Neither requires a separate component implementation.

Therefore:

```
Web engine atoms + molecules + organisms
  = React SPA atoms + molecules + organisms
  = Next.js atoms + molecules + organisms (+ server wrappers)
  = Tauri atoms + molecules + organisms (+ native hooks)
```

The web engine produces ONE set of components. Next.js adds a server integration layer on top. Tauri adds a native bridge layer on top. Both consume the SAME atoms, molecules, and organisms without modification.

### Engine Definitions

**Web Engine**: React 19+ components written in TypeScript, styled with Tailwind CSS 4, distributed as ES modules. Covers React SPA, Next.js, and Tauri web layer.

**Flutter Engine**: Flutter 3.x widgets written in Dart with null safety, styled via Material 3 ThemeData, distributed as a pub.dev package. Covers iOS, Android, macOS, Windows, Linux, and Flutter Web.

### What Each Engine Owns

| Concern | Web Engine | Flutter Engine |
|---------|-----------|----------------|
| Component rendering | React JSX | Flutter widget tree |
| Styling | Tailwind CSS 4 utility classes + CSS variables | ThemeData + const token values |
| State management | React Query + Zustand + useState + React Hook Form | Riverpod + AsyncValue |
| Routing | React Router / Next.js App Router | GoRouter |
| Accessibility | ARIA attributes, role, tabIndex | Semantics widget tree |
| Animation | CSS transitions + Framer Motion | AnimatedContainer + AnimationController |
| Testing | Vitest + Playwright + Chromatic | widget tests + integration tests + golden screenshots |

---

## 7.2 Shared Boundary

### IDENTICAL Across Engines (Zero Adaptation)

These artifacts are consumed by both engines without any transformation. They are the platform-agnostic source of truth.

| Artifact | Format | Location | Consumed by |
|----------|--------|----------|-------------|
| Design system specification | `design-system.yaml` | `specs/tokens/` | Token compiler (web target + flutter target) |
| Component contracts | `{component}.yaml` | `specs/components/` | Both engines implement against these contracts |
| Layout grammar | `grammar.yaml` | `specs/layouts/` | Both engines implement layout primitives from this grammar |
| Page template definitions | `{template}.yaml` | `specs/templates/` | Both engines implement templates from these zone schemas |
| Navigation patterns | `patterns.yaml` | `specs/navigation/` | Both engines implement navigation from these patterns |
| Theme definitions | `{theme}.yaml` | `specs/tokens/themes/` | Token compiler produces engine-specific output |

**Verification criterion**: A change to any file in `specs/` MUST NOT require knowledge of which engine will consume it. If a spec file contains React JSX, Dart code, CSS syntax, or any other engine-specific notation, it is non-compliant.

### SIMILAR But Adapted (Structural Equivalence, Syntax Difference)

These concerns have the same semantic meaning in both engines but differ in their concrete representation.

| Concern | Web Engine | Flutter Engine | Shared semantics |
|---------|-----------|----------------|------------------|
| Token compilation | CSS custom properties (`--color-primary`) + `tailwind.config.ts` | `ThemeData` + `static const` Dart values | Same source tokens, different output format |
| Layout primitives | `<VStack>`, `<Row>`, `<Grid>`, `<Split>`, `<Layer>`, `<Scroll>` using CSS flex/grid | `Column`, `Row`, `GridView`, split via `Expanded`/`Flexible`, `Overlay`, `SingleChildScrollView` | Same 6 layout primitives from grammar, different rendering primitives |
| Responsive rules | CSS media queries + container queries via Tailwind breakpoints | `LayoutBuilder` + `MediaQuery` with platform-aware breakpoints | Same breakpoint definitions (mobile/tablet/desktop/wide), different query mechanism |
| Spacing system | Tailwind spacing utilities (`p-4`, `gap-6`) mapped to CSS vars | `EdgeInsets` and `SizedBox` using const token values | Same spacing scale, different application method |
| Typography | CSS font properties via Tailwind classes | `TextStyle` via `ThemeData.textTheme` | Same type scale, different style objects |
| Color application | Tailwind color utilities referencing CSS variables | `Theme.of(context).colorScheme` properties | Same semantic color names, different access pattern |
| Motion | CSS `transition`/`animation` + `prefers-reduced-motion` | `AnimatedContainer`/`AnimationController` + `MediaQuery.disableAnimations` | Same duration/easing tokens, different animation APIs |

### COMPLETELY DIFFERENT (No Shared Implementation)

| Concern | Web Engine | Flutter Engine |
|---------|-----------|----------------|
| Component code | TypeScript + JSX | Dart + Widget tree |
| State management | React Query (server), Zustand (global), useState (local), React Hook Form (forms) | Riverpod (all state), AsyncValue (async), StateNotifier/Notifier |
| Rendering model | DOM diffing (React reconciler) | Widget rebuild + RenderObject tree |
| Platform APIs | Web APIs (fetch, localStorage, IntersectionObserver) | Platform channels, dart:io, path_provider |
| Build system | Vite (dev), Rollup (prod), TypeScript compiler | Flutter build (AOT for mobile, dart2js for web) |
| Package format | ES modules (npm) | Dart package (pub.dev) |
| Testing framework | Vitest (unit), Playwright (E2E), Chromatic (visual) | flutter_test (widget), integration_test, golden_toolkit |

---

## 7.3 Web Engine Specifics

### Technology Stack

| Concern | Choice | Version | Rationale |
|---------|--------|---------|-----------|
| Language | TypeScript | 5.x strict mode | Type safety across all components; `strict: true`, `noUncheckedIndexedAccess: true` |
| UI framework | React | 19+ | Server components, concurrent features, use() hook |
| Styling | Tailwind CSS | 4 | Utility-first, token-driven via CSS variables, zero runtime |
| Component approach | Shadcn/ui model | N/A | Components copied into project (not imported from node_modules), full customization |
| Bundler (dev) | Vite | 6+ | Fast HMR, native ES modules |
| Bundler (prod) | Rollup | Via Vite | Tree-shaking, ES module output |
| Linting | ESLint + Prettier | Latest | Enforced via pre-commit |

### State Management Strategy

| State type | Solution | When to use |
|------------|----------|-------------|
| Server state | React Query (TanStack Query) | All data fetched from APIs; provides caching, deduplication, background refresh |
| Global client state | Zustand | Auth state, UI preferences, sidebar collapsed state; stores that persist across routes |
| Local component state | useState / useReducer | Form input values, toggle states, dropdown open/closed |
| Form state | React Hook Form + Zod | All form handling; validation schemas from component contracts |
| URL state | React Router / Next.js searchParams | Filter/sort/page parameters that should be shareable via URL |

### CSS Isolation Strategy

Prism components use **CSS custom properties** (e.g., `--prism-color-primary`, `--prism-color-surface-card`) for all visual values. This namespaced approach avoids conflicts with host application styles, including Tailwind CSS utilities.

**How Prism avoids conflicts:**

| Layer | Approach |
|-------|----------|
| Colors, spacing, typography | All values reference `--prism-*` CSS custom properties with hardcoded fallbacks |
| Component styling | Inline `CSSProperties` objects — no global class names that could collide |
| Layout | CSS flexbox/grid via inline styles, not utility classes |
| Animations | Scoped `@keyframes` with `prism-` prefix (e.g., `prism-cursor-blink`, `prism-skeleton-pulse`) |

**Host app integration checklist:**

1. **Tailwind class conflicts**: Prism does not emit Tailwind utility classes. If the host app uses Tailwind, there are no class collisions. Prism's inline styles take precedence over Tailwind's utility classes on shared DOM elements.

2. **CSS custom property overrides**: Host apps can override Prism's visual tokens by setting `--prism-*` variables on a parent element:
   ```css
   .my-chat-container {
     --prism-color-primary: #7C3AED;
     --prism-color-surface-card: #1E1E2E;
   }
   ```

3. **CSS reset interference**: Prism components do not depend on a CSS reset. If the host app's reset aggressively overrides `button`, `input`, or `textarea` styles, wrap Prism components in a container with `all: revert` or scope the reset.

4. **Tailwind `@layer` ordering**: If using Tailwind v4's `@layer` system, Prism's inline styles always win over layered utility classes (inline styles have the highest specificity regardless of layer order).

5. **Shadow DOM (optional)**: For strict isolation in micro-frontend or widget-embed scenarios, wrap the Prism component tree in a shadow root. Prism's inline style approach works inside shadow DOM without modification.

### Next.js 15+ Extensions

Next.js extends the web engine with server-side capabilities. These are additive — they import and wrap web engine components without modifying them.

| Extension | Location | Purpose |
|-----------|----------|---------|
| RSC wrappers | `web/next/server/` | Mark organisms as server components; add `"use client"` boundaries at the organism level |
| App Router page factories | `web/next/routing/` | Generate `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx` from template YAML |
| Metadata helpers | `web/next/server/metadata.ts` | Generate `generateMetadata()` from page template zone definitions |
| Streaming SSR | `web/next/server/streaming.ts` | Suspense boundaries for AI Chat engine streaming responses |
| Middleware | `web/next/middleware/` | Auth guard, i18n routing, rate limiting middleware factories |
| Image optimization | Via Next.js `<Image>` | Automatic format/size optimization for all image atoms |

**Default rendering model**: Server Components by default. Client boundary (`"use client"`) applied at organism level (engines, interactive molecules). Atoms and static molecules are **server-component-compatible** -- they contain no `"use client"` directive, no hooks, and no browser APIs, meaning they CAN render as server components when used outside client boundaries (e.g., in static template zones or RSC wrappers). When imported by a client component (organism or engine), they execute in the client bundle like any other client-tree component.

### Tauri 2+ Extensions

Tauri extends the web engine with native desktop capabilities via a Rust backend.

| Extension | Location | Purpose |
|-----------|----------|---------|
| `useInvoke` hook | `web/tauri/hooks/useInvoke.ts` | Type-safe wrapper for Tauri `invoke()` with loading/error states |
| `useWindow` hook | `web/tauri/hooks/useWindow.ts` | Window position, size, maximized state, multi-window management |
| `useTray` hook | `web/tauri/hooks/useTray.ts` | System tray icon, menu, click handlers |
| `useFs` hook | `web/tauri/hooks/useFs.ts` | Native file system access (read/write/watch) without browser sandbox |
| `TitleBar` component | `web/tauri/components/TitleBar.tsx` | Custom window title bar with traffic lights (macOS) / controls (Windows) |
| `NativeDialog` component | `web/tauri/components/NativeDialog.tsx` | OS-native file picker, save dialog, message box |
| IPC bridge | `web/tauri/bridge/` | TypeScript types auto-generated from Rust command signatures |

### Bundle Size Budget

| Category | Budget (gzipped) | Measurement |
|----------|------------------|-------------|
| All atoms + molecules | <65KB | `npx bundlesize` on `dist/atoms/**` + `dist/molecules/**`. Budget accounts for Radix UI primitives used by accessible Select, Popover, Tooltip, Dialog, and DropdownMenu molecules. |
| Per-engine base (DataTable, Form, Navigation, Layout, Theme) | <30KB | `npx bundlesize` on `dist/engines/{engine}.js` |
| AI Chat engine | <80KB | Exception: includes `react-markdown`, `remark-gfm`, and `rehype-highlight`. LaTeX (`rehype-katex`) is lazy-loaded and excluded from initial budget. |
| Total initial page load (template + engine + atoms) | <150KB | Lighthouse transfer size for initial route |
| Tree-shaking verification | 0 bytes for unused engines | Import 1 atom, verify no engine code in bundle |

**Enforcement**: CI runs `bundlesize` check on every PR. Any violation blocks merge.

---

## 7.4 Flutter Engine Specifics

### Technology Stack

| Concern | Choice | Version | Rationale |
|---------|--------|---------|-----------|
| Language | Dart | Null safety required | Sound null safety eliminates null reference crashes |
| UI framework | Flutter | 3.x | Cross-platform from single codebase |
| Design system | Material 3 | Material You | Platform-adaptive, customizable via ThemeData |
| State management | Riverpod | 2.x | Compile-time safe, testable, AsyncValue for loading/error/data |
| Routing | GoRouter | Latest | Declarative, deep linking, redirect guards |
| HTTP | Dio | Latest | Interceptors, cancellation, retry |
| Grid layout | flutter_staggered_grid_view | Latest | Column spanning support for Grid layout primitive (GridView.count does not support spanning) |
| Connectivity | connectivity_plus | Latest | Offline detection for engine offline behavior contract |

### Widget Authoring Rules

These rules are non-negotiable for all Flutter engine widgets.

| Rule | Requirement | Verification |
|------|------------|--------------|
| Const constructors | All stateless widgets MUST have `const` constructor | `dart analyze` with custom lint rule |
| Null safety | No `dynamic` types, no `!` operator except where proven safe | `dart analyze --fatal-infos` |
| Widget size | Maximum 200 lines per widget file | CI line count check |
| Naming | All widgets prefixed with `K` (e.g., `KButton`, `KDataTable`) | Grep: `class K[A-Z]` in `lib/` |
| Documentation | Every public widget has `///` dartdoc with example | `dart doc --validate-links` |
| Key parameter | All list/grid item widgets accept optional `Key` parameter | AST check on constructor signatures |
| Theme access | No hardcoded colors/sizes — all via `Theme.of(context)` or const tokens | Grep for hex colors, pixel values |

### Platform-Adaptive Behavior

| Behavior | iOS | Android | Desktop |
|----------|-----|---------|---------|
| Navigation | CupertinoTabBar (optional) | Material BottomNavigationBar | KSidebar (persistent) |
| Scrolling | Bouncing scroll physics | Clamping scroll physics | Clamping + mouse wheel |
| Typography | SF Pro (system) | Roboto (system) | System default |
| Safe areas | Notch, dynamic island, home indicator | Status bar, navigation bar | Window chrome |
| Haptics | UIImpactFeedbackGenerator | HapticFeedback | N/A |
| Dialogs | CupertinoAlertDialog (optional) | AlertDialog (Material) | AlertDialog (Material) |

Platform-adaptive behavior is controlled via `KTheme.adaptivePlatform` configuration. Default: fully Material 3. Optional: Cupertino on iOS for navigation and dialogs.

### Performance Rules

| Rule | Requirement | Measurement |
|------|------------|-------------|
| Const constructors | Reduces widget rebuilds | Flutter DevTools rebuild count |
| Sliver-based scrolling | All scrollable lists with >20 items use `SliverList.builder` | Code review + performance profiling |
| AsyncValue | All async data uses Riverpod `AsyncValue` (loading/error/data) | No raw `FutureBuilder` or manual loading booleans |
| Image caching | All network images via `cached_network_image` | Grep for `Image.network` (must be 0) |
| Compile-time tokens | Fixed tokens as `static const`, not runtime `Theme.of()` | AST check for const vs runtime access |

### Design System Integration

```
design-system.yaml
  │
  └── Token compiler (flutter target)
        │
        ├── lib/theme/k_colors.dart      (static const Color values)
        ├── lib/theme/k_spacing.dart      (static const double values)
        ├── lib/theme/k_typography.dart    (static const TextStyle values)
        ├── lib/theme/k_shadows.dart      (static const BoxShadow values)
        ├── lib/theme/k_radii.dart        (static const BorderRadius values)
        ├── lib/theme/k_motion.dart       (static const Duration + Curve values)
        └── lib/theme/k_theme.dart        (ThemeData factory from above)
```

`KTheme` widget wraps `MaterialApp` and provides the generated `ThemeData`. Dark mode switching swaps the generated theme. Brand switching swaps the source theme YAML and recompiles.

---

## 7.5 Tauri Rust Extensions

### Architecture

```
kailash-prism-tauri (Rust crate)
  │
  ├── Commands (Rust functions exposed to JS via #[tauri::command])
  ├── State management (persistent window state, app preferences)
  ├── IPC bridge (type-safe serialization between Rust and TypeScript)
  └── Native integrations (file system, system tray, notifications, clipboard)
```

The Tauri Rust crate is a backend companion to the web engine. It does NOT contain UI components. All UI rendering happens in the webview using web engine React components. The Rust crate provides native capabilities that web browsers cannot access.

### Tauri 2+ Requirements

| Requirement | Specification |
|-------------|--------------|
| Tauri version | 2.x (permissions-based plugin model) |
| Rust edition | 2021 |
| Minimum Rust version | 1.77+ |
| Serialization | `serde` for all command arguments and return types |
| Error handling | `thiserror` for typed errors exposed to JS |
| Async commands | `tokio` runtime for file I/O, network, long-running tasks |

### IPC Type Safety

Type safety between Rust commands and TypeScript callers is enforced at build time via `tauri-specta`.

**Flow**:
1. Rust defines commands with typed arguments and return types using `#[tauri::command]`
2. `tauri-specta` extracts command signatures at build time and generates TypeScript type definitions
3. `useInvoke<T>` hook in web engine consumes generated types
4. TypeScript compilation fails if web code calls a command with wrong argument types

```
Rust: #[tauri::command]
      fn read_file(path: String) -> Result<FileContent, AppError>
        │
        ├── Generated: export type ReadFileArgs = { path: string }
        ├── Generated: export type ReadFileResult = FileContent
        └── Consumed: useInvoke<ReadFileResult>('read_file', { path })
```

**Verification**: CI runs both `cargo check` and `tsc --noEmit` after type generation. Any signature mismatch is caught before merge.

### Window Management

| Capability | Implementation |
|------------|---------------|
| Position persistence | Window position + size saved to local file on close, restored on open |
| Multi-window | Each window identified by label; state tracked independently |
| Maximized state | Tracked per window; restored on reopen |
| Always-on-top | Configurable per window via Rust command |
| Frameless mode | Custom `TitleBar` component replaces OS chrome; drag regions defined |

### Native APIs

Native APIs use Tauri 2 official plugins where available. Hooks wrap plugin TypeScript APIs, not raw `invoke()` calls. Custom Rust commands are used only for genuinely custom functionality not covered by official plugins.

| API | Tauri 2 Plugin / Module | TypeScript hook | Purpose |
|-----|------------------------|-----------------|---------|
| File system | `@tauri-apps/plugin-fs` | `useFs()` | Read/write/watch files without browser sandbox |
| System tray | `@tauri-apps/api/tray` | `useTray()` | Persistent app icon + context menu |
| Notifications | `@tauri-apps/plugin-notification` | `useNotify()` | OS-native notifications |
| Clipboard | `@tauri-apps/plugin-clipboard-manager` | `useClipboard()` | Read/write system clipboard |
| Global shortcuts | `@tauri-apps/plugin-global-shortcut` | `useGlobalShortcut()` | System-wide keyboard shortcuts |
| Auto-updater | `@tauri-apps/plugin-updater` | `useUpdater()` | In-app update checks and installation |
| Window state | `commands/window_state.rs` (custom) | `useWindow()` | Window position/size persistence (no official plugin) |
| App preferences | `commands/preferences.rs` (custom) | `usePreferences()` | Structured app preferences storage |

### Build Integration

Tauri build runs as an extension of the web engine build:

1. Web engine builds to `dist/` via Vite
2. Tauri CLI bundles `dist/` into webview
3. Rust backend compiles alongside
4. Output: `.dmg` (macOS), `.msi` (Windows), `.AppImage`/`.deb` (Linux)

CI builds all three platforms via GitHub Actions matrix.

---

## 7.6 Package Structure

### npm Packages

**`@kailash/prism-web`** (primary web package)

```
@kailash/prism-web
├── atoms/          # Button, Input, Select, Badge, Avatar, ...
├── molecules/      # FormField, SearchBar, Pagination, Toast, ...
├── organisms/      # DataTable, Form, Sidebar, Modal, ...
├── ai/             # ChatMessage, StreamOfThought, ActionPlan, ...
├── engines/        # DataTable engine, Form engine, Navigation engine, ...
├── templates/      # DashboardLayout, ListLayout, DetailLayout, ...
├── hooks/          # useNexus, useDataFlow, useTheme, ...
├── layouts/        # VStack, Row, Grid, Split, Layer, Scroll
├── next/           # @kailash/prism-web/next — Next.js extensions
│   ├── server/     # RSC wrappers, metadata helpers
│   ├── routing/    # App Router page factories
│   └── middleware/ # Auth, i18n, rate limiting
└── tauri/          # @kailash/prism-web/tauri — Tauri web-side extensions
    ├── hooks/      # useInvoke, useWindow, useTray, useFs
    ├── components/ # TitleBar, SystemTray, NativeDialog
    └── bridge/     # Generated IPC types
```

Import patterns:
```typescript
// Atoms and molecules — direct named imports
import { Button, Input, Badge } from '@kailash/prism-web/atoms'
import { FormField, SearchBar } from '@kailash/prism-web/molecules'

// Engines — per-engine import for tree-shaking
import { DataTableEngine } from '@kailash/prism-web/engines'
import { FormEngine } from '@kailash/prism-web/engines'

// Next.js extensions — subpath import
import { ServerDataTable } from '@kailash/prism-web/next/server'
import { createPage } from '@kailash/prism-web/next/routing'

// Tauri extensions — subpath import
import { useInvoke } from '@kailash/prism-web/tauri/hooks'
import { TitleBar } from '@kailash/prism-web/tauri/components'
```

**`@kailash/prism-compiler`** (build-time tool)

```
@kailash/prism-compiler
├── parse.ts        # Read design-system.yaml / DESIGN.md
├── web.ts          # Output: CSS vars + tailwind.config.ts
├── flutter.ts      # Output: ThemeData + Dart constants
├── validate.ts     # Constraint checks (contrast, touch targets)
└── designmd.ts     # DESIGN.md <-> design-system.yaml converter
```

Install: `npm install -D @kailash/prism-compiler` (devDependency only)

### pub.dev Package

**`kailash_prism`** (Flutter package)

```
kailash_prism
├── lib/
│   ├── atoms/          # KButton, KInput, KSelect, KBadge, ...
│   ├── molecules/      # KFormField, KSearchBar, KPagination, ...
│   ├── organisms/      # KDataTable, KForm, KSidebar, KModal, ...
│   ├── ai/             # KChatMessage, KStreamOfThought, KActionPlan, ...
│   ├── engines/        # KDataTableEngine, KFormEngine, KNavigationEngine, ...
│   ├── templates/      # KDashboardLayout, KListLayout, KDetailLayout, ...
│   ├── theme/          # KTheme, generated ThemeData, token constants
│   ├── providers/      # Riverpod providers (Nexus, DataFlow integration)
│   └── kailash_prism.dart  # Barrel export
├── test/
└── pubspec.yaml
```

Import patterns:
```dart
// Barrel import (all)
import 'package:kailash_prism/kailash_prism.dart';

// Selective imports
import 'package:kailash_prism/atoms/k_button.dart';
import 'package:kailash_prism/engines/data_table_engine.dart';
import 'package:kailash_prism/theme/k_theme.dart';
```

### crates.io Package

**`kailash-prism-tauri`** (Rust crate)

```
kailash-prism-tauri
├── src/
│   ├── commands/       # Tauri invoke commands (fs, tray, notify, ...)
│   ├── state/          # Window state persistence, app preferences
│   ├── bridge/         # Type-safe IPC bridge + TS type generation
│   └── lib.rs          # Crate root, plugin registration
└── Cargo.toml
```

### Tree-Shaking Guarantees

| Guarantee | Mechanism | Verification |
|-----------|-----------|--------------|
| Unused engines excluded | `sideEffects: false` in `package.json`, ES module exports, no barrel re-exports at root | Import 1 atom, `npx bundlesize` shows 0 engine bytes |
| Unused atoms excluded | Named exports only, no default exports, no namespace imports | Import `{ Button }`, verify other atoms absent from bundle |
| Next.js extensions excluded (non-Next projects) | Separate subpath (`/next`), not included in main entry | React SPA build shows 0 bytes from `next/` |
| Tauri extensions excluded (non-Tauri projects) | Separate subpath (`/tauri`), not included in main entry | Next.js build shows 0 bytes from `tauri/` |
| Flutter tree-shaking | Dart tree-shaking via AOT compilation, no `export` barrel that forces all imports | `flutter build --analyze-size` shows only imported widgets |

### Versioning

All packages follow semver and release in lockstep:

| Package | Registry | Version | Lockstep |
|---------|----------|---------|----------|
| `@kailash/prism-web` | npm | `X.Y.Z` | Yes |
| `@kailash/prism-compiler` | npm | `X.Y.Z` | Yes |
| `kailash_prism` | pub.dev | `X.Y.Z` | Yes |
| `kailash-prism-tauri` | crates.io | `X.Y.Z` | Yes |

**Lockstep rule**: All four packages share the same version number. A breaking change in ANY package bumps MAJOR for ALL packages. This ensures `@kailash/prism-web@2.3.0` is always compatible with `kailash_prism@2.3.0` and `kailash-prism-tauri@2.3.0`.

**Changelog convention**: When a breaking change affects only one platform (e.g., Tauri Rust crate API), the changelog entry MUST prefix the scope: "BREAKING (tauri-rs): ..." so consumers of other packages can quickly determine whether the major bump affects them.

### License

All packages: Apache 2.0, Terrene Foundation.

---

## 7.7 Internationalization (i18n)

### Message Format

All user-facing strings in Prism components use ICU MessageFormat for pluralization, gender, and select expressions. This enables proper localization for all languages without code changes.

### Platform Implementation

| Concern | Web Engine | Flutter Engine |
|---------|-----------|----------------|
| Message format library | `react-intl` (FormatJS) | `flutter_localizations` + `intl` package |
| Message extraction | `formatjs extract` CLI | `intl_utils generate` |
| Message storage | JSON files per locale in `locales/{lang}.json` | ARB files per locale in `l10n/{lang}.arb` |
| Runtime provider | `IntlProvider` wrapping app root | `MaterialApp(localizationsDelegates: [...])` |
| String access | `useIntl().formatMessage({ id: 'button.cancel' })` | `AppLocalizations.of(context).buttonCancel` |

### Component-Internal Labels

All components with user-visible text provide default English labels that are overridable via i18n:

| Component | Default labels |
|-----------|---------------|
| DataTable | "No results", "Page {page} of {total}", "{count} selected", "Search all columns" |
| Form | "Submit", "Cancel", "Reset", "Required field", "Unsaved changes" |
| Navigation | "Toggle sidebar", "Go back", "Search" |
| AI Chat | "Type a message...", "Send", "New conversation", "You're offline" |
| Pagination | "Previous", "Next", "Page {page}" |
| FileUpload | "Drop files here", "Browse", "{count} files selected" |

These labels are externalized as i18n keys. Consumer projects provide translations by including the Prism locale files alongside their own.

### Text Expansion Handling

Translated strings are often longer than English originals (German ~30%, Finnish ~40%). All containers that display translated text MUST:
- Use flexible layouts (no fixed-width text containers)
- Budget 40% horizontal overflow capacity for text containers
- Use `text-overflow: ellipsis` as a last resort when expansion exceeds container bounds
- Test with pseudo-localization (artificially expanded strings) during development

### RTL Support

See Spec 04 Section 4.5 (Directionality) for layout primitive RTL behavior. The i18n layer determines the active direction based on the current locale and sets it on the page root.

### Font Stack for Non-Latin Scripts

The typography token system supports per-locale font overrides:
- CJK (Chinese/Japanese/Korean): `"Noto Sans CJK", system-ui, sans-serif`
- Arabic: `"Noto Sans Arabic", system-ui, sans-serif`
- Devanagari: `"Noto Sans Devanagari", system-ui, sans-serif`

Font overrides are configured in `design-system.yaml` under `tokens.primitive.typography.families` with locale-keyed variants. The token compiler generates appropriate `@font-face` rules (web) or `FontFamily` declarations (Flutter).
