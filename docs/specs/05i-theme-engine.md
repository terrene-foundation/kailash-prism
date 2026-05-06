# Theme Engine (§5.5)

> Spec version: 0.1.0 | Status: DRAFT | Parent: [05 Engine Specifications](05-engine-specifications.md)

---

## 5.5 Theme Engine

**Purpose**: Loads design tokens from `design-system.yaml`, injects them as CSS custom properties (web) or `ThemeData` (Flutter), and manages dark mode switching and brand switching at runtime.

### Props/Configuration

```typescript
interface ThemeEngineConfig {
  // Token source
  tokens: DesignSystemYaml; // Parsed design-system.yaml (all three tiers).

  // Initial theme
  defaultTheme?: string; // Theme name. Default: "enterprise" (first available theme).
  defaultMode?: "light" | "dark" | "system"; // Default: "system".

  // Behavior
  persistPreference?: boolean; // Default: true. Saves theme + mode to storage.
  storageKey?: string; // Default: "prism:theme".
  transitionDuration?: number; // Duration of theme switch animation in ms. Default: 200.

  // Per-page overrides
  pageOverrides?: Record<string, Partial<TokenOverrides>>; // Keyed by route path.
}

interface TokenOverrides {
  // Any Tier 2 or Tier 3 token can be overridden per page.
  // Example: a marketing page may use larger heading sizes.
  [tokenPath: string]: string | number;
}
```

### Internal State

| State              | Type                      | Description                                                              |
| ------------------ | ------------------------- | ------------------------------------------------------------------------ |
| `activeTheme`      | `string`                  | Name of the currently active theme (e.g., "enterprise", "modern").       |
| `activeMode`       | `"light" \| "dark"`       | Resolved color mode (never "system" — always resolved to light or dark). |
| `systemPreference` | `"light" \| "dark"`       | OS-level color scheme preference.                                        |
| `resolvedTokens`   | `ResolvedTokenMap`        | Fully resolved token values for the active theme + mode combination.     |
| `cssVariables`     | `Record<string, string>`  | (Web only) Map of CSS custom property names to values.                   |
| `themeData`        | `ThemeData`               | (Flutter only) Generated Flutter ThemeData.                              |
| `activeOverrides`  | `Partial<TokenOverrides>` | Currently applied per-page overrides.                                    |

### Events/Callbacks

| Event                      | Payload                                              | When Emitted                                               |
| -------------------------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| `onThemeChange`            | `{ from: string; to: string }`                       | Active theme changes (brand switch).                       |
| `onModeChange`             | `{ from: "light" \| "dark"; to: "light" \| "dark" }` | Color mode changes.                                        |
| `onSystemPreferenceChange` | `"light" \| "dark"`                                  | OS color scheme preference changes.                        |
| `onTokensResolved`         | `ResolvedTokenMap`                                   | Token resolution completes (initial load or after switch). |

### Composition Points

| Slot          | Purpose                              | Default                                       |
| ------------- | ------------------------------------ | --------------------------------------------- |
| `modeToggle`  | Custom mode toggle component.        | Toggle switch with sun/moon icons.            |
| `themePicker` | Custom theme/brand picker component. | Dropdown with theme names and color swatches. |

### Performance Contract

- **Token resolution**: Resolving all tokens for a theme + mode combination MUST complete in < 5ms. Token count varies by theme complexity (typically 200-500 for the three tiers combined).
- **CSS variable injection** (web): Setting all CSS custom properties on `document.documentElement` MUST complete in < 2ms.
- **ThemeData generation** (Flutter): Generating `ThemeData` from resolved tokens MUST complete in < 10ms.
- **Theme switch**: Full theme switch (resolve + inject + repaint) MUST complete within 200ms. No flash of unstyled content.
- **Initial load**: Theme MUST be resolved and applied before first paint. On web, critical CSS variables are inlined in the HTML `<head>` as a `<style>` block to prevent flash.

### Accessibility Contract

- **Contrast compliance** (target): Theme tokens SHOULD be authored such that text/background combinations meet WCAG 2.1 AA contrast ratios: 4.5:1 for normal text (< 18px or < 14px bold), 3:1 for large text (>= 18px or >= 14px bold). The token schema declares an optional `contrast_min` field per palette entry (`compiler/src/types.ts:56`); however, no `contrast_min` validator/enforcement function exists in `compiler/` or `web/` as of this revision. Authoring discipline is the only current safeguard; an automated validator is reserved for future work.
- **Mode toggle**: Accessible label: "Switch to dark mode" or "Switch to light mode" based on current state.
- **Reduced motion**: When `prefers-reduced-motion: reduce` is detected, all theme transition animations are replaced with instant switches (duration: 1ms, not 0ms for rendering guarantees).
- **Focus visibility**: Focus rings MUST maintain 3:1 contrast against their background in both light and dark modes. The focus ring token is part of the theme.

### Responsive Contract

The Theme Engine has no breakpoint-specific behavior. Token values are constant across breakpoints. Responsive spacing and layout changes are handled by the Layout Engine (Spec 5.4) and the spacing tokens in Spec 04.

