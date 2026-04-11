# 04 Layout Grammar

Spec version: 0.1.0 | Status: DRAFT | Governs: Layout primitives, responsive rules, zone composition, spacing system

---

## 4.1 Layout Primitives

Six layout primitives compose all page structures. Each primitive is a container that arranges its children according to a single layout algorithm. Primitives nest to form layout trees.

### 4.1.1 VStack

**Purpose**: Arranges children vertically, top to bottom. Named `VStack` (vertical stack) to avoid collision with Flutter's `Stack` widget (which is a Z-axis overlay). In YAML templates and layout grammar, this primitive is referenced as `VStack`.

**Props**:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `gap` | `SpacingToken` | `0` | Vertical space between children. MUST reference a spacing token. |
| `align` | `"start" \| "center" \| "end" \| "stretch"` | `"stretch"` | Horizontal alignment of children within the stack. |
| `padding` | `SpacingToken \| SpacingEdges` | `0` | Inner padding. May be a single token or per-edge `{ top, right, bottom, left }`. |
| `reverse` | `boolean` | `false` | Reverses child order (bottom to top). |
| `fill` | `boolean` | `false` | When true, stack expands to fill available height (flex: 1 / Expanded). |

**CSS implementation**:
```css
display: flex;
flex-direction: column; /* column-reverse when reverse: true */
gap: var(--gap);
align-items: var(--align); /* start|center|end|stretch */
padding: var(--padding);
flex: 1; /* only when fill: true */
```

**Flutter implementation**:
```
Column(
  mainAxisSize: fill ? MainAxisSize.max : MainAxisSize.min,
  crossAxisAlignment: CrossAxisAlignment.{align},
  children: [/* with SizedBox(height: gap) between each, or Expanded wrapper when fill */],
)
```
When `fill: true`, the VStack wraps in an `Expanded` widget within its parent. When `reverse: true`, the `children` list is reversed.

**Responsive behavior**: VStack has no breakpoint-specific collapse behavior. Gap and padding MAY be responsive tokens (see Section 4.2.2). Alignment does not change across breakpoints.

**Nesting rules**: VStack MAY contain any layout primitive or any component. VStack is the default root container for all pages.

---

### 4.1.2 Row

**Purpose**: Arranges children horizontally, left to right.

**Props**:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `gap` | `SpacingToken` | `0` | Horizontal space between children. MUST reference a spacing token. |
| `align` | `"start" \| "center" \| "end" \| "stretch" \| "baseline"` | `"center"` | Vertical alignment of children within the row. |
| `justify` | `"start" \| "center" \| "end" \| "between" \| "around" \| "evenly"` | `"start"` | Horizontal distribution of children. |
| `wrap` | `boolean` | `false` | Whether children wrap to the next line when they exceed row width. |
| `padding` | `SpacingToken \| SpacingEdges` | `0` | Inner padding. |
| `reverse` | `boolean` | `false` | Reverses child order (right to left). |
| `collapse` | `Breakpoint \| null` | `null` | Breakpoint at or below which the Row becomes a VStack. |

**CSS implementation**:
```css
display: flex;
flex-direction: row; /* row-reverse when reverse: true */
gap: var(--gap);
align-items: var(--align);
justify-content: var(--justify);
flex-wrap: wrap; /* when wrap: true */
padding: var(--padding);

/* When collapse is set, at the specified breakpoint: */
@media (max-width: var(--collapse-breakpoint)) {
  flex-direction: column;
}
```

**Flutter implementation**:
```
wrap == false:
  Row(
    mainAxisAlignment: MainAxisAlignment.{justify},
    crossAxisAlignment: CrossAxisAlignment.{align},
    children: [/* with SizedBox(width: gap) between each */],
  )

wrap == true:
  Wrap(
    spacing: gap,
    runSpacing: gap,
    alignment: WrapAlignment.{justify},
    crossAxisAlignment: WrapCrossAlignment.{align},
    children: [...],
  )
```
When `collapse` is set, the Flutter implementation uses a `LayoutBuilder` to switch between `Row` and `Column` at the collapse breakpoint.

