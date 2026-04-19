/**
 * Row — unit tests
 * Spec: docs/specs/04-layout-grammar.md § 4.1.2
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Row } from '../row.js';

describe('Row', () => {
  it('renders horizontally with defaults', () => {
    render(
      <Row data-testid="r">
        <div>A</div>
        <div>B</div>
      </Row>,
    );
    const el = screen.getByTestId('r');
    expect(el.dataset.prismStack).toBe('horizontal');
    expect(el.style.flexDirection).toBe('row');
  });

  it('accepts Stack props (spacing, align, justify, wrap)', () => {
    render(
      <Row spacing="lg" align="center" justify="between" wrap data-testid="r">
        <div>X</div>
      </Row>,
    );
    const el = screen.getByTestId('r');
    expect(el.style.alignItems).toBe('center');
    expect(el.style.justifyContent).toBe('space-between');
    expect(el.style.flexWrap).toBe('wrap');
    expect(el.style.gap).toMatch(/var\(--prism-spacing-lg/);
  });

  it('preserves child order', () => {
    render(
      <Row data-testid="r">
        <span>first</span>
        <span>second</span>
        <span>third</span>
      </Row>,
    );
    const el = screen.getByTestId('r');
    const labels = Array.from(el.querySelectorAll('span')).map((n) => n.textContent);
    expect(labels).toEqual(['first', 'second', 'third']);
  });
});
