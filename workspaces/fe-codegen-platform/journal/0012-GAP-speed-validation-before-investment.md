---
type: GAP
date: 2026-04-12
created_at: 2026-04-12T17:30:00+08:00
author: agent
session_id: redteam-preimpl
session_turn: 1
project: fe-codegen-platform
topic: Speed claim unvalidated before largest investment block
phase: redteam
tags: [speed, validation, value, risk]
---

# Speed Claim Unvalidated Before Largest Investment

The value audit's strongest critique remains only partially addressed: the plan commits 6-7 sessions to engine-building before any real project validates whether primitives actually save time. The value audit recommended "validate with 3 real projects before heavy investment."

**Resolution**: Added a "Speed Checkpoint" after Sprint B1 (Session 3). After DataTable + Form engines exist, compose one reference page with Prism vs estimate without. If no measurable improvement (<60% of no-Prism estimate), pause and diagnose before committing to remaining sprints.

This is a compromise: not as lean as "1 engine + 1 real project first" but provides early signal before 60% of the investment is committed. By Session 3, only ~3 of 6-7 sessions have been spent.

## For Discussion

- Is a reference page benchmark sufficient, or does the speed check need to be a real project to be meaningful?
- The 60% threshold — is this too aggressive? The value audit suggested "first project is ~2-3x faster, not 5x." At 2x, 60% = 50% time, which is achievable. At 3x, it's 33%. Should the threshold be <70% instead?
- If the checkpoint shows no improvement, what's the exit strategy? Abandon Prism? Simplify to tokens-only (no engines)? This decision path isn't defined.
