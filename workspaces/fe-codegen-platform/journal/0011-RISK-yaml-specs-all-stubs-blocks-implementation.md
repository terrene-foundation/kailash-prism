---
type: RISK
date: 2026-04-12
created_at: 2026-04-12T17:30:00+08:00
author: agent
session_id: redteam-preimpl
session_turn: 1
project: fe-codegen-platform
topic: All YAML specs are stubs — blocks compiler and implementation
phase: redteam
tags: [yaml, specs, compiler, critical, blocking]
---

# All YAML Specs Are Stubs — Blocks Implementation

Pre-implementation red team discovered that every machine-readable YAML file in `specs/` is a placeholder:
- Token schema: empty categories (`color: {}`)
- Theme files: name/description only, zero actual values
- Grammar: flat list of 6 names, zero props or rules
- Components: empty directory
- Templates: empty directory

The detailed markdown specs in `docs/specs/` contain hundreds of lines of implementable definitions that were never translated into YAML. The token compiler's job (`specs/ -> tailwind.config.ts + ThemeData`) cannot operate on empty stubs.

**Resolution**: Added "YAML spec population" as the FIRST task in Workstream A. This is the prerequisite for compiler MVP, which is the prerequisite for engine workstreams.

**Impact on timeline**: YAML population adds approximately 0.5 sessions to Workstream A (the data exists in markdown, it needs translation to YAML, not invention). The 6-7 session Phase 1 estimate absorbs this.

## For Discussion

- Should YAML population be automated? A script that parses the markdown spec structure into YAML could reduce manual translation effort.
- Is the YAML format correct? The existing stubs suggest a structure that may not match what the compiler expects. Should the compiler team define the schema first, then populate?
- Should `docs/specs/` remain the authoritative source, with YAML generated from it? Or should YAML become authoritative after population, with markdown as documentation?