**Responsive behavior**: The `collapse` prop is the primary responsive mechanism. When the viewport width is at or below the named breakpoint, the Row renders as a VStack. All other props (gap, align, justify) remain unchanged after collapse. Wrap behavior is ignored after collapse (VStack does not wrap).

**Nesting rules**: Row MAY contain any layout primitive or any component. A Row inside a Row is valid but discouraged in favor of a single Row with nested items.

---

### 4.1.3 Grid

**Purpose**: Arranges children in an N-column grid with responsive column counts.

**Props**:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | `number \| ResponsiveValue<number>` | `{ mobile: 1, tablet: 2, desktop: 3, wide: 4 }` | Number of equal-width columns at each breakpoint. |
| `gap` | `SpacingToken \| ResponsiveValue<SpacingToken>` | `16` | Gap between grid items (both column and row gap). |
| `rowGap` | `SpacingToken \| null` | `null` | Vertical gap between rows. When null, uses `gap` for both axes. |
| `padding` | `SpacingToken \| SpacingEdges` | `0` | Inner padding of the grid container. |
| `minChildWidth` | `number \| null` | `null` | Minimum width (px) per child. When set, columns are auto-calculated to fit. Overrides `columns`. |

**CSS implementation**:
```css
display: grid;
grid-template-columns: repeat(var(--columns), 1fr);
gap: var(--gap);
row-gap: var(--row-gap, var(--gap));
padding: var(--padding);

/* When minChildWidth is set: */
grid-template-columns: repeat(auto-fill, minmax(var(--min-child-width), 1fr));
```

**Flutter implementation**:
```
GridView.count(
  crossAxisCount: columns,  /* resolved per breakpoint via LayoutBuilder */
  mainAxisSpacing: rowGap ?? gap,
  crossAxisSpacing: gap,
  padding: EdgeInsets.all(padding),
  children: [...],
)
```
When `minChildWidth` is set, Flutter uses a `LayoutBuilder` to calculate `crossAxisCount = max(1, floor(availableWidth / minChildWidth))`.

**Responsive behavior**: The `columns` prop accepts responsive values (see Section 4.2.2). Grid children reflow automatically as column count changes. There is no collapse behavior; a single-column Grid at mobile is equivalent to a VStack with gap.

**Nesting rules**: Grid MAY contain any layout primitive or any component. Grid children fill one grid cell each. A child that should span multiple columns MUST use the `span` prop on the child wrapper (see Section 4.1.7).

---

### 4.1.4 Split

**Purpose**: Two-panel layout with a resizable divider. Used for master-detail, sidebar-content, and editor-preview patterns.

**Props**:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `ratio` | `string \| ResponsiveValue<string>` | `"1:2"` | Ratio of left panel to right panel. Format: `"N:M"`. |
| `minWidth` | `{ left: number, right: number }` | `{ left: 200, right: 300 }` | Minimum width in px for each panel. |
| `collapse` | `Breakpoint` | `"tablet"` | Breakpoint at or below which the Split collapses to a single panel. |
| `collapseTarget` | `"left" \| "right"` | `"right"` | Which panel is shown when collapsed. The other panel becomes an overlay drawer. |
| `resizable` | `boolean` | `true` | Whether the user can drag the divider to resize panels. |
| `gap` | `SpacingToken` | `0` | Gap between panels (visual gap only; divider sits in the middle). |
| `dividerWidth` | `number` | `1` | Width of the divider in px. |

**CSS implementation**:
```css
display: flex;
flex-direction: row;

/* Left panel */
.split-left {
  flex: N; /* from ratio N:M */
  min-width: var(--min-width-left);
  overflow: auto;
}

/* Right panel */
.split-right {
  flex: M; /* from ratio N:M */
  min-width: var(--min-width-right);
  overflow: auto;
}

/* Divider */
.split-divider {
  width: var(--divider-width);
  cursor: col-resize; /* when resizable: true */
  background: var(--color-border-subtle);
}

/* Collapsed state */
@media (max-width: var(--collapse-breakpoint)) {
  .split-left { display: none; } /* or .split-right, depending on collapseTarget */
  .split-visible { flex: 1; }
}
```

