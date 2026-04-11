# UI/UX Architecture for Frontend Codegen Platform

Research analysis: design token architecture, component primitive library, layout grammar, cross-platform strategy, quality assurance, and Stitch integration for LLM-optimized frontend generation.

---

## 1. Design Token Architecture

### The Problem with Tokens for LLMs

Traditional design tokens serve human developers: they name values so developers don't hardcode hex codes. LLMs don't need mnemonics. They need **constraint boundaries** — what is valid, what is related, and what the consequences of a choice are. An LLM doesn't need to know that `primary` is `#1976D2`; it needs to know that `primary` is the color for interactive elements that demand attention, that it must have 4.5:1 contrast against `surface`, and that it pairs with `primaryLight` for hover states.

This means the token architecture must encode **semantic relationships and constraints**, not just name-value pairs.

### Token Structure: Three Tiers

```
Tier 1: PRIMITIVE TOKENS (raw values, brand DNA)
  colors.raw:   blue-600: "#1976D2", blue-500: "#42A5F5", ...
  spacing.raw:  4, 8, 12, 16, 24, 32, 48, 64
  type.raw:     sizes: [11, 12, 14, 16, 18, 20, 24, 32, 45, 57]
  radius.raw:   0, 4, 8, 12, 16, 9999 (pill)
  shadow.raw:   none, card, raised, elevated, modal
  duration.raw: 50, 100, 150, 200, 300, 400, 500, 800

Tier 2: SEMANTIC TOKENS (intent-mapped, theme-switchable)
  color.interactive.primary:    -> blue-600 (light) | blue-300 (dark)
  color.interactive.destructive -> red-600 (light) | red-400 (dark)
  color.surface.page:           -> gray-50 (light) | gray-900 (dark)
  color.text.primary:           -> gray-900 (light) | gray-100 (dark)
  spacing.component.padding:    -> 16
  spacing.component.gap:        -> 12
  spacing.page.margin:          -> 24
  type.heading.h1:              -> { size: 32, weight: 700, leading: 1.25 }
  type.body.default:            -> { size: 16, weight: 400, leading: 1.5 }
  radius.component.default:     -> 8
  shadow.component.card:        -> card
  duration.interaction.micro:   -> 150
  duration.interaction.state:   -> 250

Tier 3: COMPONENT TOKENS (scoped to specific components)
  button.primary.bg:            -> color.interactive.primary
  button.primary.text:          -> color.text.on-primary
  button.primary.height:        -> 48 (primary) | 40 (secondary) | 32 (tertiary)
  button.primary.radius:        -> radius.component.default
  button.primary.padding-x:     -> 24
  card.bg:                      -> color.surface.card
  card.border:                  -> color.border.subtle
  card.radius:                  -> radius.component.default
  card.padding:                 -> spacing.component.padding
  card.shadow:                  -> shadow.component.card
  input.height:                 -> 40
  input.border:                 -> color.border.default
  input.border-focus:           -> color.interactive.primary
  input.radius:                 -> radius.component.default
```

### Why Three Tiers for LLMs

- **Tier 1** defines the universe of valid values. The LLM cannot invent `spacing: 13px` if the raw scale doesn't include 13.
- **Tier 2** gives the LLM intent-based selection. It picks `color.interactive.primary` without needing to reason about hex values or contrast ratios.
- **Tier 3** removes decisions entirely for standard components. When generating a button, the LLM applies `button.primary.*` tokens and the output is guaranteed consistent.

The tiers function as a **constraint funnel**: Tier 1 constrains the universe, Tier 2 constrains intent, Tier 3 constrains components. Each tier reduces the decision space the LLM must navigate.

### DESIGN.md Protocol Assessment

Stitch's DESIGN.md protocol captures design systems as machine-readable Markdown. The format is:

```markdown
## Colors
- primary: #1976D2
- primaryLight: #42A5F5

## Typography
- heading1: Inter, 32px, Bold
- body: Inter, 16px, Regular

## Spacing
- xs: 4px
- sm: 8px
```

**Strengths**: Human-readable, version-controllable, LLM-parseable, no build tooling required.

**Weaknesses**: Flat (no semantic/component tiers), no constraints (nothing says "primary must have 4.5:1 against surface"), no responsive behavior, no state definitions (hover, active, disabled, focus), no motion tokens.

**Recommendation**: Adopt DESIGN.md as the **interchange format** (for Stitch ingestion and human readability) but extend it into a richer internal representation. The internal format should be a structured YAML/JSON that encodes the three-tier hierarchy with constraint annotations:

