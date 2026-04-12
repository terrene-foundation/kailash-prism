#!/usr/bin/env node
/**
 * @kailash/prism-compiler CLI
 * Usage: npx prism-compile --theme enterprise --target web
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { compile } from './index.js';
import type { CompileTarget } from './types.js';

function main(): void {
  const args = process.argv.slice(2);

  let theme = 'enterprise';
  let target: CompileTarget = 'web';
  let outDir = 'generated';

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--theme':
        theme = args[++i];
        break;
      case '--target':
        target = args[++i] as CompileTarget;
        break;
      case '--out':
        outDir = args[++i];
        break;
      case '--help':
        console.log(`
@kailash/prism-compiler

Usage: prism-compile [options]

Options:
  --theme <name>     Theme name (default: enterprise)
  --target <target>  Output target: web | flutter (default: web)
  --out <dir>        Output directory (default: generated)
  --help             Show this help
`);
        process.exit(0);
    }
  }

  if (!['web', 'flutter'].includes(target)) {
    console.error(`Invalid target: ${target}. Must be "web" or "flutter".`);
    process.exit(1);
  }

  const specsDir = resolve(process.cwd(), 'specs');
  const outputDir = resolve(process.cwd(), outDir);

  console.log(`Compiling theme "${theme}" for target "${target}"...`);
  console.log(`  Specs: ${specsDir}`);
  console.log(`  Output: ${outputDir}`);

  const result = compile({ theme, target, specsDir, outDir: outputDir });

  if (result.errors.length > 0) {
    console.error('\nErrors:');
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  mkdirSync(outputDir, { recursive: true });

  for (const file of result.files) {
    const filePath = join(outputDir, file.path);
    writeFileSync(filePath, file.content, 'utf-8');
    console.log(`  Written: ${filePath}`);
  }

  if (result.warnings.length > 0) {
    console.warn('\nWarnings:');
    for (const warn of result.warnings) {
      console.warn(`  - ${warn}`);
    }
  }

  console.log(`\nDone. ${result.files.length} files generated.`);
}

main();
