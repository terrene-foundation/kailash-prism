/**
 * Navigation Engine — Sidebar, breadcrumbs, routing, responsive collapse
 * Spec: docs/specs/05-engine-specifications.md § 5.3
 *
 * Manages app navigation from a declarative route definition.
 * Supports sidebar, top-nav, bottom-nav styles with responsive behavior.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { useLayout } from './layout.js';

// --- Types ---

export interface NavigationConfig {
  routes: RouteNode[];
  style?: 'sidebar' | 'top-nav' | 'bottom-nav';
  sidebar?: SidebarConfig;
  breadcrumbs?: BreadcrumbConfig;
  activeMatch?: 'exact' | 'prefix';
  badgeRefreshInterval?: number;
  onNavigate?: (event: { from: string; to: string }) => void;
}

export interface SidebarConfig {
  width?: { collapsed: number; expanded: number };
  wideWidth?: number;
  defaultCollapsed?: boolean;
  collapseBreakpoint?: 'mobile' | 'tablet' | 'desktop';
  position?: 'left' | 'right';
  showCollapseToggle?: boolean;
  headerContent?: ReactNode;
  footerContent?: ReactNode;
}

export interface BreadcrumbConfig {
  enabled?: boolean;
  maxItems?: number;
  separator?: string;
  homeLabel?: string;
}

export interface RouteNode {
  path: string;
  label: string;
  icon?: string;
  template?: string;
  position?: 'top' | 'bottom';
  children?: RouteNode[];
  badge?: { type: 'count' | 'dot'; value?: number; source?: string };
  navVisible?: boolean;
  dividerBefore?: boolean;
  group?: string;
}

interface NavigationContextValue {
  currentPath: string;
  activeRoute: RouteNode | null;
  breadcrumbs: RouteNode[];
  sidebarCollapsed: boolean;
  mobileDrawerOpen: boolean;
  navigate: (path: string) => void;
  toggleSidebar: () => void;
  toggleMobileDrawer: () => void;
}

// --- Context ---

const NavigationContext = createContext<NavigationContextValue | null>(null);

// --- Route Matching ---

function matchRoute(routes: RouteNode[], path: string, mode: 'exact' | 'prefix'): RouteNode | null {
  for (const route of routes) {
    if (mode === 'exact' && route.path === path) return route;
    if (mode === 'prefix' && path.startsWith(route.path)) {
      // Check children for more specific match
      if (route.children) {
        const childMatch = matchRoute(route.children, path, mode);
        if (childMatch) return childMatch;
      }
      return route;
    }
    if (route.children) {
      const childMatch = matchRoute(route.children, path, mode);
      if (childMatch) return childMatch;
    }
  }
  return null;
}

function buildBreadcrumbs(routes: RouteNode[], path: string): RouteNode[] {
  const crumbs: RouteNode[] = [];

  function walk(nodes: RouteNode[], target: string): boolean {
    for (const node of nodes) {
      if (target === node.path || target.startsWith(node.path + '/')) {
        crumbs.push(node);
        if (node.children && walk(node.children, target)) return true;
        if (target === node.path) return true;
      }
    }
    return false;
  }

  walk(routes, path);
  return crumbs;
}

// --- Navigation Provider ---

export function NavigationProvider({
  children,
  config,
  currentPath: initialPath = '/',
}: {
  children: ReactNode;
  config: NavigationConfig;
  currentPath?: string;
}) {
  const { isMobile, isTablet } = useLayout();
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    config.sidebar?.defaultCollapsed ?? false,
  );
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Auto-collapse sidebar on tablet
  useEffect(() => {
    if (isTablet) setSidebarCollapsed(true);
    if (!isMobile && !isTablet) setSidebarCollapsed(config.sidebar?.defaultCollapsed ?? false);
  }, [isMobile, isTablet, config.sidebar?.defaultCollapsed]);

  // Close mobile drawer on path change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [currentPath]);

  const activeRoute = useMemo(
    () => matchRoute(config.routes, currentPath, config.activeMatch ?? 'prefix'),
    [config.routes, currentPath, config.activeMatch],
  );

  const breadcrumbs = useMemo(
    () => buildBreadcrumbs(config.routes, currentPath),
    [config.routes, currentPath],
  );

  const navigate = useCallback(
    (path: string) => {
      const prev = currentPath;
      setCurrentPath(path);
      config.onNavigate?.({ from: prev, to: path });
    },
    [currentPath, config],
  );

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((c) => !c);
  }, []);

  const toggleMobileDrawer = useCallback(() => {
    setMobileDrawerOpen((o) => !o);
  }, []);

  const value = useMemo<NavigationContextValue>(
    () => ({
      currentPath,
      activeRoute,
      breadcrumbs,
      sidebarCollapsed,
      mobileDrawerOpen,
      navigate,
      toggleSidebar,
      toggleMobileDrawer,
    }),
    [currentPath, activeRoute, breadcrumbs, sidebarCollapsed, mobileDrawerOpen, navigate, toggleSidebar, toggleMobileDrawer],
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

// --- Sidebar Component ---

export function Sidebar({ config }: { config: NavigationConfig }) {
  const { isMobile } = useLayout();
  const nav = useNavigation();
  const sidebarConfig = config.sidebar ?? {};
  const width = sidebarConfig.width ?? { collapsed: 60, expanded: 240 };

  if (isMobile) {
    // Mobile: render as drawer overlay
    if (!nav.mobileDrawerOpen) return null;

    return (
      <div
        role="dialog"
        aria-label="Navigation menu"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          display: 'flex',
        }}
      >
        {/* Backdrop */}
        <div
          style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={nav.toggleMobileDrawer}
          aria-hidden="true"
        />
        {/* Drawer */}
        <nav
          aria-label="Main navigation"
          style={{
            position: 'relative',
            width: width.expanded,
            backgroundColor: 'var(--prism-color-surface-card, #fff)',
            height: '100%',
            overflowY: 'auto',
            boxShadow: 'var(--prism-shadow-lg, 0 4px 16px rgba(0,0,0,0.15))',
          }}
        >
          {sidebarConfig.headerContent}
          <NavItemList routes={config.routes} />
          {sidebarConfig.footerContent}
        </nav>
      </div>
    );
  }

  // Desktop/tablet: persistent sidebar
  const currentWidth = nav.sidebarCollapsed ? width.collapsed : width.expanded;

  return (
    <nav
      aria-label="Main navigation"
      style={{
        width: currentWidth,
        minWidth: currentWidth,
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflowY: 'auto',
        backgroundColor: 'var(--prism-color-surface-card, #fff)',
        borderRight: '1px solid var(--prism-color-border-subtle, #e2e8f0)',
        transition: 'width 200ms ease',
      }}
    >
      {sidebarConfig.headerContent}
      <NavItemList routes={config.routes} collapsed={nav.sidebarCollapsed} />
      {sidebarConfig.showCollapseToggle !== false && (
        <button
          onClick={nav.toggleSidebar}
          aria-label={nav.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
            color: 'var(--prism-color-text-secondary, #64748b)',
          }}
        >
          {nav.sidebarCollapsed ? '→' : '←'}
        </button>
      )}
      {sidebarConfig.footerContent}
    </nav>
  );
}

