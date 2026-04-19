/**
 * Layout engine — wiring test.
 *
 * Per `.claude/rules/orphan-detection.md` Rule 2: every wired engine surface
 * MUST have at least one end-to-end test that exercises the public barrel
 * through a realistic composition — not six isolated unit tests pretending
 * to be an engine.
 *
 * This test imports from the engine barrel (`../index.js`), composes all
 * six primitives into a page layout (Scroll > Stack > Row > Grid > Split
 * with a Layer overlay), and asserts that:
 *   1. Every primitive renders through the barrel export.
 *   2. Keyboard on Split and Escape on Layer propagate correctly through
 *      the composed tree.
 *   3. The page structure survives a realistic DOM query pass.
 *
 * If any primitive's barrel export is broken, or if the primitives don't
 * compose without throwing, this test fails at collection time — closing
 * the orphan-detection gap that Tier 1 unit tests alone would miss.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Stack, Row, Grid, Split, Layer, Scroll } from '../index.js';

function RealisticPage({ onDismiss }: { onDismiss: () => void }) {
  return (
    <Scroll direction="vertical" maxHeight={600} padding="md" aria-label="page scroll">
      <Stack spacing="lg" data-testid="page-stack">
        <Row justify="between" align="center" data-testid="header">
          <h1>Documents</h1>
          <button type="button">New</button>
        </Row>
        <Grid columns={{ mobile: 1, tablet: 2, desktop: 3 }} gap="md">
          <article>doc-1</article>
          <article>doc-2</article>
          <article>doc-3</article>
        </Grid>
        <Split direction="horizontal" defaultRatio={0.4} data-testid="editor-split">
          <section aria-label="editor">Editor</section>
          <section aria-label="preview">Preview</section>
        </Split>
      </Stack>
      <Layer position="bottom-right" tier="toast" onDismiss={onDismiss} data-testid="toast">
        Saved
      </Layer>
    </Scroll>
  );
}

describe('Layout engine — wiring', () => {
  it('composes all six primitives through the barrel', () => {
    const dismiss = vi.fn();
    render(<RealisticPage onDismiss={dismiss} />);

    // Scroll region is a "region" landmark.
    expect(screen.getByRole('region', { name: 'page scroll' })).toBeDefined();
    // Stack rendered.
    const pageStack = screen.getByTestId('page-stack');
    expect(pageStack.dataset.prismStack).toBe('vertical');
    // Row rendered.
    const header = screen.getByTestId('header');
    expect(header.dataset.prismStack).toBe('horizontal');
    // Grid children rendered.
    expect(screen.getByText('doc-1')).toBeDefined();
    expect(screen.getByText('doc-2')).toBeDefined();
    expect(screen.getByText('doc-3')).toBeDefined();
    // Split renders separator + two panels.
    expect(screen.getByRole('separator')).toBeDefined();
    expect(screen.getByText('Editor')).toBeDefined();
    expect(screen.getByText('Preview')).toBeDefined();
    // Layer rendered.
    expect(screen.getByTestId('toast').dataset.prismLayer).toBe('toast');
    expect(screen.getByText('Saved')).toBeDefined();
  });

  it('Split keyboard propagates through the composed tree', () => {
    render(<RealisticPage onDismiss={() => {}} />);
    const sep = screen.getByRole('separator');
    expect(sep.getAttribute('aria-valuenow')).toBe('40');
    fireEvent.keyDown(sep, { key: 'ArrowRight' });
    expect(sep.getAttribute('aria-valuenow')).toBe('45');
  });

  it('Layer.onDismiss fires on Escape from the composed tree', () => {
    const dismiss = vi.fn();
    render(<RealisticPage onDismiss={dismiss} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('Row alias is a horizontal Stack (intent-revealing wrapper)', () => {
    render(
      <Row spacing="sm" data-testid="r">
        <span>a</span>
        <span>b</span>
      </Row>,
    );
    const el = screen.getByTestId('r');
    expect(el.dataset.prismStack).toBe('horizontal');
    expect(el.style.gap).toMatch(/var\(--prism-spacing-sm/);
  });
});
