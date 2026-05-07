---
type: DECISION
date: 2026-05-06
created_at: 2026-05-06T11:30:00Z
author: agent
project: kailash-prism
topic: codify — sweep skill methodology fixes (5 rule_candidates appended)
phase: codify
tags: [codify, sweep, skill, methodology, orphan-detection, memory-citation]
workspace: prism-0.6.0 (closed; institutional record)
related:
  - SWEEP-2026-05-06.md § "Methodology gaps acknowledged"
  - SWEEP-2026-05-06.md § "Sweep 5 supplemental" (final paragraph)
  - .claude/.proposals/latest.yaml (5 rule_candidates appended)
  - workspaces/prism-0.6.0/journal/0007-DECISION-codify-pass-complete.md (prior codify pattern)
---

# Codify — sweep skill methodology fixes

## Context

The 2026-05-06 `/sweep` cycle was prompted by a user challenge ("did you /sweep
according to directives?") which triggered a self-audit. The audit surfaced
five lessons against the loom sweep skill (`commands/sweep.md`) plus the
orphan-detection rule (`rules/orphan-detection.md`). All five were flagged in
the sweep report for a future `/codify` cycle but were NOT yet appended to
`latest.yaml`. This codify pass closes that gap.

This codify pass has no owning workspace — `/sweep` is a repo-level cycle, not
a workspace-scoped workstream. Filing here under `prism-0.6.0/journal/`
because (a) the prior codify pass (`0006`, `0007`) lives here and (b) the sweep
itself was the post-release follow-up to prism-0.6.0's release cycle. The
workspace remains closed; this entry is institutional record only.

## Decision

Append five `rule_candidate` entries to `.claude/.proposals/latest.yaml` for
loom Gate-1 classification on the next `/sync`. No local globals edited (per
`cross-cli-parity.md` MUST 1 + `variant-authoring.md` MUST 1 — same constraint
as the prior codify pass).

| Candidate                                               | Tier           | Target                        |
| ------------------------------------------------------- | -------------- | ----------------------------- |
| `sweep-skill-repo-level-specs-fallback`                 | skill-embedded | `commands/sweep.md` § Sweep 5 |
| `sweep-skill-unfiltered-branch-enumeration`             | skill-embedded | `commands/sweep.md` § Sweep 4 |
| `sweep-skill-memory-citations-via-file-read`            | skill-embedded | `commands/sweep.md` § Sweep 3 |
| `sweep-skill-closure-sha-template`                      | skill-embedded | `commands/sweep.md` § Closure |
| `orphan-detection-library-vs-application-applicability` | coc-global     | `rules/orphan-detection.md`   |

## Rationale per candidate

### 1. Repo-level specs fallback (Sweep 5)

The skill iterates `for ws in workspaces/*/; [ -d "$ws/specs" ]` and silently
returns empty for any repo whose spec authority lives at the repo root.
kailash-prism keeps its spec authority under `docs/specs/00..10` (incl. the 13
sub-files of `05*`); the per-workspace assumption is a model-mismatch.

Skipping the equivalent check at the level the repo uses IS the substitution
failure mode that `sweep-completeness.md` Rule 1 blocks. The original sweep
shipped "no findings" until a user-prompted re-run against `docs/specs/`
surfaced 5 findings (2 DRIFT + 3 COVERAGE GAP) — including a DRIFT where 05b
still advertised the removed `ServerDataSource<T>` contract as current.

### 2. Unfiltered branch enumeration (Sweep 4)

`git branch --no-merged main` excludes refs whose tip is tip-equal to main
even when the branch was abandoned mid-flight. The 4 `worktree-agent-<hash>`
orphans found by accident during cleanup had this exact shape — content
already in main but the harness-default name lingering as dead-weight.

Per `worktree-isolation.md` Rule 6, the existence of any
`worktree-agent-<hash>` ref is itself a finding (the rule mandates declared
branch names). Sweep 4 MUST surface them as a named class via
`git branch --list 'worktree-agent-*'`.

### 3. Memory citations via file Read (Sweep 3)

The original Issue #33 disposition cited `project_distribution.md` from the
MEMORY.md index summary, not via direct Read of the canonical file. The
disposition was substantively correct (verified post-hoc) but the methodology
violated "distinguish OBSERVED from ASSUMED."

The MEMORY.md index hook is hand-edited and CAN drift from the underlying
file. If the hook had been stale, the close comment on a public issue would
have shipped a false claim. This is the same provenance-grounding principle
as `zero-tolerance.md` Rule 1c — citation in a public-record artifact requires
observation, not recall.

### 4. Closure SHA template (Sweep closure)

The skill mandates "Trivial fixes applied inline; reclassified `FIXED` with
commit SHA" but the report-template prose did not enforce SHA citation. The
original report shipped `FIXED inline` rows without `8e67ad3`, breaking the
audit trail between finding and fix. Future `/redteam` rounds cannot verify
closure parity without grep-able commit SHAs in the disposition column.

### 5. Orphan-detection library-vs-application applicability

The Sweep 5 supplemental flagged "navigation engine zero callsites" as an
ORPHAN candidate. On verification it was DOWNGRADED to false positive: prism
is a UI library, not an application; the framework's hot path IS the public
export via `web/src/index.ts:99` and `web/src/engines/navigation.tsx`.

The current `rules/orphan-detection.md` is authored against application
frameworks (DataFlow, Nexus, Kaizen) where the hot path is INTERNAL. For
libraries (component libraries, parser libraries, utility libraries) the hot
path IS the public export surface — the consumer is out-of-repo. The fix is
not to weaken the rule but to define the audit surface separately for each
artifact class so both have a real orphan check.

## Skipped /codify steps

Per the prior codify pass (`0007`), local-globals edits would violate
`cross-cli-parity.md` MUST 1 (neutral-body byte-identical) and
`variant-authoring.md` MUST 1 (slot-replacement only). Lessons routed via
proposal:

- Step 3 (update existing agents) — skipped
- Step 4 (update existing skills) — skipped
- Step 5 (README/docs) — N/A; no user-facing docs added

## Red team disposition (cc-architect)

| Candidate                                             | Verdict        | Action taken                                               |
| ----------------------------------------------------- | -------------- | ---------------------------------------------------------- |
| sweep-skill-repo-level-specs-fallback                 | ACCEPT         | shipped unchanged                                          |
| sweep-skill-unfiltered-branch-enumeration             | ACCEPT         | shipped unchanged                                          |
| sweep-skill-memory-citations-via-file-read            | NEEDS-REVISION | re-tiered + renamed (see below)                            |
| sweep-skill-closure-sha-template                      | ACCEPT (minor) | added cross_cli_slot_partition                             |
| orphan-detection-library-vs-application-applicability | ACCEPT (minor) | strengthened MUST NOT clause from procedural to mechanical |

Substantive revisions:

- Candidate #3 (memory citations) re-scoped: the principle applies to EVERY
  command that cites memory in user-visible artifacts, not just /sweep.
  Re-tiered from `skill-embedded` → `coc-global`, renamed
  `memory-citation-grounding`. Added a second MUST clause (Read MUST land in
  the same session as citation — closes the cross-session-recall loophole),
  added `audit_protocol` (mechanical detection: walk session tool-call log
  for Read prior to artifact emission), added two BLOCKED rationalizations
  (chat-recall + prior-session-Read). Target field preserves both options
  for Gate-1: NEW `rules/memory-citation-grounding.md` OR fold-into-existing
  as `zero-tolerance.md` Rule 1c sibling clause.
- Candidate #5 (orphan detection) MUST NOT first clause changed from
  procedural ("MUST NOT apply ... without first re-anchoring the audit
  surface") to mechanical ("MUST NOT classify when public-export entry
  contains symbol AND Tier 2 test imports it via package name").
- Candidate #4 added a `cross_cli_slot_partition` for Gate-1 audit symmetry
  (the rule itself is delegation-syntax-free so neutral-body invariance is
  trivially satisfied; the partition is recorded explicitly).

## For Discussion

1. **Counterfactual:** if `memory-citation-grounding` had landed as a
   `skill-embedded` clause inside `commands/sweep.md` only, what would the
   next failure mode look like? Answer: the same provenance-grounding gap
   would re-emerge in any other command that closes issues / writes PR
   bodies / files journal entries citing memory (e.g. `/wrapup`,
   `/journal`, `/release`). The cc-architect re-tier verdict prevents this.
2. **Specific data:** the SWEEP-2026-05-06.md self-audit found 4
   methodology gaps in one sweep run; how many of those gaps would have
   gone unnoticed without the user's "did you /sweep according to
   directives?" challenge? Sweep 5 (HIGH) would have shipped clean (since
   it returned empty); Sweep 4 (MED) would have shipped clean (4
   `worktree-agent-*` orphans hidden); Sweep 3 (MED) would have shipped
   clean (memory-citation methodology invisible without methodology
   audit). Three of four were structurally invisible without the
   challenge — the audit surface is itself a design responsibility.
3. **Counterfactual:** what is the cost of NOT re-anchoring
   `rules/orphan-detection.md` for the library class? In this sweep, one
   false-positive ORPHAN flag against the navigation engine. Across the
   USE-template fleet (kailash-prism, future Foundation-licensed component
   libraries) the false-positive rate compounds — every library imports
   the rule, every library's orphan audit returns noise. The fix is
   one-time and high-leverage.

## Follow-ups for human

1. Review the 5 appended entries in `.claude/.proposals/latest.yaml`
   (lines ~761-1075 after revisions) — check classification + clause shape.
2. Commit working-tree changes (5 latest.yaml entries + this journal entry
   - learning-codified.json + .session-notes refresh) to a
     `chore(codify): sweep skill methodology fixes` branch + PR (per
     BUILD-repo Prudence rule, agent does NOT commit).
3. Loom-side `/sync` Gate 1 reviewer classifies the 5 candidates: 4
   skill-embedded for `commands/sweep.md` (Sweep 3/4/5/Closure clauses) +
   1 coc-global for `rules/orphan-detection.md` (library-class audit
   surface).
4. Decide the `memory-citation-grounding` disposition: NEW
   `rules/memory-citation-grounding.md` (cleaner, separate principle) OR
   fold-into-existing as `zero-tolerance.md` Rule 1c sibling clause
   (tighter, leverages existing rule's authority). Both options preserved
   in the candidate's `target` field.
