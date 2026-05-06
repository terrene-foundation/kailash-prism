---
type: validate
phase: 04-validate
date: 2026-05-06
---

# Local Validation — Node 22 + 24 (Docker)

Pre-FIRST-Push CI parity per `git.md` § "Pre-FIRST-Push CI Parity Discipline".
Local Node manager not installed (host runs Homebrew node 25 only); used
Docker `node:22` and `node:24` official images instead. Source mounted
read-only, copied to container's own `/work`, npm ci + lint + build +
test:run executed against fresh node_modules per run.

## Result summary

| Package  | Node | Exit | Duration | Note |
|----------|------|------|----------|------|
| web      | 22   | 0    | 10s      | first run |
| web      | 24   | 0    | 9s       | first run |
| compiler | 22   | 1    | 2s       | failed: tests reference `../specs/` (monorepo path); compiler-only mount lacks parent context |
| compiler | 24   | 1    | 2s       | same as above |
| compiler | 22 (full-repo mount) | 0 | 4s | passed: mount adjusted to repo root, cd into compiler/ |
| compiler | 24 (full-repo mount) | 0 | 3s | passed |

Both Node majors pass on both packages. Compiler's first-attempt failure
was a Docker mount strategy artifact (the test suite uses
`../specs/tokens/themes/enterprise.yaml` and `../specs/components/data-table.yaml`
relative paths that traverse to the monorepo root), NOT a Node-version
regression. Re-run with `-v "$PWD":/src:ro` confirmed clean.

## Raw command transcripts

