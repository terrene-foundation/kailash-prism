/**
 * Layer — unit tests
 * Spec: docs/specs/04-layout-grammar.md § 4.1.5
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Layer } from '../layer.js';
import { LAYER_Z_INDEX_FALLBACK } from '../types.js';

describe('Layer', () => {
  it('renders children with defaults (center, page tier)', () => {
    render(
      <Layer data-testid="l">
        <div>overlay</div>
      </Layer>,
    );
    const el = screen.getByTestId('l');
    expect(el.dataset.prismLayer).toBe('page');
    expect(el.dataset.prismLayerPosition).toBe('center');
    expect(el.style.position).toBe('fixed');
    expect(screen.getByText('overlay')).toBeDefined();
  });

  it('renders nothing when open=false', () => {
    render(
      <Layer open={false} data-testid="l">
        <div>overlay</div>
      </Layer>,
    );
    expect(screen.queryByTestId('l')).toBeNull();
    expect(screen.queryByText('overlay')).toBeNull();
  });

  it('accepts each position enum', () => {
    const positions = ['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;
    for (const pos of positions) {
      const { unmount } = render(
        <Layer position={pos} data-testid={`l-${pos}`}>
          <div />
        </Layer>,
      );
      expect(screen.getByTestId(`l-${pos}`).dataset.prismLayerPosition).toBe(pos);
      unmount();
    }
  });

  it('applies top/left offsets for top-left', () => {
    render(
      <Layer position="top-left" data-testid="l">
        <div />
      </Layer>,
    );
    const el = screen.getByTestId('l');
    expect(el.style.top).toMatch(/var\(--prism-spacing-md/);
    expect(el.style.left).toMatch(/var\(--prism-spacing-md/);
  });

  it('resolves tier to CSS var with token fallback', () => {
    const tiers = ['page', 'popover', 'modal', 'toast', 'tooltip'] as const;
    for (const tier of tiers) {
      const { unmount } = render(
        <Layer tier={tier} data-testid={`l-${tier}`}>
          <div />
        </Layer>,
      );
      const el = screen.getByTestId(`l-${tier}`);
      expect(el.dataset.prismLayer).toBe(tier);
      expect(el.style.zIndex).toContain(`--prism-layer-z-${tier}`);
      expect(el.style.zIndex).toContain(String(LAYER_Z_INDEX_FALLBACK[tier]));
      unmount();
    }
  });

  it('honors zIndexToken override', () => {
    render(
      <Layer zIndexToken="prism-layer-z-alert" data-testid="l">
        <div />
      </Layer>,
    );
    const el = screen.getByTestId('l');
    expect(el.style.zIndex).toBe('var(--prism-layer-z-alert)');
  });

  it('calls onDismiss on Escape key when open', () => {
    const onDismiss = vi.fn();
    render(
      <Layer onDismiss={onDismiss} data-testid="l">
        <div />
      </Layer>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not call onDismiss when open=false', () => {
    const onDismiss = vi.fn();
    render(
      <Layer open={false} onDismiss={onDismiss} data-testid="l">
        <div />
      </Layer>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('does not react to non-Escape keys', () => {
    const onDismiss = vi.fn();
    render(
      <Layer onDismiss={onDismiss} data-testid="l">
        <div />
      </Layer>,
    );
    fireEvent.keyDown(document, { key: 'Enter' });
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
