---
type: DISCOVERY
date: 2026-05-03
created_at: 2026-05-03T07:30:00Z
author: agent
project: prism-0.6.0
topic: M01+M02 implementation surfaces three findings the analysis missed
phase: implement
tags: [implementation, type-safety, lint, pre-existing-failure]
---

# M01 + M02 implementation surfaces 3 findings

Wave 1 (`/implement` shards M01 + M02) ran in parallel worktrees against `main` HEAD `ead56a4`. Both completed cleanly. Three findings emerged that warrant journaling because they update or contradict prior analysis.

## Finding 1 (M01) — `data-table-body.tsx` + `data-table-mobile.tsx` had unguarded `row[col.field]` reads

### What the analysis claimed

`workspaces/prism-0.6.0/01-analysis/02-issue-25-synthetic-columns-surface.md` § "All `row[col.field]` reads (already-safe inventory)" listed every read site as "Already safe — coalesce" or "Already safe — explicit cast + coalesce". It claimed:

> Every read site is *already* synthetic-safe. Relaxing `field: string & keyof T` to `field: string` is a runtime no-op. The change is type-system-only.

### What implementation found

When `field` was relaxed from `string & keyof T` to `string`, TypeScript surfaced 7 latent type errors:

- `data-table-body.tsx:341` — `const value = row[col.field]` was UNGUARDED. The downstream `String(value ?? '')` coalesce protected the *render* but the *value extraction* itself was a typed-only access. Type system was previously narrowing `T[col.field]` because `col.field` was constrained to `keyof T`; relaxing to `string` made `row[col.field]` an unsafe untyped access.
- `data-table-mobile.tsx` — 6 sites across `titleCol` / `subtitleCol` / `detailCols` paths, same shape.

### Why agent-B's sweep missed it

Agent-B classified each site as "already safe" by reading the *surrounding render expression* (which uses `?? ''` coalesce) without checking whether the *value-extraction expression itself* was guarded. The render coalesce was confused for a value-extraction guard. Two distinct safety properties; only one was checked.

### Disposition (M01 same-shard fix per `autonomous-execution.md` Rule 4)

Same bug class as the type relaxation, fits within the shard budget — fixed in M01 commit 1:

- `body.tsx`: inline `(row as Record<string, unknown>)[col.field]` at the value-extraction site
- `mobile.tsx`: lifted `const rowRecord = row as Record<string, unknown>` once per render row, then `rowRecord[col.field]` at all 6 read sites (avoids per-cell cast cost)

These are now genuinely already-safe AND the type system can be relaxed without runtime risk.

### Lesson

Future "type relaxation surface" sweeps should check value-extraction sites separately from rendering sites. A coalesce on the render expression does NOT prove the value-extraction is guarded.

## Finding 2 (M02) — `noUnusedLocals` rejects unused type parameter `T`

### What surfaced

`UseFilterBarStateResult<T, TFilters>` was specified in the plan with `T` as the first type parameter (mirroring `UseFilterBarStateInput<T, TFilters>` for symmetry). But TypeScript strict mode (`noUnusedLocals`/TS6133) rejects unused type parameters in interface declarations.

### Disposition

Added a phantom field `readonly __rowType?: T` to the result interface:

- Always `undefined` at runtime
- Only present in the type signature
- Preserves the `<T, TFilters>` symmetry between input and result
- Documented in the hook's source as load-bearing for the public type signature

### Constraint for M03 + M04

M03 (FilterBar molecule) and M04 (spec authority) MUST NOT remove the `__rowType` phantom. The molecule's `FilterBarProps` doesn't need to reference it; the spec must mention it as part of the public API surface.

## Finding 3 (M02) — pre-existing `eslint` not in `devDependencies`

### What surfaced

`web/package.json` has `"lint": "eslint src/"` but `eslint` is not declared as a devDependency on main (verified at SHA `ead56a4`, predates this session's first tool call per `zero-tolerance.md` Rule 1c). Running `npm run lint` produces `sh: eslint: command not found`.

### Why this isn't fixed in M02

The fix requires editing `web/package.json` — explicitly forbidden by M02's coordination scope (M04 owns version anchors + dependencies). The M02 agent correctly invoked Rule 1c: pre-existence is structurally provable (the gap exists at the session-boundary commit `ead56a4`, before any session work touched the file), so the deferral disposition is legitimate.

### Disposition for M04

M04 MUST fix this in the same release. Two parts:

1. Add `eslint` + the project's TypeScript ESLint plugins to `web/devDependencies`.
2. Run `npm install`; verify `npm run lint -- src/` exits 0; commit the lockfile change.

This is NOT a Rule 1b deferral (no tracking issue, no runtime-safety proof needed) — it's a Rule 1c-grounded same-release fix. The eslint gap MUST land before 0.6.0 publishes.

### Why this matters beyond 0.6.0

Without lint in CI, shipped code may carry unaddressed warnings — the leading indicator that `zero-tolerance.md` Rule 1 specifically calls out. Restoring the lint gate closes a ratchet that's been silently degrading the codebase since whenever the eslint dep was removed.

## Connection to existing rules

- `autonomous-execution.md` Rule 4 — same-shard fix-immediately for M01 type guards (same bug class, within shard budget) ✓ correctly applied
- `zero-tolerance.md` Rule 1c — pre-existence claim grounded in session-boundary SHA for eslint gap ✓ correctly applied
- `agents.md` "Verify Agent Deliverables Exist After Exit" — orchestrator verified file lists + commit counts after each agent returned ✓

## For Discussion

1. **Counterfactual on agent-B's analysis** — should `/analyze`-time sweeps include a "compile against the proposed change" step to surface latent type errors before they hit `/implement`? The cost is one extra agent run with the proposed types applied; the benefit is moving the discovery from a code-shard surface to a planning-shard surface. Worth the trade?
2. **Specific data on the eslint gap** — the gap exists at SHA `ead56a4` and predates session start. How long has it been broken? Should `/codify` add a check that all `web/package.json` scripts have their named tools as declared dependencies?
3. **Phantom field policy** — `__rowType` is the second time we've added a phantom for type-parameter symmetry (the first was DataTableAdapter's TId default). Should the codebase document a phantom-field convention (naming, JSDoc tag) so future readers don't try to "clean up" what looks like dead code?
