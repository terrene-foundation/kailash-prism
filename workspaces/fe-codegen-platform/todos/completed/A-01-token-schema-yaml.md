# A-01: Populate Token Schema YAML

## Priority: CRITICAL (blocks compiler MVP)
## Source: Plan Workstream A, line 15-22; docs/specs/02-token-architecture.md

## Description

Populate `specs/tokens/schema.yaml` with the full three-tier token structure defined in the token architecture spec. Currently a stub with 7 empty categories.

## Acceptance Criteria

1. Schema defines all 7 categories: color, typography, spacing, elevation, border, motion, breakpoint
2. Each category has the 3-tier structure: primitive (Tier 1), semantic (Tier 2), component (Tier 3)
3. Constraint annotations included: contrast minimums, touch targets, pairing rules
4. Schema is valid YAML that the token compiler can parse
5. Schema matches the detailed definitions in docs/specs/02-token-architecture.md

## Implementation Notes

- Read docs/specs/02-token-architecture.md for the authoritative token structure
- The schema defines the STRUCTURE (what categories, tiers, constraints exist), not the VALUES (those go in theme files)
- Must support validation: the compiler reads this schema to validate theme files