Exception: `spacing.page.margin` and `spacing.section.gap` are responsive tokens. The Theme Engine resolves these per-breakpoint values; the Layout Engine applies them.

### Token Loading Process

1. At build time, the token compiler reads `design-system.yaml` and generates:
   - **Web**: A TypeScript module exporting token maps per theme per mode, plus a CSS file with all custom properties.
   - **Flutter**: A Dart file exporting `ThemeData` factories per theme per mode, plus constant color/spacing/typography classes.

2. At runtime, the Theme Engine:
   - Reads the user's persisted preference (theme + mode) from storage.
   - If no preference, reads OS `prefers-color-scheme`.
   - Resolves the token set for the determined theme + mode.
   - Injects the resolved tokens (CSS variables on web, ThemeData on Flutter).
   - Listens for OS preference changes and user-initiated switches.

### CSS Variable Injection (Web)

Token paths map to CSS custom property names by replacing dots with dashes and prefixing with `--prism-`:

```
color.interactive.primary -> --prism-color-interactive-primary
spacing.component.padding -> --prism-spacing-component-padding
radius.component.default  -> --prism-radius-component-default
```

All component CSS references these variables:

```css
.prism-button-primary {
  background-color: var(--prism-color-interactive-primary);
  padding: 0 var(--prism-spacing-component-padding);
  border-radius: var(--prism-radius-component-default);
}
```

### ThemeData Generation (Flutter)

The token compiler generates a `PrismTheme` class that extends `ThemeData`:

```dart
ThemeData prismTheme({
  required String theme,
  required Brightness brightness,
}) {
  final tokens = resolveTokens(theme, brightness);
  return ThemeData(
    brightness: brightness,
    colorScheme: ColorScheme(
      primary: tokens.color.interactive.primary,
      onPrimary: tokens.color.text.onPrimary,
      surface: tokens.color.surface.page,
      // ... all semantic color tokens mapped
    ),
    textTheme: TextTheme(
      displayLarge: TextStyle(fontSize: tokens.type.heading.h1.size, ...),
      // ... all type tokens mapped
    ),
    // ... spacing, radius, shadow via ThemeExtension
  );
}
```

### Dark Mode Switching

**Exact behavior**:

1. User clicks mode toggle (or system preference changes when mode is "system").
2. Theme Engine resolves the new token set (same theme, different mode).
3. **Web**: CSS transition is applied to `background-color` and `color` on `:root` with duration `transitionDuration`. CSS variables are updated on `document.documentElement.style`. The transition creates a smooth fade.
4. **Flutter**: `AnimatedTheme` widget wraps the app with `duration: transitionDuration`. The new `ThemeData` is set, triggering a smooth rebuild.
5. Preference is saved to storage (if `persistPreference: true`).

**System preference detection**:

- Web: `window.matchMedia('(prefers-color-scheme: dark)')` with `addEventListener('change', ...)`.
- Flutter: `MediaQuery.of(context).platformBrightness`.

### Brand Switching

**Exact behavior**:

1. User selects a new theme from the theme picker.
2. Theme Engine resolves all tokens for the new theme + current mode.
3. **Web**: All CSS variables are updated simultaneously. A `data-theme` attribute is set on `<html>` for any theme-specific CSS selectors.
4. **Flutter**: New `ThemeData` is generated and set, triggering a full rebuild.
5. Preference is saved to storage.

Brand switching changes ALL token values (colors, typography, spacing if different, radius, shadows). It is a complete visual transformation.

### Token Override (Per-Page or Per-Component)

Overrides are scoped via CSS specificity (web) or `Theme` widget nesting (Flutter).

**Web**: A `<div data-prism-overrides>` wrapper with inline CSS custom properties:

```html
<div
  style="--prism-type-heading-h1-size: 48px; --prism-spacing-page-margin: 48px;"
>
  <!-- Marketing page with larger headings and margins -->
</div>
```

**Flutter**: A nested `Theme` widget with modified `ThemeData`:

```dart
Theme(
  data: Theme.of(context).copyWith(
    textTheme: Theme.of(context).textTheme.copyWith(
      displayLarge: TextStyle(fontSize: 48),
    ),
  ),
  child: MarketingPage(),
)
```

Overrides cascade: component-level overrides take precedence over page-level overrides, which take precedence over theme defaults.

---

### Change log

- **2026-05-06** — Phantom-citation correction in Accessibility Contract: the WCAG contrast-compliance entry was originally `"The constraint validator MUST verify that all text/background combinations meet WCAG 2.1 AA contrast ratios"`. No such validator exists in `compiler/` or `web/` — the `contrast_min` field is declared in `compiler/src/types.ts:56` and used in a test fixture (`compiler/src/compile.test.ts:61`), but no enforcement function reads it. Per `rules/spec-accuracy.md` Rule 1 (every citation resolves against working code), the MUST was downgraded to a SHOULD/authoring-discipline target with an explicit "automated validator is reserved for future work" note. Surfaced by `/sweep` Sweep 5 supplemental, 2026-05-06 (`SWEEP-2026-05-06.md`).
