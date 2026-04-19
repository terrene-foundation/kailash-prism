/**
 * Codegen PoC — TypeScript emitter tests
 *
 * Exercises the pipeline end-to-end against the real
 * specs/components/data-table.yaml file. Uses inline substring assertions
 * (not a full snapshot file) so that cosmetic changes to the generated
 * header do not create a churn ritual every time the spec version bumps
 * — we assert the load-bearing structural properties instead.
 */
import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { loadComponentSpec } from '../spec-loader.js';
import { emitAdapterTypes } from '../ts-emitter.js';
import { CodegenError } from '../types.js';

const SPECS_DIR = resolve(import.meta.dirname, '../../../../specs/components');

describe('loadComponentSpec + emitAdapterTypes — data-table.yaml', () => {
  const sourcePath = resolve(SPECS_DIR, 'data-table.yaml');
  const spec = loadComponentSpec(sourcePath);
  const output = emitAdapterTypes({ sourcePath, spec });

  it('parses the adapter section', () => {
    expect(spec.adapter).toBeDefined();
    expect(spec.adapter!.name).toBe('DataTableAdapter');
  });

  it('produces an output file with a kebab-case filename', () => {
    expect(output.path).toBe('data-table-adapter-spec.ts');
  });

  it('includes a DO NOT EDIT header referencing the generator', () => {
    expect(output.content).toContain('GENERATED from');
    expect(output.content).toContain('DO NOT EDIT BY HAND');
    expect(output.content).toContain('@kailash/prism-compiler');
  });

  it('includes the spec authority reference verbatim', () => {
    expect(output.content).toContain(
      'docs/specs/05-engine-specifications.md § 5.1.1',
    );
  });

  it('declares generic type parameters with defaults', () => {
    // The data-table spec declares `T` (no default) and `TId = string`.
    expect(output.content).toContain('<T, TId = string>');
  });

  it('emits an exported interface with the declared adapter name', () => {
    expect(output.content).toContain('export interface DataTableAdapter<T, TId = string>');
  });

  it('emits all three required methods as non-optional properties', () => {
    expect(output.content).toMatch(/readonly getRowId: \(row: T\) => TId;/);
    expect(output.content).toMatch(
      /readonly capabilities: \(\) => DataTableCapabilities;/,
    );
    expect(output.content).toMatch(
      /readonly fetchPage: \(query: DataTableQuery\) => Promise<DataTablePage<T>>;/,
    );
  });

  it('emits optional methods with a trailing question mark', () => {
    expect(output.content).toMatch(/readonly onRowActivate\?:/);
    expect(output.content).toMatch(/readonly rowActions\?:/);
    expect(output.content).toMatch(/readonly bulkActions\?:/);
    expect(output.content).toMatch(/readonly invalidate\?:/);
  });

  it('includes the YAML purpose as JSDoc on each method', () => {
    expect(output.content).toContain('Stable row identity; replaces hardcoded row[\'id\']');
    expect(output.content).toContain('Fetch one page. Engine drives all state changes');
  });

  it('lists support_types as a comment (not as generated declarations)', () => {
    expect(output.content).toContain(
      '// Support types referenced by this adapter',
    );
    expect(output.content).toContain('DataTableCapabilities');
    expect(output.content).toContain('DataTableQuery');
    expect(output.content).toContain('DataTablePage');
    // Assert we do NOT generate a body for any support type — those
    // live in the hand-written web/src/engines/data-table/types.ts.
    expect(output.content).not.toMatch(
      /export interface DataTableCapabilities\s*\{/,
    );
  });

  it('declares the @since tag from version_introduced', () => {
    expect(output.content).toContain('@since       0.2.2');
  });

  it('declares the @supersedes tag when the YAML provides one', () => {
    expect(output.content).toContain('@supersedes ServerDataSource');
  });
});

describe('loadComponentSpec — error paths', () => {
  it('raises SPEC_NOT_FOUND for a missing file', () => {
    expect(() => loadComponentSpec(resolve(SPECS_DIR, 'does-not-exist.yaml')))
      .toThrow(CodegenError);
  });

  it('raises NO_ADAPTER_IN_SPEC when the spec has no adapter section', () => {
    // card.yaml is an atom with version but no adapter; the loader
    // validates successfully and the emitter raises when asked to
    // emit against an adapter-less spec.
    const cardSpec = loadComponentSpec(resolve(SPECS_DIR, 'card.yaml'));
    expect(cardSpec.adapter).toBeUndefined();
    expect(() =>
      emitAdapterTypes({ sourcePath: resolve(SPECS_DIR, 'card.yaml'), spec: cardSpec }),
    ).toThrow(CodegenError);
  });
});
