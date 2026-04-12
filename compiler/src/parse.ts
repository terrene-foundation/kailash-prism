/**
 * @kailash/prism-compiler — YAML parser
 * Reads theme YAML files and returns typed token structures.
 * Spec: docs/specs/02-token-architecture.md
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { ThemeTokens } from './types.js';

export function parseTheme(specsDir: string, themeName: string): ThemeTokens {
  const themePath = resolve(specsDir, 'tokens', 'themes', `${themeName}.yaml`);
  const raw = readFileSync(themePath, 'utf-8');
  const parsed = parseYaml(raw) as ThemeTokens;

  if (!parsed?.tokens?.primitive) {
    throw new Error(`Theme "${themeName}" missing tokens.primitive section`);
  }
  if (!parsed?.tokens?.semantic) {
    throw new Error(`Theme "${themeName}" missing tokens.semantic section`);
  }

  return parsed;
}

/**
 * Resolve a $primitive.{path} or $semantic.{path} reference to its value.
 * Returns the raw string/number value, or undefined if not found.
 */
export function resolveReference(
  tokens: ThemeTokens,
  ref: string
): string | number | undefined {
  if (!ref.startsWith('$')) return undefined;

  const parts = ref.slice(1).split('.');
  const tier = parts[0]; // 'primitive' or 'semantic'
  const path = parts.slice(1);

  let current: unknown = tokens.tokens[tier as keyof typeof tokens.tokens];
  for (const part of path) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  if (typeof current === 'string' || typeof current === 'number') {
    return current;
  }
  return undefined;
}

/**
 * Flatten a nested token object into dot-separated paths.
 * { color: { interactive: { primary: { value: "#1E3A5F" } } } }
 * → { "color.interactive.primary": { value: "#1E3A5F" } }
 */
export function flattenTokens(
  obj: Record<string, unknown>,
  prefix = ''
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (
      value != null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !('value' in (value as Record<string, unknown>)) &&
      !('family' in (value as Record<string, unknown>)) &&
      !('duration' in (value as Record<string, unknown>))
    ) {
      Object.assign(result, flattenTokens(value as Record<string, unknown>, path));
    } else {
      result[path] = value;
    }
  }

  return result;
}
