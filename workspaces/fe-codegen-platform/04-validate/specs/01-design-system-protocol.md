# 01 Design System Protocol Specification

Spec version: 0.1.0 | Status: DRAFT | Governs: DESIGN.md format, design-system.yaml schema, bidirectional conversion, authoring paths, persistence

---

## 1.1 DESIGN.md Format

DESIGN.md is the human-readable, machine-parseable design specification file. It uses standard Markdown with a fixed section structure. Every frontend project MUST have exactly one DESIGN.md at the project root.

### 1.1.1 File Header

The file MUST begin with a YAML front-matter block:

```markdown
---
prism-spec: "0.1.0"
design-system-version: "1.0.0"
name: "Enterprise Professional"
description: "Navy and slate professional theme for enterprise SaaS"
author: "COC session | Stitch extraction | Manual"
created: "2026-04-11"
modified: "2026-04-11"
---
```

Required front-matter fields:

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `prism-spec` | semver string | Spec version this file conforms to | MUST match `^\d+\.\d+\.\d+$` |
| `design-system-version` | semver string | Version of this design system | MUST match `^\d+\.\d+\.\d+$` |
| `name` | string | Human-readable theme name | MUST be non-empty, max 64 characters |
| `description` | string | One-line description of the design intent | MUST be non-empty, max 256 characters |
| `author` | string | Origin of this file | MUST be non-empty |
| `created` | ISO 8601 date | Creation date | MUST match `YYYY-MM-DD` |
| `modified` | ISO 8601 date | Last modification date | MUST match `YYYY-MM-DD`, MUST be >= `created` |

### 1.1.2 Section Structure

After the front-matter, the file MUST contain the following sections in this exact order. Each section is an H2 heading (`##`). Sections marked REQUIRED MUST be present; sections marked OPTIONAL MAY be omitted.

| Order | Section | Required | Description |
|-------|---------|----------|-------------|
| 1 | `## Colors` | REQUIRED | Color palette and semantic color assignments |
| 2 | `## Typography` | REQUIRED | Font families, sizes, weights, line heights |
| 3 | `## Spacing` | REQUIRED | Spacing scale values |
| 4 | `## Radius` | REQUIRED | Border radius values |
| 5 | `## Shadow` | REQUIRED | Box shadow definitions |
| 6 | `## Motion` | REQUIRED | Animation durations and easing functions |
| 7 | `## Breakpoints` | REQUIRED | Responsive breakpoint values |
| 8 | `## Component Variants` | REQUIRED | Per-component variant definitions |
| 9 | `## Brand Identity` | OPTIONAL | Logo, brand marks, brand colors context |
| 10 | `## Illustrations` | OPTIONAL | Illustration style guidelines |
| 11 | `## Iconography` | OPTIONAL | Icon set, sizing, stroke width conventions |

No additional H2 sections are permitted. Additional context MUST be placed as sub-sections (H3 or deeper) within the existing sections, or within the optional sections.

### 1.1.3 Value Entry Format

Every value within a section MUST be written as a Markdown list item with this exact structure:

```
- **{name}**: `{value}` -- {usage description}
```

Rules:
- `{name}` MUST be bold (`**name**`)
- `{value}` MUST be in inline code (backticks)
- `--` (space-dash-dash-space) separates value from description
- `{usage description}` is a plain-text sentence describing when to use this value
- Each entry occupies exactly one line (no line-wrapping within entries)

Example:
```markdown
- **primary**: `#1A3A5C` -- Primary brand color for interactive elements and key actions
- **primary-light**: `#2D5A8E` -- Hover and focus state for primary elements
- **surface-page**: `#F8F9FA` -- Page background color
```

### 1.1.4 Section: Colors

MUST contain at minimum the following named colors. Additional colors are permitted.

**Palette colors** (raw values):

| Name Pattern | Example | Constraint |
|-------------|---------|------------|
| `primary` | `#1A3A5C` | MUST be present |
| `primary-light` | `#2D5A8E` | MUST be present |
| `primary-dark` | `#0F2440` | MUST be present |
| `secondary` | `#6B7280` | MUST be present |
| `destructive` | `#DC2626` | MUST be present |
| `success` | `#16A34A` | MUST be present |
| `warning` | `#D97706` | MUST be present |
| `error` | `#DC2626` | MUST be present |
| `info` | `#2563EB` | MUST be present |

**Surface colors:**

| Name Pattern | Example | Constraint |
|-------------|---------|------------|
| `surface-page` | `#F8F9FA` | MUST be present |
| `surface-card` | `#FFFFFF` | MUST be present |
| `surface-elevated` | `#FFFFFF` | MUST be present |

**Text colors:**

| Name Pattern | Example | Constraint |
|-------------|---------|------------|
| `text-primary` | `#111827` | MUST be present |
| `text-secondary` | `#6B7280` | MUST be present |
| `text-disabled` | `#9CA3AF` | MUST be present |
| `text-on-primary` | `#FFFFFF` | MUST be present |

**Border colors:**

| Name Pattern | Example | Constraint |
|-------------|---------|------------|
| `border-default` | `#D1D5DB` | MUST be present |
| `border-subtle` | `#E5E7EB` | MUST be present |

All color values MUST be 6-digit hex codes prefixed with `#` (e.g., `#1A3A5C`). 3-digit shorthand, `rgb()`, `hsl()`, and named colors are NOT permitted.

A `### Dark Mode` H3 sub-section MUST be present within `## Colors`. It lists the same color names with their dark-mode values. Any color name present in the light section that is absent from the dark section inherits its light value unchanged. Any color name present in the dark section that is absent from the light section is a validation error.

### 1.1.5 Section: Typography

Each entry uses this extended format:

