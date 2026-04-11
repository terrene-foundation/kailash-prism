# Architecture Decision: kailash-prism — Frontend Composable Engine

## The Name: Prism

**`kailash-prism`** — One design spec (white light) refracts into React, Next.js, Flutter, and Tauri (the spectrum). A prism doesn't create new light; it reveals what was always there in different forms. One DESIGN.md, four platform outputs.

- `npm install @kailash/prism-web` (React + Next.js + Tauri web layer)
- `flutter pub add kailash_prism` (Flutter)
- `cargo add kailash-prism-tauri` (Tauri Rust extensions)

## Decision

Build **kailash-prism** as a standalone Kailash framework repo with the same relationship to loom/ as kailash-py and kailash-rs. It contains composable frontend engines built from primitives, covering all four targets simultaneously.

```
loom/.claude/ (source of truth)
  ├── Global + variants/py/  → kailash-coc-claude-py  → kailash-py
  ├── Global + variants/rs/  → kailash-coc-claude-rs  → kailash-rs
  ├── Global + variants/rb/  → kailash-coc-claude-rb  → (ruby projects)
  └── Global + variants/prism/ → kailash-coc-claude-prism → kailash-prism  ← NEW
```

## The Two-Engine Insight

The four targets reduce to **two implementation engines** because Tauri's frontend IS web:

```
Shared Spec Layer (DESIGN.md, layout grammar, component contracts)
  │
  ├── WEB ENGINE (React components + TypeScript + Tailwind)
  │   ├── React (SPA — Vite/CRA)
  │   ├── Next.js (SSR/RSC — extends React with server layer)
  │   └── Tauri (Desktop — extends React with Rust IPC bridge)
  │
  └── FLUTTER ENGINE (Flutter widgets + Dart + Material 3)
      ├── Mobile (iOS, Android)
      ├── Desktop (macOS, Windows, Linux)
      └── Web (Flutter Web — alternative to React for some use cases)
```

This means: **2 component implementations, not 4.** Next.js adds server extensions to React components. Tauri adds native bridge extensions. Both use the same atoms, molecules, and organisms. Only the integration layer differs.

## Four-Layer Architecture

```
Layer 1: SPECS
  └── DESIGN.md protocol, component contracts, layout grammar, design-system.yaml
  └── Platform-agnostic. One source, all targets.

Layer 2: PRIMITIVES
  └── Design tokens + atoms + molecules (per engine: web / flutter)
  └── Token compiler: design-system.yaml → tailwind.config.ts + ThemeData
  └── Consistency-enforcing: no hardcoded values, all token-driven

Layer 3: ENGINES (the composable part)
  └── DataTable engine, Form engine, Navigation engine, Layout engine,
      Theme engine, AI Chat engine
  └── Each engine = organism + state management + composition logic
  └── COC agent orchestration: updated specialists, /scaffold, composition grammar

Layer 4: INTERFACE
  └── Rendered app via React/Next.js/Flutter/Tauri runtime
  ���── Page templates: DashboardLayout, ListLayout, DetailLayout, etc.
```

### What Makes Engines Different from Components

A component library gives you a Button. An **engine** gives you a complete DataTable with sorting, filtering, pagination, virtual scrolling, bulk actions, loading/empty/error states, responsive behavior, and accessibility — all pre-wired. You configure it; it handles the complexity.

| Engine | What it handles | Equivalent Backend |
|--------|----------------|-------------------|
| DataTable engine | Sort, filter, paginate, select, bulk actions, virtual scroll | DataFlow CRUD |
| Form engine | Validate, multi-step, conditional, submit, reset, file upload | DataFlow model validation |
| Navigation engine | Sidebar, breadcrumbs, routing, responsive collapse | Nexus routing |
| Layout engine | Stack/Row/Grid/Split, responsive breakpoints, zone composition | Core SDK WorkflowBuilder |
| Theme engine | Token compilation, dark mode, component theming, brand switching | Runtime configuration |
| AI Chat engine | Streaming, tool calls, citations, action plans, conversation mgmt | Kaizen agent framework |

These are composable — you pick which engines your project needs, just like `pip install kailash-nexus` vs `pip install kailash-kaizen`.

## Repo Structure