```
# Local Validation Log — 2026-05-06T01:33:21Z
# Host: macOS, Docker Docker version 29.4.0
# Method: docker run with /src:ro mount + container-local cp+install (no host node_modules pollution)

=== web @ Node 22 ===
--- npm ci ---
--- npm run lint ---

> @kailash/prism-web@0.6.0 lint
> eslint src/

--- npm run build ---

> @kailash/prism-web@0.6.0 build
> tsc

--- npm run test:run ---

> @kailash/prism-web@0.6.0 test:run
> vitest run


 RUN  v3.2.4 /work

 ✓ src/molecules/filter-bar/__tests__/use-filter-bar-state.test.ts (9 tests) 18ms
 ✓ src/molecules/filter-bar/__tests__/filter-bar.test.tsx (14 tests) 115ms
 ✓ src/engines/data-table/__tests__/synthetic-fields.test.tsx (6 tests) 95ms
 ✓ src/engines/form/__tests__/form-engine.wiring.test.tsx (7 tests) 211ms
 ✓ src/engines/ai-chat.test.tsx (38 tests) 218ms
 ✓ src/engines/data-table-0.4.0.test.tsx (13 tests) 229ms
 ✓ src/engines/form-adapter.test.tsx (27 tests) 342ms
 ✓ src/engines/ai-chat/__tests__/ai-chat-engine.wiring.test.tsx (6 tests) 333ms
 ✓ src/engines/form.test.tsx (40 tests) 353ms
 ✓ src/engines/data-table/__tests__/data-table-engine.wiring.test.tsx (6 tests) 317ms
 ✓ src/templates/templates.test.tsx (22 tests) 241ms
 ✓ src/engines/layout-delegation.test.tsx (16 tests) 37ms
 ✓ src/engines/data-table.test.tsx (32 tests) 519ms
 ✓ src/engines/data-table-card-grid.test.tsx (20 tests) 590ms
 ✓ src/engines/theme.test.tsx (9 tests) 34ms
 ✓ src/engines/layout/__tests__/split.test.tsx (11 tests) 152ms
 ✓ src/organisms/card-grid.test.tsx (11 tests) 131ms
 ✓ src/engines/layout/__tests__/layer.test.tsx (9 tests) 37ms
 ✓ src/engines/ai-chat-sidebar.test.tsx (32 tests) 973ms
 ✓ src/engines/navigation.test.tsx (9 tests) 108ms
 ✓ src/atoms/atoms.test.tsx (20 tests) 218ms
 ✓ src/engines/data-table-adapter.test.tsx (22 tests) 925ms
 ✓ src/engines/layout/__tests__/layout-engine.wiring.test.tsx (4 tests) 116ms
 ✓ src/atoms/card.test.tsx (11 tests) 83ms
 ✓ src/engines/layout/__tests__/scroll.test.tsx (9 tests) 33ms
 ✓ src/engines/layout/__tests__/stack.test.tsx (7 tests) 59ms
 ✓ src/engines/layout.test.tsx (13 tests) 58ms
 ✓ src/engines/layout/__tests__/row.test.tsx (3 tests) 19ms
 ✓ src/engines/layout/__tests__/grid.test.tsx (6 tests) 27ms

 Test Files  29 passed (29)
      Tests  432 passed (432)
   Start at  01:33:29
   Duration  1.94s (transform 1.51s, setup 423ms, collect 6.11s, tests 6.59s, environment 7.61s, prepare 1.86s)

exit=0 duration=10s

=== web @ Node 24 ===
--- npm ci ---
--- npm run lint ---

> @kailash/prism-web@0.6.0 lint
> eslint src/

--- npm run build ---

> @kailash/prism-web@0.6.0 build
> tsc

--- npm run test:run ---

> @kailash/prism-web@0.6.0 test:run
> vitest run


 RUN  v3.2.4 /work

 ✓ src/molecules/filter-bar/__tests__/use-filter-bar-state.test.ts (9 tests) 14ms
 ✓ src/molecules/filter-bar/__tests__/filter-bar.test.tsx (14 tests) 108ms
 ✓ src/engines/data-table/__tests__/synthetic-fields.test.tsx (6 tests) 96ms
 ✓ src/engines/form/__tests__/form-engine.wiring.test.tsx (7 tests) 194ms
 ✓ src/engines/ai-chat.test.tsx (38 tests) 193ms
 ✓ src/engines/data-table-0.4.0.test.tsx (13 tests) 190ms
 ✓ src/engines/form.test.tsx (40 tests) 261ms
 ✓ src/engines/form-adapter.test.tsx (27 tests) 307ms
 ✓ src/templates/templates.test.tsx (22 tests) 212ms
 ✓ src/engines/ai-chat/__tests__/ai-chat-engine.wiring.test.tsx (6 tests) 316ms
 ✓ src/engines/layout-delegation.test.tsx (16 tests) 30ms
 ✓ src/engines/data-table/__tests__/data-table-engine.wiring.test.tsx (6 tests) 308ms
 ✓ src/engines/data-table-card-grid.test.tsx (20 tests) 424ms
 ✓ src/engines/data-table.test.tsx (32 tests) 445ms
 ✓ src/engines/theme.test.tsx (9 tests) 27ms
 ✓ src/engines/layout/__tests__/split.test.tsx (11 tests) 143ms
 ✓ src/organisms/card-grid.test.tsx (11 tests) 82ms
 ✓ src/engines/navigation.test.tsx (9 tests) 77ms
 ✓ src/engines/layout.test.tsx (13 tests) 71ms
 ✓ src/atoms/card.test.tsx (11 tests) 73ms
 ✓ src/atoms/atoms.test.tsx (20 tests) 121ms
 ✓ src/engines/layout/__tests__/layout-engine.wiring.test.tsx (4 tests) 89ms
 ✓ src/engines/layout/__tests__/layer.test.tsx (9 tests) 38ms
 ✓ src/engines/data-table-adapter.test.tsx (22 tests) 742ms
 ✓ src/engines/layout/__tests__/stack.test.tsx (7 tests) 47ms
 ✓ src/engines/layout/__tests__/scroll.test.tsx (9 tests) 31ms
 ✓ src/engines/ai-chat-sidebar.test.tsx (32 tests) 935ms
 ✓ src/engines/layout/__tests__/grid.test.tsx (6 tests) 21ms
 ✓ src/engines/layout/__tests__/row.test.tsx (3 tests) 15ms

 Test Files  29 passed (29)
      Tests  432 passed (432)
   Start at  01:33:44
   Duration  1.46s (transform 1.17s, setup 196ms, collect 4.45s, tests 5.61s, environment 5.72s, prepare 1.10s)

exit=0 duration=9s

=== compiler @ Node 22 ===
--- npm ci ---
--- npm run build ---

> @kailash/prism-compiler@0.1.0 build
> tsc

--- npm run test:run ---

> @kailash/prism-compiler@0.1.0 test:run
> vitest run


 RUN  v3.2.4 /work

 ❯ src/compile.test.ts (59 tests | 2 failed) 13ms
   ✓ flattenTokens > flattens nested objects to dot-separated paths 1ms
   ✓ flattenTokens > stops at objects with a "value" key 0ms
   ✓ flattenTokens > stops at objects with a "family" key (typography composites) 0ms
   ✓ flattenTokens > stops at objects with a "duration" key (motion composites) 0ms
   ✓ flattenTokens > handles empty objects 0ms
   ✓ flattenTokens > applies prefix 0ms
   ✓ resolveReference > resolves $primitive.color references 0ms
   ✓ resolveReference > resolves $primitive.breakpoints references 0ms
   ✓ resolveReference > returns undefined for non-$ strings 0ms
   ✓ resolveReference > returns undefined for missing paths 0ms
   ✓ resolveReference > returns undefined for paths that resolve to objects 0ms
   ✓ emitCssProperties > returns a prism-tokens.css file 0ms
   ✓ emitCssProperties > starts with auto-generated header 0ms
   ✓ emitCssProperties > emits :root block 0ms
   ✓ emitCssProperties > emits primitive color custom properties 0ms
   ✓ emitCssProperties > emits semantic color custom properties with $primitive references resolved 0ms
   ✓ emitCssProperties > emits spacing custom properties 0ms
   ✓ emitCssProperties > emits font family custom properties 0ms
   ✓ emitCssProperties > emits shadow custom properties 0ms
   ✓ emitCssProperties > emits motion custom properties 0ms
   ✓ emitCssProperties > emits dark mode overrides 0ms
   ✓ emitTailwindConfig > returns a tailwind.config.ts file 0ms
   ✓ emitTailwindConfig > includes TypeScript Config import 0ms
   ✓ emitTailwindConfig > exports a config object 0ms
   ✓ emitTailwindConfig > includes primitive colors 0ms
   ✓ emitTailwindConfig > includes spacing values in rem 0ms
   ✓ emitTailwindConfig > includes screen breakpoints 0ms
   ✓ emitTailwindConfig > includes font families 0ms
   ✓ emitTailwindConfig > includes border radius 0ms
   ✓ emitTailwindConfig > includes shadow tokens 0ms
   ✓ emitTailwindConfig > does not include mobile:0px as a screen 0ms
   ✓ emitDartConstants > returns a prism_tokens.dart file 0ms
   ✓ emitDartConstants > contains Dart Color imports 0ms
   ✓ emitDartConstants > emits PrismColors class with Flutter Color values 0ms
   ✓ emitDartConstants > emits PrismSpacing class with double values 0ms
   ✓ emitDartConstants > emits PrismTypography class 0ms
   ✓ emitDartConstants > emits PrismRadius class 0ms
   ✓ emitDartConstants > emits PrismMotion class 0ms
   ✓ emitDartConstants > emits PrismBreakpoints class 0ms
   ✓ emitThemeData > returns a prism_theme.dart file 0ms
   ✓ emitThemeData > imports Flutter material 0ms
   ✓ emitThemeData > imports prism_tokens.dart 0ms
   ✓ emitThemeData > generates prismLightTheme function 0ms
   ✓ emitThemeData > generates prismDarkTheme function 0ms
   ✓ emitThemeData > resolves semantic color to primitive hex for ColorScheme 0ms
   ✓ emitThemeData > sets font family from primitive typography 0ms
   ✓ emitThemeData > generates TextTheme entries from semantic typography 0ms
   ✓ emitThemeData > generates dark mode ColorScheme from theme modes 0ms
   × compile() > compiles web target from real specs 4ms
     → ENOENT: no such file or directory, open '/specs/tokens/themes/enterprise.yaml'
   × compile() > compiles flutter target from real specs 0ms
     → ENOENT: no such file or directory, open '/specs/tokens/themes/enterprise.yaml'
   ✓ compile() > throws on nonexistent theme 0ms
   ✓ scaffold() > generates all expected files for web dashboard template 1ms
   ✓ scaffold() > generates valid package.json with correct name 1ms
   ✓ scaffold() > generates main.tsx with ThemeProvider and LayoutProvider 0ms
   ✓ scaffold() > generates dashboard starter page with DashboardTemplate 0ms
   ✓ scaffold() > generates list starter page with DataTable 0ms
   ✓ scaffold() > generates conversation starter page with ChatEngine 0ms
   ✓ scaffold() > returns error for flutter target 0ms
   ✓ scaffold() > generates tokens.css with design token custom properties 0ms

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/codegen/__tests__/ts-emitter.test.ts [ src/codegen/__tests__/ts-emitter.test.ts ]
CodegenError: Component spec not found at /specs/components/data-table.yaml: ENOENT: no such file or directory, open '/specs/components/data-table.yaml'
 ❯ loadComponentSpec src/codegen/spec-loader.ts:37:11
     35|     raw = readFileSync(sourcePath, 'utf-8');
     36|   } catch (err) {
     37|     throw new CodegenError(
       |           ^
     38|       'SPEC_NOT_FOUND',
     39|       `Component spec not found at ${sourcePath}: ${describeError(err)…
 ❯ src/codegen/__tests__/ts-emitter.test.ts:20:16

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/3]⎯


⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/compile.test.ts > compile() > compiles web target from real specs
Error: ENOENT: no such file or directory, open '/specs/tokens/themes/enterprise.yaml'
 ❯ parseTheme src/parse.ts:14:15
     12| export function parseTheme(specsDir: string, themeName: string): Theme…
     13|   const themePath = resolve(specsDir, 'tokens', 'themes', `${themeName…
     14|   const raw = readFileSync(themePath, 'utf-8');
       |               ^
     15|   const parsed = parseYaml(raw) as ThemeTokens;
     16| 
 ❯ compile src/index.ts:33:18
 ❯ src/compile.test.ts:408:20

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/3]⎯

 FAIL  src/compile.test.ts > compile() > compiles flutter target from real specs
Error: ENOENT: no such file or directory, open '/specs/tokens/themes/enterprise.yaml'
 ❯ parseTheme src/parse.ts:14:15
     12| export function parseTheme(specsDir: string, themeName: string): Theme…
     13|   const themePath = resolve(specsDir, 'tokens', 'themes', `${themeName…
     14|   const raw = readFileSync(themePath, 'utf-8');
       |               ^
     15|   const parsed = parseYaml(raw) as ThemeTokens;
     16| 
 ❯ compile src/index.ts:33:18
 ❯ src/compile.test.ts:415:20

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/3]⎯


 Test Files  2 failed (2)
      Tests  2 failed | 57 passed (59)
   Start at  01:33:48
   Duration  220ms (transform 114ms, setup 0ms, collect 92ms, tests 13ms, environment 0ms, prepare 76ms)

exit=1 duration=2s

=== compiler @ Node 24 ===
--- npm ci ---
--- npm run build ---

> @kailash/prism-compiler@0.1.0 build
> tsc

--- npm run test:run ---

> @kailash/prism-compiler@0.1.0 test:run
> vitest run


 RUN  v3.2.4 /work

 ❯ src/compile.test.ts (59 tests | 2 failed) 9ms
   ✓ flattenTokens > flattens nested objects to dot-separated paths 1ms
   ✓ flattenTokens > stops at objects with a "value" key 0ms
   ✓ flattenTokens > stops at objects with a "family" key (typography composites) 0ms
   ✓ flattenTokens > stops at objects with a "duration" key (motion composites) 0ms
   ✓ flattenTokens > handles empty objects 0ms
   ✓ flattenTokens > applies prefix 0ms
   ✓ resolveReference > resolves $primitive.color references 0ms
   ✓ resolveReference > resolves $primitive.breakpoints references 0ms
   ✓ resolveReference > returns undefined for non-$ strings 0ms
   ✓ resolveReference > returns undefined for missing paths 0ms
   ✓ resolveReference > returns undefined for paths that resolve to objects 0ms
   ✓ emitCssProperties > returns a prism-tokens.css file 0ms
   ✓ emitCssProperties > starts with auto-generated header 0ms
   ✓ emitCssProperties > emits :root block 0ms
   ✓ emitCssProperties > emits primitive color custom properties 0ms
   ✓ emitCssProperties > emits semantic color custom properties with $primitive references resolved 0ms
   ✓ emitCssProperties > emits spacing custom properties 0ms
   ✓ emitCssProperties > emits font family custom properties 0ms
   ✓ emitCssProperties > emits shadow custom properties 0ms
   ✓ emitCssProperties > emits motion custom properties 0ms
   ✓ emitCssProperties > emits dark mode overrides 0ms
   ✓ emitTailwindConfig > returns a tailwind.config.ts file 0ms
   ✓ emitTailwindConfig > includes TypeScript Config import 0ms
   ✓ emitTailwindConfig > exports a config object 0ms
   ✓ emitTailwindConfig > includes primitive colors 0ms
   ✓ emitTailwindConfig > includes spacing values in rem 0ms
   ✓ emitTailwindConfig > includes screen breakpoints 0ms
   ✓ emitTailwindConfig > includes font families 0ms
   ✓ emitTailwindConfig > includes border radius 0ms
   ✓ emitTailwindConfig > includes shadow tokens 0ms
   ✓ emitTailwindConfig > does not include mobile:0px as a screen 0ms
   ✓ emitDartConstants > returns a prism_tokens.dart file 0ms
   ✓ emitDartConstants > contains Dart Color imports 0ms
   ✓ emitDartConstants > emits PrismColors class with Flutter Color values 0ms
   ✓ emitDartConstants > emits PrismSpacing class with double values 0ms
   ✓ emitDartConstants > emits PrismTypography class 0ms
   ✓ emitDartConstants > emits PrismRadius class 0ms
   ✓ emitDartConstants > emits PrismMotion class 0ms
   ✓ emitDartConstants > emits PrismBreakpoints class 0ms
   ✓ emitThemeData > returns a prism_theme.dart file 0ms
   ✓ emitThemeData > imports Flutter material 0ms
   ✓ emitThemeData > imports prism_tokens.dart 0ms
   ✓ emitThemeData > generates prismLightTheme function 0ms
   ✓ emitThemeData > generates prismDarkTheme function 0ms
   ✓ emitThemeData > resolves semantic color to primitive hex for ColorScheme 0ms
   ✓ emitThemeData > sets font family from primitive typography 0ms
   ✓ emitThemeData > generates TextTheme entries from semantic typography 0ms
   ✓ emitThemeData > generates dark mode ColorScheme from theme modes 0ms
   × compile() > compiles web target from real specs 3ms
     → ENOENT: no such file or directory, open '/specs/tokens/themes/enterprise.yaml'
   × compile() > compiles flutter target from real specs 0ms
     → ENOENT: no such file or directory, open '/specs/tokens/themes/enterprise.yaml'
   ✓ compile() > throws on nonexistent theme 0ms
   ✓ scaffold() > generates all expected files for web dashboard template 1ms
   ✓ scaffold() > generates valid package.json with correct name 0ms
   ✓ scaffold() > generates main.tsx with ThemeProvider and LayoutProvider 0ms
   ✓ scaffold() > generates dashboard starter page with DashboardTemplate 0ms
   ✓ scaffold() > generates list starter page with DataTable 0ms
   ✓ scaffold() > generates conversation starter page with ChatEngine 0ms
   ✓ scaffold() > returns error for flutter target 0ms
   ✓ scaffold() > generates tokens.css with design token custom properties 0ms

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/codegen/__tests__/ts-emitter.test.ts [ src/codegen/__tests__/ts-emitter.test.ts ]
CodegenError: Component spec not found at /specs/components/data-table.yaml: ENOENT: no such file or directory, open '/specs/components/data-table.yaml'
 ❯ loadComponentSpec src/codegen/spec-loader.ts:37:11
     35|     raw = readFileSync(sourcePath, 'utf-8');
     36|   } catch (err) {
     37|     throw new CodegenError(
       |           ^
     38|       'SPEC_NOT_FOUND',
     39|       `Component spec not found at ${sourcePath}: ${describeError(err)…
 ❯ src/codegen/__tests__/ts-emitter.test.ts:20:16

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/3]⎯


⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/compile.test.ts > compile() > compiles web target from real specs
Error: ENOENT: no such file or directory, open '/specs/tokens/themes/enterprise.yaml'
 ❯ parseTheme src/parse.ts:14:15
     12| export function parseTheme(specsDir: string, themeName: string): Theme…
     13|   const themePath = resolve(specsDir, 'tokens', 'themes', `${themeName…
     14|   const raw = readFileSync(themePath, 'utf-8');
       |               ^
     15|   const parsed = parseYaml(raw) as ThemeTokens;
     16| 
 ❯ compile src/index.ts:33:18
 ❯ src/compile.test.ts:408:20

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/3]⎯

 FAIL  src/compile.test.ts > compile() > compiles flutter target from real specs
Error: ENOENT: no such file or directory, open '/specs/tokens/themes/enterprise.yaml'
 ❯ parseTheme src/parse.ts:14:15
     12| export function parseTheme(specsDir: string, themeName: string): Theme…
     13|   const themePath = resolve(specsDir, 'tokens', 'themes', `${themeName…
     14|   const raw = readFileSync(themePath, 'utf-8');
       |               ^
     15|   const parsed = parseYaml(raw) as ThemeTokens;
     16| 
 ❯ compile src/index.ts:33:18
 ❯ src/compile.test.ts:415:20

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/3]⎯


 Test Files  2 failed (2)
      Tests  2 failed | 57 passed (59)
   Start at  01:33:50
   Duration  184ms (transform 87ms, setup 0ms, collect 74ms, tests 9ms, environment 0ms, prepare 60ms)

exit=1 duration=2s

# Re-run compiler with full-repo mount (compiler tests use ../specs/ paths)

=== compiler @ Node 22 (full-repo mount) ===
--- npm ci ---
--- npm run build ---

> @kailash/prism-compiler@0.1.0 build
> tsc

--- npm run test:run ---

> @kailash/prism-compiler@0.1.0 test:run
> vitest run


 RUN  v3.2.4 /work/compiler

 ✓ src/codegen/__tests__/ts-emitter.test.ts (14 tests) 7ms
 ✓ src/compile.test.ts (59 tests) 37ms

 Test Files  2 passed (2)
      Tests  73 passed (73)
   Start at  01:34:28
   Duration  250ms (transform 96ms, setup 0ms, collect 159ms, tests 44ms, environment 0ms, prepare 64ms)

exit=0 duration=4s

=== compiler @ Node 24 (full-repo mount) ===
--- npm ci ---
--- npm run build ---

> @kailash/prism-compiler@0.1.0 build
> tsc

--- npm run test:run ---

> @kailash/prism-compiler@0.1.0 test:run
> vitest run


 RUN  v3.2.4 /work/compiler

 ✓ src/codegen/__tests__/ts-emitter.test.ts (14 tests) 5ms
 ✓ src/compile.test.ts (59 tests) 27ms

 Test Files  2 passed (2)
      Tests  73 passed (73)
   Start at  01:34:32
   Duration  182ms (transform 72ms, setup 0ms, collect 124ms, tests 32ms, environment 0ms, prepare 53ms)

exit=0 duration=3s
```
