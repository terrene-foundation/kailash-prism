#!/usr/bin/env node
/**
 * @kailash/prism-compiler — Scaffold CLI
 * Usage: npx prism-scaffold --name my-app --theme enterprise --template dashboard
 */

import { resolve } from 'node:path';
import { scaffold } from './scaffold.js';
import type { CompileTarget } from './types.js';

function main(): void {
  const args = process.argv.slice(2);

  let name = 'my-prism-app';
  let theme = 'enterprise';
  let target: CompileTarget = 'web';
  let template = 'dashboard';
  let outDir: string | undefined;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--name':
        name = args[++i] ?? name;
        break;
      case '--theme':
        theme = args[++i] ?? theme;
        break;
      case '--target':
        target = (args[++i] ?? target) as CompileTarget;
        break;
      case '--template':
        template = args[++i] ?? template;
        break;
      case '--out':
        outDir = args[++i];
        break;
      case '--help':
        console.log(`
@kailash/prism-compiler — scaffold

Usage: prism-scaffold [options]

Options:
  --name <name>          Project name (default: my-prism-app)
  --theme <theme>        Theme: enterprise | modern | minimal (default: enterprise)
  --template <template>  Starter template: dashboard | list | conversation | detail | form | settings (default: dashboard)
  --target <target>      Target: web | flutter (default: web)
  --out <dir>            Output directory (default: ./<name>)
  --help                 Show this help

Examples:
  prism-scaffold --name crm-dashboard --theme enterprise --template dashboard
  prism-scaffold --name support-chat --template conversation
`);
        process.exit(0);
    }
  }

  const resolvedOut = resolve(process.cwd(), outDir ?? name);

  console.log(`Scaffolding "${name}" with ${theme} theme and ${template} template...`);
  console.log(`  Output: ${resolvedOut}`);

  const result = scaffold({
    name,
    theme,
    target,
    outDir: resolvedOut,
    template,
  });

  if (result.errors.length > 0) {
    console.error('\nErrors:');
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log(`\nGenerated ${result.files.length} files:`);
  for (const file of result.files) {
    console.log(`  ${file.path} — ${file.description}`);
  }

  console.log(`\nNext steps:`);
  console.log(`  cd ${outDir ?? name}`);
  console.log(`  npm install`);
  console.log(`  npm run dev`);
}

main();
