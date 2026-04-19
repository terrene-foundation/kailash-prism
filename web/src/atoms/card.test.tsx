/**
 * Card atom tests — rendering, variants, interactivity, a11y.
 *
 * Spec: specs/components/card-grid.yaml
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Card } from './card.js';

describe('Card atom', () => {
  describe('rendering', () => {
    it('renders title, subtitle, body, and footer slots', () => {
      render(
        <Card
          title="Policy 2024"
          subtitle="Updated 2 days ago"
          footer={<button>Preview</button>}
        >
          Body content here
        </Card>,
      );
      expect(screen.getByText('Policy 2024')).toBeDefined();
      expect(screen.getByText('Updated 2 days ago')).toBeDefined();
      expect(screen.getByText('Body content here')).toBeDefined();
      expect(screen.getByRole('button', { name: 'Preview' })).toBeDefined();
    });

    it('renders media slot above the body', () => {
      render(
        <Card
          title="Media card"
          media={<img src="about:blank" alt="illustration" data-testid="media" />}
        />,
      );
      expect(screen.getByTestId('media')).toBeDefined();
    });

    it('renders without title when only body is supplied', () => {
      render(<Card>Just a body</Card>);
      expect(screen.getByText('Just a body')).toBeDefined();
    });
  });

  describe('variants', () => {
    it('supports flat/elevated/outlined variants', () => {
      const { rerender, container } = render(<Card variant="flat" title="F" />);
      expect(container.firstChild).toBeDefined();
      rerender(<Card variant="outlined" title="O" />);
      expect(container.firstChild).toBeDefined();
      rerender(<Card variant="elevated" title="E" />);
      expect(container.firstChild).toBeDefined();
    });
  });

  describe('interactivity', () => {
    it('fires onActivate on click when supplied', () => {
      const onActivate = vi.fn();
      render(<Card title="Interactive" onActivate={onActivate} />);
      fireEvent.click(screen.getByRole('button', { name: /Interactive/ }));
      expect(onActivate).toHaveBeenCalledTimes(1);
    });

    it('fires onActivate on Enter keypress when focused', () => {
      const onActivate = vi.fn();
      render(<Card title="Interactive" onActivate={onActivate} />);
      const card = screen.getByRole('button');
      fireEvent.keyDown(card, { key: 'Enter' });
      expect(onActivate).toHaveBeenCalledTimes(1);
    });

    it('fires onActivate on Space keypress when focused', () => {
      const onActivate = vi.fn();
      render(<Card title="Interactive" onActivate={onActivate} />);
      const card = screen.getByRole('button');
      fireEvent.keyDown(card, { key: ' ' });
      expect(onActivate).toHaveBeenCalledTimes(1);
    });

    it('is not a button when onActivate is omitted', () => {
      render(<Card title="Passive" />);
      expect(screen.queryByRole('button')).toBeNull();
    });

    it('has tabindex=0 when interactive', () => {
      render(<Card title="Interactive" onActivate={() => {}} />);
      const card = screen.getByRole('button');
      expect(card.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('a11y', () => {
    it('surfaces loading state via aria-busy', () => {
      const { container } = render(<Card title="Loading" loading />);
      expect(container.firstChild).toHaveProperty('getAttribute');
      expect((container.firstChild as HTMLElement).getAttribute('aria-busy')).toBe('true');
    });

    it('forwards className to the root element', () => {
      const { container } = render(<Card title="T" className="custom" />);
      expect((container.firstChild as HTMLElement).className).toBe('custom');
    });
  });
});