```yaml
# design-system.yaml (internal representation)
tokens:
  color:
    interactive:
      primary:
        light: "#1976D2"
        dark: "#90CAF9"
        contrast-min: 4.5  # against surface
        usage: "Primary actions, active states, links"
        pairs-with: [primaryLight, primaryDark]
      destructive:
        light: "#C62828"
        dark: "#EF5350"
        contrast-min: 4.5
        usage: "Delete, remove, destructive actions"
        requires-confirmation: true

  spacing:
    scale: [4, 8, 12, 16, 24, 32, 48, 64]
    aliases:
      component-padding: 16
      component-gap: 12
      page-margin: 24
      section-gap: 32
    constraints:
      - "Touch targets minimum 44px"
      - "Card padding always component-padding (16)"
      - "Page margins collapse to 16 on mobile"

  motion:
    micro: { duration: 150, easing: "cubic-bezier(0.2, 0, 0, 1)" }
    state: { duration: 250, easing: "cubic-bezier(0.2, 0, 0, 1)" }
    layout: { duration: 350, easing: "cubic-bezier(0.05, 0.7, 0.1, 1)" }
    constraints:
      - "GPU-only properties: transform, opacity, filter"
      - "prefers-reduced-motion: collapse all to 0.01ms"
```

A **bidirectional converter** (DESIGN.md to/from design-system.yaml) allows Stitch tools to feed in, while the richer format drives codegen.

### Token Count

| Category     | Primitive | Semantic | Component | Total |
|-------------|-----------|----------|-----------|-------|
| Color       | 15-20     | 20-25    | 40-60     | 75-105|
| Typography  | 3-4       | 10-12    | 15-20     | 28-36 |
| Spacing     | 8-10      | 8-10     | 15-20     | 31-40 |
| Radius      | 5-6       | 3-4      | 8-10      | 16-20 |
| Shadow      | 5-6       | 3-4      | 6-8       | 14-18 |
| Motion      | 6-8       | 4-5      | 6-8       | 16-21 |
| Breakpoint  | 4         | 4        | --        | 8     |
| **Total**   |           |          |           | **~190-250** |

This is the minimum token set. A mature system supporting multiple brands would have 400-600.

---

## 2. Component Primitive Library

### Mapping to Kailash Architecture

Kailash's backend SDK has ~140 pre-built nodes (primitives) that an engine composes into workflows. The frontend equivalent should follow the same principle: pre-built, tested, token-consuming components that a layout engine composes into screens.

The key insight is that **not all levels of the Atomic Design hierarchy benefit equally from pre-building**. The value distribution looks like this:

```
ATOMS:      High value from pre-building (most reused, most tokens applied)
MOLECULES:  High value (complex state logic, most common user interactions)
ORGANISMS:  Medium value (more context-dependent, need flexibility)
TEMPLATES:  Very high value for LLMs (biggest cold-start savings)
PAGES:      Low value from pre-building (too project-specific)
```

### Atom Primitives (25-30)

These are the smallest units. Every atom consumes design tokens and handles its own state variants.

| # | Atom | States | Why Pre-built |
|---|------|--------|---------------|
| 1 | Button | default, hover, active, focus, disabled, loading | Action hierarchy (primary/secondary/tertiary/destructive/ghost) |
| 2 | IconButton | same as Button | Icon-only variant with tooltip |
| 3 | TextInput | empty, filled, focus, error, disabled, readonly | Validation, masking, character count |
| 4 | TextArea | same as TextInput + resize | Auto-grow behavior |
| 5 | Select/Dropdown | closed, open, filtered, empty, error, disabled | Keyboard navigation, search, multi-select |
| 6 | Checkbox | unchecked, checked, indeterminate, disabled | Accessibility, label association |
| 7 | Radio | unselected, selected, disabled | Group behavior |
| 8 | Toggle/Switch | off, on, disabled | Instant vs deferred action |
| 9 | Label | default, required, optional, error | Form association, truncation |
| 10 | Badge | count, status, dot | Color variants, max count |
| 11 | Avatar | image, initials, fallback, group | Size variants, status indicator |
| 12 | Icon | standard, colored, sized | Consistent sizing, semantic |
| 13 | Tag/Chip | default, selected, removable, disabled | Overflow (+N more) |
| 14 | Tooltip | above, below, left, right | Delay, max-width, rich content |
| 15 | Spinner | inline, overlay, determinate | Size variants |
| 16 | ProgressBar | determinate, indeterminate, segmented | Animated, with label |
| 17 | Skeleton | text, circle, rect, custom | Shimmer animation |
| 18 | Divider | horizontal, vertical, with label | Spacing variants |
| 19 | Link | default, hover, visited, external | Icon for external |
| 20 | Text/Typography | display, h1-h4, body, caption, code | Truncation, max-lines |
| 21 | Image | loading, loaded, error, placeholder | Aspect ratio, lazy loading |
| 22 | VisuallyHidden | -- | Accessibility-only content |
| 23 | Kbd | -- | Keyboard shortcut display |
| 24 | StatusDot | success, warning, error, info, neutral | Pulsing for active |
| 25 | Separator | horizontal, vertical | Named variant of Divider with semantic meaning |

