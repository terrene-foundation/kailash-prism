# A-02: Populate Enterprise Theme YAML

## Priority: CRITICAL (blocks compiler MVP)
## Source: Plan Workstream A, line 16-17, 28; docs/specs/01-design-system-protocol.md; docs/specs/02-token-architecture.md

## Description

Populate `specs/tokens/themes/enterprise.yaml` with actual color, spacing, typography, radius, shadow, and motion values for the enterprise (navy/slate professional) theme. Currently contains only name and description.

## Acceptance Criteria

1. All Tier 1 primitive values defined (raw color scales, spacing scale, type sizes, radii, shadows, durations)
2. All Tier 2 semantic tokens mapped (interactive.primary, surface.page, text.primary, etc.)
3. All Tier 3 component tokens mapped (button.primary.bg, card.shadow, input.border-focus, etc.)
4. Dark mode variants included for all semantic tokens
5. Constraint annotations: contrast ratios (4.5:1 AA), touch targets (44px), pairing rules
6. Values match the enterprise palette described in docs/specs/01-design-system-protocol.md (navy/slate)
7. Valid YAML conforming to the schema defined in A-01

## Implementation Notes

- Read docs/specs/01-design-system-protocol.md for the DESIGN.md protocol and design-system.yaml internal format
- Read docs/specs/02-token-architecture.md for the three-tier structure with constraint annotations
- The UX architecture research (workspaces/fe-codegen-platform/01-analysis/01-research/07-uiux-architecture.md) Section 1 has the most detailed token structure example
- Enterprise palette: navy primary, slate grays, amber accent for alerts
- ~190-250 tokens total per theme
