/**
 * Grid — unit tests
 * Spec: docs/specs/04-layout-grammar.md § 4.1.3
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Grid } from '../grid.js';

describe('Grid', () => {
  it('renders with defaults (1 column, md gap)', () => {
    render(
      <Grid data-testid="g">
        <div>A</div>
      </Grid>,
    );
    const el = screen.getByTestId('g');
    expect(el.style.display).toBe('grid');
    expect(el.style.gridTemplateColumns).toContain('repeat(1');
    expect(el.style.gap).toMatch(/var\(--prism-spacing-md/);
  });

  it('renders N equal-width columns when columns is a number', () => {
    render(
      <Grid columns={3} data-testid="g">
        <div />
      </Grid>,
    );
    expect(screen.getByTestId('g').style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))');
  });

  it('accepts responsive columns object and uses mobile as base', () => {
    render(
      <Grid columns={{ mobile: 1, tablet: 2, desktop: 3, wide: 4 }} data-testid="g">
        <div />
      </Grid>,
    );
    const el = screen.getByTestId('g');
    // Base value comes from "mobile" (min-width: 0).
    expect(el.style.gridTemplateColumns).toBe('repeat(1, minmax(0, 1fr))');
  });

  it('emits media queries for responsive columns', () => {
    const { container } = render(
      <Grid columns={{ mobile: 1, tablet: 2, desktop: 3 }}>
        <div />
      </Grid>,
    );
    const styleTag = container.querySelector('style');
    expect(styleTag).not.toBeNull();
    const css = styleTag!.textContent ?? '';
    expect(css).toContain('@media (min-width: 768px)');
    expect(css).toContain('@media (min-width: 1024px)');
    expect(css).toContain('repeat(2');
    expect(css).toContain('repeat(3');
  });

  it('honors minChildWidth with auto-fill (overrides columns)', () => {
    render(
      <Grid minChildWidth={200} columns={4} data-testid="g">
        <div />
      </Grid>,
    );
    expect(screen.getByTestId('g').style.gridTemplateColumns).toBe(
      'repeat(auto-fill, minmax(200px, 1fr))',
    );
  });

  it('applies gap token', () => {
    for (const token of ['xs', 'sm', 'md', 'lg', 'xl'] as const) {
      const { unmount } = render(
        <Grid gap={token} data-testid={`g-${token}`}>
          <div />
        </Grid>,
      );
      expect(screen.getByTestId(`g-${token}`).style.gap).toMatch(
        new RegExp(`var\\(--prism-spacing-${token}`),
      );
      unmount();
    }
  });
});
