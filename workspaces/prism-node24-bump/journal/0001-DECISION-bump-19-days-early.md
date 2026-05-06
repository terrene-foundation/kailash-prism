---
type: DECISION
date: 2026-05-06
status: shipped
related_pr: terrene-foundation/kailash-prism#38
---

# DECISION — Open the workspace 19 days ahead of scheduled window

## Decision

Open `workspaces/prism-node24-bump/` on 2026-05-06 instead of the suggested ~2026-05-25 window from `workspaces/prism-0.6.0/.session-notes`. Land the bump same day as workspace open: workspace + plan + bump merged within one session, 27 days before the GHA Node 20 force-cut on 2026-06-02.

## Context

The prior session-notes (prism-0.6.0 closeout, PR #32 / commit `1d6ccf9`) flagged the Node 20 → 24 bump as a future workstream and proposed spinning up the dedicated workspace ~2026-05-25 — 8 days before the deadline. That timing was conservative: minimal calendar buffer in case the bump surfaced an unexpected incompatibility.

When this session opened (2026-05-06, working tree clean post-PRs #34/#35/#36), three conditions held simultaneously:

1. No in-flight prism workstream competing for budget. The arbor migration cadence (fe-codegen-platform workspace) is cross-repo and runs on its own schedule; not preempted.
2. The validation gap (no PR-time CI workflow existed for `web/`) was load-bearing for the bump and could not be discovered until a workspace was opened. Discovery early = decision-locking early = implementation early.
3. Working tree was empty — no cost to opening, no risk of conflating with other in-flight changes.

## Trade-off

**Open early (chosen)** —

- Pros: 24 days of buffer rather than 3 (the original target). 27 days is enough to absorb a full re-implementation if any major incompatibility surfaces. Compiler `@types/node` bump and same-shard postcss patch landed cleanly.
- Cons: Opportunity cost — that session's autonomous capacity goes to Node bump rather than another workstream. But there was no competing workstream, so the cost is zero.

**Open per schedule (~2026-05-25)** —

- Pros: Defers the work until closer to the binding constraint, preserving capacity for unforeseen near-term work.
- Cons: 3-day buffer leaves no margin for incompatibility discovery. If `vitest`/`Vite` Node 24 regression had surfaced (FM-6 in 03-failure-modes.md), a 3-day buffer would not absorb the upstream-fix cycle.

## Rationale

Asymmetric risk profile: opening early costs nothing (no competing workstream, no working-tree contention). Opening late risks deadline pressure if any of the 6 enumerated failure modes (`01-analysis/03-failure-modes.md`) materializes. The autonomize directive's "long-term over short-term" criterion favors the durable-buffer option.

The bump landed clean — none of the 6 failure modes materialized. In hindsight the conservative timing would have shipped the same outcome 19 days later. But the early-open analysis cost (one session) is sunk regardless of outcome; the buffer it bought was real until the merge.

## Outcome

Bump merged as PR #38 commit `280ee60` at 2026-05-06T02:23:13Z. ci-web.yml first-on-main run: SUCCESS, both `test (22)` and `test (24)` matrix entries green. Buffer captured: 27 days vs. 3-day target.

Codify proposal (`.claude/.proposals/latest.yaml`) appended with 3 file-change entries + 1 rule_candidate (future-prism-release-workflow-defaults) for loom Gate-1 review.

## Implication for future workstream timing

For deadline-bound infrastructure work where the validation surface is non-trivial AND no competing workstream is preempted:

> **Open the workspace as soon as working-tree is clean — do NOT defer to the calendar window.** The early-open buffer is asymmetric: cheap to capture, expensive to forfeit if the binding constraint surfaces unexpected work.

Distinct from feature work, where early-open creates context drift and review noise. Infrastructure bumps with hard external deadlines are the legitimate exception.