```
- **{name}**: `{font-family}, {size}px/{line-height}, {weight}` -- {usage description}
```

Where:
- `{font-family}` is a CSS font-family string (e.g., `Inter`, `JetBrains Mono`)
- `{size}` is an integer in pixels
- `{line-height}` is a unitless ratio (e.g., `1.5`) or pixel value (e.g., `24px`)
- `{weight}` is one of: `300`, `400`, `500`, `600`, `700`, `800` or the keywords `Light`, `Regular`, `Medium`, `SemiBold`, `Bold`, `ExtraBold`

Required entries:

| Name | Constraint |
|------|------------|
| `heading-h1` | MUST be present. Size MUST be >= 28px |
| `heading-h2` | MUST be present. Size MUST be < h1 size |
| `heading-h3` | MUST be present. Size MUST be < h2 size |
| `heading-h4` | MUST be present. Size MUST be < h3 size |
| `body-default` | MUST be present. Size MUST be >= 14px and <= 18px |
| `body-small` | MUST be present. Size MUST be < body-default size |
| `caption` | MUST be present. Size MUST be >= 10px and <= 13px |
| `code` | MUST be present. Font-family MUST be a monospace font |
| `label` | MUST be present |

Typography sizes MUST follow a strictly decreasing sequence from h1 through caption: `h1 > h2 > h3 > h4 > body-default > body-small > caption`.

### 1.1.6 Section: Spacing

Values are integers in pixels. Every value MUST be divisible by 4 (4px grid constraint).

Required entries:

| Name | Value Constraint |
|------|-----------------|
| `xs` | MUST equal 4 |
| `sm` | MUST equal 8 |
| `md` | MUST equal 12 or 16 |
| `lg` | MUST equal 24 |
| `xl` | MUST equal 32 |
| `2xl` | MUST equal 48 |
| `3xl` | MUST equal 64 |

Additional spacing values are permitted provided they are divisible by 4.

### 1.1.7 Section: Radius

Values are integers in pixels or the keyword `pill`.

Required entries:

| Name | Value Constraint |
|------|-----------------|
| `none` | MUST equal `0` |
| `sm` | MUST be > 0 and <= 6 |
| `md` | MUST be > sm and <= 12 |
| `lg` | MUST be > md and <= 20 |
| `pill` | MUST equal `9999` |

### 1.1.8 Section: Shadow

Values use the CSS box-shadow syntax: `{x}px {y}px {blur}px {spread}px {color}`.

Required entries:

| Name | Description |
|------|------------|
| `none` | MUST equal `none` |
| `sm` | Subtle shadow for cards and containers |
| `md` | Medium elevation for dropdowns and popovers |
| `lg` | High elevation for modals and dialogs |
| `xl` | Maximum elevation for tooltips and command palettes |

Each shadow value (except `none`) MUST specify: x-offset, y-offset, blur-radius, spread-radius, and color. Color MUST use `rgba()` with alpha < 1.0.

### 1.1.9 Section: Motion

Each entry uses this format:

```
- **{name}**: `{duration}ms {easing}` -- {usage description}
```

Where:
- `{duration}` is an integer in milliseconds
- `{easing}` is a CSS easing function: `ease`, `ease-in`, `ease-out`, `ease-in-out`, or a `cubic-bezier(a, b, c, d)` value

Required entries:

| Name | Duration Constraint |
|------|-------------------|
| `instant` | MUST be <= 50ms |
| `micro` | MUST be > 50ms and <= 150ms |
| `fast` | MUST be > 150ms and <= 250ms |
| `normal` | MUST be > 250ms and <= 400ms |
| `slow` | MUST be > 400ms and <= 600ms |
| `reduced-motion` | MUST equal `0.01ms linear` |

Durations MUST form a strictly increasing sequence: `instant < micro < fast < normal < slow`.

### 1.1.10 Section: Breakpoints

Values are integers in pixels representing the minimum width for each breakpoint.

Required entries (exact names, exact order):

| Name | Value Constraint |
|------|-----------------|
| `mobile` | MUST equal `0` |
| `tablet` | MUST equal `768` |
| `desktop` | MUST equal `1024` |
| `wide` | MUST equal `1440` |

### 1.1.11 Section: Component Variants

Each component is an H3 sub-section. Each variant is listed with its visual description.

Format:
```markdown
### Button
- **primary**: Filled background using `primary` color, white text. Used for primary actions.
- **secondary**: Outlined with `border-default`, text uses `text-primary`. Used for secondary actions.
- **tertiary**: No border or background, text uses `primary`. Used for low-emphasis actions.
- **destructive**: Filled background using `destructive`, white text. Used for delete/remove actions.
- **ghost**: Transparent background, text uses `text-secondary`. Used for icon-only or inline actions.
```

Required components in this section:

| Component | Minimum Variants |
|-----------|-----------------|
| Button | primary, secondary, tertiary, destructive, ghost |
| TextInput | default, error, disabled |
| Select | default, error, disabled |
| Badge | neutral, success, warning, error, info |
| Avatar | image, initials, fallback |
| Alert | info, success, warning, error |
| Toast | info, success, warning, error |
| Modal | default, destructive (for confirmation dialogs) |

Each variant entry MUST reference at least one color token name from the Colors section.

### 1.1.12 Complete Example: Enterprise Professional Theme

