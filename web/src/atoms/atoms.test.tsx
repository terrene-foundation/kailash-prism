/**
 * Atom Tests — Button, Badge, Avatar, Spinner
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './button.js';
import { Badge } from './badge.js';
import { Avatar } from './avatar.js';
import { Spinner } from './spinner.js';

// --- Button ---

describe('Button', () => {
  it('renders children as label', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeDefined();
  });

  it('fires onClick handler', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Nope</Button>);
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('disabled')).not.toBeNull();
  });

  it('is disabled when loading', () => {
    render(<Button loading>Saving</Button>);
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('disabled')).not.toBeNull();
    expect(btn.getAttribute('aria-busy')).toBe('true');
  });

  it('renders all variant styles without error', () => {
    const variants = ['primary', 'secondary', 'tertiary', 'destructive', 'ghost'] as const;
    for (const variant of variants) {
      const { unmount } = render(<Button variant={variant}>{variant}</Button>);
      expect(screen.getByRole('button')).toBeDefined();
      unmount();
    }
  });

  it('renders all sizes without error', () => {
    const sizes = ['sm', 'md', 'lg'] as const;
    for (const size of sizes) {
      const { unmount } = render(<Button size={size}>{size}</Button>);
      expect(screen.getByRole('button')).toBeDefined();
      unmount();
    }
  });

  it('renders iconLeft and iconRight', () => {
    render(<Button iconLeft={<span data-testid="left">L</span>} iconRight={<span data-testid="right">R</span>}>Go</Button>);
    expect(screen.getByTestId('left')).toBeDefined();
    expect(screen.getByTestId('right')).toBeDefined();
  });
});

// --- Badge ---

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeDefined();
  });

  it('renders dot variant as aria-hidden', () => {
    const { container } = render(<Badge dot variant="error">x</Badge>);
    const span = container.querySelector('span');
    expect(span?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders all variants', () => {
    const variants = ['default', 'primary', 'success', 'warning', 'error', 'info'] as const;
    for (const variant of variants) {
      const { unmount } = render(<Badge variant={variant}>V</Badge>);
      expect(screen.getByText('V')).toBeDefined();
      unmount();
    }
  });
});

// --- Avatar ---

describe('Avatar', () => {
  it('renders initials from name when no src', () => {
    render(<Avatar name="Alice Johnson" />);
    expect(screen.getByText('AJ')).toBeDefined();
  });

  it('renders single initial for single-word name', () => {
    render(<Avatar name="Alice" />);
    expect(screen.getByText('A')).toBeDefined();
  });

  it('renders ? when no name provided', () => {
    render(<Avatar />);
    expect(screen.getByText('?')).toBeDefined();
  });

  it('renders img when src provided', () => {
    const { container } = render(<Avatar name="Test" src="https://example.com/photo.jpg" />);
    const img = container.querySelector('img');
    expect(img).toBeDefined();
    expect(img?.getAttribute('src')).toBe('https://example.com/photo.jpg');
  });

  it('has accessible label from name', () => {
    render(<Avatar name="Bob Smith" />);
    expect(screen.getByLabelText('Bob Smith')).toBeDefined();
  });

  it('renders all sizes', () => {
    const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
    for (const size of sizes) {
      const { unmount } = render(<Avatar name="T" size={size} />);
      unmount();
    }
  });
});

// --- Spinner ---

describe('Spinner', () => {
  it('renders with role="status"', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toBeDefined();
  });

  it('has accessible label', () => {
    render(<Spinner label="Processing" />);
    expect(screen.getByLabelText('Processing')).toBeDefined();
  });

  it('defaults to "Loading" label', () => {
    render(<Spinner />);
    expect(screen.getByLabelText('Loading')).toBeDefined();
  });

  it('renders all sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;
    for (const size of sizes) {
      const { unmount } = render(<Spinner size={size} />);
      expect(screen.getByRole('status')).toBeDefined();
      unmount();
    }
  });
});
