---
type: CONNECTION
date: 2026-04-12
created_at: 2026-04-12T16:45:00+08:00
author: agent
session_id: analyze-v2
session_turn: 1
project: fe-codegen-platform
topic: Composition grammar must ship before engines, not after
phase: analyze
tags: [composition, engines, timing, fail-05]
---

# Composition Grammar Must Ship Before Engines

Red team round 2 surfaced a timing dependency: the original plan had composition grammar in Workstream D shipping at Session 4, AFTER engines in Sessions 2-3. This means engines would be built without the grammar that tells agents how to compose them — agents would compose ad hoc, then the grammar would arrive and potentially contradict their choices.

This is FAIL-05 (composition layer never materializes) in a subtler form: not absent, but too late.

**Connection**: The Kailash backend analogy holds here. WorkflowBuilder (the composition system) was built BEFORE the 140+ nodes, not after. Nodes are designed to be composed by the builder. Without the builder spec, nodes make independent assumptions about connection interfaces that may not align.

**Resolution**: Moved composition grammar to Session 1-2 in Workstream D. It starts as a DRAFT in Session 1 (alongside specs), then finalizes in Session 2 (alongside the first engines). This way engines are built WITH the grammar from the start, not retrofitted to match it.

## For Discussion

- Should the composition grammar be considered part of Workstream A (specs) rather than Workstream D (COC artifacts)? It's a spec-level artifact, not a COC skill.
- If the grammar draft proves wrong after engines are built, what's the cost of revising it? Is it cheaper to draft→validate→finalize, or to build engines first and derive the grammar from what works?
- The grammar's `Custom` escape hatch (FAIL-09 mitigation) — does having an escape hatch undermine the grammar's authority? Will agents default to Custom when the grammar is inconvenient?