// --- Nav Item List ---

function NavItemList({ routes, collapsed = false }: { routes: RouteNode[]; collapsed?: boolean }) {
  const nav = useNavigation();
  const visibleRoutes = routes.filter((r) => r.navVisible !== false);

  const topRoutes = visibleRoutes.filter((r) => r.position !== 'bottom');
  const bottomRoutes = visibleRoutes.filter((r) => r.position === 'bottom');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '8px 0' }}>
      <div style={{ flex: 1 }}>
        {topRoutes.map((route) => (
          <NavItemButton key={route.path} route={route} collapsed={collapsed} nav={nav} />
        ))}
      </div>
      {bottomRoutes.length > 0 && (
        <div style={{ borderTop: '1px solid var(--prism-color-border-subtle, #e2e8f0)', paddingTop: 8 }}>
          {bottomRoutes.map((route) => (
            <NavItemButton key={route.path} route={route} collapsed={collapsed} nav={nav} />
          ))}
        </div>
      )}
    </div>
  );
}

function NavItemButton({
  route,
  collapsed,
  nav,
}: {
  route: RouteNode;
  collapsed: boolean;
  nav: NavigationContextValue;
}) {
  const isActive = nav.currentPath === route.path ||
    nav.currentPath.startsWith(route.path + '/');

  const style: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: collapsed ? 0 : 12,
    padding: collapsed ? '10px 0' : '10px 16px',
    justifyContent: collapsed ? 'center' : 'flex-start',
    width: '100%',
    background: isActive ? 'var(--prism-color-surface-elevated, #f1f5f9)' : 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: isActive
      ? 'var(--prism-color-interactive-primary, #1e3a5f)'
      : 'var(--prism-color-text-secondary, #64748b)',
    fontWeight: isActive ? 600 : 400,
    fontSize: 14,
    borderRadius: 6,
    margin: '2px 8px',
    textAlign: 'left',
  };

  return (
    <>
      {route.dividerBefore && (
        <hr style={{ border: 'none', borderTop: '1px solid var(--prism-color-border-subtle, #e2e8f0)', margin: '4px 16px' }} />
      )}
      <button
        onClick={() => nav.navigate(route.path)}
        aria-current={isActive ? 'page' : undefined}
        title={collapsed ? route.label : undefined}
        style={style}
      >
        {route.icon && <span aria-hidden="true">{route.icon}</span>}
        {!collapsed && <span>{route.label}</span>}
        {route.badge && !collapsed && (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 11,
              backgroundColor: 'var(--prism-color-interactive-primary, #1e3a5f)',
              color: 'var(--prism-color-text-on-primary, #fff)',
              borderRadius: 9999,
              padding: '2px 6px',
              minWidth: 18,
              textAlign: 'center',
            }}
          >
            {route.badge.type === 'dot' ? '●' : String(route.badge.value ?? 0)}
          </span>
        )}
      </button>
    </>
  );
}