```markdown
---
prism-spec: "0.1.0"
design-system-version: "1.0.0"
name: "Enterprise Professional"
description: "Navy and slate professional theme for enterprise SaaS applications"
author: "COC session"
created: "2026-04-11"
modified: "2026-04-11"
---

## Colors

- **primary**: `#1A3A5C` -- Primary brand color for interactive elements and key actions
- **primary-light**: `#2D5A8E` -- Hover and focus state for primary elements
- **primary-dark**: `#0F2440` -- Active/pressed state for primary elements
- **secondary**: `#64748B` -- Secondary actions and supporting UI elements
- **destructive**: `#DC2626` -- Delete, remove, and destructive actions
- **success**: `#16A34A` -- Success states, confirmations, positive indicators
- **warning**: `#D97706` -- Warning states, caution indicators
- **error**: `#DC2626` -- Error states, validation failures
- **info**: `#2563EB` -- Informational states, help indicators
- **surface-page**: `#F8FAFC` -- Page background
- **surface-card**: `#FFFFFF` -- Card and container backgrounds
- **surface-elevated**: `#FFFFFF` -- Elevated container backgrounds (modals, popovers)
- **text-primary**: `#0F172A` -- Primary text, headings, high-emphasis content
- **text-secondary**: `#64748B` -- Secondary text, descriptions, low-emphasis content
- **text-disabled**: `#94A3B8` -- Disabled text, placeholder text
- **text-on-primary**: `#FFFFFF` -- Text on primary-colored backgrounds
- **border-default**: `#CBD5E1` -- Default borders for inputs and containers
- **border-subtle**: `#E2E8F0` -- Subtle borders for dividers and separators

### Dark Mode

- **primary**: `#60A5FA` -- Primary brand color in dark mode
- **primary-light**: `#93C5FD` -- Hover state in dark mode
- **primary-dark**: `#3B82F6` -- Active state in dark mode
- **secondary**: `#94A3B8` -- Secondary actions in dark mode
- **destructive**: `#EF4444` -- Destructive actions in dark mode
- **success**: `#22C55E` -- Success states in dark mode
- **warning**: `#F59E0B` -- Warning states in dark mode
- **error**: `#EF4444` -- Error states in dark mode
- **info**: `#3B82F6` -- Info states in dark mode
- **surface-page**: `#0F172A` -- Page background in dark mode
- **surface-card**: `#1E293B` -- Card backgrounds in dark mode
- **surface-elevated**: `#334155` -- Elevated surfaces in dark mode
- **text-primary**: `#F1F5F9` -- Primary text in dark mode
- **text-secondary**: `#94A3B8` -- Secondary text in dark mode
- **text-disabled**: `#475569` -- Disabled text in dark mode
- **text-on-primary**: `#0F172A` -- Text on primary backgrounds in dark mode
- **border-default**: `#334155` -- Default borders in dark mode
- **border-subtle**: `#1E293B` -- Subtle borders in dark mode

## Typography

- **heading-h1**: `Inter, 32px/1.25, 700` -- Page titles, hero headings
- **heading-h2**: `Inter, 24px/1.3, 600` -- Section headings
- **heading-h3**: `Inter, 20px/1.4, 600` -- Sub-section headings
- **heading-h4**: `Inter, 16px/1.4, 600` -- Card headings, group labels
- **body-default**: `Inter, 16px/1.5, 400` -- Standard body text, descriptions
- **body-small**: `Inter, 14px/1.5, 400` -- Compact body text, table cells
- **caption**: `Inter, 12px/1.5, 400` -- Captions, helper text, timestamps
- **code**: `JetBrains Mono, 14px/1.6, 400` -- Code snippets, technical values
- **label**: `Inter, 14px/1.4, 500` -- Form labels, button text, navigation items

## Spacing

- **xs**: `4px` -- Minimum spacing between tightly grouped elements
- **sm**: `8px` -- Icon-to-text gaps, compact padding
- **md**: `16px` -- Default component padding, form field gaps
- **lg**: `24px` -- Section gaps, card padding
- **xl**: `32px` -- Large section separators
- **2xl**: `48px` -- Page section spacing
- **3xl**: `64px` -- Hero section margins

## Radius

- **none**: `0` -- No rounding, sharp corners
- **sm**: `4px` -- Subtle rounding for buttons, inputs
- **md**: `8px` -- Default rounding for cards, containers
- **lg**: `12px` -- Pronounced rounding for modals, elevated surfaces
- **pill**: `9999` -- Fully rounded for pills, tags, avatars

## Shadow

- **none**: `none` -- No shadow
- **sm**: `0px 1px 2px 0px rgba(0, 0, 0, 0.05)` -- Subtle shadow for cards
- **md**: `0px 4px 6px -1px rgba(0, 0, 0, 0.1)` -- Dropdowns, popovers
- **lg**: `0px 10px 15px -3px rgba(0, 0, 0, 0.1)` -- Modals, dialogs
- **xl**: `0px 20px 25px -5px rgba(0, 0, 0, 0.1)` -- Tooltips, command palette

## Motion

- **instant**: `0ms ease` -- Immediate state change with no perceptible animation
- **micro**: `100ms ease-out` -- Micro-interactions like checkbox toggle, button press
- **fast**: `200ms ease-out` -- State transitions like hover, focus ring appearance
- **normal**: `300ms ease-in-out` -- Content transitions like tab switch, accordion expand
- **slow**: `500ms ease-in-out` -- Layout animations like sidebar collapse, modal enter
- **reduced-motion**: `0.01ms linear` -- Override for prefers-reduced-motion

## Breakpoints

- **mobile**: `0px` -- Mobile-first base, phones in portrait
- **tablet**: `768px` -- Tablets in portrait, phones in landscape
- **desktop**: `1024px` -- Standard desktop viewport
- **wide**: `1440px` -- Wide desktop and large monitors

## Component Variants

