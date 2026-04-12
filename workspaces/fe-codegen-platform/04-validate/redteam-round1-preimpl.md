# Red Team Round 1: Pre-Implementation Validation

**Date**: 2026-04-12
**Scope**: Adversarial validation of complete analysis (brief, 9 research docs, 2 plans, 1 user flow, 11 specs, YAML artifacts) before implementation begins
**Method**: 7 parallel red team agents — traceability, consistency, implementability, closure, user flows, YAML stubs, value audit
**Convergence**: Round 1 findings below. Round 2 required for CRITICAL/HIGH items.

---

## Finding Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 2 | Must fix before implementation |
| HIGH | 4 | Must fix or decide before implementation |
| MEDIUM | 6 | Fix during implementation or acknowledge as deferred |
| LOW | 2 | Fix during implementation |

---

## CRITICAL Findings

### C-01: All YAML specs are stubs — implementation cannot proceed

**Source**: YAML Stub Audit agent
**Evidence**: Every file in `specs/` is a placeholder:
- `specs/tokens/schema.yaml` — 7 empty category names (`color: {}`, `typography: {}`)
- `specs/tokens/themes/enterprise.yaml` — name and description only, zero token values
- `specs/tokens/themes/modern.yaml` — same
- `specs/tokens/themes/minimal.yaml` — same
- `specs/layouts/grammar.yaml` — flat list of 6 primitive names, zero props/rules
- `specs/navigation/patterns.yaml` — flat list of 4 names, zero behavior
- `specs/components/` — empty (.gitkeep)
- `specs/templates/` — empty (.gitkeep)

**Impact**: The token compiler's job is `specs/ -> tailwind config + ThemeData`. It cannot compile empty stubs. The composition grammar references responsive rules and zone definitions that don't exist in machine-readable form. Every Phase 1 workstream depends on these YAML files.

**Root cause**: The detailed markdown specs in `docs/specs/` (hundreds of lines each) were never translated into their corresponding YAML files. The YAML layer was scaffolded but not populated.

**Resolution**: Phase 1 Workstream A must begin by populating YAML specs from the detailed markdown specifications. This is the compiler MVP's prerequisite. Add as explicit first task in Workstream A.

### C-02: Composition validator not a plan deliverable

**Source**: User Flow Validation agent
**Evidence**: Flow 1 Step 4 references a "composition validator" that checks token adherence, template zone usage, and layout primitive compliance. This validator appears in red team findings (08-red-team-findings.md line 109) as a recommendation but is NOT a line item in any workstream of the implementation plan.

**Impact**: Without a composition validator, the quality pipeline (/i-audit, /i-polish, /i-harden) has no way to verify that generated pages actually use Prism primitives and tokens. The plan's success metric (">70% of components use Prism primitives") has no automated measurement mechanism.

**Resolution**: Add composition validator as a Phase 1 Workstream D deliverable. Scope: lint-like tool that scans generated code for hardcoded values, non-primitive components, and template zone violations.

---

## HIGH Findings

### H-01: Three engines need design decisions before implementation

**Source**: Engine Spec Implementability agent
**Evidence**:
- **Navigation engine**: `top-nav` and `bottom-nav` styles listed but only sidebar responsive behavior specified. An implementer choosing `style: "top-nav"` has zero guidance.
- **Layout engine**: Template resolution algorithm undefined. `ZoneContent.engine` is a string — no defined resolution mechanism (registry, import map, etc.). `TemplateName` enum not in the engine spec (delegated to Spec 06).
- **AI Chat engine**: Branching UX (what happens to messages N+1..end when user edits message N?), `ActionPlanStep` interface never defined, reconnection semantics after SSE/WebSocket drop unspecified, `onConflict` callback referenced but never defined.

**Impact**: Implementing agents will make ad-hoc decisions that may contradict each other or the intended design. These are not implementation details — they are product decisions that affect user-visible behavior.

**Resolution**: Update docs/specs/05-engine-specifications.md with:
1. Navigation: top-nav and bottom-nav responsive rules (or explicitly mark as Phase 2)
2. Layout: template resolution algorithm + TemplateName enum inline
3. AI Chat: branching behavior, ActionPlanStep interface, reconnection strategy, onConflict signature

### H-02: Model vs guidance split boundary undefined

**Source**: Brief-to-Spec Traceability agent
**Evidence**: Brief Pillar 2 asks "What's the optimal split between model capability and structured guidance?" No spec section defines where model discretion ends and spec constraints begin. Implementing agents won't know when to follow specs literally vs exercise aesthetic judgment.

