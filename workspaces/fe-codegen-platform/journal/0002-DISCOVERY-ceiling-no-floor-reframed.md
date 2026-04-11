---
type: DISCOVERY
date: 2026-04-11
phase: analyze
---

# The Real Problem: Three Conflated Responsibilities, Not Just Missing Primitives

Initial framing: "guidance is the ceiling, primitives are the missing floor." Red team revealed a deeper structural issue: the model simultaneously handles design, implementation, and validation in a single cognitive step.

Primitives address implementation. DESIGN.md addresses design. The validation pipeline (/i-audit, /i-polish, /i-harden) addresses quality. The fix is separation of concerns across these three responsibilities, not just "adding a floor."

The DESIGN.md protocol's genuine value is **persistence** — model-generated design decisions captured once and reused across sessions — not elimination of model judgment. Most Kailash users (backend devs) will have the model generate the DESIGN.md, then review it. This is fine. The value is making design decisions once, not re-deriving them every session.