### Button
- **primary**: Filled background using `primary` color, `text-on-primary` text. Used for primary page actions.
- **secondary**: Outlined with `border-default` border, `text-primary` text. Used for secondary actions.
- **tertiary**: No border or background, `primary` colored text. Used for low-emphasis inline actions.
- **destructive**: Filled background using `destructive` color, `text-on-primary` text. Used for delete/remove.
- **ghost**: Transparent background, `text-secondary` text. Used for icon-only buttons and toolbar actions.

### TextInput
- **default**: `border-default` border, `surface-card` background, `text-primary` text. Standard input state.
- **error**: `error` border, `surface-card` background, `error` helper text. Validation failure state.
- **disabled**: `border-subtle` border, `surface-page` background, `text-disabled` text. Non-interactive state.

### Select
- **default**: `border-default` border, `surface-card` background, `text-primary` text. Standard select state.
- **error**: `error` border, `surface-card` background, `error` helper text. Validation failure state.
- **disabled**: `border-subtle` border, `surface-page` background, `text-disabled` text. Non-interactive state.

### Badge
- **neutral**: `surface-page` background, `text-secondary` text. Default non-status badge.
- **success**: `success` tinted background, `success` text. Positive status.
- **warning**: `warning` tinted background, `warning` text. Caution status.
- **error**: `error` tinted background, `error` text. Negative status.
- **info**: `info` tinted background, `info` text. Informational status.

### Avatar
- **image**: Displays user image, circular clip. Falls back to initials on load failure.
- **initials**: `primary` background, `text-on-primary` text. Shows 1-2 character initials.
- **fallback**: `surface-page` background, generic user icon. Used when no image or name available.

### Alert
- **info**: `info` left border or icon, `info` tinted background. Informational message.
- **success**: `success` left border or icon, `success` tinted background. Positive confirmation.
- **warning**: `warning` left border or icon, `warning` tinted background. Caution message.
- **error**: `error` left border or icon, `error` tinted background. Error message.

### Toast
- **info**: `info` accent, auto-dismiss after 5000ms. Informational notification.
- **success**: `success` accent, auto-dismiss after 3000ms. Action confirmed.
- **warning**: `warning` accent, auto-dismiss after 8000ms. Caution notification.
- **error**: `error` accent, no auto-dismiss (requires manual dismissal). Error notification.

### Modal
- **default**: `surface-elevated` background, `shadow-lg`. Standard content dialog.
- **destructive**: `surface-elevated` background with `destructive` accent in header. Confirmation for destructive actions.
```

### 1.1.13 Validation Rules Summary

A DESIGN.md is VALID if and only if all of the following hold:

1. Front-matter block is present and all required fields are present with correct types
2. All 8 required H2 sections are present in the specified order
3. All required entries within each section are present
4. All values conform to their type constraints (hex codes for colors, 4px grid for spacing, etc.)
5. Typography sizes follow the strictly decreasing sequence
6. Motion durations follow the strictly increasing sequence
7. Dark Mode sub-section exists within Colors, with no names absent from the light section
8. Each Component Variant entry references at least one named color from the Colors section
9. No H2 sections exist beyond the 11 defined sections

A DESIGN.md is INVALID if any of the above conditions fail. The specific failing condition MUST be reported with the line number and expected vs. actual value.

---

## 1.2 design-system.yaml Schema

The `design-system.yaml` file is the richer internal representation that adds constraint annotations, three-tier token hierarchy, and theme variants. It is the compiler's input format.

### 1.2.1 Top-Level Structure

```yaml
prism_spec: "0.1.0"
design_system_version: "1.0.0"
name: "Enterprise Professional"
description: "Navy and slate professional theme for enterprise SaaS"

themes:
  light: { ... }
  dark: { ... }
  # Additional brand themes are permitted

tokens:
  primitive: { ... }
  semantic: { ... }
  component: { ... }

constraints: { ... }
```

Required top-level keys: `prism_spec`, `design_system_version`, `name`, `description`, `themes`, `tokens`, `constraints`.

### 1.2.2 Tokens: Primitive Tier

Location: `tokens.primitive`

```yaml
tokens:
  primitive:
    color:
      blue-600: "#1A3A5C"
      blue-500: "#2D5A8E"
      blue-700: "#0F2440"
      slate-600: "#64748B"
      red-600: "#DC2626"
      green-600: "#16A34A"
      amber-600: "#D97706"
      blue-600-info: "#2563EB"
      gray-50: "#F8FAFC"
      white: "#FFFFFF"
      gray-900: "#0F172A"
      gray-500: "#64748B"
      gray-400: "#94A3B8"
      gray-300: "#CBD5E1"
      gray-200: "#E2E8F0"
      # Additional palette colors permitted

    spacing:
      scale: [4, 8, 12, 16, 24, 32, 48, 64]
      # Every value MUST be divisible by 4

    typography:
      families:
        sans: "Inter"
        mono: "JetBrains Mono"
      scale: [10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 45, 57]
      weights: [300, 400, 500, 600, 700, 800]
      line_heights: [1.0, 1.1, 1.25, 1.3, 1.4, 1.5, 1.6, 1.75, 2.0]

    radius:
      scale: [0, 2, 4, 6, 8, 12, 16, 20, 9999]

    shadow:
      none: "none"
      sm: "0px 1px 2px 0px rgba(0, 0, 0, 0.05)"
      md: "0px 4px 6px -1px rgba(0, 0, 0, 0.1)"
      lg: "0px 10px 15px -3px rgba(0, 0, 0, 0.1)"
      xl: "0px 20px 25px -5px rgba(0, 0, 0, 0.1)"

    motion:
      durations: [0, 50, 100, 150, 200, 250, 300, 350, 400, 500, 600, 800]
      easings:
        default: "cubic-bezier(0.2, 0, 0, 1)"
        emphasize: "cubic-bezier(0.05, 0.7, 0.1, 1)"
        decelerate: "cubic-bezier(0, 0, 0, 1)"
        accelerate: "cubic-bezier(0.3, 0, 1, 1)"
        linear: "linear"

    breakpoints:
      mobile: 0
      tablet: 768
      desktop: 1024
      wide: 1440
