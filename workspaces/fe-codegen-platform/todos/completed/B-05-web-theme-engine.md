# B-05: Web Theme Engine

## Priority: CRITICAL (all components consume tokens via Theme engine)
## Source: Plan Sprint B1; docs/specs/05-engine-specifications.md § 5.5

## Description

Build the Theme engine — token provider, CSS variable injection, dark mode toggle, brand switching. This engine provides the token context that ALL atoms, molecules, organisms, and other engines consume. Must be built first.

## Acceptance Criteria

1. ThemeProvider component wraps the app and injects CSS custom properties
2. useTheme() hook returns current theme tokens and mode
3. Dark mode toggle with prefers-color-scheme detection
4. Brand switching (swap entire theme at runtime)
5. CSS variable naming: --prism-{path} convention from compiler output
6. Loads compiled prism-tokens.css from compiler output
7. TypeScript types for all theme tokens
8. Tests: unit tests for provider, hook, mode switching
