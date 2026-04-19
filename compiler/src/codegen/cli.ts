#!/usr/bin/env node
/**
 * @kailash/prism-compiler — Codegen CLI (PoC)
 *
 * Usage:
 *   prism-codegen --spec specs/components/data-table.yaml \
 *                 --out compiler/generated/data-table-spec.ts
 *
 * Purpose: demonstrate end-to-end generation of a typed TypeScript
 * interface from a component YAML spec. Writes one file per invocation.
 * Multi-spec batch mode is a follow-up (see docs/guides/codegen-architecture.md).
 *
 * Exit codes:
 *   0 — success
 *   1 — input / validation error (missing file, YAML parse failure,
 *       schema violation, no adapter section in the spec)
 *   2 — internal error (should not happen in normal operation)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { loadComponentSpec } from './spec-loader.js';
import { emitAdapterTypes } from './ts-emitter.js';
import { CodegenError } from './types.js';

interface CliArgs {
  spec: string;
  out: string;
}

function parseArgs(argv: ReadonlyArray<string>): CliArgs {
  let spec: string | undefined;
  let out: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--spec':
        spec = argv[++i];
        break;
      case '--out':
        out = argv[++i];
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!spec) throw new Error('Missing required --spec <path>');
  if (!out) throw new Error('Missing required --out <path>');
  return { spec, out };
}

function printHelp(): void {
  // Using console.log here is intentional: this is a CLI binary whose
  // output is the UI the user sees. The observability rule prohibiting
  // `console.log` applies to production library / agent code; CLI
  // output is the equivalent of a UX surface.
  // eslint-disable-next-line no-console
  console.log(
    `prism-codegen (PoC)

Generate typed TypeScript scaffolding from a Prism component YAML spec.

Usage:
  prism-codegen --spec <path> --out <path>

Arguments:
  --spec <path>   Path to a specs/components/*.yaml file
  --out <path>    Destination for the generated TypeScript file

Exit codes:
  0  success
  1  input / validation error
  2  internal error
`,
  );
}

function main(): void {
  let args: CliArgs;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
    // eslint-disable-next-line no-console
    console.error('Run with --help for usage.');
    process.exit(1);
  }

  const specPath = resolve(process.cwd(), args.spec);
  const outPath = resolve(process.cwd(), args.out);

  try {
    const spec = loadComponentSpec(specPath);
    const output = emitAdapterTypes({ sourcePath: specPath, spec });

    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, output.content, 'utf-8');

    // eslint-disable-next-line no-console
    console.log(`generated ${outPath}`);
    // eslint-disable-next-line no-console
    console.log(`  from    ${specPath}`);
    // eslint-disable-next-line no-console
    console.log(
      `  adapter ${spec.adapter?.name ?? '(none)'} v${spec.adapter?.version_introduced ?? 'n/a'}`,
    );
  } catch (err) {
    if (err instanceof CodegenError) {
      // eslint-disable-next-line no-console
      console.error(`[${err.code}] ${err.message}`);
      process.exit(1);
    }
    // eslint-disable-next-line no-console
    console.error(`internal error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(2);
  }
}

main();