```

Validation rules for primitives:
- `color`: Every value MUST be a 6-digit hex string matching `^#[0-9A-Fa-f]{6}$`
- `spacing.scale`: Every element MUST be a positive integer divisible by 4
- `typography.scale`: Every element MUST be a positive integer; the list MUST be sorted ascending
- `typography.weights`: Every element MUST be a multiple of 100 in range [100, 900]
- `radius.scale`: Every element MUST be a non-negative integer; the list MUST be sorted ascending; MUST contain 0 and 9999
- `shadow`: Values MUST be `"none"` or match CSS box-shadow syntax
- `motion.durations`: Every element MUST be a non-negative integer; the list MUST be sorted ascending; MUST contain 0
- `motion.easings`: Values MUST be `"linear"` or match `cubic-bezier\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*\)`
- `breakpoints`: Values MUST be non-negative integers; `mobile` MUST equal 0; values MUST be sorted ascending

### 1.2.3 Tokens: Semantic Tier

Location: `tokens.semantic`

Semantic tokens MUST reference primitive tokens or literal values that exist in the primitive tier's scales. References use the syntax `$primitive.{category}.{name}` or a literal value.

```yaml
tokens:
  semantic:
    color:
      interactive:
        primary:
          value: "$primitive.color.blue-600"
          usage: "Primary actions, active states, links"
          contrast_min: 4.5
          pairs_with: ["interactive.primary-hover", "text.on-primary"]
        primary-hover:
          value: "$primitive.color.blue-500"
          usage: "Hover state for primary interactive elements"
        secondary:
          value: "$primitive.color.slate-600"
          usage: "Secondary actions, less prominent interactions"
        destructive:
          value: "$primitive.color.red-600"
          usage: "Delete, remove, destructive actions"
          contrast_min: 4.5
          requires_confirmation: true
      surface:
        page:
          value: "$primitive.color.gray-50"
          usage: "Page background"
        card:
          value: "$primitive.color.white"
          usage: "Card and container backgrounds"
        elevated:
          value: "$primitive.color.white"
          usage: "Elevated container backgrounds (modals, popovers)"
      text:
        primary:
          value: "$primitive.color.gray-900"
          usage: "Headings, high-emphasis body text"
        secondary:
          value: "$primitive.color.gray-500"
          usage: "Descriptions, secondary information"
        disabled:
          value: "$primitive.color.gray-400"
          usage: "Disabled text, placeholder text"
        on-primary:
          value: "$primitive.color.white"
          usage: "Text on primary-colored backgrounds"
      border:
        default:
          value: "$primitive.color.gray-300"
          usage: "Default borders for inputs and containers"
        subtle:
          value: "$primitive.color.gray-200"
          usage: "Subtle borders for dividers and separators"
      status:
        success:
          value: "$primitive.color.green-600"
          usage: "Success states, confirmations"
        warning:
          value: "$primitive.color.amber-600"
          usage: "Warning states, caution indicators"
        error:
          value: "$primitive.color.red-600"
          usage: "Error states, validation failures"
        info:
          value: "$primitive.color.blue-600-info"
          usage: "Informational states, help indicators"

    spacing:
      component:
        padding:
          value: 16
          usage: "Default internal padding for components"
        gap:
          value: 12
          usage: "Default gap between sibling elements in a component"
      page:
        margin:
          value: 24
          usage: "Page-level horizontal margins"
      section:
        gap:
          value: 32
          usage: "Vertical gap between major page sections"

    typography:
      heading:
        h1: { family: "sans", size: 32, weight: 700, line_height: 1.25, usage: "Page titles" }
        h2: { family: "sans", size: 24, weight: 600, line_height: 1.3, usage: "Section headings" }
        h3: { family: "sans", size: 20, weight: 600, line_height: 1.4, usage: "Sub-section headings" }
        h4: { family: "sans", size: 16, weight: 600, line_height: 1.4, usage: "Card headings" }
      body:
        default: { family: "sans", size: 16, weight: 400, line_height: 1.5, usage: "Standard body text" }
        small: { family: "sans", size: 14, weight: 400, line_height: 1.5, usage: "Compact text, table cells" }
      caption: { family: "sans", size: 12, weight: 400, line_height: 1.5, usage: "Captions, helper text" }
      code: { family: "mono", size: 14, weight: 400, line_height: 1.6, usage: "Code, technical values" }
      label: { family: "sans", size: 14, weight: 500, line_height: 1.4, usage: "Form labels, nav items" }

    radius:
      component:
        none:
          value: 0
          usage: "No rounding, sharp corners"
        default:
          value: 8
          usage: "Default rounding for interactive components"
        small:
          value: 4
          usage: "Subtle rounding for buttons, inputs"
        large:
          value: 12
          usage: "Pronounced rounding for modals, cards"
        pill:
          value: 9999
          usage: "Fully rounded for pills, tags, avatars"

    shadow:
      component:
        card:
          value: "$primitive.shadow.sm"
          usage: "Default card elevation"
        dropdown:
          value: "$primitive.shadow.md"
          usage: "Dropdown and popover elevation"
        modal:
          value: "$primitive.shadow.lg"
          usage: "Modal and dialog elevation"
        tooltip:
          value: "$primitive.shadow.xl"
          usage: "Tooltip and command palette elevation"

    motion:
      interaction:
        micro:
          duration: 100
          easing: "$primitive.motion.easings.default"
          usage: "Micro-interactions: toggles, checks"
        state:
          duration: 200
          easing: "$primitive.motion.easings.default"
          usage: "State transitions: hover, focus"
        content:
          duration: 300
          easing: "$primitive.motion.easings.emphasize"
          usage: "Content transitions: tabs, accordions"
        layout:
          duration: 500
          easing: "$primitive.motion.easings.emphasize"
          usage: "Layout animations: sidebar, modal"

    breakpoints:
      mobile: { min: 0, max: 767, usage: "Phones" }
      tablet: { min: 768, max: 1023, usage: "Tablets, landscape phones" }
      desktop: { min: 1024, max: 1439, usage: "Standard desktops" }
      wide: { min: 1440, max: null, usage: "Wide desktops, large monitors" }
```

