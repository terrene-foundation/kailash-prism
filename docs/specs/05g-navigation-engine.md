# Navigation Engine (§5.3)

> Spec version: 0.1.0 | Status: DRAFT | Parent: [05 Engine Specifications](05-engine-specifications.md)

---

## 5.3 Navigation Engine

**Purpose**: Manages application navigation structure — sidebar, breadcrumbs, routing, responsive collapse — from a declarative route definition.

### Props/Configuration

```typescript
interface NavigationConfig {
  // Route definitions
  routes: RouteNode[];

  // Navigation style
  style: "sidebar" | "top-nav" | "bottom-nav"; // Default: "sidebar"

  // Sidebar-specific
  sidebar?: {
    width: { collapsed: number; expanded: number }; // Default: { collapsed: 60, expanded: 240 }
    wideWidth?: number;                              // Width at "wide" breakpoint. Default: 280.
    defaultCollapsed?: boolean;                       // Default: false
    collapseBreakpoint?: Breakpoint;                  // Below this breakpoint, sidebar collapses. Default: "tablet"
    position?: "left" | "right";                      // Default: "left"
    showCollapseToggle?: boolean;                     // Default: true
    headerContent?: Component;                        // Content above navigation items (logo, org name).
    footerContent?: Component;                        // Content below navigation items (user menu, settings).
  };

  // Breadcrumbs
  breadcrumbs?: {
    enabled: boolean;             // Default: true
    maxItems: number;             // Default: 4 (items shown before collapsing middle items to "...")
    separator?: string;           // Default: "/" rendered as a visual separator.
    homeLabel?: string;           // Default: first route's label.
  };

  // Active state
  activeMatch?: "exact" | "prefix"; // Default: "prefix" (route /contacts matches /contacts/:id).

  // Badges
  badgeRefreshInterval?: number;  // Milliseconds between badge count refreshes. Default: 60000 (1 min).
}

interface RouteNode {
  path: string;                   // URL path segment. e.g., "/dashboard", "/contacts/:id"
  label: string;                  // Display label in navigation.
  icon?: string;                  // Icon identifier.
  template?: string;              // Page template name (from Spec 06).
  position?: "top" | "bottom";   // Position in sidebar. Default: "top". "bottom" for settings, profile.
  children?: RouteNode[];         // Nested routes.
  badge?: {
    type: "count" | "dot";        // Count shows number; dot shows presence indicator.
    source?: string;              // Data source for badge count. e.g., "api:/notifications/count"
  };
  navVisible?: boolean;           // Default: true. When false, route exists but is not shown in nav (e.g., detail pages).
  dividerBefore?: boolean;        // Show a divider above this item. Default: false.
  group?: string;                 // Group label. Items with the same group are visually grouped.
}
```

### Internal State

| State | Type | Description |
|-------|------|-------------|
| `currentPath` | `string` | Current URL path. |
| `activeRoute` | `RouteNode` | The route that matches `currentPath`. |
| `breadcrumbs` | `RouteNode[]` | Ancestor chain from root to `activeRoute`. |
| `expandedGroups` | `Set<string>` | Navigation groups that are expanded (for nested items). |
| `sidebarCollapsed` | `boolean` | Whether the sidebar is in collapsed (icon-only) state. |
| `mobileDrawerOpen` | `boolean` | Whether the mobile nav drawer is open. |
| `badgeCounts` | `Record<string, number>` | Current badge counts keyed by route path. |

### Events/Callbacks

| Event | Payload | When Emitted |
|-------|---------|-------------|
| `onNavigate` | `{ from: string; to: string }` | User navigates to a new route. |
| `onSidebarToggle` | `boolean` | Sidebar collapse state changes. |
| `onGroupToggle` | `{ group: string; expanded: boolean }` | A navigation group is expanded or collapsed. |
| `onBreadcrumbClick` | `{ path: string; index: number }` | User clicks a breadcrumb item. |

### Composition Points

| Slot | Purpose | Default |
|------|---------|---------|
| `sidebarHeader` | Content at the top of the sidebar (logo, org name). | None (configure via `sidebar.headerContent`). |
| `sidebarFooter` | Content at the bottom of the sidebar (user menu). | None (configure via `sidebar.footerContent`). |
| `navItem` | Custom renderer for a navigation item. | Icon + Label + Badge (standard NavItem molecule). |
| `breadcrumbItem` | Custom renderer for a breadcrumb segment. | Link with route label. |
| `mobileHeader` | Content in the mobile app header (between hamburger and actions). | App title or logo. |

### Performance Contract

- **Route matching**: Path matching MUST complete in < 1ms for route trees up to 200 nodes.
- **Sidebar render**: Full sidebar with 50 items MUST render in < 20ms.
- **Badge refresh**: Badge count fetches MUST NOT block navigation rendering. Badges update asynchronously; stale counts display until refresh completes.
- **Navigation transition**: Route change to sidebar active state update MUST complete in < 16ms (single frame).

### Accessibility Contract

- **Landmark**: Sidebar uses `<nav>` with `aria-label="Main navigation"` (web). Flutter uses `Semantics(label: "Main navigation")`.
- **Current page**: Active nav item has `aria-current="page"`.
- **Expandable groups**: Group headers have `aria-expanded="true|false"` and `aria-controls` pointing to the group's item list.
- **Keyboard**: Arrow keys navigate between items. Enter activates item. Home/End jump to first/last item. Escape closes mobile drawer.
- **Breadcrumbs**: `<nav aria-label="Breadcrumb">` with ordered list. Last item (current page) is not a link and has `aria-current="page"`.
- **Sidebar toggle**: Toggle button has `aria-label="Collapse sidebar"` or `"Expand sidebar"` based on state.
- **Mobile**: Hamburger button has `aria-label="Open navigation menu"`. Drawer has `role="dialog"` with focus trap.

### Responsive Contract

| Breakpoint | Sidebar Behavior |
|------------|-----------------|
| `mobile` (0-767px) | Sidebar hidden. Hamburger icon in top header bar. Tapping hamburger opens full-screen slide-over drawer from left. Drawer has close button and backdrop dismiss. |
| `tablet` (768-1023px) | Icon-only rail (60px wide). Hovering or tapping an icon shows tooltip with label. Nested groups show as popover menus. |
| `desktop` (1024-1439px) | Full sidebar (240px). Text labels visible. Nested groups expand inline. Collapse toggle visible. |
| `wide` (1440px+) | Full sidebar (280px). Same behavior as desktop with wider width. |

Breadcrumb responsive behavior:
- `mobile`: Hidden (current page title shown in header instead).
- `tablet+`: Visible. Items beyond `maxItems` collapse to a "..." dropdown in the middle of the chain.

### Web Implementation Notes

- Routing via Next.js App Router (`usePathname`, `useRouter`) or React Router v6 (`useLocation`, `useNavigate`).
- Sidebar state persisted to `localStorage` key `prism:sidebar-collapsed`.
- Badge counts fetched via React Query with configurable `refetchInterval`.
- Mobile drawer uses `Layer` primitive with `tier: "modal"`, `trapFocus: true`.
- Sidebar width transition animated with `transition: width 200ms ease`.

### Flutter Implementation Notes

- Routing via `go_router` package.
- Sidebar implemented as `NavigationRail` (tablet) or `Drawer` (mobile) or custom widget (desktop/wide).
- Sidebar state managed via Riverpod `StateProvider`.
- Badge counts fetched via Riverpod `FutureProvider.autoDispose` with refresh timer.
- Mobile drawer uses Flutter's `Scaffold.drawer` or custom `SlideTransition`.

---