```
kailash-prism/
├── specs/                              # Platform-agnostic source of truth
│   ├── tokens/
│   │   ├── schema.yaml                 # Token schema with constraint annotations
│   │   └── themes/
│   │       ├── enterprise.yaml         # Navy/slate professional
│   │       ├── modern.yaml             # Vibrant/clean startup
│   │       └── minimal.yaml            # Monochrome/spacious
│   ├── components/                     # Abstract component contracts
│   │   ├── button.yaml                 # Props, states, variants, a11y requirements
│   │   ├── data-table.yaml
│   │   └── ... (one per component)
│   ├── templates/                      # Page template definitions
│   │   ├── dashboard.yaml              # Zones: stats, charts, activity
│   │   ├── list.yaml                   # Zones: filter, content, footer
│   │   ├── detail.yaml                 # Zones: header, tabs, content
│   │   ├── form.yaml                   # Zones: header, sections, actions
│   │   ├── settings.yaml               # Zones: nav, sections
│   │   ├── auth.yaml                   # Zones: branding, card
│   │   ├── conversation.yaml           # Zones: sidebar, messages, panel
│   │   ├── split.yaml                  # Zones: master, detail
│   │   ├── wizard.yaml                 # Zones: steps, content, nav
│   │   ├── kanban.yaml                 # Zones: columns
│   ��   └── calendar.yaml               # Zones: grid, detail
│   ├── layouts/
│   │   └── grammar.yaml                # Stack, Row, Grid, Split, Layer, Scroll
│   └── navigation/
│       └── patterns.yaml               # Sidebar, top-nav, bottom-nav, breadcrumb
│
├── compiler/                           # Token compiler (specs → framework tokens)
│   ├── src/
│   │   ├── parse.ts                    # Read design-system.yaml / DESIGN.md
│   │   ├── web.ts                      # → CSS vars + tailwind.config.ts
│   │   ├── flutter.ts                  # → ThemeData + Dart constants
│   │   ├── validate.ts                 # Constraint checks (contrast, touch targets)
│   │   └── designmd.ts                 # DESIGN.md ↔ design-system.yaml converter
│   └── package.json                    # @kailash/prism-compiler
│
├── web/                                # Web engine (React-based)
│   ├── src/
│   │   ├── atoms/                      # Button, Input, Select, Badge, Avatar, ...
│   │   ├── molecules/                  # FormField, SearchBar, Pagination, Toast, ...
│   │   ├── organisms/                  # DataTable, Form, Sidebar, Modal, ...
│   │   ├── ai/                         # ChatMessage, StreamOfThought, ActionPlan, ...
│   │   ├── engines/                    # High-level composable engines
│   │   │   ├── data-table.tsx          # Full DataTable engine (sort/filter/page/bulk)
│   │   │   ├── form.tsx                # Full Form engine (validate/step/conditional)
│   │   │   ├── navigation.tsx          # Sidebar + breadcrumb + routing
│   │   │   ├── layout.tsx              # Stack/Row/Grid/Split responsive system
│   │   │   ├── theme.tsx               # Token provider + dark mode + brand switching
│   │   │   └── chat.tsx                # AI conversation engine (stream/tools/citations)
│   │   ├── templates/                  # DashboardLayout, ListLayout, etc.
│   │   └── hooks/                      # useNexus, useDataFlow, useTheme, ...
│   ├── next/                           # Next.js extensions
│   │   ├── server/                     # RSC wrappers, metadata helpers
│   │   ├── routing/                    # App Router page factories
│   │   └── middleware/                 # Auth, i18n, rate limiting
│   ├── tauri/                          # Tauri extensions
│   │   ├── hooks/                      # useInvoke, useWindow, useTray, useFs
│   │   ├── components/                 # TitleBar, SystemTray, NativeDialog
│   │   └── bridge/                     # Rust IPC type generation
│   ├── package.json                    # @kailash/prism-web
│   └── tsconfig.json
│
├── flutter/                            # Flutter engine
│   ├── lib/
│   │   ├── atoms/                      # KButton, KInput, KSelect, KBadge, ...
│   │   ├── molecules/                  # KFormField, KSearchBar, KPagination, ...
│   │   ├── organisms/                  # KDataTable, KForm, KSidebar, KModal, ...
│   │   ├── ai/                         # KChatMessage, KStreamOfThought, ...
│   │   ├── engines/                    # Composable engine widgets
│   │   │   ├── data_table_engine.dart
│   │   │   ├── form_engine.dart
│   │   │   ├── navigation_engine.dart
│   │   │   ├── layout_engine.dart
│   │   │   ├── theme_engine.dart
│   │   │   └── chat_engine.dart
│   │   ├── templates/                  # KDashboardLayout, KListLayout, ...
│   │   ├── theme/                      # Generated ThemeData from specs
│   │   └── providers/                  # Riverpod providers (Nexus, DataFlow)
│   ├── test/
│   └── pubspec.yaml                    # kailash_prism
│
├── tauri-rs/                           # Tauri Rust-side extensions
│   ├── src/
│   │   ├── commands/                   # Tauri invoke commands
│   │   ├── state/                      # Window state persistence
│   │   └── bridge/                     # Type-safe IPC bridge
│   └── Cargo.toml                      # kailash-prism-tauri
│
├── stitch/                             # Stitch integration (optional accelerator)
│   ├── normalizer.ts                   # Stitch output → design-system.yaml
│   └── mcp-config.yaml
│
└── .claude/                            # Will be populated by loom sync
    └── CLAUDE.md
```

## Sync Manifest Extension

