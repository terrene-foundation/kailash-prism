---
type: DISCOVERY
date: 2026-04-12
created_at: 2026-04-12T16:30:00+08:00
author: agent
session_id: analyze-v2
session_turn: 1
project: fe-codegen-platform
topic: Default DESIGN.md path is adoption-critical for backend developers
phase: analyze
tags: [design-system, ux, adoption, phase-1]
---

# Default DESIGN.md Path Is Adoption-Critical

The red team identified FAIL-02: DESIGN.md becomes a bottleneck because Kailash's target users (backend developers) lack design expertise. The prior plan included "brief-to-DESIGN.md prompt template" but didn't specify what happens when the user provides minimal or zero design input.

**Finding**: The `/scaffold` command MUST accept a `--theme` flag (enterprise/modern/minimal) that generates a complete DESIGN.md from the starter theme + whatever brief the user provides. A backend developer who types "CRM dashboard, blue and gray" should get a working DESIGN.md in seconds — not a blank template to fill.

This is the most common authoring path. The three paths described in the user flow (brief-to-spec, Stitch-accelerated, brand-extraction) are ordered by frequency for the captive Kailash audience:
1. Brief + theme selection (90% of Phase 1 users)
2. Manual DESIGN.md authoring (designers, rare)
3. Stitch accelerated (Phase 3, not available initially)

The first path must be frictionless. The model generates the DESIGN.md, the user reviews it, and only then does code generation begin. The value of DESIGN.md is persistence (design decisions made once, reused across sessions), not elimination of model judgment.

## For Discussion

- Should `/scaffold` default to the "enterprise" theme if no `--theme` flag is provided, or should it prompt the user to choose?
- How much customization should the brief-to-spec step allow? Is "blue and gray" sufficient, or should it ask follow-up questions about brand values, industry, and target audience?
- If the model generates a mediocre DESIGN.md (AI slop aesthetics), does the validation pipeline catch it? The /i-audit "AI slop detection" checks rendered output, not the spec itself. Should there be a DESIGN.md quality check?