### Molecule Primitives (20-25)

Molecules combine atoms into functional units that handle a specific user interaction.

| # | Molecule | Composed Of | Why Pre-built |
|---|----------|-------------|---------------|
| 1 | FormField | Label + Input + HelpText + ErrorText | The most repeated pattern in enterprise apps |
| 2 | SearchBar | Input + IconButton(search) + IconButton(clear) | Debounce, keyboard shortcut, suggestions |
| 3 | SelectField | Label + Select + HelpText + ErrorText | Same as FormField but for selects |
| 4 | DatePicker | Input + Calendar popup | Complex interaction, locale-aware |
| 5 | FileUpload | DropZone + ProgressBar + FileList | Drag-and-drop, validation, multi-file |
| 6 | NavItem | Icon + Label + Badge | Active state, nested, collapsible |
| 7 | Breadcrumb | Link + Separator (repeated) | Overflow handling, responsive collapse |
| 8 | Pagination | Button (repeated) + Select(page size) | Total count, range display |
| 9 | Tab | Button (repeated, styled as tabs) | Keyboard navigation, lazy content |
| 10 | AlertBanner | Icon + Text + Action + Close | Info/warning/error/success variants |
| 11 | Toast | Icon + Text + Action + Timer | Auto-dismiss, stack management, undo |
| 12 | EmptyState | Icon/Illustration + Text + Button | Context-specific messaging |
| 13 | MetricCard | Label + Value + Trend + Sparkline | Delta display, formatting |
| 14 | UserCard | Avatar + Name + Role + Status | Compact/expanded variants |
| 15 | ListItem | Leading + Content + Trailing + Actions | Swipe actions (mobile), hover actions |
| 16 | MenuItem | Icon + Label + Shortcut + Chevron | Nested submenus, disabled |
| 17 | DropdownMenu | Trigger + MenuItemList | Positioning, keyboard nav |
| 18 | Popover | Trigger + Content panel | Positioning, click-outside close |
| 19 | DialogActions | Button + Button (cancel + confirm) | Confirm/cancel ordering, loading |
| 20 | TagInput | Input + Tag (repeated) | Autocomplete, max count |
| 21 | ToggleGroup | Toggle (repeated) | Single/multi select, segmented |
| 22 | StepIndicator | Step (repeated) + Connector | Horizontal/vertical, clickable |

### Organism Primitives (15-20)

Organisms are the largest pre-built units. They compose molecules into recognizable UI sections. These require more configuration but save the most generation time.

| # | Organism | Composed Of | Why Pre-built |
|---|----------|-------------|---------------|
| 1 | AppHeader | Logo + NavItems + SearchBar + Avatar + Actions | Every app needs one; consistent navigation |
| 2 | Sidebar | NavItems (grouped) + Collapse toggle | Collapsible, responsive, nested groups |
| 3 | DataTable | Column headers + Rows + Pagination + BulkActions + Sort + Filter | The most complex enterprise component |
| 4 | Form | FormFields (composed) + DialogActions | Validation, submission, reset |
| 5 | Modal/Dialog | Overlay + Header + Body + DialogActions | Focus trap, escape close, scroll |
| 6 | CommandPalette | SearchBar + MenuItemList + Shortcuts | Global search, keyboard-first |
| 7 | SlideOver | Overlay + Panel (side) + Close | Detail view, settings, filters |
| 8 | FilterPanel | FormFields + Apply/Reset buttons | Persistent vs collapsible |
| 9 | CardGrid | Cards (repeated) + Pagination | Responsive columns, empty state |
| 10 | ListView | ListItems (repeated) + Pagination + EmptyState | Virtual scrolling, selection |
| 11 | Toolbar | Buttons + Selects + Dividers | Bulk actions, view toggles |
| 12 | StatsRow | MetricCards (repeated) | Responsive grid, loading state |
| 13 | FormWizard | Steps + Form (per step) + StepIndicator | Multi-step, validation per step |
| 14 | NotificationCenter | List of Toast-like items + Mark all read | Grouped, infinite scroll |
| 15 | SettingsSection | Heading + Description + FormFields/Toggles | Grouped settings pattern |

**AI-Specific Organisms** (additional 5-8, for applications using Kailash Kaizen):

| # | Organism | Purpose |
|---|----------|---------|
| 16 | ChatMessage | User/AI message with citations, widgets, actions, branch indicator |
| 17 | ChatInput | Open input + attachments + source selector + send |
| 18 | StreamOfThought | Step list with queued/running/done/error states |
| 19 | ActionPlan | Numbered plan with approve/modify/reject per step |
| 20 | CitationPanel | Collapsible source list with confidence badges |
| 21 | ConversationSidebar | Thread list with branches, pins, search |
| 22 | SuggestionChips | Wayfinder suggestions in grid or inline |

### Template Primitives (8-12)