```yaml
# Add to loom/.claude/sync-manifest.yaml
repos:
  prism:
    build: kailash-prism
    template: kailash-coc-claude-prism
    variant: prism
    description: Kailash Prism — Frontend composable engines (React, Next.js, Flutter, Tauri)
```

## How kailash-py/rs Users Access Prism

Prism skills sync to ALL templates (global COC tier), so agents working in kailash-py or kailash-rs projects already know how to:
1. Install `@kailash/prism-web` or `kailash_prism`
2. Read/generate a DESIGN.md
3. Use the composition grammar to scaffold frontend pages
4. Connect to Nexus API endpoints using generated hooks

The existing `skills/11-frontend-integration/` gets restructured: the global version teaches "how to integrate Prism with your Kailash backend." The prism variant teaches "how to build Prism components and engines."

## Loom Variant Structure

```
loom/.claude/variants/prism/
├── agents/frontend/
│   ├── react-specialist.md          # Enhanced: Prism component composition
│   ├── flutter-specialist.md        # Enhanced: Prism widget composition
│   └── prism-architect.md           # NEW: cross-platform engine design
├── skills/
│   ├── 11-frontend-integration/
│   │   ├── SKILL.md                 # Prism-focused (not backend integration)
│   │   └── composition-grammar.md   # YAML layout grammar reference
│   ├── XX-prism-engines/            # NEW: engine documentation
│   │   ├── SKILL.md
│   │   ├── data-table-engine.md
│   │   ├── form-engine.md
│   │   ├── navigation-engine.md
│   │   ├── layout-engine.md
│   │   ├── theme-engine.md
│   │   └── chat-engine.md
│   └── XX-prism-specs/              # NEW: DESIGN.md protocol + token system
│       ├── SKILL.md
│       ├── design-system-protocol.md
│       └── token-architecture.md
├── commands/
│   ├── scaffold.md                  # /scaffold for Prism projects
│   └── sync.md                      # Prism-specific sync behavior
└── rules/
    └── prism-patterns.md            # Component authoring rules
```

## Performance Architecture

### Web Engine (React)
- **Tree-shakeable**: ES modules, barrel exports with sideEffects: false
- **Code-split**: Each engine lazy-loadable via React.lazy()
- **RSC-first**: Server components default in Next.js; client boundary explicit
- **Virtual rendering**: DataTable uses @tanstack/virtual for 100K+ rows
- **Optimistic updates**: React Query mutations with rollback built into hooks
- **Bundle**: <50KB gzipped for atoms+molecules; engines loaded on demand

### Flutter Engine
- **Const constructors** everywhere (widget rebuild optimization)
- **Sliver-based scrolling** for large lists (CustomScrollView + SliverList.builder)
- **Riverpod AsyncValue** for loading/error/data state machine
- **Platform-adaptive**: CupertinoButton on iOS, Material on Android (configurable)
- **Compile-time tokens**: Static const values, no runtime theme lookup for fixed tokens
- **Tree-shaking**: Only import what you use; no monolith package

### Tauri Extensions
- **IPC batching**: Minimize Rust↔JS boundary crossings
- **Window state persistence**: Position, size, maximized state remembered
- **Native file system**: No browser sandbox; direct Rust fs access via invoke
- **Background processing**: Heavy computation in Rust, UI updates via events
- **System tray**: Persistent app presence without window

### Cross-Platform
- **Token compilation at build time** (not runtime lookups)
- **GPU-only animations**: transform, opacity, filter (no layout thrashing)
- **Image optimization**: Next.js Image, Flutter cached_network_image, Tauri asset protocol
- **Lazy page loading**: Route-based code splitting (all platforms)

## Scalability Architecture

### Token System Scales
```
Single brand   →  1 theme file     →  ~250 tokens
Multi-brand    →  N theme files    →  ~250 × N tokens
White-label    →  Runtime switching →  Theme engine handles
```

### Component Library Scales
```
MVP            →  46 primitives    →  80% enterprise SaaS coverage
Full           →  120+ primitives  →  95% coverage + AI patterns
Industry       →  Custom engines   →  Healthcare, fintech, logistics
```

### Platform Targets Scale
```
Current        →  React, Next.js, Flutter, Tauri
Future         →  SwiftUI, Compose (new engines, same specs)
Experimental   →  WASM-direct (kailash-rs WASM + Prism specs)
```

The spec layer is the stable core. New platforms add new engines without changing specs or existing engines.

## Relationship Summary

| Concern | Where It Lives |
|---------|---------------|
| Design system protocol, composition grammar (COC artifacts) | loom/.claude/ (synced to all) |
| Prism-specific skills, agents, commands (COC artifacts) | loom/.claude/variants/prism/ |
| Component implementations, engines, token compiler (CODE) | kailash-prism/ |
| Template for Prism developers (COC distribution) | kailash-coc-claude-prism/ |
| Frontend integration for py/rs users (COC guidance) | loom/.claude/skills/11-frontend-integration/ (global) |