**Flutter implementation**:
```
LayoutBuilder:
  if (constraints.maxWidth > collapseBreakpoint):
    Row(
      children: [
        Expanded(flex: N, child: leftPanel),
        if (resizable) VerticalDivider + GestureDetector,
        Expanded(flex: M, child: rightPanel),
      ],
    )
  else:
    /* Show collapseTarget panel full-width; other panel accessible via Drawer/SlideOver */
```

**Responsive behavior**: Split uses the `ratio` prop per breakpoint to adjust panel proportions. At the `collapse` breakpoint, the split degrades to a single panel with the hidden panel accessible as a slide-over drawer. The `ratio` format `"0:1"` means left panel is hidden; `"1:0"` means right panel is hidden.

**Nesting rules**: Split MUST have exactly two children: `left` and `right`. Each child MAY contain any layout primitive or component. Splits MAY nest (a Split inside a Split creates a three-panel layout).

---

### 4.1.5 Layer

**Purpose**: Z-axis stacking for overlays, modals, popovers, and toasts. Layer does not participate in flow layout; its children are positioned absolutely or fixed relative to a reference.

**Props**:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tier` | `"page" \| "popover" \| "modal" \| "toast" \| "tooltip"` | `"page"` | Z-index tier. Determines stacking order among layers. |
| `anchor` | `"viewport" \| "parent" \| ElementRef` | `"viewport"` | Positioning reference for the layer content. |
| `position` | `"center" \| "top" \| "bottom" \| "start" \| "end" \| PositionXY` | `"center"` | Where the content appears relative to the anchor. Uses logical properties: `start`/`end` resolve to left/right in LTR and right/left in RTL. |
| `backdrop` | `boolean` | `false` | Whether a semi-transparent backdrop is shown behind the layer content. |
| `backdropDismiss` | `boolean` | `true` | Whether clicking the backdrop dismisses the layer. |
| `trapFocus` | `boolean` | `false` | Whether keyboard focus is trapped within the layer content. MUST be true for modals. |
| `animation` | `"fade" \| "slide" \| "scale" \| "none"` | `"fade"` | Enter/exit animation type. |

**Z-index tiers** (exact values):

| Tier | z-index (web) | Description |
|------|---------------|-------------|
| `page` | `0` | Normal flow content. |
| `popover` | `100` | Dropdown menus, popovers, tooltips within page context. |
| `modal` | `200` | Modal dialogs, slide-overs, command palette. |
| `toast` | `300` | Toast notifications, snackbars. |
| `tooltip` | `400` | Tooltips (always on top). |

**CSS implementation**:
```css
.layer {
  position: fixed; /* or absolute when anchor: "parent" */
  z-index: var(--tier-z-index);
  inset: 0; /* when anchor: "viewport" */
}

.layer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: var(--tier-z-index);
}

.layer-content {
  position: relative;
  z-index: calc(var(--tier-z-index) + 1);
  /* positioning based on position prop */
}
```

**Flutter implementation**:
```
tier == "page":
  /* Normal widget tree, no overlay */

tier == "popover" | "tooltip":
  OverlayEntry with Positioned widget

tier == "modal":
  showDialog() or showModalBottomSheet()

tier == "toast":
  OverlayEntry positioned at top/bottom with auto-dismiss timer