Templates define page-level layout with designated content zones. They are the "workflow templates" of frontend codegen — the LLM selects a template and populates zones with organisms.

| # | Template | Layout | Zones | Covers |
|---|----------|--------|-------|--------|
| 1 | DashboardLayout | Stats row + charts + activity feed | 4-6 zones | Admin home, analytics overview |
| 2 | ListLayout | Filter + Table/Grid + Pagination | 3 zones | Contacts, orders, products, any CRUD list |
| 3 | DetailLayout | Header + Tabs + Content sections | 3-5 zones | Contact detail, order detail, any single record |
| 4 | FormLayout | Header + Form sections + Actions | 2-3 zones | Create/edit forms, settings |
| 5 | SettingsLayout | Sidebar nav + Settings sections | 2 zones | App settings, profile |
| 6 | AuthLayout | Centered card + branding | 1-2 zones | Login, register, forgot password |
| 7 | ConversationLayout | Sidebar + Messages + Right panel | 3 zones | AI chat, support, messaging |
| 8 | SplitLayout | Master list + Detail panel | 2 zones | Email, CRM, any master-detail |
| 9 | WizardLayout | StepIndicator + Step content + Nav | 2 zones | Onboarding, multi-step process |
| 10 | EmptyLayout | Full-page empty state | 1 zone | 404, coming soon, no access |
| 11 | KanbanLayout | Column headers + Draggable cards | N columns | Project boards, pipelines |
| 12 | CalendarLayout | Calendar grid + Event detail | 2 zones | Scheduling, events |

### 80/20 Coverage Estimate

The 80/20 rule here: **which primitives cover 80% of enterprise SaaS screens?**

Based on a survey of common enterprise applications (CRM, ERP, project management, analytics dashboards, admin panels), the screen archetypes break down as:

- **List/table screens**: 35% of all screens
- **Detail screens**: 20%
- **Dashboard screens**: 15%
- **Form/edit screens**: 15%
- **Settings screens**: 5%
- **Auth screens**: 5%
- **Other**: 5%

The minimum set that covers 80% of screens:

**20 atoms + 12 molecules + 8 organisms + 6 templates = 46 primitives**

Specifically:
- Atoms: Button, IconButton, TextInput, Select, Checkbox, Toggle, Label, Badge, Avatar, Icon, Tag, Tooltip, Skeleton, Divider, Link, Typography, Image, Spinner, ProgressBar, StatusDot
- Molecules: FormField, SearchBar, SelectField, Pagination, Tab, AlertBanner, Toast, EmptyState, MetricCard, ListItem, MenuItem, DropdownMenu
- Organisms: AppHeader, Sidebar, DataTable, Form, Modal, FilterPanel, CardGrid, Toolbar
- Templates: DashboardLayout, ListLayout, DetailLayout, FormLayout, AuthLayout, SettingsLayout

---

## 3. Layout Grammar

### The Frontend Equivalent of Workflow Orchestration

In Kailash's backend, workflows are directed graphs: nodes (primitives) connected by edges (data flow). The frontend equivalent is a **layout tree**: containers (layout primitives) containing components (UI primitives) with responsive rules (flow control).

The layout grammar defines how primitives compose into screens, just as workflow definitions compose nodes into pipelines.

### Layout Primitives (6 core)

```
1. Stack (vertical)
   Places children top-to-bottom.
   Props: gap, align (start|center|end|stretch), padding
   CSS: flex-direction: column
   Flutter: Column

2. Row (horizontal)
   Places children left-to-right.
   Props: gap, align, justify (start|center|end|between|around), wrap
   CSS: flex-direction: row
   Flutter: Row / Wrap

3. Grid (responsive)
   N-column grid with responsive column spans.
   Props: columns (per breakpoint), gap, row-gap
   CSS: display: grid; grid-template-columns
   Flutter: GridView / custom responsive grid

4. Split (master-detail)
   Two-panel layout with resizable divider.
   Props: ratio (default 1:2), min-width (per panel), collapse-at (breakpoint)
   CSS: flex with min-width constraints
   Flutter: Row with Expanded + constraints

5. Layer (overlay)
   Z-axis stacking for modals, popovers, toasts.
   Props: z-index tier (page, popover, modal, toast, tooltip)
   CSS: position: fixed/absolute with z-index
   Flutter: Overlay / Stack

6. Scroll (overflow)
   Scrollable container with virtualization.
   Props: direction (vertical|horizontal|both), virtualize (threshold)
   CSS: overflow-auto + virtual scrolling library
   Flutter: ListView.builder / CustomScrollView
```

### Responsive Rules as Layout Tokens

Instead of embedding responsive logic in every component, the layout grammar encodes responsive behavior as **rules on layout primitives**:

