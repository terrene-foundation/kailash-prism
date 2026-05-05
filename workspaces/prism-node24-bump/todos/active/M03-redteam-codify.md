---
shard: 3
release: node24-bump
estimated_loc: 0 (verification + proposal append only)
specialist: none
worktree: none
branch: main (post-merge)
parallel_with: none
blocked_by: M02 + human admin-squash-merge
blocks: workspace closeout
---

# M03 — Redteam + Codify

## Goal

After admin-squash-merge of the M02 PR: run the four mechanical grep checks defined in `01-analysis/02-decisions-locked.md` § "Validation criteria for /redteam"; append the institutional pattern (default-Node-24 + matrix CI for future Prism release workflows) to `.claude/.proposals/latest.yaml` for loom Gate-1 review; close the workspace with a final `.session-notes` update.

This milestone is the structural close-out that prevents recurrence of the same crisis when:

- The next forced Node major arrives (Node 26 LTS in 2027/2028)
- A future `release-compiler.yml` ships (per Decision 6 — the inheritance pattern lives in the codify proposal, not in folklore).

## Tasks

### /redteam — 4 grep checks

- [ ] **T01** — `grep -rn "node.version.*20\\|node-version: '20'\\|engines.*node.*20" .github/ web/package.json compiler/package.json` returns ZERO matches. ANY match is a HIGH finding (residual Node 20 reference).

- [ ] **T02** — `grep -E "node-version:.*\\[.*22.*24.*\\]|node-version:.*'22'|node-version:.*'24'" .github/workflows/ci-web.yml` returns matches confirming matrix `[22, 24]` is present.

- [ ] **T03** — `node -e 'console.log(JSON.stringify(require("./web/package.json").engines))'` outputs `{"node":">=22.0.0"}`. Same check for `compiler/package.json`. ANY mismatch is a HIGH finding.

- [ ] **T04** — `grep '"@types/node"' compiler/package.json` matches `"^24.0.0"`. AND `node -e 'console.log(require("./compiler/package-lock.json").packages["node_modules/@types/node"].version)'` resolves to a `24.x.x` version.

- [ ] **T05** — Verify the merged PR's `ci-web.yml` run actually passed both matrix entries: `gh run list --workflow=ci-web.yml --branch=main --limit=1 --json conclusion,name,headSha`. Conclusion MUST be `success`.

- [ ] **T06** — Optional: cut a synthetic test tag locally (NOT pushed) to validate `release-web.yml` YAML well-formedness. `git tag web-vTEST-LOCAL && git tag -d web-vTEST-LOCAL` (the create+delete validates YAML refs without pushing). Skip if T05 covers parity confidence.

- [ ] **T07** — Document T01–T05 results in `04-validate/redteam-round-1.md` (create file). Format: one bullet per check, command + output excerpt + PASS/FAIL.

### /codify — institutional pattern capture

- [ ] **T08** — Read `.claude/.proposals/latest.yaml`. If status is `pending_review` or `reviewed`: APPEND a new entry (per `artifact-flow.md` MUST: append-not-overwrite). If status is `distributed` or file missing: archive old to `.claude/.proposals/archive/2026-05-DD-prism-node24.yaml`, then create fresh.

- [ ] **T09** — Add proposal entries:
  - **Pattern entry**: "Future Prism release workflows MUST default to Node 24 + setup-node@v5 + checkout@v5. Companion CI workflow MUST exist with `node-version` matrix `[<LTS>, <CURRENT>]` to validate the declared `engines.node` floor against the release pin. Trigger paths MUST include `<package>/**` AND `.github/workflows/<package>-ci.yml` AND `.github/workflows/<package>-release.yml`."
  - **Inheritance entry**: "When `release-compiler.yml` ships, it MUST inherit this pattern. Cite this workspace (`workspaces/prism-node24-bump/01-analysis/02-decisions-locked.md`) as the canonical reference."
  - **Lessons-learned entry**: "Repos with tag-only release workflows MUST also have PR-time CI workflows. The validation gap (no CI workflow before this bump) was load-bearing — the Node 24 bump could not be validated without first creating the CI surface that validates it. Future major-version bumps in similar gap-shaped repos MUST treat 'add CI workflow' as a co-requisite, not a separate workspace."
  - **Decision-locked entry** (machine-readable for future codify cycles): the locked values from `02-decisions-locked.md` Decisions 1–7, structured so future `/sync` Gate-1 review can classify global vs variant.

- [ ] **T10** — Update `.claude/.proposals/latest.yaml` `status` to `pending_review` (regardless of prior state, per `artifact-flow.md` MUST: reset status on append).

### Workspace closeout

- [ ] **T11** — Move all M01-M03 todo files from `todos/active/` to `todos/completed/`.

- [ ] **T12** — Update `.session-notes` to reflect: workspace closed, all 4 redteam checks PASS, codify proposal appended, link to merged PR, link to ci-web.yml's first green run on main.

- [ ] **T13** — Optional but recommended: write one `journal/0001-DECISION-bumped-19-days-early.md` capturing the rationale for opening the workspace 2026-05-06 vs the suggested 2026-05-25, the actual buffer captured (24 days), and the trade-off (early open = less risk of deadline scramble; opportunity cost = none, since no in-flight prism workstream was preempted).

### Coordination

- [ ] **T14** — DO NOT delete the workspace directory. Closed workspaces stay in tree as institutional record (per existing convention: `prism-0.6.0` stayed after its release shipped).

- [ ] **T15** — DO NOT modify any code, workflow, or manifest in M03. This milestone is verify + capture only.

## Acceptance criteria

- [ ] All 4 grep checks (T01–T04) PASS
- [ ] T05 confirms ci-web.yml first run on main is green
- [ ] T07 redteam doc written
- [ ] `.claude/.proposals/latest.yaml` contains the 4 new entries from T09
- [ ] `.claude/.proposals/latest.yaml` status is `pending_review` (per T10)
- [ ] `.session-notes` reflects close-out
- [ ] Three todo files moved to `todos/completed/`

## Risks

- **`.claude/.proposals/latest.yaml` doesn't exist yet on main**: per `artifact-flow.md` MUST "Archive Before Fresh", create the proposal file fresh — no archive needed for non-existent prior state.
- **Pattern entry is too prescriptive for future bumps**: Node majors evolve; the "matrix [<LTS>, <CURRENT>]" formulation is intentionally parametric. If a future review finds a specific match-pattern more useful, that's a /codify follow-up — not a blocker for this proposal.

## References

- Decisions: `01-analysis/02-decisions-locked.md` § Validation criteria
- Failure modes: `01-analysis/03-failure-modes.md` FM-4 (compiler workflow inheritance — the institutional pattern this milestone captures)
- Rule: `artifact-flow.md` § BUILD Repo Rules + § Proposal Lifecycle