```

**Responsive behavior**: Layer has no breakpoint-specific behavior. Modal layers on mobile SHOULD use `position: "bottom"` with slide-up animation for reachability. This is configured per-component, not per-primitive.

**Nesting rules**: Layer MAY contain any layout primitive or component as its content. Layers MUST NOT be nested directly (a Layer inside a Layer is undefined). Multiple layers at the same tier stack in document order (last-opened on top).

---

### 4.1.6 Scroll

**Purpose**: Scrollable container. Provides overflow handling and optional virtualization for large content.

**Props**:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `direction` | `"vertical" \| "horizontal" \| "both"` | `"vertical"` | Scroll axis. |
| `virtualize` | `boolean \| number` | `false` | When `true`, virtualizes when child count > 50. When a number, virtualizes when child count > that number. |
| `overscan` | `number` | `5` | Number of items rendered outside the visible area (buffer for smooth scrolling). |
| `itemHeight` | `number \| "auto"` | `"auto"` | Fixed item height in px. When `"auto"`, variable item heights are measured dynamically. Fixed heights are more performant. |
| `padding` | `SpacingToken \| SpacingEdges` | `0` | Inner padding of the scroll container. |
| `snapTo` | `"none" \| "start" \| "center"` | `"none"` | Scroll snap behavior for child items. |
| `indicator` | `boolean` | `true` | Whether to show scroll indicator (scrollbar on web, indicator on mobile). |

**CSS implementation**:
```css
.scroll {
  overflow-y: auto; /* or overflow-x, or overflow: auto, based on direction */
  padding: var(--padding);
  scroll-snap-type: y mandatory; /* when snapTo is set */
  -webkit-overflow-scrolling: touch; /* smooth momentum on iOS */
}

.scroll-child {
  scroll-snap-align: var(--snap-to); /* start | center | none */
}

/* Virtualization: delegate to @tanstack/virtual */
```

**Flutter implementation**:
```
virtualize == false:
  SingleChildScrollView(
    scrollDirection: Axis.{direction},
    padding: EdgeInsets.all(padding),
    child: Column/Row(children: [...]),
  )

virtualize == true:
  ListView.builder(
    scrollDirection: Axis.{direction},
    padding: EdgeInsets.all(padding),
    itemCount: itemCount,
    itemExtent: itemHeight != "auto" ? itemHeight : null,
    itemBuilder: (context, index) => buildItem(index),
  )

direction == "both":
  InteractiveViewer or nested ScrollView
```

**Responsive behavior**: Scroll has no breakpoint-specific collapse behavior. The `virtualize` threshold is constant across breakpoints. On mobile, the scroll container SHOULD support pull-to-refresh when used as the page-level scroll (configured by the containing template, not the Scroll primitive itself).

**Nesting rules**: Scroll MAY contain any layout primitive or component. A Scroll inside a Scroll with the same direction is explicitly forbidden (nested same-direction scrolling creates usability problems). Scroll with `direction: "vertical"` inside Scroll with `direction: "horizontal"` is valid.

---

### 4.1.7 Grid Child Span

Grid children that need to span multiple columns use a wrapper:

**Props**:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `span` | `number \| ResponsiveValue<number>` | `1` | Number of columns this child spans. |

**CSS**: `grid-column: span var(--span);`
**Flutter**: Implemented via `StaggeredGrid` or manual column calculation in the Grid parent.

---

### 4.1.8 Nesting Compatibility Matrix

| Parent \ Child | VStack | Row | Grid | Split | Layer | Scroll |
|----------------|--------|-----|------|-------|-------|--------|
| **VStack** | yes | yes | yes | yes | yes | yes |
| **Row** | yes | discouraged | yes | no | yes | yes |
| **Grid** | yes | yes | no | no | yes | yes |
| **Split** | yes | yes | yes | no | yes | yes |
| **Layer** | yes | yes | yes | yes | no | yes |
| **Scroll** | yes | yes | yes | yes | no | no (same direction) |

"no" = produces undefined behavior or usability issues. "discouraged" = valid but indicates a likely design smell.

---

## 4.2 Responsive System

### 4.2.1 Breakpoint Definitions

| Name | Range | Typical Device | CSS Media Query |
|------|-------|----------------|----------------|
| `mobile` | 0 -- 767px | Phone (portrait and landscape) | `@media (max-width: 767px)` |
| `tablet` | 768 -- 1023px | Tablet (portrait), small laptop | `@media (min-width: 768px) and (max-width: 1023px)` |
| `desktop` | 1024 -- 1439px | Laptop, standard monitor | `@media (min-width: 1024px) and (max-width: 1439px)` |
| `wide` | 1440px+ | Large monitor, ultrawide | `@media (min-width: 1440px)` |

**Breakpoint boundary values** (in px):
- `MOBILE_MAX`: 767
- `TABLET_MIN`: 768
- `TABLET_MAX`: 1023
- `DESKTOP_MIN`: 1024
- `DESKTOP_MAX`: 1439
- `WIDE_MIN`: 1440

**Flutter breakpoint detection**: Uses `MediaQuery.of(context).size.width` or `LayoutBuilder` constraints:
```dart
enum PrismBreakpoint { mobile, tablet, desktop, wide }

