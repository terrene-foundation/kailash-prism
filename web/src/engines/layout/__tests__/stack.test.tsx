/**
 * Stack — unit tests
 * Spec: docs/specs/04-layout-grammar.md § 4.1.1
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Stack } from '../stack.js';

describe('Stack', () => {
  it('renders children with defaults (vertical, stretch, start)', () => {
    render(
      <Stack data-testid="s">
        <div>A</div>
        <div>B</div>
      </Stack>,
    );
    const el = screen.getByTestId('s');
    expect(el.dataset.prismStack).toBe('vertical');
    expect(el.style.flexDirection).toBe('column');
    expect(el.style.alignItems).toBe('stretch');
    expect(el.style.justifyContent).toBe('flex-start');
    expect(el.style.flexWrap).toBe('nowrap');
    expect(screen.getByText('A')).toBeDefined();
    expect(screen.getByText('B')).toBeDefined();
  });

  it('accepts each direction value', () => {
    const { rerender } = render(
      <Stack direction="vertical" data-testid="s">
        <div />
      </Stack>,
    );
    expect(screen.getByTestId('s').style.flexDirection).toBe('column');
    rerender(
      <Stack direction="horizontal" data-testid="s">
        <div />
      </Stack>,
    );
    expect(screen.getByTestId('s').style.flexDirection).toBe('row');
  });

  it('accepts each spacing token and emits token-driven gap', () => {
    for (const token of ['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const) {
      const { unmount } = render(
        <Stack spacing={token} data-testid={`s-${token}`}>
          <div />
        </Stack>,
      );
      const style = screen.getByTestId(`s-${token}`).style;
      expect(style.gap).toMatch(new RegExp(`var\\(--prism-spacing-${token}`));
      unmount();
    }
  });

  it('accepts each align value', () => {
    const alignMap = {
      start: 'flex-start',
      center: 'center',
      end: 'flex-end',
      stretch: 'stretch',
    } as const;
    for (const [value, expected] of Object.entries(alignMap)) {
      const { unmount } = render(
        <Stack align={value as keyof typeof alignMap} data-testid={`s-${value}`}>
          <div />
        </Stack>,
      );
      expect(screen.getByTestId(`s-${value}`).style.alignItems).toBe(expected);
      unmount();
    }
  });

  it('accepts each justify value', () => {
    const justifyMap = {
      start: 'flex-start',
      center: 'center',
      end: 'flex-end',
      between: 'space-between',
      around: 'space-around',
    } as const;
    for (const [value, expected] of Object.entries(justifyMap)) {
      const { unmount } = render(
        <Stack justify={value as keyof typeof justifyMap} data-testid={`s-${value}`}>
          <div />
        </Stack>,
      );
      expect(screen.getByTestId(`s-${value}`).style.justifyContent).toBe(expected);
      unmount();
    }
  });

  it('honors wrap=true', () => {
    render(
      <Stack wrap data-testid="s">
        <div />
      </Stack>,
    );
    expect(screen.getByTestId('s').style.flexWrap).toBe('wrap');
  });

  it('forwards className and inline style', () => {
    render(
      <Stack className="custom-class" style={{ backgroundColor: 'red' }} data-testid="s">
        <div />
      </Stack>,
    );
    const el = screen.getByTestId('s');
    expect(el.className).toBe('custom-class');
    expect(el.style.backgroundColor).toBe('red');
  });
});
