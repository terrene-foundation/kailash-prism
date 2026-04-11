# Kailash Prism

**One design spec, four platform outputs.**

Kailash Prism is a frontend composable engine framework that refracts a single design specification into React, Next.js, Flutter, and Tauri implementations. Define your design once in platform-agnostic specs; Prism compiles them into production-ready components and engines for every target.

Part of the [Kailash](https://terrene.dev) platform by the [Terrene Foundation](https://terrene.foundation).

## Architecture

Prism is built on a four-layer architecture:

| Layer | Purpose | Location |
|-------|---------|----------|
| **Specs** | Platform-agnostic design tokens, component contracts, layout grammar | `specs/` |
| **Primitives** | Atoms and molecules per engine (Button, Input, FormField, SearchBar) | `web/src/atoms/`, `flutter/lib/atoms/` |
| **Engines** | Composable high-level solutions (DataTable, Form, Navigation, Chat) | `web/src/engines/`, `flutter/lib/engines/` |
| **Interface** | Page templates rendered via platform runtime | `web/src/templates/`, `flutter/lib/templates/` |

The four platform targets reduce to **two implementation engines**:

- **Web Engine** (React + TypeScript + Tailwind) covers React SPA, Next.js SSR/RSC, and Tauri desktop
- **Flutter Engine** (Dart + Material 3) covers iOS, Android, macOS, Windows, Linux, and Flutter Web

## Packages

| Package | Registry | Install |
|---------|----------|---------|
| `@kailash/prism-web` | npm | `npm install @kailash/prism-web` |
| `@kailash/prism-compiler` | npm | `npm install @kailash/prism-compiler` |
| `kailash_prism` | pub.dev | `flutter pub add kailash_prism` |
| `kailash-prism-tauri` | crates.io | `cargo add kailash-prism-tauri` |

## Platform Support

| Platform | Engine | Runtime |
|----------|--------|---------|
| React SPA | Web | Vite |
| Next.js | Web + SSR extensions | App Router |
| Tauri Desktop | Web + Rust bridge | Tauri v2 |
| iOS / Android | Flutter | Flutter SDK |
| macOS / Windows / Linux | Flutter | Flutter SDK |
| Flutter Web | Flutter | Flutter SDK |

## Engines

Engines are complete, pre-wired solutions — not just components. Each engine handles the full complexity of its domain:

| Engine | Capabilities |
|--------|-------------|
| **DataTable** | Sort, filter, paginate, select, bulk actions, virtual scroll, loading/empty/error states |
| **Form** | Validate, multi-step, conditional fields, submit, reset, file upload |
| **Navigation** | Sidebar, breadcrumbs, routing, responsive collapse |
| **Layout** | Stack/Row/Grid/Split composition, responsive breakpoints, zone-based templates |
| **Theme** | Token compilation, dark mode, component theming, brand switching |
| **AI Chat** | Streaming responses, tool calls, citations, action plans, conversation management |

## Quick Start

### Web (React)

```bash
npm install @kailash/prism-web @kailash/prism-compiler
```

```tsx
import { ThemeEngine } from '@kailash/prism-web/engines';
import { DataTable } from '@kailash/prism-web/engines';
import { Button } from '@kailash/prism-web/atoms';

function App() {
  return (
    <ThemeEngine theme="enterprise">
      <DataTable
        columns={columns}
        data={data}
        sortable
        filterable
        paginated
      />
    </ThemeEngine>
  );
}
```

### Flutter

```bash
flutter pub add kailash_prism
```

```dart
import 'package:kailash_prism/engines/data_table_engine.dart';
import 'package:kailash_prism/engines/theme_engine.dart';

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return KThemeEngine(
      theme: 'enterprise',
      child: KDataTableEngine(
        columns: columns,
        data: data,
        sortable: true,
        filterable: true,
      ),
    );
  }
}
```

## Design Specifications

The `docs/specs/` directory contains the complete first-principles specifications:

- Design system protocol and DESIGN.md format
- Token architecture and theme system
- Component contracts (props, states, variants, accessibility)
- Layout grammar (Stack, Row, Grid, Split, Layer, Scroll)
- Engine specifications and composition patterns
- Page template definitions
- Cross-platform adaptation strategy

## License

Apache 2.0 -- Copyright Terrene Foundation (Singapore CLG)

See [LICENSE](LICENSE) for details.
