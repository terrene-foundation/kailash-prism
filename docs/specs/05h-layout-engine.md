# Layout Engine (§5.4)

> Spec version: 0.1.0 | Status: DRAFT | Parent: [05 Engine Specifications](05-engine-specifications.md)

---

## 5.4 Layout Engine

**Purpose**: Transforms the layout grammar (Spec 04) and page template definitions (Spec 06) into rendered output, orchestrating zone placement, responsive adaptation, and navigation integration.

### Props/Configuration

```typescript
interface LayoutEngineConfig {
  // Template selection
  template: TemplateName;         // One of the 11 defined templates.

  // Zone content mapping
  zones: Record<string, ZoneContent>;

  // Navigation integration
  navigation?: NavigationConfig;  // Navigation engine config. When provided, wraps the template in navigation chrome.

  // Page-level overrides
  pageMargin?: SpacingToken | ResponsiveValue<SpacingToken>; // Override spacing.page.margin.
  maxContentWidth?: number;       // Maximum width of the content area in px. Default: 1440.

  // Theme override
  theme?: string;                 // Theme name override for this page. Default: inherits from ThemeEngine.
}

interface ZoneContent {
  engine?: string;                // Engine name (e.g., "DataTable", "Form", "Chat").
  organism?: string;              // Organism name (e.g., "Toolbar", "FilterPanel").
  component?: Component;          // Direct component reference.
  props: Record<string, any>;     // Props passed to the engine/organism/component.
}
```

### Internal State

| State | Type | Description |
|-------|------|-------------|
| `currentBreakpoint` | `Breakpoint` | The active breakpoint based on viewport width. |
| `resolvedTemplate` | `TemplateLayout` | The template's layout tree with responsive values resolved for the current breakpoint. |
| `zoneVisibility` | `Record<string, VisibilityRule>` | Per-zone visibility at the current breakpoint. |
| `zoneOrder` | `string[]` | Zone rendering order at the current breakpoint. |
| `navigationState` | `NavigationState` | Current state of the integrated navigation engine (sidebar collapsed, active route, etc.). |

### Events/Callbacks

| Event | Payload | When Emitted |
|-------|---------|-------------|
| `onBreakpointChange` | `{ from: Breakpoint; to: Breakpoint }` | Viewport crosses a breakpoint boundary. |
| `onZoneReady` | `{ zone: string }` | A zone's content has finished its initial render. |
| `onPageReady` | `void` | All zones have emitted `onZoneReady`. |

### Composition Points

| Slot | Purpose | Default |
|------|---------|---------|
| `pageHeader` | Content above the template (global header, announcements). | None. |
| `pageFooter` | Content below the template (global footer). | None. |
| `zoneWrapper[name]` | Custom wrapper around a specific zone's content. | Default zone container with spacing tokens applied. |

### Performance Contract

- **Template instantiation**: Resolving a template layout tree and applying responsive values MUST complete in < 5ms.
- **Breakpoint transition**: Re-resolving all responsive values on breakpoint change MUST complete in < 10ms.
- **Zone lazy loading**: Zones marked `responsive.{breakpoint}: "hidden"` at the current breakpoint MUST NOT render their content. Content is mounted only when the zone becomes visible.
- **Page chrome**: Navigation frame (sidebar + header) renders independently of zone content. Navigation MUST be visible within 100ms of page load; zone content may load progressively.

### Accessibility Contract

- **Page landmark**: Main content area uses `<main>` element (web) or equivalent semantics (Flutter).
- **Skip link**: On web, a "Skip to main content" link is rendered as the first focusable element, targeting the main content zone. Visually hidden until focused.
- **Zone landmarks**: Zones MAY specify an ARIA landmark role (navigation, complementary, contentinfo) via the template definition.
- **Focus management**: On route change, focus moves to the main content area (or to a heading within it if one exists).

### Responsive Contract

The Layout Engine is the central coordinator for responsive behavior:

1. It monitors viewport width and resolves the current breakpoint.
2. It propagates the breakpoint to all child layout primitives, zones, and engines.
3. It re-evaluates zone visibility, zone order, and layout primitive collapse rules on every breakpoint change.
4. It coordinates the navigation engine's responsive behavior (sidebar collapse/expand).

The Layout Engine does NOT independently transform; it applies the template's declared responsive rules (from Spec 06).

### Web Implementation Notes

- Implemented as a React context provider (`PrismLayoutProvider`) that supplies breakpoint information to all children.
- Breakpoint detection via `window.matchMedia` listeners (one per breakpoint boundary).
- CSS-based layout (Grid/Flex) for template structure. JavaScript handles zone visibility toggling and order changes.
- Navigation chrome rendered outside the main content `Suspense` boundary so it appears before zone content loads.
- `maxContentWidth` applied as `max-width` on the content container with `margin: 0 auto` for centering.

### Flutter Implementation Notes

- Implemented as a widget tree starting with `Scaffold` (when navigation is present) or raw layout widgets.
- Breakpoint detection via `MediaQuery.of(context).size.width` in the top-level `LayoutBuilder`.
- Zone visibility managed via conditional widget inclusion in the build method (hidden zones return `SizedBox.shrink()`).
- Navigation integration via `Scaffold(drawer: ..., body: ...)` for mobile, custom `Row` layout for tablet/desktop.

---
