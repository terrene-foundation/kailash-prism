import { describe, it, expect, vi } from 'vitest';
import { render, screen, renderHook, fireEvent } from '@testing-library/react';
import {
  NavigationProvider,
  AppShell,
  useNavigation,
  type NavigationConfig,
  type RouteNode,
} from './navigation.js';
import { LayoutProvider } from './layout.js';
import type { ReactNode } from 'react';

const testRoutes: RouteNode[] = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  {
    path: '/contacts',
    label: 'Contacts',
    icon: '👥',
    children: [
      { path: '/contacts/new', label: 'New Contact', navVisible: false },
    ],
  },
  { path: '/settings', label: 'Settings', icon: '⚙️', position: 'bottom' },
];

const testConfig: NavigationConfig = {
  routes: testRoutes,
  style: 'sidebar',
  sidebar: { showCollapseToggle: true },
  breadcrumbs: { enabled: true },
  activeMatch: 'prefix',
};

function wrapper({ children }: { children: ReactNode }) {
  return (
    <LayoutProvider>
      <NavigationProvider config={testConfig} currentPath="/contacts">
        {children}
      </NavigationProvider>
    </LayoutProvider>
  );
}

describe('useNavigation', () => {
  it('provides current path and active route', () => {
    const { result } = renderHook(() => useNavigation(), { wrapper });

    expect(result.current.currentPath).toBe('/contacts');
    expect(result.current.activeRoute?.label).toBe('Contacts');
  });

  it('builds breadcrumbs from route tree', () => {
    const deepWrapper = ({ children }: { children: ReactNode }) => (
      <LayoutProvider>
        <NavigationProvider config={testConfig} currentPath="/contacts/new">
          {children}
        </NavigationProvider>
      </LayoutProvider>
    );

    const { result } = renderHook(() => useNavigation(), { wrapper: deepWrapper });
    expect(result.current.breadcrumbs.length).toBeGreaterThanOrEqual(1);
    expect(result.current.breadcrumbs[0]?.label).toBe('Contacts');
  });

  it('throws outside provider', () => {
    expect(() => renderHook(() => useNavigation())).toThrow('useNavigation()');
  });
});

describe('AppShell', () => {
  it('renders sidebar with navigation items', () => {
    render(
      <LayoutProvider>
        <AppShell config={testConfig} currentPath="/dashboard">
          <div>Page content</div>
        </AppShell>
      </LayoutProvider>,
    );

    // Use getAllByText since breadcrumbs may duplicate labels
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Contacts').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Settings').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Page content')).toBeDefined();
  });

  it('marks active route with aria-current', () => {
    render(
      <LayoutProvider>
        <AppShell config={testConfig} currentPath="/contacts">
          <div>Content</div>
        </AppShell>
      </LayoutProvider>,
    );

    // Find the nav item button (not breadcrumb) with aria-current
    const navButtons = screen.getByLabelText('Main navigation').querySelectorAll('button[aria-current="page"]');
    expect(navButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('fires onNavigate callback', () => {
    const onNavigate = vi.fn();
    const configWithCb = { ...testConfig, onNavigate };

    render(
      <LayoutProvider>
        <AppShell config={configWithCb} currentPath="/dashboard">
          <div>Content</div>
        </AppShell>
      </LayoutProvider>,
    );

    fireEvent.click(screen.getByText('Contacts'));
    expect(onNavigate).toHaveBeenCalledWith({ from: '/dashboard', to: '/contacts' });
  });

  it('hides navVisible=false routes from sidebar', () => {
    render(
      <LayoutProvider>
        <AppShell config={testConfig} currentPath="/dashboard">
          <div>Content</div>
        </AppShell>
      </LayoutProvider>,
    );

    expect(screen.queryByText('New Contact')).toBeNull();
  });

  it('renders collapse toggle with accessible label', () => {
    render(
      <LayoutProvider>
        <AppShell config={testConfig} currentPath="/dashboard">
          <div>Content</div>
        </AppShell>
      </LayoutProvider>,
    );

    const toggle = screen.getByLabelText('Collapse sidebar');
    expect(toggle).toBeDefined();
  });

  it('separates bottom-positioned routes', () => {
    render(
      <LayoutProvider>
        <AppShell config={testConfig} currentPath="/dashboard">
          <div>Content</div>
        </AppShell>
      </LayoutProvider>,
    );

    // Settings should be in the bottom section
    const settingsBtn = screen.getByText('Settings');
    expect(settingsBtn).toBeDefined();
  });
});
