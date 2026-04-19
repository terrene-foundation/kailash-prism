---
type: GAP
date: 2026-04-20
created_at: 2026-04-20T06:31:00+08:00
author: agent
session_id: redteam-convergence-2026-04-20
session_turn: post-round2
project: fe-codegen-platform
topic: 13 of 70 component YAMLs lack top-level version field; blocks batch codegen
phase: redteam
tags: [specs-authority, codegen, corpus-drift]
---

# 0022 — GAP — 13/70 component spec YAMLs missing `version:` field

**Status**: Deferred to spec-corpus cleanup shard

## Context

Codegen PoC (S8) landed a `spec-loader.ts` that validates each `specs/components/*.yaml` against a hand-rolled schema. `version` is declared REQUIRED on every component spec. 57 of 70 specs have `version:` at the top level; 13 do not:

```
button.yaml, badge.yaml, avatar.yaml, (+ 10 others)
```

The 13 specs still have a commented `# Spec version: X.Y.Z` header but no machine-readable top-level field. They pass `name`/`category` validation, so the drift is isolated.

## The gap

- Batch-mode `prism-codegen` runs will fail with `SCHEMA_VIOLATION` on the 13 files once we introduce a batch entry point.
- Round-1 security audit flagged this as MED-2.
- The spec authority (`rules/specs-authority.md`) requires spec files to be detailed authoritative sources — a missing `version` makes pin-to-release impossible.
- The codegen emitter reads `spec.version` into generated file headers (`@spec X v<version>`); without the field, every generated file for these 13 atoms would have an empty version or crash.

## What needs to happen

One-session shard: add `version: "0.1.0"` (or the value from the commented header) to each of the 13 YAML files, verify with `grep -l '^version:' specs/components/*.yaml | wc -l == 70`. No code changes needed.

## Cost if ignored

- Codegen cannot be run in batch mode — only against the ~57 compliant specs.
- The 13 atoms can never be codegen'd without a manual pre-step.
- `rules/specs-authority.md` MUST Rule 3 (spec files are detailed authorities) silently eroded.

## Tracking

Not filed as a GitHub issue (internal cleanup); will pick up in the next wave alongside the Layout migration shard or the MED-2 security hardening pass.

## For Discussion

1. **Counterfactual**: If the codegen loader were lenient (treat `version` as optional, default to `"0.0.0"`), would the drift get fixed or would it ossify — treating "0.0.0" as the permanent default because nothing breaks?
2. **Data**: The 13 non-compliant files are all atoms (button, badge, avatar, etc.) per `ls specs/components/*.yaml | xargs grep -L '^version:'`. Does that pattern suggest atoms were created in one early cohort before the version convention landed, and the convention was added at organism level first?
3. **Gate placement**: Should this check live in the `spec-loader.ts` (fail fast at codegen time) or in a pre-commit hook (fail fast at authoring time)? The former catches the error once it's already committed; the latter prevents it ever landing.
