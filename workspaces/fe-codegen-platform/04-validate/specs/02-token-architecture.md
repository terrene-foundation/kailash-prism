# 02 Token Architecture Specification

Spec version: 0.1.0 | Status: DRAFT | Governs: Three-tier token system, compilation targets, constraint validation

---

## 2.1 Tier 1: Primitive Tokens

Primitive tokens are the raw value scales that define the universe of valid values. No semantic meaning is attached at this tier. The naming convention is `{category}.raw.{name}`.

### 2.1.1 Color Primitives

Color primitives are an enumerated palette. Every color used anywhere in the design system MUST exist as a primitive.

Naming convention: `color.raw.{hue}-{shade}` where `{hue}` is the color family name and `{shade}` is a numeric lightness indicator (50-950 in increments of 50 or 100).

Required color families (MUST have at least 3 shades each spanning light to dark):

| Family | Purpose | Minimum Shades |
|--------|---------|---------------|
| `blue` (or brand primary hue) | Interactive elements | 3 (light, default, dark) |
| `gray` (or neutral) | Text, borders, surfaces | 6 (50, 100, 200, 300, 500, 900 minimum) |
| `red` | Destructive, error | 3 |
| `green` | Success | 3 |
| `amber` | Warning | 3 |

Additional families are permitted. The special value `white` (alias for `#FFFFFF`) and `black` (alias for `#000000`) are implicit primitives that need not be declared.

Constraints:
- Every value MUST be a 6-digit hex code: `^#[0-9A-Fa-f]{6}$`
- Within a hue family, lower shade numbers MUST have higher luminance (lighter) than higher shade numbers. Luminance is computed using WCAG relative luminance formula: `L = 0.2126 * R_lin + 0.7152 * G_lin + 0.0722 * B_lin` where `R_lin`, `G_lin`, `B_lin` are the sRGB channels linearized via the standard gamma formula
- The palette MUST contain at least 15 distinct colors and no more than 80

### 2.1.2 Spacing Primitives

A strictly ascending scale of positive integers. Every value MUST be divisible by 4.

Naming convention: `spacing.raw.{value}` (e.g., `spacing.raw.4`, `spacing.raw.8`)

Required scale (these exact values MUST be present; additional values are permitted):

```
[4, 8, 12, 16, 24, 32, 48, 64]
```

Constraints:
- Minimum value: 4
- Maximum value: no limit, but values above 128 are unusual and SHOULD have explicit justification in the `usage` field
- The scale MUST be strictly ascending: each value > the previous
- Every value MUST be divisible by 4
- The scale MUST contain at least 6 values

### 2.1.3 Typography Primitives

Typography primitives define the raw scales for font families, font sizes, font weights, and line heights.

**Font Families**

Naming convention: `typography.raw.family.{name}` (e.g., `typography.raw.family.sans`)

Required families:
- `sans`: A sans-serif family. MUST be present.
- `mono`: A monospace family. MUST be present.

Optional: `serif`, `display`, or other named families.

Each family value is a CSS font-family string (e.g., `"Inter, system-ui, sans-serif"`).

**Font Size Scale**

Naming convention: `typography.raw.size.{value}` (e.g., `typography.raw.size.14`)

The size scale MUST:
- Contain at least 8 values
- Be strictly ascending
- Include a value in the range [14, 18] (body text range)
- Include a value >= 28 (heading range)
- Include a value in the range [10, 13] (caption range)
- All values are positive integers representing pixels

Recommended scale following a modular ratio (Major Third = 1.25):
```
[10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 45, 57]
```

The exact values need not follow a mathematical ratio, but the scale MUST be strictly ascending and the gaps between adjacent values MUST NOT exceed a 2x ratio (i.e., no value may be more than double the preceding value).

**Font Weight Scale**

Naming convention: `typography.raw.weight.{value}` (e.g., `typography.raw.weight.400`)

Values MUST be multiples of 100 in the range [100, 900].

Required weights (these exact values MUST be present):
```
[400, 500, 600, 700]
```

Additional weights (300, 800, 900) are permitted.

**Line Height Scale**

Naming convention: `typography.raw.line-height.{value}` (e.g., `typography.raw.line-height.1.5`)

Values are unitless ratios (multiplied by font size to compute line height in pixels).

Required values (these exact values MUST be present):
```
[1.25, 1.4, 1.5]
```

Additional values in range [1.0, 2.0] are permitted. The scale MUST be strictly ascending.

### 2.1.4 Radius Primitives

Naming convention: `radius.raw.{value}` (e.g., `radius.raw.4`, `radius.raw.9999`)

A strictly ascending scale of non-negative integers.

Required values:
```
[0, 9999]
```

The value `0` represents no rounding. The value `9999` represents fully rounded (pill shape). At least 3 additional values between 0 and 9999 MUST be present.

Example:
```
[0, 2, 4, 8, 12, 16, 9999]
```

Constraints:
- All values MUST be non-negative integers
- The scale MUST contain at least 5 values (including 0 and 9999)
- The scale MUST be strictly ascending

### 2.1.5 Shadow Primitives

Naming convention: `shadow.raw.{name}` (e.g., `shadow.raw.sm`, `shadow.raw.lg`)

Each shadow value is either the string `"none"` or a CSS box-shadow value string.

Required shadows:

| Name | Constraint |
|------|-----------|
| `none` | MUST equal the string `"none"` |
| `sm` | Blur radius MUST be <= 4px |
| `md` | Blur radius MUST be > sm blur and <= 10px |
| `lg` | Blur radius MUST be > md blur and <= 20px |
| `xl` | Blur radius MUST be > lg blur |

