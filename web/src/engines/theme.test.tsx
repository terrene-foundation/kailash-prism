import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ThemeProvider, useTheme, type ThemeTokenData } from './theme.js';
import type { ReactNode } from 'react';

const mockTokens: ThemeTokenData = {
  themes: {
    enterprise: {
      name: 'Enterprise Professional',
      light: {
        '--prism-color-interactive-primary': '#1E3A5F',
        '--prism-color-surface-page': '#F8FAFC',
        '--prism-color-text-primary': '#0F172A',
      },
      dark: {
        '--prism-color-interactive-primary': '#7293BA',
        '--prism-color-surface-page': '#0A1929',
        '--prism-color-text-primary': '#F1F5F9',
      },
    },
    modern: {
      name: 'Modern Vibrant',
      light: {
        '--prism-color-interactive-primary': '#4F46E5',
        '--prism-color-surface-page': '#F8FAFC',
        '--prism-color-text-primary': '#0F172A',
      },
      dark: {
        '--prism-color-interactive-primary': '#818CF8',
        '--prism-color-surface-page': '#0F172A',
        '--prism-color-text-primary': '#F1F5F9',
      },
    },
  },
};

function wrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider tokens={mockTokens} defaultMode="light" persistPreference={false}>
      {children}
    </ThemeProvider>
  );
}

beforeEach(() => {
  document.documentElement.style.cssText = '';
  document.documentElement.removeAttribute('data-prism-theme');
  document.documentElement.removeAttribute('data-prism-mode');
});

describe('ThemeProvider', () => {
  it('provides default theme and mode', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe('enterprise');
    expect(result.current.mode).toBe('light');
    expect(result.current.availableThemes).toEqual(['enterprise', 'modern']);
  });

  it('injects CSS custom properties on mount', () => {
    renderHook(() => useTheme(), { wrapper });

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--prism-color-interactive-primary')).toBe('#1E3A5F');
    expect(root.style.getPropertyValue('--prism-color-surface-page')).toBe('#F8FAFC');
  });

  it('sets data attributes on root element', () => {
    renderHook(() => useTheme(), { wrapper });

    expect(document.documentElement.dataset.prismTheme).toBe('enterprise');
    expect(document.documentElement.dataset.prismMode).toBe('light');
  });

  it('toggles dark mode', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => result.current.toggleMode());

    expect(result.current.mode).toBe('dark');
    expect(document.documentElement.style.getPropertyValue('--prism-color-interactive-primary')).toBe('#7293BA');
    expect(document.documentElement.dataset.prismMode).toBe('dark');
  });

  it('switches theme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => result.current.setTheme('modern'));

    expect(result.current.theme).toBe('modern');
    expect(document.documentElement.style.getPropertyValue('--prism-color-interactive-primary')).toBe('#4F46E5');
    expect(document.documentElement.dataset.prismTheme).toBe('modern');
  });

  it('fires onThemeChange callback', () => {
    const onThemeChange = vi.fn();

    function callbackWrapper({ children }: { children: ReactNode }) {
      return (
        <ThemeProvider tokens={mockTokens} defaultMode="light" persistPreference={false} onThemeChange={onThemeChange}>
          {children}
        </ThemeProvider>
      );
    }

    const { result } = renderHook(() => useTheme(), { wrapper: callbackWrapper });

    act(() => result.current.setTheme('modern'));

    expect(onThemeChange).toHaveBeenCalledWith({ from: 'enterprise', to: 'modern' });
  });

  it('fires onModeChange callback', () => {
    const onModeChange = vi.fn();

    function callbackWrapper({ children }: { children: ReactNode }) {
      return (
        <ThemeProvider tokens={mockTokens} defaultMode="light" persistPreference={false} onModeChange={onModeChange}>
          {children}
        </ThemeProvider>
      );
    }

    const { result } = renderHook(() => useTheme(), { wrapper: callbackWrapper });

    act(() => result.current.toggleMode());

    expect(onModeChange).toHaveBeenCalledWith({ from: 'light', to: 'dark' });
  });

  it('ignores invalid theme names', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => result.current.setTheme('nonexistent'));

    expect(result.current.theme).toBe('enterprise');
  });
});

describe('useTheme outside provider', () => {
  it('throws descriptive error', () => {
    expect(() => {
      renderHook(() => useTheme());
    }).toThrow('useTheme() must be used within a <ThemeProvider>');
  });
});
