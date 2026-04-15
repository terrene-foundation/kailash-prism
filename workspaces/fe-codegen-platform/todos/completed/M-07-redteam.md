# M-07: Red team review of M-01 / M-02 / M-03 migrations

## Priority: HIGH
## Scope: migrations + Prism diffs

## Description

Run a red team pass over the three migrations AND the Prism-side gap fixes (M-04). Produce `workspaces/fe-codegen-platform/04-validate/redteam-arbor-wave2.md` with HIGH/MEDIUM/LOW findings.

Red team MUST specifically check:

1. **Orphan detection** (`rules/orphan-detection.md`) — every new Prism API surface introduced by M-04 has a real call site in arbor
2. **Spec compliance** (`skills/spec-compliance/SKILL.md`) — migration code matches `docs/specs/05-engine-specifications.md` for Form and DataTable contracts
3. **Type safety** — no `any`, no `as unknown as T`, no `@ts-expect-error` in migration code
4. **Mock data check** — no hardcoded data sneaked into the -prism routes (rules/zero-tolerance.md Rule 2)
5. **Silent fallback check** — no swallowed errors (rules/zero-tolerance.md Rule 3)
6. **Regression check** — does each migration preserve bespoke-route functionality one-for-one? Any silent feature drop?
7. **Accessibility** — keyboard nav, ARIA, focus states
8. **Visual parity** — the Prism route looks right (this is the "is the user getting what they asked for" check)

## Acceptance criteria

1. Red team doc exists with dated findings
2. Each finding classified HIGH / MEDIUM / LOW
3. Each finding has a concrete recommendation
4. For findings that are Prism-side gaps: classify whether they're M-04-level blocking or M-05 codify targets

## Dependencies

- Requires: M-06 integration test passing
- Blocks: M-08 (fix findings)

## Agent

- `reviewer` — code review pass (background)
- `security-reviewer` — security audit (background)
- Main thread aggregates and writes the consolidated doc

## Done when

- Red team doc written and dated
- Every finding has classification + recommendation
