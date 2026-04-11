# Kailash Prism — Frontend Composable Engines

One design spec, four platform outputs. Prism refracts a single design specification into React, Next.js, Flutter, and Tauri implementations.

Owned by the **Terrene Foundation** (Singapore CLG). Licensed under **Apache 2.0**.

- Repository: `terrene-foundation/kailash-prism`
- Domain: `terrene.dev`
- GitHub org: `terrene-foundation`

## Architecture

Prism uses a **four-layer architecture** with a **two-engine model**.

```
Layer 1: SPECS (platform-agnostic)
  └── Design tokens, component contracts, layout grammar, navigation patterns
  └── One source, all targets. Lives in specs/

Layer 2: PRIMITIVES (per engine)
  └── Design tokens + atoms + molecules (web / flutter)
  └── Token compiler: specs/ → tailwind config + ThemeData
  └── All values token-driven, no hardcoded styling

Layer 3: ENGINES (composable)
  └── DataTable, Form, Navigation, Layout, Theme, AI Chat
  └── Each engine = organism + state management + composition logic

Layer 4: INTERFACE (rendered app)
  └── Page templates: Dashboard, List, Detail, Form, Settings, etc.
  └── Rendered via React/Next.js/Flutter/Tauri runtime
```

The four targets reduce to **two implementation engines** because Tauri's frontend IS web technology:

```
Shared Spec Layer (specs/)
  │
  ├── WEB ENGINE (React + TypeScript + Tailwind)    → web/
  │   ├── React SPA (Vite)
  │   ├── Next.js (SSR/RSC — extends React)         → web/next/
  │   └── Tauri Desktop (extends React)             → web/tauri/
  │
  └── FLUTTER ENGINE (Dart + Material 3)            → flutter/
      ├── Mobile (iOS, Android)
      ├── Desktop (macOS, Windows, Linux)
      └── Web (Flutter Web)
```

## Packages

| Package | Registry | Contents |
|---------|----------|----------|
| `@kailash/prism-web` | npm | React atoms/molecules/organisms, engines, Next.js extensions, Tauri web layer |
| `@kailash/prism-compiler` | npm | Token compiler (specs → CSS vars, tailwind config, ThemeData, Dart constants) |
| `kailash_prism` | pub.dev | Flutter atoms/molecules/organisms, engines, theme, providers |
| `kailash-prism-tauri` | crates.io | Tauri Rust extensions (IPC commands, state persistence, native bridge) |

## Directory Structure

```
kailash-prism/
├── specs/           # Platform-agnostic source of truth (tokens, contracts, grammar)
├── compiler/        # Token compiler (@kailash/prism-compiler)
├── web/             # Web engine: React + Next.js + Tauri web (@kailash/prism-web)
├── flutter/         # Flutter engine (kailash_prism)
├── tauri-rs/        # Tauri Rust extensions (kailash-prism-tauri)
├── stitch/          # Stitch integration (optional)
├── docs/specs/      # First-principles specification documents
└── workspaces/      # Analysis workspace (architecture decisions, user flows)
```

## Spec Documents

All design specifications live in `docs/specs/`. These are the authoritative references:

- `00-prism-manifest.md` — Master manifest
- `01-design-system-protocol.md` — DESIGN.md protocol
- `02-token-architecture.md` — Token system design
- `03-component-contracts.md` — Abstract component contracts
- `04-layout-grammar.md` — Layout grammar (Stack, Row, Grid, Split, Layer, Scroll)
- `05-engine-specifications.md` — Engine architecture and contracts
- `06-page-templates.md` — Page template definitions
- `07-cross-platform-strategy.md` — Platform adaptation strategy
- `08-repo-architecture.md` — Repository structure decisions
- `09-coc-integration.md` — COC artifact integration
- `10-quality-gates.md` — Quality gate definitions

## Absolute Directives

### 1. Foundation Independence

Kailash Prism is a **Terrene Foundation project** (Singapore CLG). No commercial references, no proprietary coupling. See `rules/independence.md`.

### 2. Token-Driven Design

ALL visual values MUST come from design tokens. No hardcoded colors, spacing, typography, or elevation values anywhere in component code. The token compiler is the single path from design intent to implementation.

### 3. Two Implementations, Not Four

React and Flutter are the two engines. Next.js extends React (server layer). Tauri extends React (native bridge). Do not create separate component implementations for Next.js or Tauri — they compose on top of the web engine.

### 4. Engines Are Not Components

An engine is a complete, pre-wired solution (DataTable with sort/filter/paginate/bulk actions/virtual scroll). A component is a building block. Engines compose components; they are not components themselves.

## Development Rules

### TypeScript (web/, compiler/)

- Strict mode (`strict: true` in tsconfig.json)
- No `any` types — use proper generics or `unknown`
- ES modules with explicit exports
- All components must accept a `className` prop for composition
- Maximum 200 lines per component file

### Dart (flutter/)

- Null safety enabled (sound null safety)
- Const constructors everywhere possible
- Riverpod for state management
- All widgets must accept theme overrides
- Maximum 200 lines per widget file

### Cross-Platform

- All atoms MUST consume tokens (no hardcoded values)
- Engines MUST be tree-shakeable (no monolith re-exports)
- All components MUST meet WCAG 2.1 AA accessibility
- GPU-only animations (transform, opacity, filter — no layout thrashing)
- Token compilation at build time, not runtime

### Naming

- Web atoms: PascalCase (`Button`, `Input`, `Select`)
- Flutter atoms: K-prefix PascalCase (`KButton`, `KInput`, `KSelect`)
- Engine files: kebab-case (`data-table.tsx`, `data_table_engine.dart`)
- Token files: kebab-case YAML (`enterprise.yaml`, `modern.yaml`)

## Commands

| Command | Purpose |
|---------|---------|
| `/analyze` | Analyze requirements and identify failure points |
| `/todos` | Break down implementation plan |
| `/implement` | Execute implementation |
| `/redteam` | Adversarial validation |
| `/codify` | Capture institutional knowledge |
| `/design` | Design system and UX decisions |
| `/i-audit` | Quality audit pipeline |
| `/i-polish` | Quality polish pipeline |
| `/i-harden` | Quality hardening pipeline |

## Rules Index

| Concern | Rule File |
|---------|-----------|
| Foundation independence | `rules/independence.md` |
| Security | `rules/security.md` |
| Zero tolerance | `rules/zero-tolerance.md` |
| Terrene naming | `rules/terrene-naming.md` |
| Git workflow | `rules/git.md` |
| Communication style | `rules/communication.md` |

## Kailash Platform Integration

Prism frontend engines connect to Kailash backend frameworks:

| Prism Engine | Backend Framework | Connection |
|-------------|-------------------|------------|
| DataTable engine | DataFlow | CRUD operations via REST/GraphQL |
| Form engine | DataFlow | Model validation, submission |
| Navigation engine | Nexus | Route definitions, middleware |
| AI Chat engine | Kaizen | Agent streaming, tool calls |
| Theme engine | — | Standalone (token compilation) |
| Layout engine | — | Standalone (composition grammar) |

Hooks (`useNexus`, `useDataFlow`, `useKaizen`) and providers bridge the frontend engines to backend services.