PrismBreakpoint resolveBreakpoint(double width) {
  if (width < 768) return PrismBreakpoint.mobile;
  if (width < 1024) return PrismBreakpoint.tablet;
  if (width < 1440) return PrismBreakpoint.desktop;
  return PrismBreakpoint.wide;
}
```

### 4.2.2 Responsive Token Format

Responsive values are encoded in YAML as a map keyed by breakpoint name. The token resolution algorithm applies mobile-first cascade (see Section 4.2.3).

**Format**:
```yaml
# Single value (applies to all breakpoints):
gap: 16

# Responsive value (breakpoint-keyed map):
gap:
  mobile: 12
  tablet: 16
  desktop: 24

# Partial responsive value (unspecified breakpoints inherit from smaller):
columns:
  mobile: 1
  desktop: 3
```

Any prop in a layout primitive that accepts `SpacingToken` also accepts `ResponsiveValue<SpacingToken>`. The responsive wrapper is:

```typescript
type ResponsiveValue<T> = T | {
  mobile?: T;
  tablet?: T;
  desktop?: T;
  wide?: T;
};
```

### 4.2.3 Cascade Rules

Mobile-first cascade: the `mobile` value (or the bare scalar value) is the base. Larger breakpoints override in order.

**Resolution algorithm**:
1. Start with the `mobile` value (or the scalar default).
2. If the current breakpoint is `tablet` or larger and a `tablet` value exists, use it.
3. If the current breakpoint is `desktop` or larger and a `desktop` value exists, use it.
4. If the current breakpoint is `wide` and a `wide` value exists, use it.

**Example**: Given `gap: { mobile: 12, desktop: 24 }`:
- At mobile: 12
- At tablet: 12 (inherits from mobile; no tablet value specified)
- At desktop: 24
- At wide: 24 (inherits from desktop; no wide value specified)

**CSS implementation**: Uses min-width media queries in ascending order:
```css
.element { gap: 12px; }
@media (min-width: 1024px) { .element { gap: 24px; } }
```

**Flutter implementation**: Uses `LayoutBuilder` or `MediaQuery` to resolve the value at the current breakpoint, applying the cascade algorithm above.

### 4.2.4 Collapse Behavior

Complex layout primitives degrade gracefully on smaller screens:

| Primitive | Collapse Behavior | Default Collapse Breakpoint |
|-----------|-------------------|-----------------------------|
| **Row** | Row becomes VStack (vertical). Children maintain order unless `reverse` is set. | Defined per-instance via `collapse` prop. No default (does not collapse unless specified). |
| **Split** | Two panels collapse to one. Hidden panel becomes a slide-over drawer accessible via a toggle button. | `tablet` (at mobile, always collapsed). |
| **Grid** | Column count reduces per breakpoint. Single-column Grid is functionally a VStack. | No collapse; column count is explicitly responsive. |
| **VStack** | No collapse. VStacks are already vertical. | N/A |
| **Layer** | No collapse. Layers are viewport-relative. On mobile, modals SHOULD use bottom-sheet position. | N/A |
| **Scroll** | No collapse. Scrolling is native on all sizes. | N/A |

---

## 4.3 Zone Composition

### 4.3.1 Zone Definition

A **zone** is a named content area within a page template. Zones are the composition points where engines and organisms are placed. Each zone has:

- A unique name within its template (e.g., `page-header`, `content`, `sidebar`)
- A position in the template's layout tree
- Content type constraints
- Responsive visibility rules
- Optional size constraints

**YAML schema**:
```yaml
zone:
  name: string          # Unique within template. Kebab-case.
  content: ContentType  # What types of content this zone accepts.
  layout: LayoutPrimitive  # How content within the zone is arranged.
  responsive:
    mobile: VisibilityRule
    tablet: VisibilityRule
    desktop: VisibilityRule
    wide: VisibilityRule
  minHeight: number | null   # Minimum height in px. Null means no minimum.
  maxHeight: number | null   # Maximum height in px. Null means unconstrained.
  minWidth: number | null    # Minimum width in px. Null means no minimum.
  maxWidth: number | null    # Maximum width in px. Null means unconstrained.
