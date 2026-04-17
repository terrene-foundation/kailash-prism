/**
 * CardGrid organism tests — rendering, responsive columns, empty state, a11y.
 *
 * Spec: specs/components/card-grid.yaml
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CardGrid } from './card-grid.js';
import { Card } from '../atoms/card.js';

describe('CardGrid organism', () => {
  describe('rendering', () => {
    it('wraps each child in a listitem', () => {
      render(
        <CardGrid aria-label="Documents">
          <Card title="A" />
          <Card title="B" />
          <Card title="C" />
        </CardGrid>,
      );

      expect(screen.getByRole('list').getAttribute('aria-label')).toBe('Documents');
      expect(screen.getAllByRole('listitem')).toHaveLength(3);
    });

    it('filters out null/false/empty children before rendering', () => {
      render(
        <CardGrid aria-label="Sparse">
          <Card title="A" />
          {null}
          {false}
          <Card title="B" />
        </CardGrid>,
      );
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });
  });

  describe('empty state', () => {
    it('renders emptyState slot when children array is empty', () => {
      render(
        <CardGrid aria-label="Empty" emptyState={<div data-testid="empty">Nothing here</div>}>
          {[]}
        </CardGrid>,
      );
      expect(screen.getByTestId('empty')).toBeDefined();
      expect(screen.queryByRole('list')).toBeNull();
    });

    it('renders list (not empty state) when children are present', () => {
      render(
        <CardGrid aria-label="Has content" emptyState={<div data-testid="empty" />}>
          <Card title="A" />
        </CardGrid>,
      );
      expect(screen.queryByTestId('empty')).toBeNull();
      expect(screen.getByRole('list')).toBeDefined();
    });
  });

  describe('configuration', () => {
    it('applies custom gap', () => {
      const { container } = render(
        <CardGrid aria-label="Gap" gap={32}>
          <Card title="A" />
        </CardGrid>,
      );
      const grid = container.querySelector('.prism-card-grid') as HTMLElement;
      expect(grid.style.gap).toBe('32px');
    });

    it('emits a stable className derived from column config', () => {
      const { container } = render(
        <CardGrid columns={{ mobile: 2, tablet: 3, desktop: 4, wide: 5 }}>
          <Card title="A" />
        </CardGrid>,
      );
      const grid = container.querySelector('.prism-card-grid-2-3-4-5');
      expect(grid).not.toBeNull();
    });

    it('identically configured grids share a className (CSSOM dedup)', () => {
      const { container } = render(
        <>
          <CardGrid columns={{ mobile: 1, tablet: 2, desktop: 3, wide: 4 }}>
            <Card title="A" />
          </CardGrid>
          <CardGrid columns={{ mobile: 1, tablet: 2, desktop: 3, wide: 4 }}>
            <Card title="B" />
          </CardGrid>
        </>,
      );
      const grids = container.querySelectorAll('.prism-card-grid-1-2-3-4');
      expect(grids).toHaveLength(2);
    });
  });

  describe('a11y', () => {
    it('forwards aria-label onto the list role', () => {
      render(
        <CardGrid aria-label="Contracts">
          <Card title="A" />
        </CardGrid>,
      );
      expect(screen.getByRole('list').getAttribute('aria-label')).toBe('Contracts');
    });

    it('forwards consumer className without clobbering internal class', () => {
      const { container } = render(
        <CardGrid className="custom-grid">
          <Card title="A" />
        </CardGrid>,
      );
      const grid = container.querySelector('ul');
      expect(grid?.className).toContain('custom-grid');
      expect(grid?.className).toContain('prism-card-grid');
    });
  });
});