Each shadow value (except `none`) MUST conform to the format:
```
{offset-x}px {offset-y}px {blur-radius}px {spread-radius}px rgba({r}, {g}, {b}, {a})
```

Where:
- `offset-x` and `offset-y` are integers (positive, negative, or zero)
- `blur-radius` is a non-negative integer
- `spread-radius` is an integer (positive, negative, or zero)
- `r`, `g`, `b` are integers in [0, 255]
- `a` is a decimal in range (0.0, 1.0) exclusive of 0.0 (fully transparent shadows are meaningless) and exclusive of 1.0 (opaque shadows look unnatural)

Composite shadows (multiple shadows separated by commas) are permitted.

### 2.1.6 Motion Primitives

**Duration Scale**

Naming convention: `motion.raw.duration.{value}` (e.g., `motion.raw.duration.150`)

A strictly ascending scale of non-negative integers representing milliseconds.

Required values:
```
[0, 100, 150, 200, 300, 500]
```

The value `0` represents no animation. Additional values are permitted. Maximum permitted value is 2000ms (animations longer than 2 seconds are not motion tokens but orchestrated sequences).

**Easing Functions**

Naming convention: `motion.raw.easing.{name}` (e.g., `motion.raw.easing.default`)

Required easings:

| Name | Value | Purpose |
|------|-------|---------|
| `linear` | `linear` | Constant speed, used for progress bars and reduced-motion |
| `default` | A `cubic-bezier()` value | Standard easing for most interactions |
| `emphasize` | A `cubic-bezier()` value | Emphasizing entrances and layout shifts |
| `decelerate` | A `cubic-bezier()` value | Elements entering the screen |
| `accelerate` | A `cubic-bezier()` value | Elements leaving the screen |

Each value MUST be either `linear` or match `^cubic-bezier\(\s*-?[\d.]+\s*,\s*-?[\d.]+\s*,\s*-?[\d.]+\s*,\s*-?[\d.]+\s*\)$`.

### 2.1.7 Breakpoint Primitives

Naming convention: `breakpoint.raw.{name}` (e.g., `breakpoint.raw.tablet`)

Values are non-negative integers representing the minimum viewport width in pixels.

Required breakpoints (exact names, exact order):

| Name | Value Constraint | Purpose |
|------|-----------------|---------|
| `mobile` | MUST equal `0` | Base breakpoint, smallest viewports |
| `tablet` | MUST equal `768` | Tablet portrait, phone landscape |
| `desktop` | MUST equal `1024` | Standard desktop |
| `wide` | MUST equal `1440` | Wide desktop, large monitors |

Constraints:
- Values MUST be strictly ascending: `mobile < tablet < desktop < wide`
- Exactly 4 breakpoints are REQUIRED. Additional breakpoints are NOT permitted (to ensure consistent responsive behavior across all components)

---

## 2.2 Tier 2: Semantic Tokens

Semantic tokens assign intent to primitive values. They are the primary tokens consumed by the LLM during code generation. Naming convention: `{category}.{intent}.{variant}`.

Semantic tokens MUST reference Tier 1 primitive values. The reference syntax is `$primitive.{path}` (e.g., `$primitive.color.raw.blue-600`). Literal values that exist in the primitive scale are also permitted (e.g., `16` is valid for spacing if 16 is in `spacing.raw`).

### 2.2.1 Color Semantics

Every semantic color token MUST specify:
- `value`: Reference to a primitive color (for the default/light theme)
- `usage`: String describing when to use this color
- `contrast_min`: Minimum contrast ratio (decimal, e.g., 4.5) against its expected background. OPTIONAL; defaults to no constraint. When present, the compiler validates this pair.

**Required semantic color tokens** (every theme MUST define all of these):

```
color.interactive.primary          -- Primary actions, active states, links
color.interactive.primary-hover    -- Hover state for primary elements
color.interactive.secondary        -- Secondary actions, less prominent
color.interactive.destructive      -- Delete, remove, destructive actions

color.surface.page                 -- Page background
color.surface.card                 -- Card and container backgrounds
color.surface.elevated             -- Elevated surfaces (modals, popovers)

color.text.primary                 -- High-emphasis text, headings
color.text.secondary               -- Low-emphasis text, descriptions
color.text.disabled                -- Disabled text, placeholders
color.text.on-primary              -- Text on primary-colored backgrounds
color.text.on-destructive          -- Text on destructive-colored backgrounds

color.border.default               -- Input borders, container borders
color.border.subtle                -- Dividers, separators

color.status.success               -- Success states, positive indicators
color.status.warning               -- Warning states, caution indicators
color.status.error                 -- Error states, validation failures
color.status.info                  -- Informational states, help indicators
```

Total required: 19 semantic color tokens.

Optional semantic color tokens (recognized but not required):
- `color.interactive.primary-active`, `color.interactive.secondary-hover`, `color.interactive.destructive-hover`
- `color.surface.overlay` (for backdrop overlays)
- `color.text.on-secondary`, `color.text.on-success`, `color.text.on-warning`, `color.text.on-error`, `color.text.on-info`
- `color.status.success-bg`, `color.status.warning-bg`, `color.status.error-bg`, `color.status.info-bg` (tinted background variants)
- `color.border.focus` (focus ring color, if distinct from `interactive.primary`)

### 2.2.2 Spacing Semantics

Semantic spacing tokens map intent to primitive spacing values. Every value MUST be an integer that appears in `spacing.raw`.