```yaml
responsive-rules:
  sidebar-content:
    type: Split
    ratio: { mobile: "0:1", tablet: "0:1", desktop: "1:3", wide: "1:4" }
    sidebar-behavior:
      mobile: overlay-drawer
      tablet: icon-only-rail (60px)
      desktop: full (240px)
      wide: full (280px)

  stats-grid:
    type: Grid
    columns: { mobile: 1, tablet: 2, desktop: 4, wide: 4 }
    gap: { mobile: 12, tablet: 16, desktop: 16, wide: 24 }

  action-bar:
    type: Row
    justify: between
    collapse-to-stack: mobile  # Row becomes Stack on mobile
    primary-action:
      mobile: fab  # Floating action button
      desktop: button-in-bar
```

### Page Templates as Workflow Templates

A page template is a **pre-wired layout tree** — the layout equivalent of a Kailash workflow template. The LLM selects a template and fills zones rather than building layout from scratch.

```yaml
template: ListLayout
  root: Stack
    children:
      - zone: page-header
        layout: Row(justify: between)
        contains: [title: Typography.h1, actions: Toolbar]

      - zone: filter-bar
        layout: Row(gap: 12, wrap: true)
        responsive:
          mobile: hidden (move to modal)
          desktop: visible

      - zone: content
        layout: Stack
        contains: [DataTable | CardGrid]  # LLM chooses based on data shape

      - zone: footer
        layout: Row(justify: between)
        contains: [bulk-action-bar, Pagination]
```

### Navigation Patterns as Flow Definitions

Navigation is the frontend equivalent of Kailash's workflow edges — it defines how users move between screens.

```yaml
navigation:
  type: sidebar-primary  # Options: sidebar, top-nav, bottom-nav, breadcrumb

  routes:
    - path: /dashboard
      template: DashboardLayout
      icon: home
      label: Dashboard

    - path: /contacts
      template: ListLayout
      icon: people
      label: Contacts
      children:
        - path: /contacts/:id
          template: DetailLayout
          nav-type: breadcrumb  # Not in sidebar, reached via list

        - path: /contacts/new
          template: FormLayout
          nav-type: modal  # Opens as modal from list

    - path: /settings
      template: SettingsLayout
      icon: settings
      label: Settings
      position: bottom  # Sidebar bottom section
```

This navigation definition gives the LLM enough structure to generate routing code, sidebar navigation, and breadcrumbs without composing them from scratch.

---

## 4. Cross-Platform Strategy

### Shared vs Divergent

The design token and layout grammar layers can be shared. The component implementation layer must diverge.

```
SHARED (platform-agnostic):
  design-system.yaml        <- Tokens (Tier 1, 2, 3)
  layout-grammar.yaml       <- Layout primitives + responsive rules
  page-templates.yaml       <- Template definitions with zones
  navigation.yaml           <- Route structure + nav patterns
  interaction-patterns.yaml <- AI patterns (wayfinders, governors, etc.)

DIVERGENT (platform-specific):
  react/
    components/             <- shadcn/ui + Tailwind + React 19
    state/                  <- React Query + Zustand
    routing/                <- Next.js App Router
    rendering/              <- RSC + Suspense
  flutter/
    components/             <- Material 3 + custom widgets
    state/                  <- Riverpod
    routing/                <- Go Router
    rendering/              <- Widget tree + isolates
```

### Framework-Agnostic Intermediate Representation

The question of whether to build an IR that compiles to both React and Flutter is critical. The answer is: **yes, but only at the layout and composition level, not at the component level**.

Reasons:

1. **Layout is convergent.** A 12-column grid with responsive breakpoints means the same thing in CSS Grid and Flutter GridView. The layout grammar YAML naturally serves as an IR.

2. **Components are deeply divergent.** A React `<DataTable>` using Tanstack Table with server-side sorting, React Query for data fetching, and Shadcn styling has almost nothing in common with a Flutter `DataTable` widget using Riverpod for state and Material 3 for styling. Abstracting this into an IR produces lowest-common-denominator output that neither platform does well.

3. **Token application is convergent.** `color.interactive.primary -> #1976D2` applies the same way in Tailwind (`text-primary`) and Flutter (`AppColors.primary`). A token-to-platform compiler is straightforward.

**Proposed IR architecture:**

```
design-system.yaml ─┬──> token-compiler ──> tailwind.config.ts
                     │                  ──> colors.dart + typography.dart + spacing.dart
                     │
layout-grammar.yaml ─┼──> layout-compiler ──> React layout components (CSS Grid/Flex)
                     │                    ──> Flutter layout widgets (Row/Column/Grid)
                     │
page-templates.yaml ─┼──> template-compiler ──> Next.js page scaffolds
                     │                      ──> Flutter screen scaffolds
                     │
components ──────────┴──> NOT compiled across platforms
                         React: shadcn/ui extended with tokens
                         Flutter: Material 3 extended with tokens
```

### Token Compilation Details

**React/Tailwind target:**

