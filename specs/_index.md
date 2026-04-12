# Kailash Prism — Specs Index

Platform-agnostic source of truth for all Prism implementations. YAML files in this directory define the machine-readable contracts; detailed specifications live in `docs/specs/`.

## YAML Specs (Machine-Readable)

| File | Domain | Description |
|------|--------|-------------|
| `tokens/schema.yaml` | Tokens | Design token schema: categories, tiers, constraint annotations |
| `tokens/themes/enterprise.yaml` | Tokens | Enterprise theme: navy/slate professional palette |
| `tokens/themes/modern.yaml` | Tokens | Modern theme: vibrant/clean startup palette |
| `tokens/themes/minimal.yaml` | Tokens | Minimal theme: monochrome/spacious palette |
| `layouts/grammar.yaml` | Layout | Layout primitives: VStack, Row, Grid, Split, Layer, Scroll + Custom escape hatch |
| `navigation/patterns.yaml` | Navigation | Navigation patterns: sidebar, top-nav, bottom-nav, breadcrumb |
| `components/` | Components | Abstract component contracts (props, states, variants, a11y) |
| `templates/` | Templates | Page template zone definitions (dashboard, list, detail, form, etc.) |

## Detailed Specifications (docs/specs/)

| # | Document | Governs |
|---|----------|---------|
| 01 | [Design System Protocol](../docs/specs/01-design-system-protocol.md) | DESIGN.md format, design-system.yaml schema, token tiers, constraint system |
| 02 | [Token Architecture](../docs/specs/02-token-architecture.md) | Three-tier token system, compilation targets, constraint validation |
| 03 | [Component Contracts](../docs/specs/03-component-contracts.md) | Abstract component definitions, state machines, accessibility requirements |
| 04 | [Layout Grammar](../docs/specs/04-layout-grammar.md) | Layout primitives, responsive rules, zone composition |
| 05 | [Engine Specifications](../docs/specs/05-engine-specifications.md) | DataTable, Form, Navigation, Layout, Theme, AI Chat engine contracts |
| 06 | [Page Templates](../docs/specs/06-page-templates.md) | Template definitions, zone schemas, composition rules |
| 07 | [Cross-Platform Strategy](../docs/specs/07-cross-platform-strategy.md) | Two-engine model, shared/divergent boundaries, compilation targets |
| 08 | [Repo Architecture](../docs/specs/08-repo-architecture.md) | Directory structure, package boundaries, build system, distribution |
| 09 | [COC Integration](../docs/specs/09-coc-integration.md) | Loom relationship, sync manifest, variant system, artifact flow |
| 10 | [Quality Gates](../docs/specs/10-quality-gates.md) | /i-audit scoring, /i-harden checklist, automated validation |

## How to Use

- **Phase commands** (`/implement`, `/redteam`, `/codify`): Read this index, select relevant spec files, read only those.
- **Token compiler**: Reads `tokens/schema.yaml` + theme files, outputs framework-specific tokens.
- **Agents**: Include relevant spec content in delegation prompts per specs-authority rules.