**Required semantic spacing tokens:**

```
spacing.component.padding          -- Default internal padding for components (MUST be in range [12, 24])
spacing.component.gap              -- Default gap between sibling elements (MUST be in range [8, 16])
spacing.page.margin                -- Horizontal page margins (MUST be in range [16, 32])
spacing.section.gap                -- Vertical gap between page sections (MUST be in range [24, 48])
```

Optional semantic spacing tokens:
- `spacing.component.padding-sm`, `spacing.component.padding-lg` (size variants)
- `spacing.component.gap-tight` (tight gap within compact component groups, MUST be in range [4, 12])
- `spacing.component.gap-loose` (loose gap for spacious layouts, MUST be in range [16, 32])
- `spacing.page.margin-mobile` (mobile override, MUST be <= `spacing.page.margin`)
- `spacing.page.gutter` (gutter between page-level columns such as navigation and content, MUST be in range [8, 24])
- `spacing.section.padding` (padding inside a section container, MUST be in range [12, 32])
- `spacing.inline.gap` (gap between inline elements like icon and label, MUST be in range [4, 12])
- `spacing.inline.gap-tight` (tight inline gap such as icon inside button, MUST be in range [4, 8])

### 2.2.3 Typography Semantics

Each semantic typography token is a composite object with the following required fields:

| Field | Type | Constraint |
|-------|------|-----------|
| `family` | string | MUST reference a primitive family name (`sans`, `mono`, etc.) |
| `size` | integer | MUST be a value in `typography.raw.size` scale |
| `weight` | integer | MUST be a value in `typography.raw.weight` scale |
| `line_height` | number | MUST be a value in `typography.raw.line-height` scale |
| `usage` | string | Description of when to use this style |

**Required semantic typography tokens:**

```
typography.heading.h1     -- Page titles (size MUST be >= 28)
typography.heading.h2     -- Section headings (size MUST be < h1.size)
typography.heading.h3     -- Sub-section headings (size MUST be < h2.size)
typography.heading.h4     -- Card headings, group labels (size MUST be < h3.size)
typography.body.default   -- Standard body text (size MUST be in [14, 18])
typography.body.small     -- Compact text, table cells (size MUST be < body.default.size)
typography.caption        -- Captions, helper text (size MUST be in [10, 13])
typography.code           -- Code snippets (family MUST be "mono")
typography.label          -- Form labels, button text (weight MUST be >= 500)
```

Strict ordering constraint: `h1.size > h2.size > h3.size > h4.size > body.default.size > body.small.size > caption.size`.

### 2.2.4 Radius Semantics

**Required semantic radius tokens:**

```
radius.component.none     -- No rounding (MUST equal 0)
radius.component.small    -- Subtle rounding (MUST be in range [2, 6])
radius.component.default  -- Standard rounding (MUST be > small, in range [4, 12])
radius.component.large    -- Pronounced rounding (MUST be > default, in range [8, 20])
radius.component.pill     -- Fully rounded (MUST equal 9999)
```

All values MUST appear in `radius.raw`.

### 2.2.5 Shadow Semantics

**Required semantic shadow tokens:**

```
shadow.component.none     -- No shadow (MUST reference primitive "none")
shadow.component.card     -- Card elevation (MUST reference primitive "sm" or "md")
shadow.component.dropdown -- Dropdown/popover elevation (MUST reference primitive "md" or "lg")
shadow.component.modal    -- Modal/dialog elevation (MUST reference primitive "lg" or "xl")
shadow.component.tooltip  -- Tooltip/overlay elevation (MUST reference primitive "xl")
```

Elevation ordering: `none < card < dropdown < modal <= tooltip`. If two tokens reference the same primitive, they MUST be adjacent in this ordering.

### 2.2.6 Motion Semantics

Each semantic motion token is a composite object:

| Field | Type | Constraint |
|-------|------|-----------|
| `duration` | integer | MUST be a value in `motion.raw.duration` scale |
| `easing` | string | MUST reference a primitive easing name |
| `usage` | string | Description |

**Required semantic motion tokens:**

```
motion.interaction.micro    -- Toggles, checks, small state changes (duration MUST be in [50, 150])
motion.interaction.state    -- Hover, focus, press transitions (duration MUST be in [150, 250])
motion.interaction.content  -- Tab switch, accordion, content reveal (duration MUST be in [250, 400])
motion.interaction.layout   -- Sidebar collapse, modal enter/exit (duration MUST be in [350, 600])
```

Ordering constraint: `micro.duration < state.duration < content.duration < layout.duration`.

### 2.2.7 Breakpoint Semantics

Each semantic breakpoint token extends the primitive with min/max range and usage:

**Required semantic breakpoint tokens:**

```
breakpoint.mobile    -- { min: 0, max: tablet.min - 1 }
breakpoint.tablet    -- { min: tablet_primitive, max: desktop.min - 1 }
breakpoint.desktop   -- { min: desktop_primitive, max: wide.min - 1 }
breakpoint.wide      -- { min: wide_primitive, max: null (unbounded) }
```

The `max` of each breakpoint MUST equal `min` of the next breakpoint minus 1. The `wide` breakpoint has `max: null` (no upper bound).

### 2.2.8 Theme Switching

Semantic tokens are the theme-switching layer. Each theme provides alternative mappings from semantic tokens to primitive values.

