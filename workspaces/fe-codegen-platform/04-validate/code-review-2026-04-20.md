# Code Review — 01b1c1d..7b5c686 (6 PRs, kailash-prism)

**Reviewer:** quality-reviewer (Step 3 of /redteam)
**Date:** 2026-04-20
**Scope:** 52 files changed, +5634 / -166 across PRs #11–#16
**Heads:** 01b1c1d (base) → 7b5c686 (HEAD)

## Executive Summary

| Severity | Count |
| -------- | ----- |
| CRIT     | 0     |
| HIGH     | 3     |
| MEDIUM   | 6     |
| LOW      | 7     |
| INFO     | 4     |

Status: **Issues Found — not blocking merge (they are already merged), but two HIGH items are follow-up-blockers before the next release tag.**

The six merged PRs are collectively coherent and the engineering quality is high: consistent file-header convention, consistent JSDoc style, uniform `import ... from './X.js'` ESM-with-explicit-suffix pattern, consistent `export { X, type Y }` barrel shape, and no TODO/FIXME/HACK markers anywhere in the new production code. The Tier 2 wiring tests (PR #15) correctly exercise real adapters through the engine barrel, exactly what `rules/orphan-detection.md` Rule 2 asks for. `.claude/rules/independence.md`, `rules/security.md`, and `rules/zero-tolerance.md` Rule 2/6 all spot-check clean across the new engine code.

The three HIGH findings are all about **consistency drift between PR #14 (new Layout engine) and the pre-existing `engines/layout.tsx` legacy file** — the current state has two parallel Layout surfaces that publicly shadow each other, and the aliasing workaround is a code smell that points to an unfinished consolidation.

## Convergence Blockers (CRIT + HIGH)

None are CRIT (compile-green, tests wired, CHANGELOG present, versions consistent within web/package.json). The three HIGH items below MUST be resolved before the next release tag:

1. **HIGH-1** — Legacy `web/src/engines/layout.tsx` is still imported by every template (`dashboard-template.tsx`, `detail-template.tsx`, `conversation-template.tsx`, etc.) — the new `engines/layout/` engine has no production consumer inside the framework. Per `rules/orphan-detection.md` MUST Rule 1 this is a facade-without-production-call-site pattern. **Disposition needed: either wire the new engine into the templates, OR delete the new engine's top-level `Layout*` re-exports until a template consumes it.**
2. **HIGH-2** — Top-level barrel alias `LayoutStack` / `LayoutRow` / `LayoutGrid` / `LayoutSplit` / `LayoutLayer` / `LayoutScroll` collides with the legacy `VStack` / `Row` / `Grid` / `Split` / `Layer` / `Scroll` exports. The "two parallel APIs with `Layout*` prefix on one" is an interim shim, not a durable shape. Consumers reading the barrel see two `Row`, two `Grid`, two `Split` — unambiguous to TypeScript, confusing to humans.
3. **HIGH-3** — `specs/components/data-table.yaml` still reports `version: "0.3.0"` despite 0.4.0-level API changes (TId generics, `globalSearchValue`, `onGlobalSearchChange`, `defaultSortComparator` export). The 0.2.2 CHANGELOG established the precedent that the YAML spec version tracks the engine version. PR #13's codegen pipeline reads this version into the generated header — downstream artifact will claim 0.3.0 while the code is 0.4.0.

## Critical Issues (CRIT)

_None._

## High-Severity Issues

### HIGH-1 — New Layout engine has zero production consumers

**File:** `web/src/engines/layout/{stack,row,grid,split,layer,scroll}.tsx` (PR #14)
**Rule:** `.claude/rules/orphan-detection.md` MUST Rule 1 + `.claude/rules/facade-manager-detection.md`

The new engine is re-exported from `web/src/index.ts` with `Layout*` prefixes, but the only importers of the new primitives are the tests (`layout/__tests__/*.test.tsx`). The 11 templates that need layout primitives (`dashboard-template.tsx`, `detail-template.tsx`, `form-template.tsx`, etc.) all still import from the LEGACY `../engines/layout.js`:

```bash
$ grep -rn "from '../engines/layout" web/src/templates/
web/src/templates/dashboard-template.tsx:9:import { useLayout, VStack, Grid, Split } from '../engines/layout.js';
web/src/templates/detail-template.tsx:9:import { useLayout, VStack, Split } from '../engines/layout.js';
web/src/templates/form-template.tsx:9:import { useLayout, VStack, Split } from '../engines/layout.js';
... (11 more)
```

This is the exact orphan shape rule §1 blocks: a 1,000+-line public surface that no framework-internal consumer invokes. Per the rule's own disposition matrix: wire it OR delete it — don't ship both.

**Why it matters:** Downstream consumers reading the barrel will see both `VStack` (legacy) and `LayoutStack` (new) — they will read the 0.4.0 CHANGELOG, reach for `LayoutStack`, and build pages on an un-dogfooded API. The next refactor that touches templates will still hit the legacy file first (because that's where the prod code is) and the new engine will continue to drift from what templates actually need.

**Fix:** Pick one of:
1. **Migrate** — replace legacy imports in templates with the new engine's primitives, delete `engines/layout.tsx`. Large change; but it resolves HIGH-1, HIGH-2, and MED-1 in one commit.
2. **Gate** — remove the `Layout*`-prefixed re-exports from `web/src/index.ts` (the sub-path import `@kailash/prism-web/engines/layout` still works). Smallest change; keeps the new engine alive without advertising a confusable public surface.

### HIGH-2 — `Layout*` aliasing is an interim shim, not a durable shape

**File:** `web/src/index.ts:77–103`
**Rule:** `.claude/rules/independence.md` (design for SDK users) + CHANGELOG claims under Unreleased

The CHANGELOG correctly acknowledges (lines 142–148) that `Layout*`-prefixing is a stop-gap to coexist with the legacy exports. But the stop-gap is now shipped behind a `Layout*` prefix that will be harder to remove in a v1.0 because downstream consumers will pin to `LayoutStack`.

Evidence the prefix is load-bearing rather than intentional:

- The prefix is applied to **14 type aliases** in addition to 6 components — `LayoutStackProps`, `LayoutRowProps`, `LayoutGridProps`, `LayoutSplitProps`, `LayoutLayerProps`, `LayoutScrollProps`, `LayoutSpacingToken`, `LayoutResponsiveColumns`, `LayoutStackDirection`, `LayoutStackAlign`, `LayoutStackJustify`, `LayoutSplitDirection`, `LayoutLayerTier`, `LayoutLayerPosition`, `LayoutScrollDirection`.
- Every prefixed type name collides with its non-prefixed counterpart in the legacy surface. Consumers now need to remember whether their code path imports the legacy `Row` or the new `LayoutRow`, plus the 14 sibling types.
- The LayoutProvider / useLayout / useResponsive / Zone / Breakpoint hooks (legacy `engines/layout.tsx`) are NOT available on the new engine — which means the new engine is STRICTLY a subset of the legacy engine's surface. There is nothing the new engine does that the old engine does not already cover (except nicer token discipline and CSS-only responsive grids).

**Why it matters:** Two public APIs for the same nine layout primitives is the exact "rent-seeking API surface" anti-pattern `rules/independence.md` warns against. A v1.0 cleanup will require either breaking `LayoutStack` consumers or breaking `VStack` consumers.

**Fix:** Same two-option disposition as HIGH-1. If option (2) — remove the `Layout*`-prefixed exports from the top-level `index.ts` and require sub-path imports for the new engine. The CHANGELOG "Unreleased" section should then make the sub-path discipline explicit: "New engine is reachable only via `@kailash/prism-web/engines/layout`; top-level barrel retains the legacy surface until migration completes."

### HIGH-3 — `data-table.yaml` spec version stale at 0.3.0

**File:** `specs/components/data-table.yaml:5`
**Rule:** `.claude/rules/specs-authority.md` MUST Rule 5 (spec files updated at first instance) + 0.2.2 precedent.

The engine shipped 0.4.0 changes (TId generics, controlled globalSearch, `defaultSortComparator` public export), but:

```yaml
# specs/components/data-table.yaml:5
version: "0.3.0"
```

The 0.2.2 CHANGELOG D-11 entry (web/CHANGELOG.md:372) explicitly says `data-table.yaml bumped to 0.2.2 — changelog entry + new prop`. That precedent was not followed in 0.4.0.

PR #13's codegen emitter reads `spec.version` and emits it into the generated file's header:

```typescript
// compiler/src/codegen/ts-emitter.ts:72
 * @spec        ${spec.name} v${spec.version}
```

So the regenerated `compiler/generated/data-table-adapter-spec.ts` will claim `@spec DataTable v0.3.0` forever — an immediately-wrong provenance stamp.

Only the PR #16 diff touched the file (line 306, `serverDataSource_deprecation` prose edit) — the version field was not bumped.

**Fix:** Bump `specs/components/data-table.yaml` version to `0.4.0` and add a changelog entry:

```yaml
changelog:
  - version: "0.4.0"
    date: "2026-04-20"
    changes:
      - "FEAT: TId generic propagates to rowAction.onExecute / bulkAction.onExecute / onRowClick callback surfaces."
      - "FEAT: Controlled global-search via globalSearchValue + onGlobalSearchChange."
      - "FEAT: defaultSortComparator exported for custom virtualised layouts."
```

Then regenerate `compiler/generated/data-table-adapter-spec.ts`.

## Medium-Severity Issues

### MED-1 — `engines/layout.tsx` is pure legacy; follow-up deletion not tracked

**File:** `web/src/engines/layout.tsx` (not touched by any of the 6 PRs)
**Rule:** `rules/orphan-detection.md` Rule 3 (removed = deleted, not deprecated)

Related to HIGH-1, but specifically: if the migration per HIGH-1 option (1) completes, the legacy file MUST be deleted — not deprecated, not kept "for backwards compat." There is currently no workspace todo, no codify proposal, no issue tracking the delete. Recommend: create a tracking issue in the same session as the HIGH-1 disposition.

### MED-2 — `compiler/package.json` version bumped but no CHANGELOG file exists

**File:** `compiler/package.json:3` (`"version": "0.1.0"`), missing `compiler/CHANGELOG.md`

PR #13 introduced a codegen PoC into `@kailash/prism-compiler` (7 source files + tests + generated output). The package.json still says 0.1.0, but three new entry points were added (`prism-codegen` binary, `src/codegen/cli.ts`, `src/codegen/spec-loader.ts`, `src/codegen/ts-emitter.ts`, `src/codegen/types.ts`). A 0.1.0 published in the old shape and this 0.1.0 would be misleading. Recommend: bump to 0.2.0 AND add `compiler/CHANGELOG.md` to match `web/CHANGELOG.md` discipline. Not a zero-tolerance Rule 5 blocker today because the compiler is not yet published (no GitHub Release workflow for it), but a release-prep blocker.

### MED-3 — `data-table-root.tsx` is 612 lines — exceeds the 200 LOC per-component rule

**File:** `web/src/engines/data-table/data-table-root.tsx:612`
**Rule:** `.claude/CLAUDE.md` § TypeScript (web/, compiler/) — "Maximum 200 lines per component file"

Other over-limit offenders (same rule, same directory):

| File                                              | LOC | Limit | Over-by |
| ------------------------------------------------- | --: | ----: | ------: |
| `engines/data-table/use-data-table.ts`            | 700 |   200 |    500  |
| `engines/data-table/data-table-root.tsx`          | 612 |   200 |    412  |
| `engines/data-table/types.ts`                     | 511 |   200 |    311  |
| `engines/data-table/data-table-body.tsx`          | 502 |   200 |    302  |
| `engines/data-table/data-table-header.tsx`        | 234 |   200 |     34  |
| `engines/data-table/data-table-mobile.tsx`        | 202 |   200 |      2  |

The rule is a soft ceiling for component files; `types.ts` and `use-data-table.ts` are hooks/types and less load-bearing on the cyclomatic-complexity axis. But `data-table-root.tsx` at 612 LOC and `data-table-body.tsx` at 502 LOC are genuinely over-budget components — both shot past the limit in earlier PRs but PR #16 added ~80 more LOC to each and PR #14 had the opportunity to split during the layout refactor and did not. Recommend: extract the `display="card-grid"` branch into a `data-table-card-grid-view.tsx` sub-component (split from `data-table-root.tsx` lines ~217–265), and extract `RowActionsCell` + `VirtualBody` out of `data-table-body.tsx`.

### MED-4 — `reactUseState` aliasing in 0.4.0 test is an avoidable smell

**File:** `web/src/engines/data-table-0.4.0.test.tsx:12`

```typescript
import { useState as reactUseState } from 'react';
```

Aliasing `useState` has no visible purpose in the test — there's no name collision with vitest's `useState`. Either the test originally had a name collision that is now resolved, or the author worked around an import-order issue. Either way, the alias is now unneeded; inline to plain `useState`. LOW-severity maintenance smell.

### MED-5 — CLI `console.log` justification relies on a rule that doesn't exist as cited

**File:** `compiler/src/codegen/cli.ts:59–63`

```typescript
// Using console.log here is intentional: this is a CLI binary whose
// output is the UI the user sees. The observability rule prohibiting
// `console.log` applies to production library / agent code; CLI
// output is the equivalent of a UX surface.
// eslint-disable-next-line no-console
```

The decision is **correct** — a CLI binary's stdout IS the user surface. However, `.claude/rules/observability.md` Rule 1 literally says "`print()`, `console.log()`, `eprintln!`, `puts` are BLOCKED in production code." The rule has no CLI carve-out. Two fixes are acceptable:

1. Update `rules/observability.md` Rule 1 to add an explicit "CLI stdout is a user-surface; the rule applies to library / agent / server code only" carve-out.
2. Keep the inline comment, but cite the specific rule version and the rationale — e.g. "`rules/observability.md` Rule 1 rationale (`print is unstructured`) does not apply because stdout IS the structured UX contract of a CLI." Today's comment is close to this but doesn't invoke the rule text directly.

Either approach closes the drift. Prefer (1) because the same justification applies to `compiler/src/scaffold-cli.ts` and `compiler/src/cli.ts` already in the repo.

### MED-6 — `DataTableRowAction.href` / `onExecute` "exactly one" invariant is not enforced

**File:** `web/src/engines/data-table/types.ts:214–235`

JSDoc says: `onExecute and href are mutually exclusive — href renders an anchor, onExecute renders a button. Exactly one MUST be defined.` But the type signature does not enforce it:

```typescript
readonly href?: (row: T, id: TId) => string;
readonly onExecute?: (row: T, id: TId) => void | Promise<void>;
```

Both fields are individually optional, so `{ id, label }` with neither defined type-checks. A discriminated union would enforce the contract at compile time:

```typescript
type DataTableRowAction<T, TId> = DataTableRowActionBase<T> &
  ({ href: (row: T, id: TId) => string; onExecute?: never }
  | { onExecute: (row: T, id: TId) => void | Promise<void>; href?: never });
```

Not a regression from the 6 PRs (same shape since 0.2.2) but worth calling out now that `TId` plumbing touched this line.

## Low-Severity Issues

### LOW-1 — `VirtualBody` ignores `expandable` / expand state

**File:** `web/src/engines/data-table/data-table-body.tsx:140–229`

The virtual scrolling body doesn't pass `expandable`, `expandedIds`, `onToggleExpand`, or `expandContent` — users who combine `virtualScroll={true}` with `expandable={true}` will see checkboxes but no expand chevrons and no expanded rows. Document limitation or wire through.

### LOW-2 — `getTypedRowId` fallback cast is a silent type lie when `TId ≠ string`

**File:** `web/src/engines/data-table/use-data-table.ts:258–271`

```typescript
return getRowId(row, index) as unknown as TId;
```

When no adapter is wired AND the consumer declared `TId = number`, this returns a `string` cast as `number`. A consumer's `onRowClick(row, id: number) => {}` receives a string at runtime and `typeof id === "number"` is false. Either:

1. Narrow the return type constraint: require adapter when `TId ≠ string`.
2. Only cast when `config.getRowId` is also missing; prefer `config.getRowId`'s return over `row['id']` stringification.

CHANGELOG 0.4.0 acknowledges the stringification for `selectedIds` — this is a different path (callback surface).

### LOW-3 — `Layer` "position: fixed" will break inside `transform`-parent stacking contexts

**File:** `web/src/engines/layout/layer.tsx:80`

`position: 'fixed'` is anchored to the viewport by default, but a parent element with `transform: translate(...)` (CardGrid footer slots, Scroll containers) changes what `fixed` is relative to. If a future template uses Scroll's WebKit-transform scrollbar around a Layer, the Layer will dock to the Scroll's bounding box, not the viewport. JSDoc mentions "viewport-fixed anchoring" as the default — but doesn't mention this hazard. Add a doc note.

### LOW-4 — `Split`'s `second = kids[kids.length - 1 > 0 ? kids.length - 1 : 0]` is an unreachable expression

**File:** `web/src/engines/layout/split.tsx:125`

```typescript
const second = kids[kids.length - 1 > 0 ? kids.length - 1 : 0];
```

When `kids.length === 0`: `kids[0]` is `undefined` anyway.
When `kids.length === 1`: `kids[0]`.
When `kids.length > 1`: `kids[kids.length - 1]`.

The ternary's false branch (`kids[0]`) is reached for length=1, but line 186 gates the second panel render on `kids.length > 1`. So the expression simplifies to `kids[kids.length - 1]` for the rendering path. Simplify to `kids[kids.length - 1]` and let the `kids.length > 1` guard do its work.

### LOW-5 — `defaultSortComparator` Number-coercion surprise on strings that happen to parse

**File:** `web/src/engines/data-table/use-data-table.ts:692`

`Number('1e99')` is `1e99`, not NaN. A column of stringified codes like `'1e99'` that happens to parse as a number will sort numerically instead of alphabetically. Acceptable behavior; worth a JSDoc line.

### LOW-6 — `Grid` `useId()` replace is a workaround for an SSR issue

**File:** `web/src/engines/layout/grid.tsx:39`

```typescript
const instanceId = useId().replace(/[:]/g, '-');
```

`useId()` returns `:r0:` on React 18+ client and `_R_0_` on server. The colon-strip avoids querying an invalid attribute selector (`data-prism-grid=":r0:"`). Works, but consider using `.replace(/:/g, '')` for readability — the escape on `[:]` is unnecessary. Same pattern in `scroll.tsx:60`.

### LOW-7 — GitHub release workflow extracts CHANGELOG notes without failing loud on missing section

**File:** `.github/workflows/release-web.yml:83–86`

The awk-based extraction falls back to a generic body when no matching CHANGELOG section is found. The fallback is printed to stderr (`echo "No matching CHANGELOG section..." >&2`) but the workflow still succeeds with the generic body. For a release pipeline, a missing CHANGELOG entry should FAIL loud, not degrade silently — otherwise the scenario where someone forgets to update CHANGELOG ships a GitHub Release with a generic body and nobody notices until a user reports it. Consider failing the job if `${notes_file}` is empty before applying the fallback.

## Informational

### INFO-1 — 0.4.0 test file lives in an unusual location

**File:** `web/src/engines/data-table-0.4.0.test.tsx` (versioned test)

Placing a per-version test file at the top of `engines/` breaks the pattern where tests live alongside their target (`data-table/data-table.test.tsx`). Works today; downstream `/redteam` greps for `data-table/*.test.tsx` will miss it. Recommend: rename to `data-table/data-table-0.4.0.test.tsx` or fold the tests into the existing suite.

### INFO-2 — Wiring tests use relative `../index.js`, not `@kailash/prism-web`

**File:** all four `*.wiring.test.tsx` files

`rules/orphan-detection.md` Rule 2 (frontend-adapted in this repo's variant of the rule) says imports MUST be "through the framework facade (`db.trust_executor`, not `from dataflow.trust import TrustAwareQueryExecutor`)." In a monorepo with self-imports, `../index.js` IS the engine barrel — so this is fine. But a stricter interpretation would import from `@kailash/prism-web/engines/data-table` to prove the published-package path works too. Not a blocker; worth considering for a future strengthening of the wiring-test contract.

### INFO-3 — 14 test files (layout primitives) exceed the "one test file per engine" idiom

**Directory:** `web/src/engines/layout/__tests__/`

PR #14 adds 7 test files (`stack.test.tsx`, `row.test.tsx`, `grid.test.tsx`, `split.test.tsx`, `layer.test.tsx`, `scroll.test.tsx`, `layout-engine.wiring.test.tsx`). This is good test hygiene and matches the per-primitive convention. But note: the corresponding DataTable engine tests live in `engines/data-table-*.test.tsx` at the parent directory level (PR #15 added `__tests__/data-table-engine.wiring.test.tsx` inside the engine). Two conventions are active. Pick one — recommendation: all tests live in `engines/<engine>/__tests__/` to match PRs #14 and #15.

### INFO-4 — `useLayoutMaybe` is exported from the legacy engine but not re-exported at the top level

**File:** `web/src/engines/layout.tsx:533` (legacy) + `web/src/index.ts:48–70`

The legacy `engines/layout.tsx` exports `useLayoutMaybe` for optional-provider consumers (`conversation-template.tsx` imports it at line 16). It is NOT re-exported from `web/src/index.ts`. Downstream consumers who want the "maybe" hook must deep-import. If the legacy engine is kept (option 2 of HIGH-1), add `useLayoutMaybe` to the top-level export.

## Code Example Validation

No runnable doc code blocks were introduced in the 6 PRs (CHANGELOG entries are prose; `docs/guides/codegen-architecture.md` was read but not exercised against the emitter). Validation skipped — N/A for this review.

## Rules-Compliance Spot Check

| Rule                                                    | Status  | Notes                                                                                         |
| ------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------- |
| `rules/independence.md` — no commercial refs            | ✓ clean | 0 matches for proprietary names in new code                                                   |
| `rules/security.md` — no hardcoded secrets              | ✓ clean |                                                                                               |
| `rules/zero-tolerance.md` Rule 2 — no TODO/FIXME/HACK   | ✓ clean | 0 matches in new engine / compiler source                                                     |
| `rules/zero-tolerance.md` Rule 3 — no silent fallbacks  | ✓ clean | `use-data-table.ts:312–323` catches `fetchPage` rejection and populates `serverError` — loud. |
| `rules/zero-tolerance.md` Rule 5 — version consistency  | ✓       | `web/package.json` = 0.4.0, CHANGELOG has 0.4.0 section, peer-deps unchanged                  |
| `rules/terrene-naming.md` — Foundation / license        | ✓       | `Apache-2.0` in all new package.json files; "Terrene Foundation" author field                 |
| `rules/orphan-detection.md` Rule 1 — facade call sites  | ✗ HIGH-1 | New Layout engine has zero production consumers                                               |
| `rules/orphan-detection.md` Rule 2 — Tier 2 tests       | ✓       | PR #15 adds wiring tests for DataTable / Form / AI-Chat; PR #14 for Layout                    |
| `rules/observability.md` Rule 1 — no console.log        | ⚠ MED-5  | CLI carve-out is correct but not in the rule text                                             |
| `rules/specs-authority.md` Rule 5 — first-instance update | ✗ HIGH-3 | `data-table.yaml` version not bumped                                                        |

## What's Working Well

- File header convention (multiline `/** ... */` JSDoc with Spec + Rule refs) is consistent across ALL new files. PR #13's codegen files, PR #14's layout primitives, and PR #15's wiring tests all share the same header shape.
- TypeScript import style is uniform: `import { X, type Y } from './Z.js'` with explicit `.js` suffix matching the `"type": "module"` + `exports` field. No `.ts` / extension-less imports.
- Barrel export style is uniform: `export { X, type Y } from './z.js'` — no `export *`, no default exports, no `export type { X }` / `export { X }` split (matches the pattern already in `engines/data-table/index.ts`).
- `rules/facade-manager-detection.md` Rule 2 (`*-engine.wiring.test.*` naming) is respected across all 4 new wiring tests.
- 0 TODO/FIXME/HACK/XXX markers across all changed files.
- 0 `vi.fn()` standing in for engine methods in wiring tests (all use real in-memory adapters, matching `rules/orphan-detection.md` 2a crypto-pair discipline generalized to adapter pairs).
- `sanitizeHref()` is still the single scheme-allowlist gate (extracted in 0.2.2, unchanged here) — well-maintained single-point defense.

## Recommended Follow-Up Actions (in order)

1. Create a follow-up workspace item tracking disposition of HIGH-1 / HIGH-2 (migrate templates vs gate new engine to sub-path).
2. Bump `specs/components/data-table.yaml` to `0.4.0` + regen `compiler/generated/data-table-adapter-spec.ts` (HIGH-3). Single-commit fix.
3. Bump `compiler/package.json` to `0.2.0` + add `compiler/CHANGELOG.md` (MED-2).
4. Update `rules/observability.md` Rule 1 to add the CLI carve-out that MED-5 documents.
5. Schedule a "size discipline" follow-up to split `data-table-root.tsx` and `data-table-body.tsx` (MED-3).
