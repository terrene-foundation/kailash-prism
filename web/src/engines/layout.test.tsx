import { describe, it, expect } from 'vitest';
import { render, screen, renderHook } from '@testing-library/react';
import {
  LayoutProvider,
  useLayout,
  VStack,
  Row,
  Grid,
  Split,
  Zone,
  resolveBreakpoint,
  type ZoneContent,
} from './layout.js';
import type { ReactNode } from 'react';

function wrapper({ children }: { children: ReactNode }) {
  return <LayoutProvider>{children}</LayoutProvider>;
}

describe('resolveBreakpoint', () => {
  it('returns mobile for small widths', () => {
    expect(resolveBreakpoint(375)).toBe('mobile');
    expect(resolveBreakpoint(0)).toBe('mobile');
  });

  it('returns tablet at 768px', () => {
    expect(resolveBreakpoint(768)).toBe('tablet');
    expect(resolveBreakpoint(1023)).toBe('tablet');
  });

  it('returns desktop at 1024px', () => {
    expect(resolveBreakpoint(1024)).toBe('desktop');
    expect(resolveBreakpoint(1439)).toBe('desktop');
  });

  it('returns wide at 1440px+', () => {
    expect(resolveBreakpoint(1440)).toBe('wide');
    expect(resolveBreakpoint(2560)).toBe('wide');
  });
});

describe('useLayout', () => {
  it('provides breakpoint context', () => {
    const { result } = renderHook(() => useLayout(), { wrapper });
    expect(result.current.breakpoint).toBeDefined();
    expect(typeof result.current.viewportWidth).toBe('number');
  });

  it('throws outside provider', () => {
    expect(() => renderHook(() => useLayout())).toThrow('useLayout()');
  });
});

describe('VStack', () => {
  it('renders children in a vertical flex container', () => {
    render(
      <LayoutProvider>
        <VStack gap={8} data-testid="vstack">
          <div>Child 1</div>
          <div>Child 2</div>
        </VStack>
      </LayoutProvider>,
    );
    expect(screen.getByText('Child 1')).toBeDefined();
    expect(screen.getByText('Child 2')).toBeDefined();
  });
});

describe('Row', () => {
  it('renders children in a horizontal flex container', () => {
    render(
      <LayoutProvider>
        <Row gap={12} justify="between">
          <span>Left</span>
          <span>Right</span>
        </Row>
      </LayoutProvider>,
    );
    expect(screen.getByText('Left')).toBeDefined();
    expect(screen.getByText('Right')).toBeDefined();
  });
});

describe('Grid', () => {
  it('renders a grid with specified columns', () => {
    render(
      <LayoutProvider>
        <Grid columns={3} gap={16}>
          <div>A</div>
          <div>B</div>
          <div>C</div>
        </Grid>
      </LayoutProvider>,
    );
    expect(screen.getByText('A')).toBeDefined();
    expect(screen.getByText('B')).toBeDefined();
    expect(screen.getByText('C')).toBeDefined();
  });
});

describe('Split', () => {
  it('renders two panels', () => {
    render(
      <LayoutProvider>
        <Split ratio="1:2">
          <div>Sidebar</div>
          <div>Content</div>
        </Split>
      </LayoutProvider>,
    );
    expect(screen.getByText('Sidebar')).toBeDefined();
    expect(screen.getByText('Content')).toBeDefined();
  });
});

describe('Zone', () => {
  it('renders zone with content', () => {
    const zone: ZoneContent = {
      children: <div>Zone content</div>,
      role: 'main',
    };
    render(
      <LayoutProvider>
        <Zone name="content" zone={zone} />
      </LayoutProvider>,
    );
    expect(screen.getByText('Zone content')).toBeDefined();
    expect(screen.getByRole('main')).toBeDefined();
  });

  it('hides zone when not visible at current breakpoint', () => {
    const zone: ZoneContent = {
      children: <div>Hidden zone</div>,
      visible: { mobile: false, tablet: false, desktop: false, wide: false },
    };
    render(
      <LayoutProvider>
        <Zone name="hidden" zone={zone} />
      </LayoutProvider>,
    );
    expect(screen.queryByText('Hidden zone')).toBeNull();
  });

  it('renders navigation landmark for nav role', () => {
    const zone: ZoneContent = {
      children: <div>Nav content</div>,
      role: 'navigation',
    };
    render(
      <LayoutProvider>
        <Zone name="nav" zone={zone} />
      </LayoutProvider>,
    );
    expect(screen.getByRole('navigation')).toBeDefined();
  });
});