// --- Breadcrumbs Component ---

export function Breadcrumbs({ config }: { config: NavigationConfig }) {
  const nav = useNavigation();
  const { isMobile } = useLayout();
  const breadcrumbConfig = config.breadcrumbs;

  if (!breadcrumbConfig?.enabled || isMobile) return null;

  const items = nav.breadcrumbs;
  const maxItems = breadcrumbConfig.maxItems ?? 4;
  const separator = breadcrumbConfig.separator ?? '/';

  // Collapse middle items if too many
  const displayItems = items.length > maxItems
    ? [...items.slice(0, 1), { path: '', label: '...', collapsed: true } as RouteNode & { collapsed?: boolean }, ...items.slice(-maxItems + 1)]
    : items;

  return (
    <nav aria-label="Breadcrumb">
      <ol style={{ display: 'flex', alignItems: 'center', gap: 4, listStyle: 'none', margin: 0, padding: 0, fontSize: 14 }}>
        {displayItems.map((item, i) => (
          <li key={item.path || `collapsed-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {i > 0 && (
              <span aria-hidden="true" style={{ color: 'var(--prism-color-text-disabled, #94a3b8)' }}>
                {separator}
              </span>
            )}
            {i === items.length - 1 ? (
              <span aria-current="page" style={{ color: 'var(--prism-color-text-primary, #0f172a)', fontWeight: 500 }}>
                {item.label}
              </span>
            ) : (
              <button
                onClick={() => nav.navigate(item.path)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--prism-color-text-secondary, #64748b)',
                  padding: 0,
                  fontSize: 'inherit',
                }}
              >
                {item.label}
              </button>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// --- App Shell (Sidebar + Content) ---

export function AppShell({
  config,
  children,
  currentPath = '/',
}: {
  config: NavigationConfig;
  children: ReactNode;
  currentPath?: string;
}) {
  return (
    <NavigationProvider config={config} currentPath={currentPath}>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {config.style !== 'top-nav' && config.style !== 'bottom-nav' && (
          <Sidebar config={config} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Mobile header with hamburger */}
          <MobileHeader config={config} />
          <Breadcrumbs config={config} />
          <main>{children}</main>
        </div>
      </div>
    </NavigationProvider>
  );
}

function MobileHeader({ config }: { config: NavigationConfig }) {
  const { isMobile } = useLayout();
  const nav = useNavigation();

  if (!isMobile) return null;

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderBottom: '1px solid var(--prism-color-border-subtle, #e2e8f0)',
        backgroundColor: 'var(--prism-color-surface-card, #fff)',
      }}
    >
      <button
        onClick={nav.toggleMobileDrawer}
        aria-label="Open navigation menu"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, fontSize: 20 }}
      >
        ☰
      </button>
      <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--prism-color-text-primary, #0f172a)' }}>
        {nav.activeRoute?.label ?? 'Page'}
      </span>
    </header>
  );
}

// --- Hook ---

export function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error(
      'useNavigation() must be used within <NavigationProvider> or <AppShell>.',
    );
  }
  return ctx;
}
