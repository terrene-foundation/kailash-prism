/**
 * @kailash/prism-compiler
 * Compiles Prism design token specs into framework-specific output.
 *
 * Spec: docs/specs/02-token-architecture.md
 * Targets: Tailwind CSS + CSS custom properties (web), ThemeData + Dart constants (flutter)
 */

export { parseTheme, resolveReference, flattenTokens } from './parse.js';
export { compileWeb, emitTailwindConfig, emitCssProperties } from './web.js';
export { compileFlutter, emitDartConstants, emitThemeData } from './flutter.js';
export type {
  ThemeTokens,
  CompileTarget,
  CompileOptions,
  CompileResult,
  OutputFile,
} from './types.js';

import { parseTheme } from './parse.js';
import { compileWeb } from './web.js';
import { compileFlutter } from './flutter.js';
import type { CompileOptions, CompileResult } from './types.js';

/**
 * Main compilation entry point.
 * Reads a theme YAML, compiles to the specified target, returns output files.
 */
export function compile(options: CompileOptions): CompileResult {
  const { theme, target, specsDir } = options;

  const tokens = parseTheme(specsDir, theme);
  const warnings: string[] = [];
  const errors: string[] = [];

  const files = target === 'web'
    ? compileWeb(tokens)
    : compileFlutter(tokens);

  return { files, warnings, errors };
}