```typescript
// Generated: tailwind.config.ts
const config = {
  theme: {
    colors: {
      primary: { DEFAULT: '#1976D2', light: '#42A5F5', dark: '#0D47A1' },
      destructive: { DEFAULT: '#C62828', light: '#EF5350' },
      surface: { DEFAULT: '#FFFFFF', page: '#F5F5F5', card: '#FFFFFF' },
      // ... generated from design-system.yaml
    },
    spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px' },
    borderRadius: { sm: '8px', md: '12px', lg: '16px' },
  }
}
```

**Flutter target:**

```dart
// Generated: colors.dart
class AppColors {
  AppColors._();
  static const Color primary = Color(0xFF1976D2);
  static const Color primaryLight = Color(0xFF42A5F5);
  static const Color primaryDark = Color(0xFF0D47A1);
  static const Color destructive = Color(0xFFC62828);
  // ... generated from design-system.yaml
}
```

Same source of truth, platform-native output. The LLM generates **platform-specific code** that references **platform-specific token files**, but both trace back to the same `design-system.yaml`.

---

## 5. Quality Assurance Pipeline

### Preventing AI Slop at the Architecture Level

The existing /i-audit, /i-polish, /i-harden pipeline operates post-generation: generate first, audit after. This is necessary but insufficient. Architectural-level prevention means the LLM **cannot produce slop** because the primitive system constrains its output space.

### Three Prevention Layers

**Layer 1: Constrained Generation (Before)**

The design token system constrains valid values. The component primitive library constrains valid compositions. The layout grammar constrains valid structures. If the LLM must select from pre-defined primitives rather than inventing components, the output is inherently more consistent.

This is analogous to Kailash's node system: a workflow author selects from 140 pre-built nodes rather than writing arbitrary code. The constraint is the quality mechanism.

Concrete mechanisms:
- Token validation: any color/spacing/radius value must reference a token, not a raw value
- Component allowlist: generated code must use primitive components, not raw HTML/widgets
- Layout validation: page structure must match a template or be composable from layout primitives
- Typography scale enforcement: font sizes must come from the type scale

**Layer 2: Automated Compliance (During)**

Real-time checks that run as part of generation, not as a separate audit step:

```
Check                         | Implementation
------------------------------|----------------------------------------------
Token adherence               | Lint rule: no raw color/spacing/radius values
Component coverage            | Static analysis: all imports from primitive lib
Accessibility baseline        | Automated: contrast ratios, aria-labels, focus order
Responsive completeness       | Verify breakpoint coverage for all layout primitives
State completeness            | Each data-fetching component has loading + error + empty
Typography scale compliance   | No font-size values outside the defined scale
Motion compliance             | No animation on non-GPU properties; reduced-motion handler
```

**Layer 3: Evolved Pipeline (After)**

The existing pipeline becomes the final gate:

```
/i-audit (detect problems)
  NOW:  Manual heuristic evaluation (P0-P3)
  EVOLVED:
    - Automated AI slop fingerprint scan (existing 5-point checklist)
    - Token adherence report (automated)
    - Component primitive coverage percentage
    - Accessibility audit (axe-core / flutter_test semantics)
    - Visual regression against template baseline

/i-polish (fix problems)
  NOW:  Agent fixes issues found in audit
  EVOLVED:
    - Auto-fix token violations (replace raw values with nearest token)
    - Auto-fix missing states (add skeleton/error/empty for data components)
    - Typography normalization (snap to nearest scale value)

/i-harden (stress test)
  NOW:  Production hardening checklist (manual verification)
  EVOLVED:
    - Automated content resilience tests (0-char, 500-char, emoji, RTL)
    - Automated responsive snapshot tests (375px, 768px, 1024px, 1440px)
    - Automated accessibility audit (keyboard nav, screen reader, zoom)
    - Performance benchmarks (render time, bundle size, Lighthouse score)
```

### Visual Regression Integration

For cross-session and cross-project consistency, visual regression testing compares generated screens against baselines:

1. Each template has a **golden screenshot** at each breakpoint
2. Generated screens are compared pixel-by-pixel (with configurable tolerance for content differences)
3. Deviations above threshold trigger review

Tools: Playwright (React) for screenshot comparison, Golden tests (Flutter) for widget snapshots.

### Component Library Version Control

The primitive library itself needs versioning, independent of the projects that consume it:

```
primitives/
  v1.0.0/
    atoms/
    molecules/
    organisms/
    templates/
    tokens/
    CHANGELOG.md
```

Each project pins a primitive version. Upgrades are explicit. This prevents the "design system drift" problem where each project subtly modifies shared components.

---

## 6. Stitch Integration Opportunity

### Tool-by-Tool Analysis

**`extract_design_context` (URL -> design tokens)**

Value: High. This is the fastest path from "I want my app to look like X" to a populated `design-system.yaml`. The extracted tokens become Tier 1 primitives that feed into semantic and component token tiers.

