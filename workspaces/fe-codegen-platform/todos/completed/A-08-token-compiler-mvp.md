# A-08: Token Compiler MVP

## Priority: CRITICAL (unblocks Workstreams B/C)
## Source: Plan Workstream A, line 21-24

## Description

Build the @kailash/prism-compiler MVP that reads design-system.yaml (enterprise theme) and outputs:
1. tailwind.config.ts + CSS custom properties (web)
2. ThemeData + Dart constants (flutter)

## Acceptance Criteria

1. Parses specs/tokens/themes/enterprise.yaml
2. Validates against specs/tokens/schema.yaml structure
3. Outputs valid tailwind.config.ts with all token values mapped
4. Outputs valid CSS custom properties file (--prism-{path} naming)
5. Outputs valid Flutter ThemeData Dart file
6. Outputs valid Dart constants file
7. Reports constraint violations (contrast ratios, touch targets)
8. CLI: `npx prism-compile --theme enterprise --target web`
9. CLI: `npx prism-compile --theme enterprise --target flutter`

## Scope (MVP only)

- Enterprise theme only (modern/minimal deferred to full compiler)
- No DESIGN.md conversion (deferred)
- No constraint validation beyond basic structure (deferred)
- Focus: parse YAML, emit valid framework-specific token files
