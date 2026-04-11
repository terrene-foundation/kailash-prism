---
type: GAP
date: 2026-04-11
phase: analyze
---

# Primitive Hosting: Where Does Frontend Code Live?

Critical unresolved question. Loom/ is "no code" but frontend primitives ARE code. The sync-manifest.yaml has no provision for frontend code artifacts.

Proposed resolution (hybrid): Specs and composition grammar live in loom/.claude/skills/ (these are COC artifacts). Reference component implementations live in a new kailash-fe/ repo (this is code). Design tokens compile from specs to framework-specific formats.

This needs architectural decision and implementation before Phase 1 can complete. Classified as CRITICAL by the red team, despite being listed as MODERATE in the initial gap analysis.