Required semantic token groups (MUST be present in every valid design-system.yaml):

| Group | Required Keys |
|-------|--------------|
| `color.interactive` | `primary`, `secondary`, `destructive` |
| `color.surface` | `page`, `card`, `elevated` |
| `color.text` | `primary`, `secondary`, `disabled`, `on-primary` |
| `color.border` | `default`, `subtle` |
| `color.status` | `success`, `warning`, `error`, `info` |
| `spacing.component` | `padding`, `gap` |
| `spacing.page` | `margin` |
| `spacing.section` | `gap` |
| `typography.heading` | `h1`, `h2`, `h3`, `h4` |
| `typography.body` | `default`, `small` |
| `typography` (direct) | `caption`, `code`, `label` |
| `radius.component` | `none`, `default`, `small`, `large`, `pill` |
| `shadow.component` | `card`, `dropdown`, `modal`, `tooltip` |
| `motion.interaction` | `micro`, `state`, `content`, `layout` |
| `breakpoints` | `mobile`, `tablet`, `desktop`, `wide` |

### 1.2.4 Tokens: Component Tier

Location: `tokens.component`

Component tokens MUST reference semantic tokens using the syntax `$semantic.{path}`. Direct primitive references are NOT permitted in component tokens (they must go through the semantic tier).

```yaml
tokens:
  component:
    button:
      primary:
        bg: "$semantic.color.interactive.primary"
        text: "$semantic.color.text.on-primary"
        border: "none"
        shadow: "none"
        radius: "$semantic.radius.component.small"
        padding_x: 24
        padding_y: 0
        height: 44
        font_size: "$semantic.typography.label.size"
        font_weight: "$semantic.typography.label.weight"
        hover:
          bg: "$semantic.color.interactive.primary-hover"
        active:
          bg: "$semantic.color.interactive.primary"  # Same or darker
          transform: "scale(0.98)"
        focus:
          ring_color: "$semantic.color.interactive.primary"
          ring_width: 2
          ring_offset: 2
        disabled:
          bg: "$semantic.color.surface.page"
          text: "$semantic.color.text.disabled"
          opacity: 0.6
      secondary:
        bg: "transparent"
        text: "$semantic.color.text.primary"
        border: "$semantic.color.border.default"
        # ... same structure
      # ... tertiary, destructive, ghost variants

    input:
      default:
        bg: "$semantic.color.surface.card"
        text: "$semantic.color.text.primary"
        placeholder: "$semantic.color.text.disabled"
        border: "$semantic.color.border.default"
        radius: "$semantic.radius.component.small"
        height: 40
        padding_x: 12
        font_size: "$semantic.typography.body.default.size"
        focus:
          border: "$semantic.color.interactive.primary"
          ring_color: "$semantic.color.interactive.primary"
          ring_width: 2
        error:
          border: "$semantic.color.status.error"
          ring_color: "$semantic.color.status.error"
        disabled:
          bg: "$semantic.color.surface.page"
          text: "$semantic.color.text.disabled"
          border: "$semantic.color.border.subtle"

    card:
      bg: "$semantic.color.surface.card"
      border: "$semantic.color.border.subtle"
      radius: "$semantic.radius.component.default"
      padding: "$semantic.spacing.component.padding"
      shadow: "$semantic.shadow.component.card"
```

Validation rules for component tokens:
- Every value that is a string starting with `$semantic.` MUST resolve to an existing semantic token
- No circular references are permitted (a component token MUST NOT transitively reference itself)
- Every component that has an entry in the Component Contracts spec (see spec 03) MUST have a corresponding component token group
- Height values for interactive components MUST be >= 44 (touch target minimum)

### 1.2.5 Themes

Location: `themes`

Each theme maps semantic token paths to alternate primitive values. The `light` theme is REQUIRED and is the default. The `dark` theme is REQUIRED.

```yaml
themes:
  light:
    color.interactive.primary: "$primitive.color.blue-600"
    color.surface.page: "$primitive.color.gray-50"
    color.text.primary: "$primitive.color.gray-900"
    # ... all semantic color tokens must be mapped

  dark:
    color.interactive.primary: "$primitive.color.blue-400"
    color.surface.page: "$primitive.color.gray-900"
    color.text.primary: "$primitive.color.gray-100"
    # ... all semantic color tokens must be mapped
```

Theme validation rules:
- Every semantic color token MUST have a mapping in every theme
- Non-color semantic tokens (spacing, typography, radius) are theme-invariant unless explicitly overridden
- Every theme mapping MUST reference a valid primitive token

### 1.2.6 Constraints

Location: `constraints`

