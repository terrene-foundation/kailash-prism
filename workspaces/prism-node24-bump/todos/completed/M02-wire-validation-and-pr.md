---
shard: 2
release: node24-bump
estimated_loc: 0 (validation + PR open only — no new code)
specialist: none
worktree: none
branch: chore/node24-bump-implementation
parallel_with: none
blocked_by: M01
blocks: M03
---

# M02 — Wire: local validation + commit + PR + own-CI green

## Goal

Validate the staged changes from M01 against real Node 22 and Node 24 runtimes locally per `git.md` § "Pre-FIRST-Push CI Parity Discipline" — the structural defense against the "CI green, release red" failure mode (FM-1). Then commit per the 4-commit split in `02-plans/01-implementation-plan.md`, push, open PR, and verify the bump's OWN `ci-web.yml` run is green for both matrix entries `[22, 24]`.

The PR validates itself — its diff includes the new `ci-web.yml`, which fires on the PR's own opening, and its build passes on both Node majors. This is the structural completion of the bump: the new CI workflow is its own first user.

## Tasks

### Local pre-flight validation (per `git.md` MUST)

- [ ] **T01** — `cd web && nvm use 24 && npm ci && npm run lint && npm run build && npm run test:run`. All four must exit 0. Capture command exit codes; if any fails, STOP and surface the failure before proceeding.

- [ ] **T02** — `cd web && nvm use 22 && npm ci && npm run lint && npm run build && npm run test:run`. Same exit-0 requirement. Validates the declared `engines.node: ">=22.0.0"` floor actually works.

- [ ] **T03** — `cd compiler && nvm use 24 && npm ci && npm run build && npm run test:run`. Same exit-0 requirement.

- [ ] **T04** — `cd compiler && nvm use 22 && npm ci && npm run build && npm run test:run`. Same exit-0 requirement.

- [ ] **T05** — Capture stdout/stderr to `workspaces/prism-node24-bump/04-validate/local-validation.log` (create dir if missing) for audit trail. Document each command's exit code and runtime in seconds.

- [ ] **T06** — If `nvm` is not installed: install it, OR document the alternative (Volta, `n`, system-installed Node 22 + 24) used. Either way, both Node majors MUST be exercised — not skipping one because "the other one is enough."

### Branch + commits

- [ ] **T07** — `git checkout -b chore/node24-bump-implementation` from current `main` (verify `git rev-parse main` matches `git rev-parse origin/main`; refresh with `git fetch origin && git reset --keep origin/main` if behind).

- [ ] **T08** — Commit 1: `git add .github/workflows/release-web.yml && git commit -m "chore(ci): bump release-web.yml to Node 24 + setup-node@v5 + checkout@v5"`. Commit body cites the 2026-06-02 GHA Node 20 force-cut deadline.

- [ ] **T09** — Commit 2: `git add .github/workflows/ci-web.yml && git commit -m "chore(ci): add ci-web.yml PR-time validation workflow with [22, 24] matrix"`. Commit body explains the validation gap this closes (no PR-time CI existed before this commit).

- [ ] **T10** — Commit 3: `git add web/package.json compiler/package.json && git commit -m "chore(deps): declare engines.node \\\">=22.0.0\\\" in web/ and compiler/"`. Commit body cites Node 22 LTS rationale.

- [ ] **T11** — Commit 4: `git add compiler/package.json compiler/package-lock.json && git commit -m "chore(deps): bump @types/node to ^24.0.0 in compiler"`. Note: `compiler/package.json` was already committed in T10; T11 only stages the `^24.0.0` change to `devDependencies` and the lockfile regen. If git complains about re-staging an unmodified path, drop `compiler/package.json` from this commit's add list.

  **Alternative atomic order** (if T10 + T11 collide on `compiler/package.json`): merge T10 and T11 into a single `chore(deps): declare engines.node + bump @types/node` commit. Document which path was taken in M02's session-notes update (T16).

### Push + PR

- [ ] **T12** — `git push -u origin chore/node24-bump-implementation`. The push triggers nothing yet (no workflow fires on branch push); validation runs on PR open.

- [ ] **T13** — `gh pr create --repo terrene-foundation/kailash-prism --base main --head chore/node24-bump-implementation --title "chore(ci): Node 20 → 24 bump + ci-web.yml validation workflow" --body @-` with body covering:
  - Summary referencing the 2026-06-02 deadline + workspace
  - Per-commit breakdown
  - Verified versions table (from `02-decisions-locked.md`)
  - Local validation matrix results (from T05's log)
  - "This PR validates itself: ci-web.yml runs on opening; both matrix entries [22, 24] gate the merge"
  - Test plan checkboxes
  - Related issues: none

### Own-CI verification

- [ ] **T14** — Wait for `ci-web.yml` workflow to fire on the PR. `gh pr checks <PR#> --repo terrene-foundation/kailash-prism --watch` until both matrix entries (Node 22, Node 24) show `pass`.

- [ ] **T15** — If either matrix entry fails: STOP, capture the failure log, do NOT merge, escalate to the human. Failure modes: FM-5 (missing native prebuild) or FM-6 (vitest/Vite Node 24 regression) per `01-analysis/03-failure-modes.md`.

### Workspace housekeeping

- [ ] **T16** — Update `.session-notes` with: PR number, commit shas, T05 validation log path, any deviations from T08–T11 (alternative atomic order), and "ready for M03 after admin-merge".

### Coordination

- [ ] **T17** — DO NOT admin-squash-merge. The merge is the human approval gate (per BUILD-repo Prudence in `feedback_directive_recommendations.md`). M02 ends at "PR green, awaiting human merge approval".

## Acceptance criteria

- [ ] T01–T04 all exited 0 (local validation green on both Node majors for both packages)
- [ ] T05 log file present and committed (or noted as ephemeral; recommend committing to `04-validate/`)
- [ ] PR opened, `gh pr view` shows `state: OPEN`, `mergeable: MERGEABLE`
- [ ] Both matrix entries on the PR's ci-web.yml run show `pass`
- [ ] `.session-notes` updated with PR# + sha set

## Risks

- **`nvm use 22` fails because Node 22 not installed**: bounded; `nvm install 22 && nvm use 22`. Document if encountered.
- **PR's ci-web.yml doesn't fire because the trigger paths-filter excludes `.github/workflows/ci-web.yml` itself on its first push**: Decision 2 explicitly includes `.github/workflows/ci-web.yml` in the trigger paths to prevent this. Verify by inspecting the actions tab on the PR.
- **One Node major passes, the other fails**: per FM-6, this localizes the bug to the failing major. Recovery: pin the workflow to the passing major + file upstream issue. Re-scope the bump if the failing major is 24 (the deadline-binding one).

## References

- Plan: `02-plans/01-implementation-plan.md` § "Pre-flight CI parity"
- Decisions: `01-analysis/02-decisions-locked.md` § Decisions 1–4
- Failure modes: `01-analysis/03-failure-modes.md` FM-5, FM-6
- Rule: `git.md` § "Pre-FIRST-Push CI Parity Discipline"
