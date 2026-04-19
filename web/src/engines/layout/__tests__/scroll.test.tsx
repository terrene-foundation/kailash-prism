/**
 * Scroll — unit tests
 * Spec: docs/specs/04-layout-grammar.md § 4.1.6
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Scroll } from '../scroll.js';

describe('Scroll', () => {
  it('renders children with defaults (vertical, no padding)', () => {
    render(
      <Scroll data-testid="sc">
        <div>content</div>
      </Scroll>,
    );
    const el = screen.getByTestId('sc');
    expect(el.dataset.prismScrollDirection).toBe('vertical');
    expect(el.style.overflowY).toBe('auto');
    expect(el.style.overflowX).toBe('hidden');
    expect(screen.getByText('content')).toBeDefined();
  });

  it('renders as region with tabIndex and aria-label', () => {
    render(
      <Scroll aria-label="sidebar list" data-testid="sc">
        <div />
      </Scroll>,
    );
    const el = screen.getByTestId('sc');
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('tabindex')).toBe('0');
    expect(el.getAttribute('aria-label')).toBe('sidebar list');
  });

  it('horizontal direction sets overflowX auto and Y hidden', () => {
    render(
      <Scroll direction="horizontal" data-testid="sc">
        <div />
      </Scroll>,
    );
    const el = screen.getByTestId('sc');
    expect(el.style.overflowX).toBe('auto');
    expect(el.style.overflowY).toBe('hidden');
  });

  it('both direction sets overflow on both axes', () => {
    render(
      <Scroll direction="both" data-testid="sc">
        <div />
      </Scroll>,
    );
    const el = screen.getByTestId('sc');
    expect(el.style.overflowX).toBe('auto');
    expect(el.style.overflowY).toBe('auto');
  });

  it('maxHeight number is emitted as px', () => {
    render(
      <Scroll maxHeight={240} data-testid="sc">
        <div />
      </Scroll>,
    );
    expect(screen.getByTestId('sc').style.maxHeight).toBe('240px');
  });

  it('maxHeight string is emitted verbatim (viewport units etc)', () => {
    render(
      <Scroll maxHeight="70vh" data-testid="sc">
        <div />
      </Scroll>,
    );
    expect(screen.getByTestId('sc').style.maxHeight).toBe('70vh');
  });

  it('maxHeight SpacingToken resolves to CSS var', () => {
    render(
      <Scroll maxHeight="xl" data-testid="sc">
        <div />
      </Scroll>,
    );
    expect(screen.getByTestId('sc').style.maxHeight).toMatch(/var\(--prism-spacing-xl/);
  });

  it('padding SpacingToken applied', () => {
    render(
      <Scroll padding="lg" data-testid="sc">
        <div />
      </Scroll>,
    );
    expect(screen.getByTestId('sc').style.padding).toMatch(/var\(--prism-spacing-lg/);
  });

  it('emits scoped scrollbar token-driven CSS', () => {
    const { container } = render(
      <Scroll>
        <div />
      </Scroll>,
    );
    const styleTag = container.querySelector('style');
    expect(styleTag).not.toBeNull();
    const css = styleTag!.textContent ?? '';
    expect(css).toContain('::-webkit-scrollbar');
    expect(css).toContain('--prism-scrollbar-thumb');
    expect(css).toContain('--prism-scrollbar-track');
    expect(css).toContain('--prism-scrollbar-size');
  });
});
