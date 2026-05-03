---
type: milestone-launch-plan
release: 0.6.0
status: pending /implement
---

# Prism 0.6.0 — Implementation Launch Plan

## Shard order (dependency-driven)

```
Wave 1 (parallel, isolated worktrees):
  Shard 1 (M01) — ColumnDef relaxation         → web/src/engines/data-table/
  Shard 2 (M02) — useFilterBarState hook       → web/src/molecules/filter-bar/

Wave 2 (sequential, after Wave 1 merges):
  Shard 3 (M03) — FilterBar molecule           → web/src/molecules/filter-bar/  (depends on M02 types)

Wave 3 (sequential, after Wave 2 merges):
  Shard 4 (M04) — Spec authority + release     → specs/, docs/specs/, CHANGELOG, package.json
```

## Worktree-isolation discipline (per `worktree-isolation.md`)

Wave 1 launches 2 parallel agents — under the wave-of-≤3 cap (Rule 4). Each shard:

- **MUST** pin worktree path in prompt (Rule 1): `/Users/esperie/repos/loom/kailash-prism/.claude/worktrees/0.6.0-shard-N`
- **MUST** verify branch name matches prompt (Rule 6): `feat/prism-0.6.0-shard-N-<descriptor>`
- **MUST** run pre-flight `git merge-base` against `main` HEAD (Rule 5)
- **MUST** include explicit `git commit` discipline in prompt (Rule 6 of `agents.md`)
- **MUST** be verified by parent via `Read` of claimed deliverables after agent exits (Rule 3)

## Specialist selection

- Wave 1, 2 (code shards): **react-specialist** — frontend / molecule / hook work; has Edit + Bash
- Wave 3 (specs + release): direct orchestrator work OR **release-specialist** — version bumps, CHANGELOG, spec edits
- Quality gates after each wave: **reviewer** (background) + **security-reviewer** (background)

## Coordination — package.json owner

Per `agents.md` MUST "Parallel-Worktree Package Ownership Coordination": only the **release shard (M04)** edits `web/package.json` and `web/CHANGELOG.md`. Wave 1+2 prompts MUST instruct sibling agents not to touch these files.

## Per-shard branch naming

| Shard | Branch                                         | Worktree path                                         |
| ----- | ---------------------------------------------- | ----------------------------------------------------- |
| M01   | `feat/prism-0.6.0-shard1-columndef-relaxation` | `.claude/worktrees/0.6.0-shard1`                      |
| M02   | `feat/prism-0.6.0-shard2-use-filter-bar-state` | `.claude/worktrees/0.6.0-shard2`                      |
| M03   | `feat/prism-0.6.0-shard3-filter-bar-molecule`  | `.claude/worktrees/0.6.0-shard3`                      |
| M04   | `release/v0.6.0`                               | direct (release branches per `git.md` § Release-Prep) |

## Quality gates

- After Wave 1 merge: reviewer + security-reviewer (background, parallel)
- After Wave 2 merge: reviewer + security-reviewer (background, parallel)
- After Wave 3 merge: reviewer + gold-standards-validator + security-reviewer (background, parallel)
- `/redteam` runs after Wave 3 (full-release adversarial sweep)

## Done definition

- [ ] All 4 shards merged to main
- [ ] `web/package.json` version 0.6.0
- [ ] CHANGELOG entry covers all 4 shards + the type-narrowing migration note
- [ ] Storybook covers 3 FilterBar shapes + Profile-completeness DataTable scenario
- [ ] `/redteam` clean
- [ ] `/codify` (if patterns emerged worth promoting cross-repo)