```yaml
constraints:
  contrast:
    text_on_surface:
      ratio_min: 4.5
      applies_to:
        - ["color.text.primary", "color.surface.page"]
        - ["color.text.primary", "color.surface.card"]
        - ["color.text.secondary", "color.surface.page"]
        - ["color.text.secondary", "color.surface.card"]
        - ["color.text.on-primary", "color.interactive.primary"]
    large_text_on_surface:
      ratio_min: 3.0
      applies_to:
        - ["typography.heading.h1", "color.surface.page"]
        - ["typography.heading.h2", "color.surface.page"]
    ui_elements:
      ratio_min: 3.0
      applies_to:
        - ["color.interactive.primary", "color.surface.page"]
        - ["color.border.default", "color.surface.card"]

  touch_target:
    min_width: 44
    min_height: 44
    applies_to: ["button", "input", "select", "checkbox", "radio", "toggle", "icon-button"]

  spacing_grid:
    base: 4
    rule: "All spacing values MUST be divisible by base"

  motion:
    reduced_motion:
      rule: "When prefers-reduced-motion is active, all durations MUST be set to 0.01ms"
    gpu_only:
      allowed_properties: ["transform", "opacity", "filter"]
      rule: "Animations MUST only animate properties in allowed_properties list"

  color_pairing:
    rules:
      - foreground: "color.text.primary"
        allowed_backgrounds: ["color.surface.page", "color.surface.card", "color.surface.elevated"]
      - foreground: "color.text.on-primary"
        allowed_backgrounds: ["color.interactive.primary", "color.interactive.destructive", "color.status.success", "color.status.error"]
      - foreground: "color.status.error"
        disallowed_backgrounds: ["color.interactive.destructive"]
        reason: "Red text on red background is indistinguishable"
```

The constraint section is declarative. The token compiler (spec 02, section 2.4) MUST evaluate every constraint and report violations as compilation errors. No token set passes compilation with unresolved constraint violations.

---

## 1.3 Bidirectional Conversion

### 1.3.1 DESIGN.md to design-system.yaml

The converter reads a valid DESIGN.md and produces a design-system.yaml. Conversion rules:

**Lossless mappings** (information preserved exactly):

| DESIGN.md | design-system.yaml |
|-----------|-------------------|
| Front-matter `name` | Top-level `name` |
| Front-matter `description` | Top-level `description` |
| Front-matter `design-system-version` | Top-level `design_system_version` |
| Colors section (light) | `tokens.primitive.color.*` + `themes.light.*` |
| Colors > Dark Mode | `themes.dark.*` |
| Typography entries | `tokens.semantic.typography.*` + `tokens.primitive.typography.families/scale` |
| Spacing entries | `tokens.primitive.spacing.scale` + `tokens.semantic.spacing.*` |
| Radius entries | `tokens.primitive.radius.scale` + `tokens.semantic.radius.component.*` |
| Shadow entries | `tokens.primitive.shadow.*` + `tokens.semantic.shadow.component.*` |
| Motion entries | `tokens.primitive.motion.durations` + `tokens.semantic.motion.interaction.*` |
| Breakpoints entries | `tokens.primitive.breakpoints.*` + `tokens.semantic.breakpoints.*` |

**Lossy mappings** (DESIGN.md cannot represent):

| design-system.yaml feature | Handling |
|---------------------------|---------|
| `contrast_min` annotations | Generated with defaults: 4.5 for text-on-surface, 3.0 for UI elements |
| `pairs_with` annotations | Not present in DESIGN.md; populated with empty list |
| `requires_confirmation` | Not present in DESIGN.md; defaults to `false` |
| `usage` descriptions | Extracted from the `-- {description}` portion of each entry |
| Component tokens (Tier 3) | Not present in DESIGN.md; generated with defaults from Component Contracts spec |
| Constraint block | Generated with WCAG 2.1 AA defaults |
| Easing functions (named) | Extracted from Motion entries; unmatched easings assigned to `default` |

When converting DESIGN.md to design-system.yaml, the converter MUST:
1. Validate the DESIGN.md first (section 1.1.13 rules)
2. Auto-generate primitive color names from semantic names using a deterministic naming algorithm: `{hue}-{lightness_bucket}` where lightness is computed from the hex value
3. Create semantic tokens that reference the generated primitives
4. Populate Tier 3 component tokens from the Component Variants section using default mappings
5. Emit an `_conversion_metadata` block documenting all generated/defaulted values

### 1.3.2 design-system.yaml to DESIGN.md

The converter reads a valid design-system.yaml and produces a DESIGN.md.

Conversion rules:

| design-system.yaml | DESIGN.md |
|-------------------|-----------|
| Semantic color tokens (light theme) | Colors section entries |
| Dark theme overrides | Colors > Dark Mode entries |
| Semantic typography tokens | Typography section entries |
| Semantic spacing tokens + primitive scale | Spacing section entries |
| Semantic radius tokens | Radius section entries |
| Semantic shadow tokens | Shadow section entries |
| Semantic motion tokens | Motion section entries |
| Semantic breakpoint tokens | Breakpoints section entries |
| Component tokens + constraint annotations | Component Variants section (visual descriptions generated from token values) |

Information loss (design-system.yaml features not representable in DESIGN.md):
- `contrast_min`, `pairs_with`, `requires_confirmation` annotations (dropped silently)
- Primitive-to-semantic reference chain (flattened to resolved values)
- Component token numeric values (represented as variant descriptions, not raw token maps)
- Constraint block (dropped; only representable in YAML)
- Easing function names (only the `cubic-bezier()` value is preserved)

The converter MUST annotate the generated DESIGN.md front-matter with `generated_from: "design-system.yaml"` and include the conversion timestamp.

### 1.3.3 Round-Trip Guarantee

Converting `DESIGN.md (A) -> design-system.yaml (B) -> DESIGN.md (A')`:

- All values in A MUST appear in A' with identical values
- A' MAY contain additional entries not in A (generated defaults)
- A' MUST pass validation (section 1.1.13)
- The `_conversion_metadata` block in B documents exactly which values were generated vs. original

