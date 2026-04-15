# M-09: Session wrap-up — update session notes, memory, proposal

## Priority: HIGH (session-end hygiene)
## Scope: Prism session notes + memory + upstream proposal

## Description

Capture what happened in this wave so the next session resumes cleanly.

## Acceptance criteria

1. `workspaces/fe-codegen-platform/.session-notes` updated with:
   - What was delivered (three migrations + Prism gap fixes)
   - Which Prism APIs were added/changed
   - What's in the upstream proposal queue
   - Traps for next session (new Prism version, any known flakiness)
2. Memory updates via Write to `memory/`:
   - Update `project_phase2_arbor.md` with the new wave's status
   - Add a new feedback memory if any new preferences were learned
3. Upstream proposal updated at `.claude/.proposals/latest.yaml`:
   - Any new Prism APIs (Form / DataTable adapter design, new atoms) appended (NOT replaced — see `rules/artifact-flow.md` on append lifecycle)
   - Status stays `pending_review` (loom `/sync` does the classification)
4. Completed todos moved from `todos/active/` to `todos/completed/`
5. Journal entries written for any DECISION / TRADE-OFF / RISK surfaced during this wave (via `/journal new` or direct write to `workspaces/fe-codegen-platform/journal/`)

## Dependencies

- Requires: M-08 convergence

## Agent

- Main thread

## Done when

- Session notes written
- Memory updated
- Proposal appended
- Todos moved
- User can `/clear` and next session picks up cleanly
