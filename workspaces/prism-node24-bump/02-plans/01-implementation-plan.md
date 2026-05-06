---
type: plan
phase: 02-plans
date: 2026-05-06
deadline: 2026-06-02
---

# Implementation Plan — Node 20 → 24 Bump

Single-shard implementation: 5 file edits + 1 lockfile regen + local validation + PR open. All changes are workflow YAML + manifest only — zero source code touched. Plan derives directly from `01-analysis/02-decisions-locked.md`.

## Shard sizing audit (per autonomous-execution.md MUST 1)

| Constraint              | Threshold | Actual                                                                                     |
| ----------------------- | --------- | ------------------------------------------------------------------------------------------ |
| Load-bearing LOC        | ≤500      | ~50 (4 file edits + 1 new ~30-line workflow)                                               |
| Simultaneous invariants | ≤5–10     | 5 (Node 24 build pass, Node 22 build pass, workflow parity, engines floor, no code change) |
| Call-graph hops         | ≤3–4      | 1 (workflow runner → npm scripts)                                                          |
| Working-context LOC     | ≤15k      | ~2k (web/, compiler/, .github/)                                                            |

Single shard fits comfortably. Splitting would be artificial overhead.

## Dependency graph

```
M01 (Build: 5 file edits + lockfile)
  └─→ M02 (Wire: local Node 22+24 validation + commit + PR + own-CI green)
        └─→ [HUMAN GATE: admin-squash-merge]
              └─→ M03 (Redteam + Codify)
```

Three milestones, strict serial. Validation at each gate prevents drift from leaking forward.

## Branch + commit hygiene

- Branch: `chore/node24-bump-implementation` (per `git.md` Branch Naming + matches BUILD-repo conventions for non-feature work)
- Commits split per logical change (per `git.md` Atomic Commits):
  1. `chore(ci): bump release-web.yml to Node 24 + setup-node@v5 + checkout@v5`
  2. `chore(ci): add ci-web.yml PR-time validation workflow with [22, 24] matrix`
  3. `chore(deps): declare engines.node ">=22.0.0" in web/ and compiler/`
  4. `chore(deps): bump @types/node to ^24.0.0 in compiler + regen lockfile`
- Single PR bundling all 4 commits (Decision 7: atomicity).

## Pre-flight CI parity (per `git.md` MUST)

Before the FIRST push that creates the remote branch, M02 MUST run locally:

- `cd web && nvm use 24 && npm ci && npm run lint && npm run build && npm run test:run`
- `cd web && nvm use 22 && npm ci && npm run lint && npm run build && npm run test:run`
- `cd compiler && nvm use 24 && npm ci && npm run build && npm run test:run`
- `cd compiler && nvm use 22 && npm ci && npm run build && npm run test:run`

All 4 must exit 0. Push only after green.

## What's NOT in scope

- Compiler release workflow (no `release-compiler.yml` exists; future work — Decision 6)
- `packageManager` field in package.json (Decision 5: skip)
- Vite/web/src/ source code (per Decision: zero code changes)
- Synthetic `web-vTEST` tag dry-run of release-web.yml (per .session-notes trap: would create a real GitHub Release)
- `flutter/`, `tauri-rs/`, `stitch/` — these toolchains don't depend on Node majors

## Pseudocode for the new ci-web.yml

```yaml
name: CI — @kailash/prism-web

on:
  pull_request:
    paths:
      - "web/**"
      - ".github/workflows/ci-web.yml"
  push:
    branches: [main]
    paths:
      - "web/**"

concurrency:
  group: ci-web-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        node-version: ["22", "24"]
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: ${{ matrix.node-version }}
          cache: "npm"
          cache-dependency-path: web/package-lock.json
      - run: npm ci
        working-directory: web
      - run: npm run lint
        working-directory: web
      - run: npm run build
        working-directory: web
      - run: npm run test:run
        working-directory: web
```

## Pseudocode for the engines field

```jsonc
// web/package.json + compiler/package.json (delta)
{
  ...
  "engines": {
    "node": ">=22.0.0"
  },
  ...
}
```

## Risk-adjusted timing

- M01 + M02: ~1 autonomous session (file edits + 4 local validation runs + commit + push + PR).
- M03: ~0.5 autonomous session (4 grep checks + codify proposal append).
- Total: 1–2 sessions.
- Target merge: 2026-05-30 (≥3 days before 2026-06-02 deadline). Today is 2026-05-06 → 24 days of slack.

## Validation gates

- **M01 → M02**: all 5 files staged, working tree visible to `git status`, no source-code modifications visible (`git diff --stat src/ web/src/ compiler/src/` returns empty).
- **M02 → human gate**: 4 local validation runs green, PR opened, ci-web.yml run on the PR is green for both matrix entries `22` and `24`.
- **Human gate → M03**: admin-squash-merge to main, branch deleted, local main fast-forwarded.
- **M03 → workspace close**: 4 grep checks (per `02-decisions-locked.md` § Validation criteria) return zero matches each, codify proposal appended, `.session-notes` updated for next session.