Converting `design-system.yaml (B) -> DESIGN.md (A) -> design-system.yaml (B')`:

- All DESIGN.md-representable values in B MUST appear in B'
- Constraint annotations, pairing rules, and component token details in B that are not representable in DESIGN.md will be regenerated with defaults in B'
- B' will NOT be byte-identical to B due to default regeneration
- A diff report MUST be emitted listing every value in B that was lost or changed in B'

The practical guarantee: no value that a human entered in DESIGN.md is lost through a round-trip. Computed/defaulted values may change because they are regenerated from the same rules.

---

## 1.4 Authoring Paths

Four paths produce a DESIGN.md. All four MUST produce output that passes validation (section 1.1.13).

### 1.4.1 Path A: Brief-to-DESIGN.md (Model-Generated)

Input: A natural language project brief describing the desired aesthetic.
Process:
1. The LLM reads the brief and extracts aesthetic intent (color mood, typography preference, formality level)
2. The LLM generates a complete DESIGN.md conforming to section 1.1
3. The generated file passes automated validation
4. Human reviews and approves or edits

Constraints:
- The LLM MUST generate all required sections and entries
- The LLM MUST NOT invent spacing values outside the 4px grid
- The LLM MUST ensure contrast ratios meet WCAG 2.1 AA minimums (4.5:1 for normal text, 3:1 for large text and UI elements)
- Generated files MUST set `author: "COC session"` in front-matter

### 1.4.2 Path B: Stitch-Accelerated

Input: A Stitch project (created via Stitch MCP tools).
Process:
1. Invoke Stitch `extract_design_context` tool on the Stitch project
2. Receive raw design tokens (colors, fonts, spacing) in Stitch's output format
3. Run the Stitch normalizer to convert to DESIGN.md format:
   - Snap spacing values to nearest 4px grid value
   - Verify contrast ratios; warn on violations
   - Map typography to nearest scale values
   - Fill missing required entries with safe defaults
4. Human reviews the generated DESIGN.md

Constraints:
- Stitch is an optional accelerator; if unavailable, fall back to Path A or D
- The normalizer MUST NOT silently change colors that fail contrast checks; it MUST emit warnings and mark failing pairs for human review
- Generated files MUST set `author: "Stitch extraction"` in front-matter

### 1.4.3 Path C: Brand Extraction

Input: An existing URL, screenshot, or Figma file representing the brand.
Process:
1. Extract visual properties from the source (colors, fonts, spacing patterns)
2. Map extracted values to DESIGN.md structure
3. Fill gaps (missing required entries) with defaults that complement extracted values
4. Human reviews and approves

Constraints:
- Extraction is inherently approximate; the generated DESIGN.md MUST be treated as a draft requiring human review
- The `author` field MUST identify the extraction source (e.g., `"Brand extraction from https://example.com"`)

### 1.4.4 Path D: Manual Authoring

Input: A designer or developer writes DESIGN.md directly.
Process:
1. Author creates DESIGN.md following the format specification (section 1.1)
2. Run validation to check compliance
3. Fix any validation errors

Constraints:
- No tooling required beyond a text editor
- Author MUST run validation before the file is considered ready for token compilation
- `author` field MUST identify the human author or team

---

## 1.5 Persistence and Versioning

### 1.5.1 File Locations

| File | Location | Committed to Git |
|------|----------|-----------------|
| `DESIGN.md` | Project root (e.g., `kailash-prism/DESIGN.md` or `my-app/DESIGN.md`) | YES |
| `design-system.yaml` | `specs/tokens/themes/{name}.yaml` (within kailash-prism) or `specs/design-system.yaml` (in consumer projects) | YES |
| Compiled tokens (CSS/Tailwind) | `web/src/generated/tokens/` | YES (build artifact committed for reproducibility) |
| Compiled tokens (Dart) | `flutter/lib/generated/tokens/` | YES (same reason) |

### 1.5.2 Change Protocol

When the design system changes:

1. Edit the source file (DESIGN.md or design-system.yaml, whichever is the designated source for the project)
2. If DESIGN.md was edited: re-run DESIGN.md to design-system.yaml conversion
3. If design-system.yaml was edited: re-run design-system.yaml to DESIGN.md conversion
4. Re-run token compilation to produce updated CSS/Tailwind and Dart outputs
5. Run constraint validation on the updated design-system.yaml
6. Commit all changed files atomically (DESIGN.md + design-system.yaml + compiled tokens)

Partial commits (e.g., updating DESIGN.md without recompiling tokens) are a validation error detectable by CI.

### 1.5.3 Version Tracking

The `design-system-version` (DESIGN.md) / `design_system_version` (YAML) field follows semantic versioning:

| Change Type | Version Bump | Examples |
|------------|-------------|---------|
| New color added, new component variant added | MINOR | Adding `color.status.pending`, adding Button `outline` variant |
| Color value changed, spacing scale modified | MAJOR | Changing `primary` from `#1A3A5C` to `#2563EB`, removing a spacing value |
| Usage description updated, typo fix | PATCH | Fixing a description string, correcting a comment |
| Adding a new token tier entry that shadows/overrides existing | MAJOR | Changing `button.primary.height` from 44 to 48 |

### 1.5.4 Single Source Rule

Each project MUST designate either DESIGN.md or design-system.yaml as the single source of truth. The other file is derived. Both files MUST be committed, but edits MUST only be made to the designated source. The designated source is recorded in the front-matter / top-level metadata:

- DESIGN.md: `source: true` in front-matter means DESIGN.md is the source
- design-system.yaml: `source: true` at top level means YAML is the source

If both files claim `source: true`, this is a validation error. If neither claims `source: true`, DESIGN.md is the default source.