Rules:
- `light` theme MUST be defined and is the default
- `dark` theme MUST be defined
- Additional named themes (e.g., `brand-a`, `high-contrast`) are permitted
- Every theme MUST provide a mapping for every semantic color token
- Non-color semantic tokens (spacing, typography, radius, shadow, motion, breakpoints) are theme-invariant by default
- A theme MAY override non-color tokens, but this is unusual. When it does, the overridden value MUST still satisfy all constraints for that token category

Theme switching at runtime:
- Web: CSS custom properties scoped to a `[data-theme="dark"]` attribute on `<html>` or a theme provider `<div>`
- Flutter: `ThemeData` objects selected by `ThemeMode` enum

The token compiler generates all theme variants. The runtime uses the appropriate variant based on user preference or system setting.

---

## 2.3 Tier 3: Component Tokens

Component tokens are scoped to a specific component. They reference Tier 2 semantic tokens exclusively (no direct Tier 1 references). Naming convention: `{component}.{variant}.{property}` or `{component}.{element}.{property}`.

### 2.3.1 Component Token Structure

Every component that has a contract in spec 03 (Component Contracts) MUST have a corresponding component token group. The structure for each component:

```yaml
{component}:
  {variant_or_state}:
    bg: "$semantic.color.{...}"              # Background color
    text: "$semantic.color.{...}"            # Text color
    border: "$semantic.color.{...}" | "none" # Border color
    shadow: "$semantic.shadow.{...}"         # Box shadow
    radius: "$semantic.radius.{...}"         # Border radius
    padding: <integer>                       # Internal padding (shorthand) or padding_x + padding_y
    padding_x: <integer>                     # Horizontal padding
    padding_y: <integer>                     # Vertical padding
    height: <integer>                        # Component height (for interactive components)
    min_width: <integer>                     # Minimum width (optional)
    font_size: <integer>                     # Font size (references a type scale value)
    font_weight: <integer>                   # Font weight
    line_height: <number>                    # Line height ratio
    gap: <integer>                           # Internal gap between children
    icon_size: <integer>                     # Icon dimensions (square, optional)
```

Not all properties are required for every component. The required properties vary by component category:

**Atoms with interactive states** (Button, IconButton, TextInput, TextArea, Select, Checkbox, Radio, Toggle, Link):
- MUST define: `bg`, `text`, `border`, `radius`, `height`
- MUST define states: `hover`, `active`, `focus`, `disabled`
- Focus state MUST define `ring_color`, `ring_width`, `ring_offset`

**Display atoms** (Badge, Avatar, Tag, Tooltip, Spinner, ProgressBar, Skeleton, Divider, Typography, Image, StatusDot, Separator, Kbd):
- MUST define: `bg`, `text` (where applicable), `radius` (where applicable)
- Need NOT define interactive states

**Molecules and Organisms:**
- MUST define: `bg`, `border` (or "none"), `radius`, `padding`
- Internal atom tokens are inherited from the atom's own token set; the molecule/organism token set covers the container only

### 2.3.2 Required Component Token Sets

The following components MUST have complete token sets. "Complete" means all properties listed in 2.3.1 as required for that component's category, across all variants defined in spec 03.

**Atoms (25):**

| Component | Variants Requiring Token Sets |
|-----------|------------------------------|
| `button` | `primary`, `secondary`, `tertiary`, `destructive`, `ghost` -- each with `default`, `hover`, `active`, `focus`, `disabled`, `loading` |
| `icon-button` | Same variants as `button` |
| `text-input` | `default`, `focus`, `error`, `disabled`, `readonly` |
| `text-area` | Same as `text-input` |
| `select` | `default`, `open`, `focus`, `error`, `disabled` |
| `checkbox` | `unchecked`, `checked`, `indeterminate`, `disabled` -- each with `default`, `hover`, `focus` |
| `radio` | `unselected`, `selected`, `disabled` -- each with `default`, `hover`, `focus` |
| `toggle` | `off`, `on`, `disabled` -- each with `default`, `hover`, `focus` |
| `label` | `default`, `required`, `optional`, `error` |
| `badge` | `neutral`, `success`, `warning`, `error`, `info` |
| `avatar` | `image`, `initials`, `fallback` -- sizes: `sm` (24px), `md` (32px), `lg` (40px), `xl` (48px) |
| `icon` | `default`, `primary`, `secondary`, `disabled` -- sizes: `sm` (16px), `md` (20px), `lg` (24px) |
| `tag` | `default`, `selected`, `removable`, `disabled` |
| `tooltip` | `default` (single variant; positioned by logic, not tokens) |
| `spinner` | `default` -- sizes: `sm` (16px), `md` (24px), `lg` (32px) |
| `progress-bar` | `default`, `success`, `error` |
| `skeleton` | `default` (single variant, animated) |
| `divider` | `horizontal`, `vertical`, `with-label` |
| `link` | `default`, `hover`, `visited`, `focus`, `disabled` |
| `typography` | Token consumption via semantic typography tokens directly; no separate component token set beyond what semantic typography provides |
| `image` | `loading`, `loaded`, `error` |
| `visually-hidden` | No visual tokens (this component is invisible by design) |
| `kbd` | `default` |
| `status-dot` | `success`, `warning`, `error`, `info`, `neutral` |
| `separator` | `default` |

**Molecules (22):**

