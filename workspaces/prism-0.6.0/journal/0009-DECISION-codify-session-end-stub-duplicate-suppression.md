---
type: DECISION
date: 2026-05-08
session: codify-session-end-pending-stub-duplicate-suppression
---

# Codify session-end pending-stub duplicate suppression

## What

Appended one rule_candidate to `.claude/.proposals/latest.yaml` for loom
Gate-1 review on next `/sync`:

- **session-end-pending-stub-duplicate-suppression** (skill-embedded,
  priority 30) — `.claude/hooks/session-end.js § generateJournalCandidates`
  MUST add a pre-write filter that suppresses stub generation for commits
  whose SHA already appears in a canonical session artifact (`SWEEP-*.md`,
  open/merged PR body, existing `<workspace>/journal/` entry).

## Why

Session-start cleanup deleted two `.pending/` stubs:

- `1778065911099-0-DECISION.md` for commit `91a107c` (Sweep 5 closure PR #41)
- `1778065911099-1-RISK.md` for commit `2f68aa3` (Sweep self-audit)

Both commits' content was already captured in `SWEEP-2026-05-06.md` and
PR #41 body — the stubs were duplicate from the moment they were written.

Same recurrence class as the 4 stubs cleaned by commit `8e67ad3` one day
prior. Twice in 7 days = repeating-pattern signal flagged at the prior
session's `.session-notes:41-45` open question.

## Disposition

User selected option B (SessionEnd-side filter) over A (SessionStart
surface) and C (filter + workspace-resolution fix). Rationale: filter
eliminates the duplicate class at source; misroute (wrong workspace via
`detectActiveWorkspace` cwd-recency) remains a manual-cleanup nuisance
but no longer carries duplicate content — low residual value vs. cost of
fixing in same cycle.

## Skipped pipeline steps

Did NOT run the full /codify subagent fan-out (analyst x2, reviewer x2,
cc-architect, gold-standards-validator, testing-specialist,
security-reviewer). Scope is one well-grounded candidate against a single
hook function with explicit user pre-approval; full validation team
matters more for new rule introductions than single-clause hook patches.
cc-architect verification will run at loom Gate-1 against the
`audit_protocol` spec.

## Trust Posture Wiring

Severity: advisory. Grace period: 7 days from rule landing.
Regression-within-grace: any session-end.js modification within 7 days
that ships `generateJournalCandidates` without the duplicate-suppression
filter triggers emergency downgrade L5 → L4.

## Follow-ups for human

- Loom Gate-1 review at next `/sync` from loom.
- Two prior unresolved Gate-1 dispositions still open per prior
  `.session-notes`: `memory-citation-grounding` (NEW rule vs. fold into
  zero-tolerance.md Rule 1c) and `commands/sweep.md` Sweep 5
  model-mismatch.
- The misroute axis (workspace selection by cwd-recency rather than
  session work surface) is documented in this entry for future codify
  consideration if duplicate suppression alone proves insufficient.

## Closure

Proposal candidate appended to `.claude/.proposals/latest.yaml` (lines
1079–1184). Rule status `pending_review`. Two `.pending/` stubs cleared
at session start. Repo back to clean main.