**Impact**: Inconsistent behavior — one agent follows token specs rigidly, another interprets them loosely. Quality varies by session, which is the original problem the system was designed to solve.

**Resolution**: Add a "Decision Authority" section to Spec 09 (COC Integration) or Spec 10 (Quality Gates) defining: which choices are spec-bound (token values, layout grammar, component contracts), which are model-discretionary (novel layouts, aesthetic decisions, domain-specific UI), and escalation rules.

### H-03: No minimum viable primitive set / critical path defined

**Source**: Brief-to-Spec Traceability agent
**Evidence**: All 25 atoms, 22 molecules, 22 organisms, 6 engines, and 11 templates are specified at equal priority. No spec defines which primitives must exist before engines become viable, or which engines must exist before templates work.

**Impact**: Implementing agents may build atoms bottom-up when the plan intends engines-first. Dependency ordering is implicit (e.g., DataTable engine needs Button, Input, Checkbox, Pagination atoms) but not specified.

**Resolution**: Add an "Implementation Critical Path" section to the implementation plan specifying dependency chains: token compiler -> theme -> atoms -> molecules -> organisms -> engines -> templates. Identify which atoms are engine prerequisites.

### H-04: Speed claim validation deferred past largest investment

**Source**: Value Audit Re-validation agent
**Evidence**: The plan commits 6-7 sessions to engine-building before any real project validates the speed hypothesis. The value audit's strongest recommendation was "validate with 3 real projects before heavy investment." The Mid-Phase 1 gate checks compiler correctness, not whether the approach actually saves time.

**Impact**: If the fundamental premise (primitives save time) is wrong, 6-7 sessions are wasted. The value audit suggested building 1 engine, using it on 1 real project, then deciding. This option is not in the plan.

**Resolution**: Consider adding a "speed checkpoint" to the Phase 1 gate — after Sprint B1 (2 engines: DataTable + Form), compose one reference page and time it vs generating the same page without Prism. If no measurable improvement, reconsider before building remaining engines. This can be a lightweight check, not a full project.

---

## MEDIUM Findings

### M-01: Plan uses "Stack" while specs use "VStack" + missing primitives

Plan lines 27, 40 reference "Stack"; all 10 specs use "VStack". Plan's Layout engine scope lists 4 primitives (Stack, Row, Grid, Split) while specs define 6 (VStack, Row, Grid, Split, Layer, Scroll). Layer and Scroll missing from Sprint B1.

### M-02: Nexus type extraction is Phase 3 but user flows assume Phase 1

Flow 1 Step 3 and Flow 3 both show React Query hooks generated from Nexus API types. This bridge is Phase 3 only. Phase 1 projects must hand-write hooks. Flows need a Phase 1 fallback note.

### M-03: No collaboration model or community flywheel

Value audit flagged this twice. Neither plan nor specs address multi-person workflows, design handoff, or contributor model. Explicitly deferred — acceptable if documented.

### M-04: Brand extraction has no Phase 1 path

Flow 2 Path C depends on Stitch (Phase 3) or Figma export (not in plan). If the user has an existing brand but no text description, Phase 1 has no extraction mechanism.

### M-05: Stitch MCP integration detail remains thin

Brief asks how Stitch informs architecture. Only Spec 01 S1.4.2 addresses this. Phase 3 Stitch integration has no spec document.

### M-06: Session-count quality target not in specs

Brief success criterion: "production quality in 1-2 sessions." Spec 10 defines quality scores (50-point scale) but no session budget. Quality and speed are separate metrics.

---

## LOW Findings

### L-01: Guidance compression lacks enforcement gate

300-line reduction target exists but no automated check that guidance actually decreases as primitives increase.

### L-02: Component responsive rules are prose, not structured data

Spec 03 uses natural language for responsive behavior ("Touch target 44px minimum") rather than structured values. Acceptable for atoms but may cause inconsistency at scale.

---

## Convergence Assessment

**Round 1 is NOT converged.** 2 CRITICAL + 4 HIGH findings must be resolved before implementation.

### Required Actions Before Round 2

1. **C-01**: Populate YAML specs from markdown specs (or acknowledge as Phase 1 Sprint A1 first task)
2. **C-02**: Add composition validator to plan
3. **H-01**: Update engine specs with missing design decisions
4. **H-02**: Add decision authority section to specs
5. **H-03**: Add implementation critical path to plan
6. **H-04**: Add speed checkpoint after Sprint B1
7. **M-01**: Fix Stack→VStack naming and add Layer/Scroll to Layout engine scope

### Round 2 Trigger

After the above actions are taken, run Round 2 to verify closure and check for 0 CRITICAL + 0 HIGH findings.
