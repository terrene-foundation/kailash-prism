/**
 * Theme Engine — Token provider, dark mode, brand switching
 * Spec: docs/specs/05-engine-specifications.md § 5.5
 *
 * Provides design tokens as CSS custom properties to all Prism components.
 * All components consume tokens via var(--prism-{path}) references.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

// --- Types ---

export type ColorMode = 'light' | 'dark';
export type ColorModePreference = 'light' | 'dark' | 'system';

export interface ThemeEngineConfig {
  /** Parsed theme token data (from compiler output or raw YAML) */
  tokens: ThemeTokenData;
  /** Initial theme name. Default: first available */
  defaultTheme?: string;
  /** Initial color mode. Default: "system" */
  defaultMode?: ColorModePreference;
  /** Persist user preference to localStorage. Default: true */
  persistPreference?: boolean;
  /** localStorage key. Default: "prism:theme" */
  storageKey?: string;
  /** Duration of theme transition in ms. Default: 200 */
  transitionDuration?: number;
  /** Per-page token overrides keyed by route path */
  pageOverrides?: Record<string, Record<string, string | number>>;
  /** Callbacks */
  onThemeChange?: (event: { from: string; to: string }) => void;
  onModeChange?: (event: { from: ColorMode; to: ColorMode }) => void;
}

export interface ThemeTokenData {
  /** Available themes, keyed by name */
  themes: Record<string, ThemeDefinition>;
}

export interface ThemeDefinition {
  name: string;
  /** CSS custom properties for light mode: { "--prism-color-interactive-primary": "#1E3A5F", ... } */
  light: Record<string, string>;
  /** CSS custom properties for dark mode */
  dark: Record<string, string>;
}

export interface ThemeContextValue {
  /** Current active theme name */
  theme: string;
  /** Resolved color mode (never "system") */
  mode: ColorMode;
  /** User's preference (may be "system") */
  preference: ColorModePreference;
  /** Switch to a different theme */
  setTheme: (name: string) => void;
  /** Switch color mode */
  setMode: (mode: ColorModePreference) => void;
  /** Toggle between light and dark */
  toggleMode: () => void;
  /** Available theme names */
  availableThemes: string[];
}

// --- Context ---

const ThemeContext = createContext<ThemeContextValue | null>(null);

// --- Provider ---

export function ThemeProvider({
  children,
  ...config
}: ThemeEngineConfig & { children: ReactNode }) {
  const {
    tokens,
    defaultTheme,
    defaultMode = 'system',
    persistPreference = true,
    storageKey = 'prism:theme',
    transitionDuration = 200,
    onThemeChange,
    onModeChange,
  } = config;

  const availableThemes = useMemo(
    () => Object.keys(tokens.themes),
    [tokens.themes],
  );

  // Restore persisted preference or use defaults
  const [theme, setThemeState] = useState<string>(() => {
    if (typeof window === 'undefined') return defaultTheme ?? availableThemes[0] ?? 'enterprise';
    if (persistPreference) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored) as { theme?: string };
          if (parsed.theme && tokens.themes[parsed.theme]) return parsed.theme;
        }
      } catch { /* ignore corrupt storage */ }
    }
    return defaultTheme ?? availableThemes[0] ?? 'enterprise';
  });

  const [preference, setPreference] = useState<ColorModePreference>(() => {
    if (typeof window === 'undefined') return defaultMode;
    if (persistPreference) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored) as { mode?: ColorModePreference };
          if (parsed.mode) return parsed.mode;
        }
      } catch { /* ignore corrupt storage */ }
    }
    return defaultMode;
  });

  const [systemPreference, setSystemPreference] = useState<ColorMode>(() => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Resolve "system" to actual mode
  const mode: ColorMode = preference === 'system' ? systemPreference : preference;

  // Listen for OS color scheme changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemPreference(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Inject CSS custom properties
  useEffect(() => {
    const themeDef = tokens.themes[theme];
    if (!themeDef) return;

    const root = document.documentElement;
    const vars = mode === 'dark' ? { ...themeDef.light, ...themeDef.dark } : themeDef.light;

    // Apply transition for smooth theme switches
    root.style.setProperty('transition', `background-color ${transitionDuration}ms, color ${transitionDuration}ms`);

    // Respect reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.style.setProperty('transition', 'background-color 1ms, color 1ms');
    }

    for (const [prop, value] of Object.entries(vars)) {
      root.style.setProperty(prop, value);
    }

    // Set data attribute for CSS selectors
    root.dataset.prismTheme = theme;
    root.dataset.prismMode = mode;
  }, [theme, mode, tokens.themes, transitionDuration]);

  // Persist preference
  useEffect(() => {
    if (!persistPreference || typeof window === 'undefined') return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ theme, mode: preference }));
    } catch { /* storage full or blocked */ }
  }, [theme, preference, persistPreference, storageKey]);

  // Actions
  const setTheme = useCallback(
    (name: string) => {
      if (!tokens.themes[name]) return;
      const prev = theme;
      setThemeState(name);
      if (prev !== name) onThemeChange?.({ from: prev, to: name });
    },
    [theme, tokens.themes, onThemeChange],
  );

  const setMode = useCallback(
    (newMode: ColorModePreference) => {
      const prevResolved = mode;
      setPreference(newMode);
      const newResolved = newMode === 'system' ? systemPreference : newMode;
      if (prevResolved !== newResolved) {
        onModeChange?.({ from: prevResolved, to: newResolved });
      }
    },
    [mode, systemPreference, onModeChange],
  );

  const toggleMode = useCallback(() => {
    setMode(mode === 'light' ? 'dark' : 'light');
  }, [mode, setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      mode,
      preference,
      setTheme,
      setMode,
      toggleMode,
      availableThemes,
    }),
    [theme, mode, preference, setTheme, setMode, toggleMode, availableThemes],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// --- Hook ---

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error(
      'useTheme() must be used within a <ThemeProvider>. ' +
      'Wrap your app with <ThemeProvider tokens={...}>.',
    );
  }
  return ctx;
}