```

**ContentType** enum:
```yaml
ContentType:
  - "any"           # Accepts any organism or layout primitive.
  - "navigation"    # Accepts navigation organisms (Sidebar, AppHeader, Breadcrumb).
  - "form"          # Accepts Form engine or form-related organisms.
  - "data"          # Accepts DataTable, CardGrid, ListView organisms.
  - "stats"         # Accepts StatsRow, MetricCard, chart organisms.
  - "actions"       # Accepts Toolbar, DialogActions, button groups.
  - "media"         # Accepts Image, video, illustration organisms.
  - "chat"          # Accepts AI Chat engine organisms.
  - "steps"         # Accepts StepIndicator, wizard navigation.
```

**VisibilityRule** enum:
```yaml
VisibilityRule:
  - "visible"       # Zone is rendered in its normal position.
  - "hidden"        # Zone is not rendered. Content is inaccessible.
  - "drawer"        # Zone is hidden but accessible as a slide-over drawer.
  - "modal"         # Zone is hidden but accessible as a modal overlay.
  - "collapsed"     # Zone is rendered but minimized (e.g., icon-only sidebar).
```

### 4.3.2 Zone Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | yes | Unique zone identifier within the template. |
| `content` | `ContentType` | yes | Content type constraint. The agent MUST NOT place organisms that do not match the zone's content type. |
| `layout` | `LayoutPrimitive` | no | Default layout for content within the zone. Defaults to `VStack` with default props. |
| `responsive` | `ResponsiveVisibility` | no | Per-breakpoint visibility. Defaults to `visible` at all breakpoints. |
| `minHeight` | `number \| null` | no | Minimum height constraint in px. |
| `maxHeight` | `number \| null` | no | Maximum height constraint in px. |
| `minWidth` | `number \| null` | no | Minimum width constraint in px. |
| `maxWidth` | `number \| null` | no | Maximum width constraint in px. |
| `order` | `ResponsiveValue<number>` | no | Ordering priority. Lower numbers appear first. See Section 4.3.4. |
| `sticky` | `boolean` | no | Whether the zone sticks to the top of the viewport on scroll. Default: `false`. |
| `scrollable` | `boolean` | no | Whether the zone content independently scrolls. Default: `false`. |

### 4.3.3 Zone Population

Zones are populated by the agent during page composition. The agent:

1. Selects a page template (see Spec 06).
2. Reads the template's zone definitions.
3. For each zone, selects organisms or engines whose output matches the zone's `content` type.
4. Configures the selected organism/engine with data bindings and props.
5. Places the configured organism into the zone.

**Population contract**:
```yaml
page:
  template: ListLayout
  zones:
    page-header:
      organism: Toolbar
      props:
        title: "Contacts"
        actions:
          - { label: "Add Contact", variant: "primary", onClick: "navigateToCreate" }
          - { label: "Export", variant: "ghost", onClick: "exportContacts" }

    filter-bar:
      organism: FilterPanel
      props:
        filters:
          - { field: "status", type: "select", options: ["Active", "Inactive"] }
          - { field: "department", type: "select", options: "dynamic:departments" }

    content:
      engine: DataTable
      props:
        columns: [...]
        data: "api:/contacts"
        pagination: { pageSize: 25 }

    footer:
      organism: Pagination
      props:
        totalCount: "bind:contacts.totalCount"
        pageSize: 25