Integration flow:
```
User provides reference URL
  -> Stitch extract_design_context
  -> Raw design tokens (colors, fonts, spacing)
  -> Token normalizer (snap to nearest scale values, ensure contrast compliance)
  -> design-system.yaml (Tier 1 populated)
  -> LLM generates Tier 2 (semantic) and Tier 3 (component) mappings
  -> Token compiler generates platform-specific token files
```

**`generate_screen_from_text` (prompt -> visual design)**

Value: Medium. Useful for early exploration ("show me a dashboard for sales analytics") but outputs raw HTML, not composed components. The gap between "visual concept" and "production component tree" is significant.

Integration flow:
```
User describes screen
  -> Stitch generate_screen_from_text
  -> HTML + Tailwind mockup (visual reference only)
  -> LLM analyzes mockup structure
  -> Maps to nearest page template + primitives
  -> Generates production code using primitive library
```

The critical step is the LLM mapping from unstructured HTML to structured primitives. This is where the component library proves its value: instead of trying to replicate arbitrary HTML, the LLM identifies which template and which organisms best match the mockup, then populates them.

**`get_screen_code` (screen -> HTML code)**

Value: Low for direct use, medium as training signal. The HTML output lacks component structure, state management, accessibility, responsive behavior, and production hardening. However, it can serve as a **structural hint** that the LLM interprets rather than copies.

**`extract_components` / `extract_patterns`**

Value: High if Stitch adds these (currently not available). Extracting component patterns from reference URLs and mapping them to our primitive library would close the "I want it to look like that CRM" loop.

### The Gap: Raw HTML to Composed Components

Stitch outputs:
```html
<div class="flex items-center gap-4 p-4 bg-white rounded-lg shadow">
  <img class="w-10 h-10 rounded-full" src="..." />
  <div>
    <p class="font-semibold text-gray-900">John Doe</p>
    <p class="text-sm text-gray-500">Engineering</p>
  </div>
  <span class="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">Active</span>
</div>
```

What we need:
```tsx
<UserCard
  avatar={{ src: "...", fallback: "JD" }}
  name="John Doe"
  subtitle="Engineering"
  status="active"
/>
```

The **primitive-matching engine** (an LLM-driven step) converts raw HTML patterns to primitive component usage. This is the "compilation" step that Stitch alone cannot provide and that justifies the component library's existence.

### MCP Integration Architecture

```
Stitch MCP Server
  |
  |-- extract_design_context --> Token Ingestion Pipeline --> design-system.yaml
  |-- generate_screen_from_text --> Visual Exploration --> Template Matching
  |
Kailash FE Codegen Pipeline
  |
  |-- design-system.yaml --> Token Compiler --> tailwind.config.ts / colors.dart
  |-- Template Selection --> Layout Grammar --> Scaffold Generation
  |-- Primitive Composition --> Production Code (React or Flutter)
  |-- /i-audit + /i-polish + /i-harden --> Quality Gate
```

Stitch handles design exploration and token extraction. The Kailash pipeline handles structured composition, production code generation, and quality assurance.

---

## 7. Concrete Primitive Count and Minimum Viable Set

### Full Primitive Inventory

| Category | Count | Notes |
|----------|-------|-------|
| **Design Tokens** | ~220 | Across all three tiers |
| **Atom Components** | 25 | Core interactive elements |
| **Molecule Components** | 22 | Composed interaction units |
| **Organism Components** | 22 | Page sections (15 standard + 7 AI-specific) |
| **Template Layouts** | 12 | Page-level scaffolds |
| **Layout Primitives** | 6 | Stack, Row, Grid, Split, Layer, Scroll |
| **Navigation Patterns** | 4 | Sidebar, top-nav, bottom-nav, breadcrumb |
| **Responsive Rule Sets** | 8 | Per-template responsive configurations |
| **TOTAL** | **~319** | Full enterprise-grade library |

### Minimum Viable Primitive Set (MVP)

The 10x speed multiplier requires the LLM to spend most of its time **composing** from pre-built pieces rather than **generating** from scratch. Based on the screen archetype analysis (list 35%, detail 20%, dashboard 15%, form 15%), the MVP must cover those four categories.

**MVP: 120-130 primitives**

```
Tokens (MVP):              ~120
  - Tier 1 (all):          45 (colors + spacing + type + radius + shadow)
  - Tier 2 (core):         35 (semantic mappings for the above)
  - Tier 3 (top 8 comps):  40 (button, card, input, table, select, badge, avatar, tag)

Atoms (MVP):               16
  Button, IconButton, TextInput, TextArea, Select, Checkbox, Toggle,
  Label, Badge, Avatar, Icon, Tag, Tooltip, Skeleton, Spinner, Typography

Molecules (MVP):           10
  FormField, SearchBar, SelectField, Pagination, Tab, AlertBanner,
  Toast, EmptyState, MetricCard, ListItem

Organisms (MVP):           8
  AppHeader, Sidebar, DataTable, Form, Modal, FilterPanel, CardGrid, Toolbar

Templates (MVP):           4
  DashboardLayout, ListLayout, DetailLayout, FormLayout

Layout Primitives (MVP):   4
  Stack, Row, Grid, Split

Navigation (MVP):          1
  Sidebar navigation pattern
```