| Component | Token Set Scope |
|-----------|----------------|
| `form-field` | Container: padding, gap between label/input/help-text |
| `search-bar` | Container: bg, border, radius, height |
| `select-field` | Container: same as form-field |
| `date-picker` | Container + calendar popup: bg, border, radius, shadow |
| `file-upload` | Drop zone: bg, border (dashed), border-active, radius |
| `nav-item` | `default`, `hover`, `active`, `disabled`; padding, gap, text, bg |
| `breadcrumb` | Container: gap; separator: text color |
| `pagination` | Container: gap; page buttons use `button` tokens |
| `tab` | `default`, `active`, `hover`, `disabled`; indicator color and position |
| `alert-banner` | `info`, `success`, `warning`, `error`: bg, border, text, icon-color |
| `toast` | `info`, `success`, `warning`, `error`: bg, border, text, shadow |
| `empty-state` | Container: padding; icon: color, size; text: color |
| `metric-card` | Container: bg, border, radius, padding; value: font-size, weight; trend: up-color, down-color |
| `user-card` | Container: bg, border, radius, padding; uses avatar + typography tokens |
| `list-item` | `default`, `hover`, `selected`, `disabled`: bg, text, border-bottom, padding |
| `menu-item` | `default`, `hover`, `active`, `disabled`: bg, text, padding, gap |
| `dropdown-menu` | Container: bg, border, radius, shadow, padding |
| `popover` | Container: bg, border, radius, shadow, padding |
| `dialog-actions` | Container: padding, gap, border-top |
| `tag-input` | Container: bg, border, radius; reuses tag + text-input tokens |
| `toggle-group` | Container: bg, border, radius; segment uses button-like tokens |
| `step-indicator` | Step circle: bg, text, border, size; connector: color, width; states: `completed`, `current`, `upcoming` |

**Organisms (22):**

| Component | Token Set Scope |
|-----------|----------------|
| `app-header` | Container: bg, shadow, height, padding; uses nav-item + avatar tokens |
| `sidebar` | Container: bg, width, width-collapsed, border-right, padding |
| `data-table` | Header: bg, text, border; row: bg, hover-bg, border; cell: padding |
| `form` | Container: padding, gap between fields |
| `modal` | Overlay: bg-color + opacity; dialog: bg, radius, shadow, padding, max-width |
| `command-palette` | Container: bg, border, radius, shadow; search: uses search-bar tokens |
| `slide-over` | Overlay: same as modal; panel: bg, shadow, width, padding |
| `filter-panel` | Container: bg, border, radius, padding |
| `card-grid` | Container: gap (responsive), columns (responsive) |
| `list-view` | Container: gap; items use list-item tokens |
| `toolbar` | Container: bg, border-bottom, padding, gap, height |
| `stats-row` | Container: gap (responsive), columns (responsive) |
| `form-wizard` | Container: padding; step-indicator tokens + form tokens |
| `notification-center` | Container: bg, border, radius, shadow, max-height; item: padding, border-bottom |
| `settings-section` | Container: padding, border-bottom; heading: typography token |
| `chat-message` | `user`: bg, text, radius, padding; `assistant`: bg, text, radius, padding |
| `chat-input` | Container: bg, border, radius, padding, min-height |
| `stream-of-thought` | Step: icon-size, gap; states: queued-color, running-color, done-color, error-color |
| `action-plan` | Step: padding, border, radius; states: pending-bg, approved-bg, rejected-bg |
| `citation-panel` | Container: bg, border, radius, padding; citation: bg, border-left, padding |
| `conversation-sidebar` | Container: bg, border-right, width; thread: padding, hover-bg, active-bg |
| `suggestion-chips` | Chip: bg, border, radius, padding, text; hover: bg, border |

### 2.3.3 Component Token Size Constraints

Interactive component heights (Tier 3 `height` values) MUST meet touch-target minimums:

| Size Variant | Minimum Height | Usage |
|-------------|---------------|-------|
| `sm` | 32px | Dense UIs, toolbars (FAILS touch-target on mobile; desktop-only) |
| `md` | 40px | Default for most contexts |
| `lg` | 44px | Mobile-first, accessibility-focused |
| `xl` | 48px | Hero CTAs, prominent actions |

For components that appear on mobile viewports, the rendered height MUST be >= 44px. Components with height < 44px MUST have sufficient padding or margin to create a 44px x 44px touch target area.

### 2.3.4 Component Token Reference Rules

1. Every value string starting with `$semantic.` MUST resolve to an existing semantic token
2. Every integer value for `padding`, `padding_x`, `padding_y`, `gap`, `height`, `min_width` MUST be a value in `spacing.raw` OR the product of a spacing.raw value and an integer multiplier (e.g., 44 = not in scale, but is valid as a height because touch-target constraints override spacing grid for heights specifically)
3. Every integer value for `font_size` MUST be a value in `typography.raw.size`
4. Every integer value for `font_weight` MUST be a value in `typography.raw.weight`
5. No circular references: a token MUST NOT transitively reference itself
6. Tier 3 tokens MUST NOT reference Tier 1 primitives directly; they MUST go through Tier 2 semantic tokens for color, shadow, and radius references

---

## 2.4 Token Compilation

The token compiler reads `design-system.yaml` and produces platform-specific outputs. Compilation is deterministic: identical input MUST always produce byte-identical output (excluding timestamps in comments).

### 2.4.1 Web Compilation Target: CSS Custom Properties + tailwind.config.ts

**Output file 1: `tokens.css`**

