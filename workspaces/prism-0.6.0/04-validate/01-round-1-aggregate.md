---
type: redteam-aggregate
round: 1
phase: redteam
date: 2026-05-08
project: prism-0.6.0
release: 0.6.0
input_main_sha: 78add91 (release(prism-web): v0.6.0 — FilterBar + ColumnDef.field relaxation, PR #30)
verdict: CONVERGED on 0 CRIT / 0 HIGH; 6 MED + 7 LOW for fix-or-defer triage
---

# Round 1 — Aggregate (M01–M04 release surface)

## Verdict line

**CONVERGED on convergence-blocker criteria** — 0 CRITICAL, 0 HIGH across all 3 adversarial agents (security-reviewer, reviewer, value-auditor) plus the orchestrator's own mechanical sweep (`.spec-coverage-v2.md`, 30 assertions).

The release shipped honestly: code is real, tested, type-safe, lint-clean, build-clean, audit-clean. Findings cluster in three secondary layers: type-system pedantry, narrative coherence in spec/CHANGELOG, and label/citation hygiene.

## Source agent reports

- **02-round-1-security.md** — `security-reviewer` agent — `CONVERGED (0 CRIT, 0 HIGH, 2 MED, 6 LOW polish)` — 9 mechanical sweeps over 8 source files
- **03-round-1-code-review.md** — `reviewer` agent — `CONVERGED (0 CRIT, 0 HIGH, 1 MED, 3 LOW)` — 9 mechanical sweeps + 10/10 spec-implementation parity table + barrel runtime checks
- **04-round-1-value-audit.md** — `value-auditor` agent — `CONVERGED (0 CRIT, 0 HIGH, 4 MED, 4 LOW)` — 12 mechanical sweeps from a buyer-side perspective

## Mechanical sweeps owned by orchestrator

| Source                                                                                                            | Result                                                 |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `.spec-coverage-v2.md` (30 assertions across M01–M04 + build/test/lint gates + log triage + brief-vs-deliverable) | 30/30 ✅                                               |
| `npx vitest run`                                                                                                  | 30 files / 435 tests passed                            |
| `npx tsc --noEmit`                                                                                                | exit 0                                                 |
| `npm run lint` (ESLint 9.x with @typescript-eslint)                                                               | exit 0                                                 |
| `npm run build`                                                                                                   | exit 0                                                 |
| `npm audit`                                                                                                       | 0 vulnerabilities                                      |
| Log triage (vitest, build, npm-ls, \*.log files)                                                                  | 0 unique WARN+ entries (per `observability.md` MUST 5) |

## Deduplicated findings

### CRITICAL

_None._

### HIGH

_None._

### MEDIUM (6 distinct, after dedup)

| ID                               | Class               | Source                                    | Location                                                                                                                        | One-line                                                                                                                                                                                                                                                                                                        | Disposition                                                                                                                                                       |
| -------------------------------- | ------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MED-1 (RT-PHANTOM)**           | type/runtime drift  | security M-1 + value V-M-2 (same finding) | `web/src/molecules/filter-bar/use-filter-bar-state.ts:96-98` (decl) vs `:191-197` (return)                                      | Type promises `readonly __rowType?: T`; runtime literal omits the key entirely. `("__rowType" in result) === false`.                                                                                                                                                                                            | Fix this round — drop the phantom field. T binding is preserved by the function generic signature alone; the runtime/type-level disagreement is not load-bearing. |
| **MED-2 (SEARCHPLACEHOLDER)**    | UX null-handling    | security M-2                              | `web/src/molecules/filter-bar/filter-bar.tsx:290` (`const ariaLabel = placeholder ?? "Search";`)                                | `??` only falls back on `null`/`undefined`; consumers passing `searchPlaceholder=""` get an empty `aria-label`.                                                                                                                                                                                                 | Fix this round — change to `(placeholder?.trim() \|\| "Search")`.                                                                                                 |
| **MED-3 (STALE-CAST)**           | type contract drift | reviewer M-1                              | `web/src/engines/data-table/data-table-root.tsx:613` (`col.render(value as T[keyof T] \| undefined, row)`)                      | The 0.6.0 release widened `render` to accept `unknown`; this single call site re-narrows via `as T[keyof T] \| undefined`, contradicting the migration narrative.                                                                                                                                               | Fix this round — drop the cast, mirror `data-table-body.tsx:389`'s call shape.                                                                                    |
| **MED-4 (PHANTOM-TOKENS)**       | spec accuracy       | value V-M-1                               | `specs/components/filter-bar.yaml:154-169` lists 14 `filter-bar.*` tokens not in code                                           | `grep -rn "filter-bar\." web/src/ compiler/` returns matches only inside the spec itself. The molecule consumes generic `--prism-*` tokens. Per `spec-accuracy.md` Rule 1 (every citation resolves against working code), this is a HIGH-by-rule but MED-by-impact (theme-author confusion, not user-blocking). | Fix this round — rewrite `tokens.consumes` to the actual `--prism-*` tokens consumed by `filter-bar.tsx`.                                                         |
| **MED-5 (BLOCKING-1-COLLISION)** | label hygiene       | value V-M-3                               | `01-analysis/03-third-gap-investigation.md` lines 16/53/61, `02-plans/01-prism-0.6.0-design.md:152`, `web/CHANGELOG.md:61, 337` | Same label `BLOCKING-1` refers to "ServerDataSource never invoked" AND "Form custom field render escape hatch" depending on which row a reader sees. Cross-workspace traceability breaks on `grep BLOCKING-1`.                                                                                                  | Fix this round — rename to fully-qualified `M02-BLOCKING-1` (ServerDataSource) and `M01-BLOCKING-1` (Form custom-field render).                                   |
| **MED-6 (LOC-PROSPECTIVE)**      | narrative coherence | value V-M-4                               | `web/CHANGELOG.md:12` ("replaces ~120 LOC of consumer boilerplate per route")                                                   | Headline is present-tense; spec admits realisation is post-`M05-arbor-migration-followup.md`. Future-tense reality buried in a parenthetical at `docs/specs/05m-0.6.0-additions.md:71`.                                                                                                                         | Fix this round — reword headline as "expected to replace" with explicit "(realised post-arbor-wave-6)" qualifier.                                                 |

### LOW (7 distinct)

| ID                                | Class                  | Source       | Disposition                                                                                                                                                                                                                                |
| --------------------------------- | ---------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **LOW-1 (CHANGELOG-LANDING)**     | narrative accuracy     | reviewer L-1 | Fix this round — CHANGELOG says "appended to `05-engine-specifications.md`"; actual landing was sibling file `05m-0.6.0-additions.md`. 1-line edit.                                                                                        |
| **LOW-2 (MEMO-IDENTITY)**         | doc'd trade-off        | reviewer L-2 | Defer — `useFilterBarState` filters memo recomputes on inline-literal `initial`. Already documented in source as accepted trade-off. Not a defect.                                                                                         |
| **LOW-3 (NO-UNCHECKED-INDEX)**    | forward-compat defense | reviewer L-3 | Defer — `noUncheckedIndexedAccess` flag not enabled in tsconfig; the defensive guard at `use-filter-bar-state.ts:176-178` is dead under current strictness but correct for a future strictness flip. Not a regression.                     |
| **LOW-4 (VAPOURWARE-CLAIM)**      | citation accuracy      | value V-L-1  | Fix this round — the spec says `DataTableAdapter.filterDimensions` was "declared in the type"; actually it's only mentioned in JSDoc, not declared as a property. 1-line edit.                                                             |
| **LOW-5 (STORYBOOK-OVERCLAIM)**   | narrative accuracy     | value V-L-2  | Fix this round — CHANGELOG says "Storybook stories"; no Storybook runner is installed. Reword to "Storybook-compatible scenario exports (runner pending)". 1-line edit.                                                                    |
| **LOW-6 (TOKEN-NAMESPACE-DRIFT)** | story consistency      | value V-L-3  | Fix this round — 3 story files use 3 different token-prefix conventions (`--prism-*` with fallback, `--color-*` no fallback, `--color-*` with fallback). Normalise all stories to the `filter-bar.tsx` convention. ~10 LOC across 2 files. |
| **LOW-7 (CHANGELOG-LINE-COUNT)**  | temporal staleness     | value V-L-4  | Defer — CHANGELOG cites "2200-line `05-engine-specifications.md`" but commit `e8cc809` (post-0.6.0) split it into 13 sub-files. Historical record; correct at time of authoring.                                                           |

## Cross-cutting observations

1. **Spec drift is the dominant failure pattern.** 4 of 6 MEDs and 4 of 7 LOWs are spec/CHANGELOG accuracy issues — phantom tokens, prospective claims, label collisions, line-count staleness, runner overclaims, vapourware-citation drift. The CODE is clean; the secondary-artefact layer is what surfaces findings. This is a recurring pattern across COC sessions and supports `rules/spec-accuracy.md` Rule 1's "every citation MUST resolve" stance.

2. **`__rowType` is flagged by two independent agents** (security M-1 + value V-M-2). When two adversarial perspectives converge on the same finding from different angles, severity is reinforced — fix this round.

3. **No security risk, no runtime regression, no test coverage gap.** All three "would-be-blocking" axes are clean. The release is structurally sound; the polish surface is where Round 2's fix-immediately discipline applies.

4. **Same-shard fix-immediately budget check.** Total fix-cost: ~40 LOC across 8 files. Well within `autonomous-execution.md` MUST 1 (≤500 LOC load-bearing, ≤5–10 invariants, ≤3–4 call-graph hops). Rule 4 (same-bug-class same-shard fix) directs the fix-this-round disposition rather than file-follow-up. BLOCKED rationalization "follow-up issue is cleaner" explicitly named.

## Fix plan (Round 1 → fix-immediately)

In-shard fixes for Round 2 to verify against:

1. **MED-1 (RT-PHANTOM)** — drop `readonly __rowType?: T` from `UseFilterBarStateResult` declaration + JSDoc comment block (~5 LOC delete).
2. **MED-2 (SEARCHPLACEHOLDER)** — change `placeholder ?? "Search"` → `(placeholder?.trim() || "Search")` (~1 LOC).
3. **MED-3 (STALE-CAST)** — drop `as T[keyof T] | undefined` cast in `data-table-root.tsx:613` (3 chars).
4. **MED-4 (PHANTOM-TOKENS)** — rewrite `specs/components/filter-bar.yaml::tokens.consumes` from 14 phantom `filter-bar.*` entries to the actual `--prism-*` tokens consumed by `filter-bar.tsx` (verified via `grep var(-- web/src/molecules/filter-bar/filter-bar.tsx`).
5. **MED-5 (BLOCKING-1-COLLISION)** — rename `BLOCKING-1` to `M01-BLOCKING-1` (Form) and `M02-BLOCKING-1` (DataTable/ServerDataSource) across 4 files (1 line each = 6 edits total).
6. **MED-6 (LOC-PROSPECTIVE)** — reword `web/CHANGELOG.md:12` headline to "expected to replace ~120 LOC … (realised once arbor wave-6 ships)".
7. **LOW-1 (CHANGELOG-LANDING)** — fix CHANGELOG sentence to reference companion file `05m-0.6.0-additions.md` (1 line).
8. **LOW-4 (VAPOURWARE-CLAIM)** — reword spec line to "mentioned in `DataTableAdapter` JSDoc as reserved for 0.4.0; not yet declared as a property" (1 line).
9. **LOW-5 (STORYBOOK-OVERCLAIM)** — reword CHANGELOG to "Storybook-compatible scenario exports (runner pending)" (1 line).
10. **LOW-6 (TOKEN-NAMESPACE-DRIFT)** — normalise `data-table-synthetic-column.stories.tsx` and `filter-bar-with-data-table.stories.tsx` to `--prism-*` with fallback chain matching `filter-bar.tsx` (~10 LOC across 2 files).

## Deferred (with rationale)

- **LOW-2** — documented trade-off in source (line 156-159 of `use-filter-bar-state.ts`); not a defect.
- **LOW-3** — forward-compatible defense for a TS strictness flag not currently enabled. Becomes load-bearing only the day `noUncheckedIndexedAccess: true` flips on.
- **LOW-7** — temporal staleness; CHANGELOG was correct at time of authoring. Historical records are not retro-edited per `spec-accuracy.md` Rule 6 (past-tense change logs are append-only).

## What Round 2 verifies

Round 2 re-runs the same mechanical sweeps + 3 parallel agents against the post-fix state. Convergence requires Round 2 to surface **no new findings** (same set as Round 1, or fewer). A 3rd round confirms 2 consecutive clean rounds.

## Cross-references

- Brief: `workspaces/prism-0.6.0/briefs/0001-prism-0.6.0-design-cycle.md`
- Plan: `workspaces/prism-0.6.0/02-plans/01-prism-0.6.0-design.md`
- Implementation journals: `workspaces/prism-0.6.0/journal/0004-DISCOVERY-implementation-surfaces-latent-type-guards-and-eslint-gap.md`, `0005-DECISION-implement-cycle-complete-pending-npm-publish.md`
- Released PRs: #27 (M01 ColumnDef relaxation), #28 (M02 hook), #29 (M03 molecule), #30 (M04 release-merge, commit `78add91`)
- Spec coverage table: `workspaces/prism-0.6.0/.spec-coverage-v2.md`
