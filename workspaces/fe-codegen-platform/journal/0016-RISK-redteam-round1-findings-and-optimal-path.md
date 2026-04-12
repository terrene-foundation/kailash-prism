---
type: RISK
date: 2026-04-12
created_at: 2026-04-12T19:50:00+08:00
author: agent
session_id: redteam-session2
session_turn: 1
project: fe-codegen-platform
topic: Red team round 1 — 5 HIGH findings, optimal path revision
phase: redteam
tags: [red-team, findings, optimal-path, session-3]
---

# Red Team Round 1: Findings and Optimal Path Revision

## Findings Summary

0 CRITICAL, 5 HIGH, 5 MEDIUM, 3 LOW across 7 audit dimensions (spec compliance, test coverage, security, code quality, UX, naming/licensing, value assessment).

### HIGH findings (all addressed or documented)

1. **H-1: Compiler zero tests** — 779 lines, no test file. FIXED: 51 tests added in this session.
2. **H-2: Layout engine missing Layer + Scroll primitives** — spec promises 6, only 4 implemented. Documented for Session 4.
3. **H-3: Form engine missing file upload drag-and-drop** — documented for Session 5.
4. **H-4: Form engine missing multi-step wizard** — documented for Session 5.
5. **H-5: Nav badge hardcoded "0"** — FIXED: badge.value prop added.

### Also fixed in this session
- Form/DataTable exports missing from `web/src/index.ts` — FIXED.

## Optimal Path Revision

Key insight: **AI Chat engine should come before atoms.** It's the differentiated feature. Every other engine has open-source equivalents; AI Chat with streaming/action plans/citations does not.

Second insight: **Extract atoms from engines, don't build bottom-up.** Engines already contain Button, Input, Checkbox etc. as internal implementations. Extracting them produces battle-tested atoms faster than building from YAML contracts.

Revised session map:
- Session 3: Speed checkpoint (compose reference page with existing engines)
- Session 4: AI Chat engine + Layer/Scroll primitives
- Session 5: Extract shared atoms from engines + complete Form/DataTable gaps
- Session 6: Page templates + /scaffold + /i-audit gate
- Session 7+: Flutter workstream (proven architecture)

## For Discussion

- Should the speed checkpoint use a real brief ("CRM contacts page") or a synthetic test?
- The atoms-from-engines approach trades spec purity for battle-testing. Is this acceptable?
- Flutter deferral to Session 7 means the "parallel execution" plan is effectively sequential. Is the risk reduction worth the throughput cost?