```css
/* Generated by Prism Token Compiler — DO NOT EDIT
   Source: design-system.yaml v1.0.0
   Theme: light */

:root {
  /* Primitive Colors */
  --prism-color-raw-blue-600: #1A3A5C;
  --prism-color-raw-blue-500: #2D5A8E;
  /* ... all primitives ... */

  /* Semantic Colors */
  --prism-color-interactive-primary: var(--prism-color-raw-blue-600);
  --prism-color-surface-page: var(--prism-color-raw-gray-50);
  --prism-color-text-primary: var(--prism-color-raw-gray-900);
  /* ... all semantics ... */

  /* Component Tokens */
  --prism-button-primary-bg: var(--prism-color-interactive-primary);
  --prism-button-primary-text: var(--prism-color-text-on-primary);
  --prism-button-primary-height: 44px;
  --prism-button-primary-radius: var(--prism-radius-component-small);
  /* ... all component tokens ... */

  /* Spacing */
  --prism-spacing-xs: 4px;
  --prism-spacing-sm: 8px;
  /* ... */

  /* Typography */
  --prism-font-sans: 'Inter', system-ui, sans-serif;
  --prism-font-mono: 'JetBrains Mono', monospace;
  /* ... */

  /* Radius */
  --prism-radius-component-default: 8px;
  /* ... */

  /* Shadow */
  --prism-shadow-component-card: 0px 1px 2px 0px rgba(0, 0, 0, 0.05);
  /* ... */

  /* Motion */
  --prism-motion-micro-duration: 100ms;
  --prism-motion-micro-easing: cubic-bezier(0.2, 0, 0, 1);
  /* ... */
}

[data-theme="dark"] {
  --prism-color-raw-blue-600: #60A5FA;
  --prism-color-raw-gray-50: #0F172A;
  --prism-color-raw-gray-900: #F1F5F9;
  /* ... dark overrides at primitive level ... */
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --prism-motion-micro-duration: 0.01ms;
    --prism-motion-state-duration: 0.01ms;
    --prism-motion-content-duration: 0.01ms;
    --prism-motion-layout-duration: 0.01ms;
  }
}
```

CSS variable naming convention: `--prism-{path}` with dots replaced by hyphens. The `--prism-` prefix avoids collisions with other CSS custom properties in the host application. Examples:
- `color.raw.blue-600` becomes `--prism-color-raw-blue-600`
- `color.interactive.primary` becomes `--prism-color-interactive-primary`
- `button.primary.bg` becomes `--prism-button-primary-bg`

**Output file 2: `tailwind.config.ts`**

```typescript
// Generated by Prism Token Compiler — DO NOT EDIT
// Source: design-system.yaml v1.0.0

import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    colors: {
      primary: {
        DEFAULT: "var(--prism-color-interactive-primary)",
        hover: "var(--prism-color-interactive-primary-hover)",
        // ... all interactive colors
      },
      destructive: {
        DEFAULT: "var(--prism-color-interactive-destructive)",
      },
      surface: {
        page: "var(--prism-color-surface-page)",
        card: "var(--prism-color-surface-card)",
        elevated: "var(--prism-color-surface-elevated)",
      },
      text: {
        primary: "var(--prism-color-text-primary)",
        secondary: "var(--prism-color-text-secondary)",
        disabled: "var(--prism-color-text-disabled)",
      },
      border: {
        DEFAULT: "var(--prism-color-border-default)",
        subtle: "var(--prism-color-border-subtle)",
      },
      status: {
        success: "var(--prism-color-status-success)",
        warning: "var(--prism-color-status-warning)",
        error: "var(--prism-color-status-error)",
        info: "var(--prism-color-status-info)",
      },
    },
    spacing: {
      xs: "var(--prism-spacing-xs)",
      sm: "var(--prism-spacing-sm)",
      md: "var(--prism-spacing-md)",
      lg: "var(--prism-spacing-lg)",
      xl: "var(--prism-spacing-xl)",
      "2xl": "var(--prism-spacing-2xl)",
      "3xl": "var(--prism-spacing-3xl)",
    },
    borderRadius: {
      none: "0",
      sm: "var(--prism-radius-component-small)",
      DEFAULT: "var(--prism-radius-component-default)",
      lg: "var(--prism-radius-component-large)",
      full: "9999px",
    },
    boxShadow: {
      none: "none",
      sm: "var(--prism-shadow-component-card)",
      DEFAULT: "var(--prism-shadow-component-dropdown)",
      lg: "var(--prism-shadow-component-modal)",
      xl: "var(--prism-shadow-component-tooltip)",
    },
    fontFamily: {
      sans: ["var(--prism-font-sans)"],
      mono: ["var(--prism-font-mono)"],
    },
  },
};

export default config;
```

### 2.4.2 Flutter Compilation Target: ThemeData + Dart Constants

**Output file 1: `prism_colors.dart`**

```dart
// Generated by Prism Token Compiler — DO NOT EDIT
// Source: design-system.yaml v1.0.0

import 'package:flutter/material.dart';

class PrismColors {
  PrismColors._();

  // Primitive Colors
  static const Color rawBlue600 = Color(0xFF1A3A5C);
  static const Color rawBlue500 = Color(0xFF2D5A8E);
  // ... all primitives

  // Semantic Colors (light theme)
  static const Color interactivePrimary = rawBlue600;
  static const Color surfacePage = rawGray50;
  static const Color textPrimary = rawGray900;
  // ... all semantics
}

class PrismColorsDark {
  PrismColorsDark._();

  static const Color interactivePrimary = Color(0xFF60A5FA);
  static const Color surfacePage = Color(0xFF0F172A);
  static const Color textPrimary = Color(0xFFF1F5F9);
  // ... dark overrides
}
```

**Output file 2: `prism_theme.dart`**