**Total MVP: ~163 discrete artifacts** (tokens + components + templates + layout)

### When Does the 10x Multiplier Kick In?

The multiplier is not binary. It scales with coverage:

| Coverage Level | Primitive Count | Speed Multiplier | What's Covered |
|---------------|-----------------|-------------------|----------------|
| **Phase 0**: Guidance only (current state) | 0 primitives, 7 skills | 1.5-2x vs blank slate | LLM knows principles but builds from scratch |
| **Phase 1**: Tokens + atoms | ~90 | 3-4x | Consistent styling, no raw values, basic components |
| **Phase 2**: + molecules + organisms | ~130 | 5-7x | Complex interactions pre-built, state handling included |
| **Phase 3**: + templates + layout grammar | ~165 | 8-10x | Full screen composition from templates |
| **Phase 4**: + AI patterns + full library | ~320 | 10x+ (compounding) | AI application screens, any enterprise archetype |

The meaningful threshold is **Phase 2** (~130 primitives). At this point, the LLM stops generating DataTable implementations from scratch and starts composing them from a pre-built, tested DataTable organism with pre-built pagination, sorting, filtering, and bulk actions.

Phase 3 is where the multiplier hits 10x because templates eliminate layout decisions entirely. The LLM goes from "build a contacts page" to "select ListLayout, populate with ContactsTable organism, configure filter panel" in one reasoning step.

### Build Sequence Recommendation

The build order should maximize coverage of the most common screen archetype first:

```
Sprint 1 (foundation):
  All design tokens (Tier 1 + 2)
  Layout primitives (Stack, Row, Grid, Split)
  Token compilers (-> Tailwind config, -> Flutter tokens)

Sprint 2 (atoms):
  Button, TextInput, Select, Checkbox, Toggle
  Label, Badge, Avatar, Icon, Tag
  Typography, Skeleton, Spinner, Tooltip

Sprint 3 (molecules + first template):
  FormField, SearchBar, Pagination, Tab
  AlertBanner, Toast, EmptyState
  ListLayout template
  -> Can now generate list/table screens

Sprint 4 (organisms):
  DataTable, Form, AppHeader, Sidebar
  Modal, FilterPanel, Toolbar
  DashboardLayout, DetailLayout, FormLayout templates
  -> Can now generate 85% of enterprise screens

Sprint 5 (AI-specific):
  ChatMessage, ChatInput, StreamOfThought
  ActionPlan, CitationPanel, SuggestionChips
  ConversationLayout template
  -> Full Kaizen application support

Sprint 6 (remaining):
  Remaining atoms, molecules, organisms
  SettingsLayout, AuthLayout, WizardLayout, etc.
  Full visual regression baseline
  -> 100% enterprise coverage
```

At autonomous execution rates (per the COC 10x multiplier), each sprint is approximately 1-2 sessions. The full library builds in 6-12 sessions total. However, Sprints 1-3 are sufficient for the first projects to see a material speed improvement, making this a 3-4 session investment before payoff begins.

---

## Summary: Architecture Decision Record

**Decision 1: Token Architecture** — Three-tier (primitive / semantic / component) tokens stored in structured YAML, compiled to platform-specific files. DESIGN.md adopted as interchange format, not internal representation.

**Decision 2: Component Library** — Atomic Design hierarchy with ~320 total primitives. Pre-build everything from atoms through templates. MVP at ~165 primitives covering 80% of enterprise screen archetypes.

**Decision 3: Layout Grammar** — Six layout primitives (Stack, Row, Grid, Split, Layer, Scroll) with responsive rules. Page templates as pre-wired layout trees. Navigation as declarative route definitions.

**Decision 4: Cross-Platform** — Shared token/layout/template definitions compiled to React and Flutter targets. Component implementations are platform-native, not cross-compiled. No component-level IR.

**Decision 5: Quality Pipeline** — Three layers: constrained generation (tokens + primitives prevent slop), automated compliance (lint rules during generation), evolved /i-audit + /i-polish + /i-harden (automated post-generation testing).

**Decision 6: Stitch Integration** — Stitch feeds design exploration and token extraction. Kailash pipeline handles structured composition and production code. Primitive-matching engine bridges the gap between raw HTML and composed components.

**Decision 7: Build Sequence** — Foundation tokens and layout in Sprint 1. Core atoms in Sprint 2. First usable template (ListLayout) in Sprint 3. Full enterprise coverage by Sprint 6. Payoff begins at Sprint 3 (~3-4 sessions).
