---
type: GAP
date: 2026-04-12
created_at: 2026-04-12T17:30:00+08:00
author: agent
session_id: redteam-preimpl
session_turn: 1
project: fe-codegen-platform
topic: Three engines need product decisions before implementation
phase: redteam
tags: [engines, specs, decisions, navigation, layout, ai-chat]
---

# Three Engines Need Product Decisions Before Implementation

Red team implementability audit found 3 of 6 engines have specification gaps that are PRODUCT decisions, not implementation details:

1. **Navigation**: top-nav and bottom-nav responsive behavior unspecified (sidebar is fully defined)
2. **Layout**: template-to-engine resolution algorithm undefined (how does a zone string become a component?)
3. **AI Chat**: conversation branching UX (what happens to later messages when user edits earlier one?), ActionPlanStep interface, reconnection strategy

These gaps are documented in `04-validate/engine-spec-gaps.md` for implementing agents to resolve during Sprint B1/B3a, with recommended decisions.

The 4 remaining engines (DataTable, Form, Theme, and component contracts) rated IMPLEMENTABLE — specs are sufficient for an agent to build without asking questions.

## For Discussion

- Should these decisions be made NOW (before implementation) or delegated to implementing agents? Making them now adds spec authoring time but prevents divergent agent decisions. Delegating is faster but risks inconsistency.
- The AI Chat branching decision is the most consequential — it affects the entire conversation data model. Should this be elevated to a brief-level decision rather than left to an implementing agent?
- The Layout engine's template resolution mechanism has architectural implications (static vs dynamic imports, tree-shaking behavior). Should the prism-architect agent be consulted before implementation?