```dart
// Generated by Prism Token Compiler — DO NOT EDIT

import 'package:flutter/material.dart';
import 'prism_colors.dart';
import 'prism_typography.dart';
import 'prism_spacing.dart';

class PrismTheme {
  static ThemeData light() => ThemeData(
    brightness: Brightness.light,
    colorScheme: ColorScheme.light(
      primary: PrismColors.interactivePrimary,
      secondary: PrismColors.interactiveSecondary,
      error: PrismColors.statusError,
      surface: PrismColors.surfaceCard,
      // ... mapped from semantic tokens
    ),
    textTheme: PrismTypography.textTheme,
    // ... other theme properties
  );

  static ThemeData dark() => ThemeData(
    brightness: Brightness.dark,
    colorScheme: ColorScheme.dark(
      primary: PrismColorsDark.interactivePrimary,
      // ... dark mappings
    ),
    textTheme: PrismTypography.textThemeDark,
  );
}
```

**Output file 3: `prism_spacing.dart`**

```dart
// Generated by Prism Token Compiler — DO NOT EDIT

class PrismSpacing {
  PrismSpacing._();

  static const double xs = 4;
  static const double sm = 8;
  static const double md = 16;
  static const double lg = 24;
  static const double xl = 32;
  static const double xxl = 48;
  static const double xxxl = 64;

  static const double componentPadding = 16;
  static const double componentGap = 12;
  static const double pageMargin = 24;
  static const double sectionGap = 32;
}
```

**Output file 4: `prism_typography.dart`**

```dart
// Generated by Prism Token Compiler — DO NOT EDIT

import 'package:flutter/material.dart';

class PrismTypography {
  PrismTypography._();

  static const TextTheme textTheme = TextTheme(
    displayLarge: TextStyle(fontSize: 32, fontWeight: FontWeight.w700, height: 1.25),
    headlineMedium: TextStyle(fontSize: 24, fontWeight: FontWeight.w600, height: 1.3),
    titleLarge: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, height: 1.4),
    titleMedium: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, height: 1.4),
    bodyLarge: TextStyle(fontSize: 16, fontWeight: FontWeight.w400, height: 1.5),
    bodyMedium: TextStyle(fontSize: 14, fontWeight: FontWeight.w400, height: 1.5),
    bodySmall: TextStyle(fontSize: 12, fontWeight: FontWeight.w400, height: 1.5),
    labelLarge: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, height: 1.4),
  );
}
```

### 2.4.3 Compilation Determinism

The compiler MUST produce byte-identical output given the same input. To achieve this:
- Token output order is alphabetical within each section
- No timestamps or session-specific data in output (source version only)
- Floating-point values are rounded to 4 decimal places
- Color hex codes are uppercase
- CSS values use consistent spacing (no trailing spaces, single space after colons)

### 2.4.4 Compilation Errors

The compiler MUST reject input and report errors (not warnings) for:

| Error | Description |
|-------|------------|
| `UNRESOLVED_REFERENCE` | A `$primitive.*` or `$semantic.*` reference points to a non-existent token |
| `CIRCULAR_REFERENCE` | Token A references Token B which references Token A (at any depth) |
| `CONSTRAINT_VIOLATION` | A contrast ratio, touch-target, spacing-grid, or color-pairing constraint fails |
| `MISSING_REQUIRED_TOKEN` | A required semantic or component token is absent |
| `INVALID_VALUE` | A value does not match its type constraint (e.g., hex code with wrong format, spacing not on 4px grid) |
| `TIER_VIOLATION` | A component token references a primitive directly instead of going through semantic |
| `THEME_INCOMPLETE` | A theme does not provide mappings for all semantic color tokens |
| `SCALE_ORDER` | A scale is not strictly ascending |

Each error MUST include: error code, the token path that caused it, the expected constraint, and the actual value found.

The compiler MUST NOT produce partial output when errors exist. Either all output files are generated successfully, or none are.

---

## 2.5 Constraint System

The constraint system is the enforcement mechanism that prevents design system violations. Constraints are evaluated during token compilation and during runtime validation (for dynamic theme changes).

### 2.5.1 Contrast Ratios (WCAG 2.1 AA)

**Normal text** (font-size < 18px, or < 14px bold): minimum 4.5:1 contrast ratio against background.

**Large text** (font-size >= 18px, or >= 14px bold): minimum 3.0:1 contrast ratio against background.

**UI components and graphical objects**: minimum 3.0:1 contrast ratio against adjacent colors.

Contrast ratio is computed using the WCAG 2.1 relative luminance formula:

```
contrast_ratio = (L1 + 0.05) / (L2 + 0.05)
```

Where `L1` is the relative luminance of the lighter color and `L2` is the relative luminance of the darker color. Relative luminance is computed as:

```
L = 0.2126 * R_lin + 0.7152 * G_lin + 0.0722 * B_lin
```

Where `R_lin`, `G_lin`, `B_lin` are the linearized sRGB channel values:
```
C_lin = C_srgb / 12.92                    if C_srgb <= 0.04045
C_lin = ((C_srgb + 0.055) / 1.055) ^ 2.4  if C_srgb > 0.04045
```

And `C_srgb = C_8bit / 255`.

**Required contrast pairs to validate** (the compiler MUST check all of these for every theme):