```

**Validation rules**:
- Every zone defined in the template MUST be populated. Empty zones are forbidden.
- The organism/engine placed in a zone MUST match the zone's `content` type.
- A zone with `responsive.{breakpoint}: "hidden"` is still populated; the content is rendered but visually hidden via CSS/widget tree exclusion.

### 4.3.4 Zone Ordering

Zones can reorder on different breakpoints using the `order` prop. Lower numbers appear first in the layout flow.

**Example**: On a dashboard, stats appear above the activity feed on desktop, but below it on mobile:
```yaml
zones:
  stats:
    order: { mobile: 2, desktop: 1 }
  activity:
    order: { mobile: 1, desktop: 2 }
```

**CSS implementation**: `order: var(--order);` within a flex or grid container.
**Flutter implementation**: Rebuild the children list sorted by the resolved order value at the current breakpoint.

**Rules**:
- Order values are integers. Negative values are valid.
- Zones with equal order values maintain their document order (stable sort).
- Order changes MUST NOT cause layout jumps. The transition between breakpoints happens instantly (no animation on reorder).

---

## 4.4 Spacing System

All spacing values in Prism MUST derive from design tokens. No magic numbers. No raw pixel values in component code.

### 4.4.1 Spacing Scale

The canonical spacing scale (from design-system.yaml Tier 1):
```
spacing.scale: [0, 4, 8, 12, 16, 24, 32, 48, 64, 80, 96, 128]
```

The required subset is `[4, 8, 12, 16, 24, 32, 48, 64]` per Spec 02. Values `[0, 80, 96, 128]` are permitted extensions for layout-level spacing. All values MUST be divisible by 4. Values are in logical pixels (dp on Flutter, px on web at 1x). No spacing value outside this scale is valid.

### 4.4.2 Semantic Spacing Tokens

Tier 2 tokens assign intent to spacing values:

| Token | Value (px) | Usage |
|-------|-----------|-------|
| `spacing.page.margin` | `{ mobile: 16, tablet: 24, desktop: 32, wide: 48 }` | Outer margin of the page content area. |
| `spacing.page.gutter` | `16` | Gutter between page-level columns (navigation + content). |
| `spacing.section.gap` | `{ mobile: 24, desktop: 32 }` | Vertical gap between major page sections (between zones). |
| `spacing.section.padding` | `{ mobile: 16, desktop: 24 }` | Padding inside a section container (zone internal padding). |
| `spacing.component.gap` | `12` | Gap between sibling components within a zone. |
| `spacing.component.padding` | `16` | Padding inside a component (card padding, form field group padding). |
| `spacing.component.gap-tight` | `8` | Tight gap within compact component groups (button row, tag list). |
| `spacing.component.gap-loose` | `24` | Loose gap for spacious layouts (settings sections). |
| `spacing.inline.gap` | `8` | Gap between inline elements (icon + label, badge + text). |
| `spacing.inline.gap-tight` | `4` | Tight inline gap (icon inside button). |

### 4.4.3 Spacing Application Map

Every place spacing is applied and which token governs it:

| Location | Token | Applied As |
|----------|-------|------------|
| Page outer margins (left + right of content area) | `spacing.page.margin` | `padding-left` + `padding-right` on page container |
| Page top/bottom padding | `spacing.page.margin` | `padding-top` + `padding-bottom` on page container |
| Gap between navigation and content | `spacing.page.gutter` | `gap` on the root Split/Row that holds nav + content |
| Gap between zones in a template | `spacing.section.gap` | `gap` on the template's root VStack |
| Padding inside a zone | `spacing.section.padding` | `padding` on the zone wrapper |
| Gap between organisms within a zone | `spacing.component.gap` | `gap` on the zone's inner VStack/Row |
| Padding inside a card | `spacing.component.padding` | `padding` on the card container |
| Padding inside a form group | `spacing.component.padding` | `padding` on the form section wrapper |
| Gap between form fields | `spacing.component.gap` | `gap` on the form field VStack |
| Gap between buttons in a button group | `spacing.component.gap-tight` | `gap` on the button Row |
| Gap between tags in a tag list | `spacing.component.gap-tight` | `gap` on the tag Wrap |
| Gap between settings sections | `spacing.component.gap-loose` | `gap` on the settings VStack |
| Gap between icon and label in a button | `spacing.inline.gap-tight` | `gap` on the button's inner Row |
| Gap between icon and label in a nav item | `spacing.inline.gap` | `gap` on the nav item Row |
| Gap between avatar and name in a user card | `spacing.inline.gap` | `gap` on the user card Row |
| Modal internal padding | `spacing.component.padding` | `padding` on the modal body |
| Toast internal padding | `spacing.component.padding` | `padding` on the toast container |
| Toolbar internal padding | `spacing.component.gap-tight` | `gap` between toolbar items |
| DataTable cell padding | `spacing.inline.gap` | `padding` on each table cell |
| DataTable header cell padding | `spacing.component.gap-tight` | `padding` on each header cell |

### 4.4.4 Spacing Rules

1. **No raw values**: Every `gap`, `padding`, `margin` in generated code MUST reference a spacing token. Violations are flagged by the token compiler's constraint validator.

2. **Scale adherence**: Spacing values MUST come from `spacing.scale`. There is no `spacing: 13px` or `spacing: 22px`. The nearest valid value MUST be used.

3. **Responsive spacing**: Page-level and section-level spacing tokens are responsive (per 4.4.2). Component-level spacing tokens are constant across breakpoints unless explicitly overridden by the component contract.

4. **Minimum touch target**: Interactive elements (buttons, links, checkboxes, radio buttons, toggle switches) MUST have a minimum tappable area of 44x44px. This is enforced by the component contract, not the spacing system, but spacing around interactive elements MUST NOT reduce the effective touch target below this minimum.

5. **Collapse behavior**: When `spacing.page.margin` collapses from desktop (32px) to mobile (16px), all nested spacing remains unchanged. Only page-level and section-level tokens are responsive.

6. **Consistent axis**: Within a single container, the same spacing token MUST govern all gaps. Mixed gap values within a single VStack or Row are forbidden. Use nested containers to achieve different gap values.

---

## 4.5 Directionality (RTL Support)

### Global Direction

Layout direction is set at the page root:
- **Web**: `dir="rtl"` attribute on `<html>` element. CSS logical properties (`inline-start`/`inline-end`) are used instead of `left`/`right`.
- **Flutter**: `Directionality(textDirection: TextDirection.rtl)` widget wrapping the app. Or set via `MaterialApp(locale: ...)` with a RTL locale.

The direction token is part of the page configuration, not the design system. It is determined by the active locale.

### Layout Primitive Adaptation

| Primitive | LTR behavior | RTL behavior |
|-----------|-------------|--------------|
| VStack | No change | No change (vertical axis is direction-independent) |
| Row | Children flow left-to-right | Children flow right-to-left. `justify: "start"` aligns to right edge. |
| Grid | Columns fill left-to-right | Columns fill right-to-left |
| Split | First child on left, second on right | First child on right, second on left. `collapseTarget` semantics invert. |
| Layer | `position: "start"` = left edge | `position: "start"` = right edge in RTL (logical positioning via CSS `inset-inline-start`). |
| Scroll | Horizontal scroll starts at left | Horizontal scroll starts at right |

### Logical vs Physical Properties

All layout primitives use LOGICAL properties (`start`/`end`) not PHYSICAL (`left`/`right`) for alignment and positioning. When `align: "start"` is specified:
- LTR: `start` = left
- RTL: `start` = right

Component contracts that reference `iconLeft` / `iconRight` map to `iconStart` / `iconEnd` respectively.

### Icon Mirroring

- Icons with directional meaning (arrow-left, arrow-right, chevron-left, chevron-right, reply, forward) MUST mirror in RTL
- Icons without directional meaning (search, settings, user, home, trash, check) MUST NOT mirror
- The `Icon` atom accepts a `mirrorInRtl?: boolean` prop (default: `false`). Directional icons set this to `true` in their definitions.

### Automatic Row/Split Mirroring

When the global direction is RTL:
- Row children render in reverse visual order (right-to-left) without needing the `reverse` prop
- Split panels swap positions (first child renders on the right)
- Navigation sidebar renders on the right side of the page

No additional configuration is needed from the consumer. The layout primitives read the direction context and adapt automatically.
