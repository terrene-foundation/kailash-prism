/**
 * Split — unit tests
 * Spec: docs/specs/04-layout-grammar.md § 4.1.4
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Split } from '../split.js';

describe('Split', () => {
  it('renders two panels with defaults (horizontal, 0.5 ratio)', () => {
    render(
      <Split data-testid="s">
        <div>Left</div>
        <div>Right</div>
      </Split>,
    );
    expect(screen.getByText('Left')).toBeDefined();
    expect(screen.getByText('Right')).toBeDefined();
    const container = screen.getByTestId('s');
    expect(container.dataset.prismSplit).toBe('horizontal');
    expect(container.style.flexDirection).toBe('row');
  });

  it('renders vertically when direction="vertical"', () => {
    render(
      <Split direction="vertical" data-testid="s">
        <div>Top</div>
        <div>Bottom</div>
      </Split>,
    );
    const container = screen.getByTestId('s');
    expect(container.dataset.prismSplit).toBe('vertical');
    expect(container.style.flexDirection).toBe('column');
  });

  it('renders a divider with role="separator" and correct aria', () => {
    render(
      <Split defaultRatio={0.3} data-testid="s">
        <div />
        <div />
      </Split>,
    );
    const sep = screen.getByRole('separator');
    expect(sep.getAttribute('aria-orientation')).toBe('vertical'); // horizontal split → vertical divider
    expect(sep.getAttribute('aria-valuenow')).toBe('30');
    expect(sep.getAttribute('aria-valuemin')).toBe('0');
    expect(sep.getAttribute('aria-valuemax')).toBe('100');
    expect(sep.getAttribute('tabindex')).toBe('0');
  });

  it('divider is not focusable when resizable=false', () => {
    render(
      <Split resizable={false} data-testid="s">
        <div />
        <div />
      </Split>,
    );
    const sep = screen.getByRole('separator');
    expect(sep.getAttribute('tabindex')).toBe('-1');
  });

  it('supports custom aria-label on divider', () => {
    render(
      <Split aria-label="Editor / Preview divider" data-testid="s">
        <div />
        <div />
      </Split>,
    );
    expect(screen.getByRole('separator').getAttribute('aria-label')).toBe(
      'Editor / Preview divider',
    );
  });

  it('ArrowRight increases ratio by 5% (horizontal)', () => {
    render(
      <Split defaultRatio={0.5} data-testid="s">
        <div />
        <div />
      </Split>,
    );
    const sep = screen.getByRole('separator');
    fireEvent.keyDown(sep, { key: 'ArrowRight' });
    expect(sep.getAttribute('aria-valuenow')).toBe('55');
  });

  it('ArrowLeft decreases ratio by 5%', () => {
    render(
      <Split defaultRatio={0.5} data-testid="s">
        <div />
        <div />
      </Split>,
    );
    const sep = screen.getByRole('separator');
    fireEvent.keyDown(sep, { key: 'ArrowLeft' });
    expect(sep.getAttribute('aria-valuenow')).toBe('45');
  });

  it('ArrowDown/ArrowUp adjust ratio when direction="vertical"', () => {
    render(
      <Split direction="vertical" defaultRatio={0.5} data-testid="s">
        <div />
        <div />
      </Split>,
    );
    const sep = screen.getByRole('separator');
    expect(sep.getAttribute('aria-orientation')).toBe('horizontal');
    fireEvent.keyDown(sep, { key: 'ArrowDown' });
    expect(sep.getAttribute('aria-valuenow')).toBe('55');
    fireEvent.keyDown(sep, { key: 'ArrowUp' });
    expect(sep.getAttribute('aria-valuenow')).toBe('50');
  });

  it('PageUp/PageDown adjust by 20%', () => {
    render(
      <Split defaultRatio={0.5} data-testid="s">
        <div />
        <div />
      </Split>,
    );
    const sep = screen.getByRole('separator');
    fireEvent.keyDown(sep, { key: 'PageDown' });
    expect(sep.getAttribute('aria-valuenow')).toBe('70');
    fireEvent.keyDown(sep, { key: 'PageUp' });
    expect(sep.getAttribute('aria-valuenow')).toBe('50');
  });

  it('ignores keyboard when resizable=false', () => {
    render(
      <Split resizable={false} defaultRatio={0.5} data-testid="s">
        <div />
        <div />
      </Split>,
    );
    const sep = screen.getByRole('separator');
    fireEvent.keyDown(sep, { key: 'ArrowRight' });
    expect(sep.getAttribute('aria-valuenow')).toBe('50');
  });

  it('pointerdown starts drag — pointerup ends it', () => {
    render(
      <Split defaultRatio={0.5} data-testid="s">
        <div />
        <div />
      </Split>,
    );
    const sep = screen.getByRole('separator');
    // jsdom does not implement setPointerCapture; stub it so the handler runs.
    (sep as unknown as { setPointerCapture: (id: number) => void }).setPointerCapture = () => {};
    (sep as unknown as { releasePointerCapture: (id: number) => void }).releasePointerCapture =
      () => {};
    fireEvent.pointerDown(sep, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerUp(sep, { pointerId: 1 });
    // No throw = pass. Ratio stays at initial value (no move events).
    expect(sep.getAttribute('aria-valuenow')).toBe('50');
  });
});