| Foreground Token | Background Token | Minimum Ratio |
|-----------------|-----------------|---------------|
| `color.text.primary` | `color.surface.page` | 4.5:1 |
| `color.text.primary` | `color.surface.card` | 4.5:1 |
| `color.text.secondary` | `color.surface.page` | 4.5:1 |
| `color.text.secondary` | `color.surface.card` | 4.5:1 |
| `color.text.on-primary` | `color.interactive.primary` | 4.5:1 |
| `color.text.on-destructive` | `color.interactive.destructive` | 4.5:1 |
| `color.interactive.primary` | `color.surface.page` | 3.0:1 |
| `color.interactive.primary` | `color.surface.card` | 3.0:1 |
| `color.interactive.destructive` | `color.surface.page` | 3.0:1 |
| `color.border.default` | `color.surface.card` | 3.0:1 |
| `color.status.success` | `color.surface.card` | 3.0:1 |
| `color.status.warning` | `color.surface.card` | 3.0:1 |
| `color.status.error` | `color.surface.card` | 3.0:1 |
| `color.status.info` | `color.surface.card` | 3.0:1 |

### 2.5.2 Touch Target Minimums

Every interactive component MUST have a touch target area of at least 44px x 44px. This applies to:
- The `height` property of component tokens for: `button`, `icon-button`, `text-input`, `text-area`, `select`, `checkbox`, `radio`, `toggle`
- The computed clickable area (height x width) for any interactive element

Components with a visual size smaller than 44px (e.g., a 32px icon button in a dense toolbar) MUST use padding, margin, or `::before`/`::after` pseudo-elements to expand the clickable area to 44px x 44px. The spec does not mandate visual size >= 44px, only clickable area >= 44px.

Exception: components explicitly marked as `desktop-only` in their contract are exempt from the 44px minimum but MUST still meet 32px x 32px minimum.

### 2.5.3 Spacing Grid Consistency

Every spacing value in the system (component tokens, layout tokens, and any gap/padding/margin value) MUST be divisible by 4.

Exceptions to the 4px grid:
- `1px` borders are permitted (border-width is not a spacing token)
- `2px` focus ring widths are permitted
- Font sizes are NOT required to be on the 4px grid (they follow the type scale)
- Line heights are ratios, not pixel values, and are exempt
- Touch target heights (44px, 48px) may not be on the 4px grid but are still valid
- Icon sizes (16px, 20px, 24px) are permitted even though 20px is not on the 4px grid, because icon sizing follows its own scale

### 2.5.4 Color Pairing Rules

The constraint system defines which foreground colors are permitted on which background colors. These rules prevent combinations that are technically accessible (pass contrast checks) but semantically confusing.

Hard rules (MUST be enforced):
- `color.status.error` text MUST NOT appear on `color.interactive.destructive` background (red-on-red)
- `color.status.success` text MUST NOT appear on `color.status.success` background (green-on-green)
- `color.text.disabled` MUST NOT be used as a link color (disabled text that looks clickable is a UX violation)
- `color.text.on-primary` MUST only appear on backgrounds that use `color.interactive.primary` or `color.interactive.destructive` or `color.status.*` tokens

Soft rules (SHOULD be enforced, emit warnings not errors):
- Status colors (`success`, `warning`, `error`, `info`) SHOULD NOT be used as primary interactive colors
- `color.text.primary` on `color.surface.elevated` SHOULD have the same contrast ratio as on `color.surface.card` (elevated surfaces should not degrade readability)

### 2.5.5 Motion Constraints

**`prefers-reduced-motion` rule:**

When the user's system preference is `prefers-reduced-motion: reduce`:
- All animation durations MUST be set to `0.01ms` (not 0ms, because 0ms may skip the animation's end state)
- All easing functions MUST be set to `linear`
- Opacity transitions are exempt (opacity changes at 0.01ms are effectively instant but still reach the target value)

**GPU-only animation rule:**

CSS animations and transitions MUST only animate properties in this allowlist:
- `transform` (translate, scale, rotate, skew)
- `opacity`
- `filter` (blur, brightness, contrast, etc.)
- `clip-path` (for reveal animations)

Animating properties NOT in this list (e.g., `width`, `height`, `top`, `left`, `margin`, `padding`, `border`, `background-color`) triggers layout recalculation and MUST NOT be used for animations. Color transitions are permitted only via the `filter` property or by transitioning `opacity` between two layered elements.

Flutter equivalent: animations MUST use `AnimatedOpacity`, `AnimatedSlide`, `ScaleTransition`, `FadeTransition`, or equivalent compositor-friendly widgets. `AnimatedContainer` is permitted only for `decoration` changes (which map to compositor properties), not for size changes.

### 2.5.6 Constraint Validation Output

The compiler MUST produce a constraint validation report alongside the compiled tokens. The report format:

```
CONSTRAINT VALIDATION REPORT
Source: design-system.yaml v1.0.0
Theme: light
Date: 2026-04-11

PASS  [CONTRAST] color.text.primary on color.surface.page — 15.2:1 (min 4.5:1)
PASS  [CONTRAST] color.text.primary on color.surface.card — 18.1:1 (min 4.5:1)
FAIL  [CONTRAST] color.text.secondary on color.surface.page — 3.8:1 (min 4.5:1)
PASS  [TOUCH]    button.primary.height — 44px (min 44px)
FAIL  [TOUCH]    icon-button.sm.height — 32px (min 44px, no clickable-area expansion declared)
PASS  [GRID]     All spacing values on 4px grid
PASS  [PAIRING]  No prohibited color combinations detected
PASS  [MOTION]   All animated properties in GPU-only allowlist
WARN  [PAIRING]  color.status.warning used as interactive element background (soft rule)

SUMMARY: 2 FAIL, 1 WARN, 12 PASS
```

Compilation MUST be blocked if any FAIL exists. Compilation proceeds with WARN entries (they are advisory).
