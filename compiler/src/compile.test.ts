/**
 * @kailash/prism-compiler — Test suite
 * Covers: YAML parsing, token flattening, reference resolution,
 * CSS property emission, Tailwind config generation,
 * Flutter ThemeData/constants emission, compile() entry point.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { flattenTokens, resolveReference } from './parse.js';
import { emitCssProperties, emitTailwindConfig } from './web.js';
import { emitDartConstants, emitThemeData } from './flutter.js';
import { compile } from './index.js';
import { resolve } from 'node:path';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import type { ThemeTokens } from './types.js';
import { scaffold } from './scaffold.js';

// --- Minimal fixture matching real enterprise.yaml structure ---

function makeFixture(overrides?: Partial<ThemeTokens>): ThemeTokens {
  return {
    prism_spec: '0.1.0',
    design_system_version: '1.0.0',
    name: 'Test Theme',
    description: 'Fixture for tests',
    tokens: {
      primitive: {
        color: {
          'navy-600': '#1E3A5F',
          'gray-50': '#F8FAFC',
          'gray-900': '#0F172A',
          'red-600': '#DC2626',
          'green-600': '#16A34A',
          white: '#FFFFFF',
        },
        spacing: { scale: [4, 8, 16, 24, 32] },
        typography: {
          families: {
            sans: 'Inter, system-ui, sans-serif',
            mono: 'JetBrains Mono, monospace',
          },
          scale: [12, 14, 16, 20, 24],
          weights: [400, 500, 600, 700],
          line_heights: [1.25, 1.4, 1.5],
        },
        radius: { scale: [0, 4, 8, 9999] },
        shadow: {
          none: 'none',
          sm: '0px 1px 2px 0px rgba(0,0,0,0.05)',
          md: '0px 4px 6px -1px rgba(0,0,0,0.1)',
        },
        motion: {
          durations: [0, 100, 200, 300],
          easings: { linear: 'linear', default: 'cubic-bezier(0.2,0,0,1)' },
        },
        breakpoints: { mobile: 0, tablet: 768, desktop: 1024, wide: 1440 },
      },
      semantic: {
        color: {
          interactive: {
            primary: { value: '$primitive.color.navy-600', usage: 'Primary actions', contrast_min: 4.5 },
          },
          surface: {
            page: { value: '$primitive.color.white', usage: 'Page background' },
          },
          text: {
            primary: { value: '$primitive.color.gray-900', usage: 'Primary text' },
          },
          status: {
            error: { value: '$primitive.color.red-600', usage: 'Error state' },
          },
        } as ThemeTokens['tokens']['semantic']['color'],
        spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
        typography: {
          heading: {
            h1: { family: '$primitive.typography.families.sans', size: 24, weight: 700, line_height: 1.25, usage: 'Page titles' },
            h2: { family: '$primitive.typography.families.sans', size: 20, weight: 600, line_height: 1.25, usage: 'Section headings' },
          },
          body: {
            default: { family: '$primitive.typography.families.sans', size: 14, weight: 400, line_height: 1.5, usage: 'Body text' },
          },
        },
        radius: {
          sm: { value: 4, usage: 'Small rounding' },
          md: { value: 8, usage: 'Default rounding' },
        },
        shadow: {
          card: { value: '0px 4px 6px -1px rgba(0,0,0,0.1)', usage: 'Card elevation' },
        },
        motion: {
          fast: { duration: 100, easing: 'linear', usage: 'Quick feedback' },
          default: { duration: 200, easing: 'cubic-bezier(0.2,0,0,1)', usage: 'Default transitions' },
        },
      },
      component: {},
    },
    themes: {
      light: { color: {} },
      dark: {
        color: {
          'surface.page': '$primitive.color.gray-900',
          'text.primary': '$primitive.color.gray-50',
        },
      },
    },
    ...overrides,
  };
}

// =============================================================================
// flattenTokens
// =============================================================================

describe('flattenTokens', () => {
  it('flattens nested objects to dot-separated paths', () => {
    const result = flattenTokens({
      interactive: {
        primary: { value: '#1E3A5F', usage: 'test' },
      },
    });
    expect(result).toHaveProperty('interactive.primary');
    const entry = result['interactive.primary'] as { value: string };
    expect(entry.value).toBe('#1E3A5F');
  });

  it('stops at objects with a "value" key', () => {
    const result = flattenTokens({
      a: { b: { value: 'stop-here', deep: { nested: true } } },
    });
    expect(result).toHaveProperty('a.b');
    expect(result).not.toHaveProperty('a.b.deep');
  });

  it('stops at objects with a "family" key (typography composites)', () => {
    const result = flattenTokens({
      heading: { h1: { family: 'Inter', size: 24, weight: 700, line_height: 1.25, usage: 'titles' } },
    });
    expect(result).toHaveProperty('heading.h1');
    expect(result).not.toHaveProperty('heading.h1.family');
  });

  it('stops at objects with a "duration" key (motion composites)', () => {
    const result = flattenTokens({
      motion: { fast: { duration: 100, easing: 'linear' } },
    });
    expect(result).toHaveProperty('motion.fast');
    expect(result).not.toHaveProperty('motion.fast.duration');
  });

  it('handles empty objects', () => {
    expect(flattenTokens({})).toEqual({});
  });

  it('applies prefix', () => {
    const result = flattenTokens({ a: { value: 'x' } }, 'prefix');
    expect(result).toHaveProperty('prefix.a');
  });
});

// =============================================================================
// resolveReference
// =============================================================================

describe('resolveReference', () => {
  const tokens = makeFixture();

  it('resolves $primitive.color references', () => {
    expect(resolveReference(tokens, '$primitive.color.navy-600')).toBe('#1E3A5F');
  });

  it('resolves $primitive.breakpoints references', () => {
    expect(resolveReference(tokens, '$primitive.breakpoints.tablet')).toBe(768);
  });

  it('returns undefined for non-$ strings', () => {
    expect(resolveReference(tokens, 'plain-string')).toBeUndefined();
  });

  it('returns undefined for missing paths', () => {
    expect(resolveReference(tokens, '$primitive.color.nonexistent')).toBeUndefined();
  });

  it('returns undefined for paths that resolve to objects', () => {
    expect(resolveReference(tokens, '$primitive.color')).toBeUndefined();
  });
});

// =============================================================================
// CSS custom properties (web target)
// =============================================================================

describe('emitCssProperties', () => {
  const tokens = makeFixture();
  const output = emitCssProperties(tokens);

  it('returns a prism-tokens.css file', () => {
    expect(output.path).toBe('prism-tokens.css');
  });

  it('starts with auto-generated header', () => {
    expect(output.content).toContain('Auto-generated by @kailash/prism-compiler');
  });

  it('emits :root block', () => {
    expect(output.content).toContain(':root {');
  });

  it('emits primitive color custom properties', () => {
    expect(output.content).toContain('--prism-primitive-color-navy-600: #1E3A5F;');
    expect(output.content).toContain('--prism-primitive-color-white: #FFFFFF;');
  });

  it('emits semantic color custom properties with $primitive references resolved', () => {
    // interactive.primary references $primitive.color.navy-600 which is #1E3A5F
    expect(output.content).toContain('--prism-color-interactive-primary: #1E3A5F;');
  });

  it('emits spacing custom properties', () => {
    expect(output.content).toContain('--prism-spacing-4: 4px;');
    expect(output.content).toContain('--prism-spacing-32: 32px;');
  });

  it('emits font family custom properties', () => {
    expect(output.content).toContain('--prism-font-sans:');
  });

  it('emits shadow custom properties', () => {
    expect(output.content).toContain('--prism-shadow-sm:');
    expect(output.content).toContain('--prism-shadow-none: none;');
  });

  it('emits motion custom properties', () => {
    expect(output.content).toContain('--prism-duration-100: 100ms;');
    expect(output.content).toContain('--prism-easing-linear: linear;');
  });

  it('emits dark mode overrides', () => {
    expect(output.content).toContain('@media (prefers-color-scheme: dark)');
  });
});

// =============================================================================
// Tailwind config (web target)
// =============================================================================

describe('emitTailwindConfig', () => {
  const tokens = makeFixture();
  const output = emitTailwindConfig(tokens);

  it('returns a tailwind.config.ts file', () => {
    expect(output.path).toBe('tailwind.config.ts');
  });

  it('includes TypeScript Config import', () => {
    expect(output.content).toContain("import type { Config } from 'tailwindcss';");
  });

  it('exports a config object', () => {
    expect(output.content).toContain('const config: Config');
    expect(output.content).toContain('export default config;');
  });

  it('includes primitive colors', () => {
    expect(output.content).toContain('"navy-600"');
    expect(output.content).toContain('#1E3A5F');
  });

  it('includes spacing values in rem', () => {
    // 16px / 16 = 1rem
    expect(output.content).toContain('"1rem"');
  });

  it('includes screen breakpoints', () => {
    expect(output.content).toContain('"768px"');
    expect(output.content).toContain('"1024px"');
  });

  it('includes font families', () => {
    expect(output.content).toContain('Inter');
  });

  it('includes border radius', () => {
    expect(output.content).toContain('"4"');
    expect(output.content).toContain('"pill"');
  });

  it('includes shadow tokens', () => {
    expect(output.content).toContain('"none"');
  });

  it('does not include mobile:0px as a screen', () => {
    // mobile is 0, should be excluded from screens
    expect(output.content).not.toContain('"mobile": "0px"');
  });
});

// =============================================================================
// Dart constants (flutter target)
// =============================================================================

describe('emitDartConstants', () => {
  const tokens = makeFixture();
  const output = emitDartConstants(tokens);

  it('returns a prism_tokens.dart file', () => {
    expect(output.path).toBe('prism_tokens.dart');
  });

  it('contains Dart Color imports', () => {
    expect(output.content).toContain("import 'dart:ui';");
  });

  it('emits PrismColors class with Flutter Color values', () => {
    expect(output.content).toContain('abstract final class PrismColors');
    // navy-600 -> navy600, #1E3A5F -> Color(0xFF1E3A5F)
    expect(output.content).toContain('static const navy600 = Color(0xFF1E3A5F);');
  });

  it('emits PrismSpacing class with double values', () => {
    expect(output.content).toContain('abstract final class PrismSpacing');
    expect(output.content).toContain('static const double s4 = 4.0;');
    expect(output.content).toContain('static const double s32 = 32.0;');
  });

  it('emits PrismTypography class', () => {
    expect(output.content).toContain('abstract final class PrismTypography');
    expect(output.content).toContain('FontWeight.w400');
    expect(output.content).toContain('FontWeight.w700');
  });

  it('emits PrismRadius class', () => {
    expect(output.content).toContain('abstract final class PrismRadius');
    expect(output.content).toContain('static const double r4 = 4.0;');
    expect(output.content).toContain('static const double pill = 9999.0;');
  });

  it('emits PrismMotion class', () => {
    expect(output.content).toContain('abstract final class PrismMotion');
    expect(output.content).toContain('Duration(milliseconds: 200)');
  });

  it('emits PrismBreakpoints class', () => {
    expect(output.content).toContain('abstract final class PrismBreakpoints');
    expect(output.content).toContain('static const double tablet = 768.0;');
  });
});

// =============================================================================
// Flutter ThemeData
// =============================================================================

describe('emitThemeData', () => {
  const tokens = makeFixture();
  const output = emitThemeData(tokens);

  it('returns a prism_theme.dart file', () => {
    expect(output.path).toBe('prism_theme.dart');
  });

  it('imports Flutter material', () => {
    expect(output.content).toContain("import 'package:flutter/material.dart';");
  });

  it('imports prism_tokens.dart', () => {
    expect(output.content).toContain("import 'prism_tokens.dart';");
  });

  it('generates prismLightTheme function', () => {
    expect(output.content).toContain('ThemeData prismLightTheme()');
    expect(output.content).toContain('useMaterial3: true');
    expect(output.content).toContain('Brightness.light');
  });

  it('generates prismDarkTheme function', () => {
    expect(output.content).toContain('ThemeData prismDarkTheme()');
    expect(output.content).toContain('Brightness.dark');
  });

  it('resolves semantic color to primitive hex for ColorScheme', () => {
    // interactive.primary = $primitive.color.navy-600 = #1E3A5F
    expect(output.content).toContain('Color(0xFF1E3A5F)');
  });

  it('sets font family from primitive typography', () => {
    expect(output.content).toContain("fontFamily: 'Inter'");
  });

  it('generates TextTheme entries from semantic typography', () => {
    expect(output.content).toContain('headlineLarge: TextStyle(');
    expect(output.content).toContain('fontSize: 24.0');
    expect(output.content).toContain('fontWeight: FontWeight.w700');
  });

  it('generates dark mode ColorScheme from theme modes', () => {
    // dark.color.surface.page = $primitive.color.gray-900 = #0F172A
    expect(output.content).toContain('Color(0xFF0F172A)');
  });
});

// =============================================================================
// compile() entry point
// =============================================================================

describe('compile()', () => {
  const specsDir = resolve(import.meta.dirname, '../../specs');

  it('compiles web target from real specs', () => {
    const result = compile({ theme: 'enterprise', target: 'web', specsDir, outDir: '' });
    expect(result.errors).toHaveLength(0);
    expect(result.files).toHaveLength(2);
    expect(result.files.map(f => f.path)).toEqual(['tailwind.config.ts', 'prism-tokens.css']);
  });

  it('compiles flutter target from real specs', () => {
    const result = compile({ theme: 'enterprise', target: 'flutter', specsDir, outDir: '' });
    expect(result.errors).toHaveLength(0);
    expect(result.files).toHaveLength(2);
    expect(result.files.map(f => f.path)).toEqual(['prism_tokens.dart', 'prism_theme.dart']);
  });

  it('throws on nonexistent theme', () => {
    expect(() =>
      compile({ theme: 'nonexistent', target: 'web', specsDir, outDir: '' })
    ).toThrow();
  });
});

// =============================================================================
// scaffold()
// =============================================================================

describe('scaffold()', () => {
  const tmpDir = resolve(import.meta.dirname, '../../.test-scaffold-output');

  // Clean up after tests
  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('generates all expected files for web dashboard template', () => {
    const result = scaffold({
      name: 'Test App',
      theme: 'enterprise',
      target: 'web',
      outDir: tmpDir,
      template: 'dashboard',
    });
    expect(result.errors).toHaveLength(0);
    expect(result.files.length).toBeGreaterThanOrEqual(7);

    // Verify key files exist
    expect(existsSync(resolve(tmpDir, 'package.json'))).toBe(true);
    expect(existsSync(resolve(tmpDir, 'tsconfig.json'))).toBe(true);
    expect(existsSync(resolve(tmpDir, 'vite.config.ts'))).toBe(true);
    expect(existsSync(resolve(tmpDir, 'index.html'))).toBe(true);
    expect(existsSync(resolve(tmpDir, 'src/tokens.css'))).toBe(true);
    expect(existsSync(resolve(tmpDir, 'src/theme.ts'))).toBe(true);
    expect(existsSync(resolve(tmpDir, 'src/main.tsx'))).toBe(true);
    expect(existsSync(resolve(tmpDir, 'src/app.tsx'))).toBe(true);
  });

  it('generates valid package.json with correct name', () => {
    scaffold({ name: 'My CRM App', theme: 'enterprise', target: 'web', outDir: tmpDir, template: 'dashboard' });
    const pkg = JSON.parse(readFileSync(resolve(tmpDir, 'package.json'), 'utf-8'));
    expect(pkg.name).toBe('my-crm-app');
    expect(pkg.dependencies['@kailash/prism-web']).toBeDefined();
    expect(pkg.dependencies.react).toBeDefined();
  });

  it('generates main.tsx with ThemeProvider and LayoutProvider', () => {
    scaffold({ name: 'Test', theme: 'enterprise', target: 'web', outDir: tmpDir, template: 'dashboard' });
    const main = readFileSync(resolve(tmpDir, 'src/main.tsx'), 'utf-8');
    expect(main).toContain('ThemeProvider');
    expect(main).toContain('LayoutProvider');
    expect(main).toContain('App');
  });

  it('generates dashboard starter page with DashboardTemplate', () => {
    scaffold({ name: 'Test', theme: 'enterprise', target: 'web', outDir: tmpDir, template: 'dashboard' });
    const app = readFileSync(resolve(tmpDir, 'src/app.tsx'), 'utf-8');
    expect(app).toContain('DashboardTemplate');
    expect(app).toContain('StatCard');
  });

  it('generates list starter page with DataTable', () => {
    scaffold({ name: 'Test', theme: 'enterprise', target: 'web', outDir: tmpDir, template: 'list' });
    const app = readFileSync(resolve(tmpDir, 'src/app.tsx'), 'utf-8');
    expect(app).toContain('ListTemplate');
    expect(app).toContain('DataTable');
  });

  it('generates conversation starter page with ChatEngine', () => {
    scaffold({ name: 'Test', theme: 'enterprise', target: 'web', outDir: tmpDir, template: 'conversation' });
    const app = readFileSync(resolve(tmpDir, 'src/app.tsx'), 'utf-8');
    expect(app).toContain('ConversationTemplate');
    expect(app).toContain('ChatEngine');
  });

  it('returns error for flutter target', () => {
    const result = scaffold({ name: 'Test', theme: 'enterprise', target: 'flutter', outDir: tmpDir, template: 'dashboard' });
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Flutter');
  });

  it('generates tokens.css with design token custom properties', () => {
    scaffold({ name: 'Test', theme: 'enterprise', target: 'web', outDir: tmpDir, template: 'dashboard' });
    const css = readFileSync(resolve(tmpDir, 'src/tokens.css'), 'utf-8');
    expect(css).toContain('--prism-color-interactive-primary');
    expect(css).toContain('--prism-color-surface-page');
    expect(css).toContain(':root');
  });
});
