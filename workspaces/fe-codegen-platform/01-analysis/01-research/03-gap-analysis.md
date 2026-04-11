# Gap Analysis: Current State vs Enterprise Production Quality in 1-2 Sessions

## Executive Summary

The current frontend COC stack has comprehensive GUIDANCE (7 skills, 3 agents, 4 commands) but zero PRIMITIVES, no TOOLING for design-to-code pipelines, and no INTEGRATION between design tools and the code generation workflow. Of 34 identified gaps, 12 are missing primitives, 8 are missing guidance restructuring, 9 are missing tooling, and 5 are missing integration. The primitives gap is both the largest and the most impactful.

---

## Inventory: What Exists

### Skills (7)

| Skill | Category | Depth | Actionability |
|---|---|---|---|
| 23-uiux-design-principles | Design | Deep (4 sub-files, 200+ checklist items) | High -- specific, measurable criteria |
| 25-ai-interaction-patterns | AI UX | Deep (60+ patterns from Shape of AI) | Moderate -- catalog, not instructions |
| 11-frontend-integration | Integration | Moderate (5 sub-files, code examples) | High -- copy-paste patterns |
| 19-flutter-patterns | Flutter | Moderate (3 sub-files) | Moderate -- principles + examples |
| 20-interactive-widgets | Widgets | Moderate (3 sub-files, JSON protocol) | High -- protocol spec is implementable |
| 21-enterprise-ai-ux | Enterprise | Moderate (1 sub-file) | Moderate -- patterns + palette |
| 22-conversation-ux | Chat UX | Moderate (1 sub-file) | Moderate -- data model + layout |

### Agents (3)

| Agent | Lines | Model | Key Rules |
|---|---|---|---|
| react-specialist | 105 | Opus | 6 critical rules, module structure, state management table, React 19+Next.js 15 |
| flutter-specialist | 144 | Opus | 6 critical rules, design system first, Riverpod, feature-based structure |
| uiux-designer | 115 | Opus | Top-down analysis, enterprise principles, AI interaction, AI slop detection |

### Commands (4)

| Command | Purpose | Lines |
|---|---|---|
| /design | Load design principles | 107 |
| /i-audit | 10-dimension design audit + AI slop | 126 |
| /i-polish | 7-area visual refinement | 137 |
| /i-harden | 6-category production hardening | 93 |

---

## Gap Register

### Category 1: Missing Primitives (12 gaps)

These are things that need to EXIST as artifacts (code files, token files, template files) before the speed multiplier kicks in.

| ID | Gap | Impact | Priority |
|---|---|---|---|
| P-01 | **No design token system** -- No shared color, spacing, typography, shadow tokens in any format (CSS variables, Tailwind config, Flutter constants, DESIGN.md) | Every project invents its own palette. Cross-session consistency impossible. AI slop is the default because models use their own defaults. | CRITICAL |
| P-02 | **No component library (React)** -- No pre-built Shadcn-configured components with enterprise theming, loading states, error states, responsive behavior | Every component generated from scratch. 15-20 components per page x 4-6 hours. | CRITICAL |
| P-03 | **No component library (Flutter)** -- Same gap but for Flutter. The flutter-specialist references `design_system.dart` and `component_showcase.dart` that do not exist as reusable primitives. | Flutter projects start from even further behind because the agent expects files that are not there. | CRITICAL |
| P-04 | **No layout templates** -- No pre-built dashboard layout, list-detail layout, settings layout, auth layout | Layout is the most time-consuming part of enterprise UI. Doing it from scratch every time is the core of the cold-start penalty. | HIGH |
| P-05 | **No page templates** -- No CRUD page scaffold, analytics dashboard scaffold, onboarding flow scaffold | DataFlow generates 11 nodes per model. The frontend has no equivalent auto-generation. | HIGH |
| P-06 | **No form system** -- No pre-built form components with validation, error display, field types, submission handling | Forms are 40-60% of enterprise UI. Generated forms rarely handle validation edge cases correctly. | HIGH |
| P-07 | **No table/data grid** -- No pre-built sortable, filterable, paginated table with column configuration | Tables are the other 30-40% of enterprise UI. Generated tables miss sorting, pagination, virtual scrolling. | HIGH |
| P-08 | **No navigation primitives** -- No sidebar, top nav, breadcrumb, tab system with responsive behavior | Navigation is boilerplate that should never be generated from scratch. | MODERATE |
| P-09 | **No empty/loading/error state library** -- No pre-built state components with proper illustrations and microcopy | The /i-harden checklist flags missing states. Pre-built states would pass by construction. | MODERATE |
| P-10 | **No chart/visualization primitives** -- No pre-configured chart components (line, bar, pie, metric card) | Every analytics dashboard reinvents chart integration. | MODERATE |
| P-11 | **No toast/notification system** -- No pre-built feedback components | Every project creates its own toast system differently. | LOW |
| P-12 | **No icon system** -- No curated icon set with semantic naming | Agents pick random icon libraries each session. | LOW |

### Category 2: Missing Guidance (Restructuring) (8 gaps)

These are not "more skills" but restructuring existing skills to work WITH primitives rather than as standalone references.

| ID | Gap | Impact | Priority |
|---|---|---|---|
| G-01 | **No composition guide** -- Skills describe WHAT good UI looks like but not HOW to compose primitives into pages. No "given these primitives, here is how to build a dashboard." | Agents cannot leverage primitives without assembly instructions. Having parts without instructions is like having nodes without WorkflowBuilder. | CRITICAL |
| G-02 | **No design spec protocol** -- No standard for how design decisions are captured and communicated between design tools and code generation. Stitch uses DESIGN.md; COC has no equivalent. | Design decisions evaporate between sessions. Each session re-invents the design system. | CRITICAL |
| G-03 | **React guidance is shallow** -- react-specialist is 105 lines. react-patterns.md is mostly code examples with no architectural depth. Compare to DataFlow (40+ sub-files). | React is the primary web target but has the least guidance depth. | HIGH |
| G-04 | **No cross-framework mapping** -- No guide for "this React pattern corresponds to this Flutter pattern." Agents working on both web and mobile re-derive everything. | Dual-target projects (web + mobile) take 2x the time instead of 1.3x. | HIGH |
| G-05 | **No scaffold command** -- No `/scaffold` or equivalent that generates a project structure from a data model + design system selection. | The cold-start penalty is not addressed by any existing command. /design loads principles but does not generate structure. | HIGH |
| G-06 | **AI interaction patterns are catalog not playbook** -- Skill 25 has 60+ patterns from Shape of AI but no decision tree for "building an enterprise AI app, which 8 patterns do you need?" | Agents read the catalog and pick patterns inconsistently. | MODERATE |
| G-07 | **No accessibility testing guide** -- Production hardening checklist covers accessibility items but no agent or skill specializes in WCAG testing. | Accessibility compliance is mentioned but not systematically verified. | MODERATE |
| G-08 | **uiux-designer has no design generation capability** -- Agent can analyze and critique but cannot generate designs (no Stitch integration, no wireframe tools). | Design analysis without design generation means the agent can say "this is wrong" but not "here is the right version." | MODERATE |

### Category 3: Missing Tooling (9 gaps)

These are capabilities that need to be built into the COC system (commands, hooks, scripts).

| ID | Gap | Impact | Priority |
|---|---|---|---|
| T-01 | **No design-to-tokens pipeline** -- No automated way to go from a design (Stitch output, Figma export, or manual spec) to design token files (CSS variables, Tailwind config, Flutter constants). | Design tokens must be hand-written every time. | HIGH |
| T-02 | **No component scaffolder** -- No tool that generates a component skeleton with props interface, loading state, error state, responsive behavior, test file from a component spec. | Every component is written from blank, missing standard states. | HIGH |
| T-03 | **No visual regression testing** -- No integration with Percy, Chromatic, or Flutter golden tests for catching visual regressions. | Design quality degrades across sessions with no automated catch. | HIGH |
| T-04 | **No responsive preview** -- No automated way to verify responsive behavior across breakpoints (375px, 768px, 1024px+). | /i-harden checklist requires responsive testing but agents cannot see rendered output. | MODERATE |
| T-05 | **No accessibility scanner** -- No axe-core, Lighthouse, or Flutter accessibility service integration. | WCAG compliance is aspirational without automated verification. | MODERATE |
| T-06 | **No design system validator** -- No tool that checks whether a page correctly uses the design token system (no hardcoded colors, no magic spacing numbers). | Design token adoption cannot be enforced mechanically. | MODERATE |
| T-07 | **No CRUD generator** -- No equivalent of DataFlow's auto-generation for frontend. Given a DataFlow model definition, there should be a way to generate matching frontend CRUD pages. | Every CRUD page is written by hand when the schema already has all the information needed. | MODERATE |
| T-08 | **No Stitch MCP integration** -- The Stitch MCP server exists but is not connected to the COC workflow. No command invokes it; no skill references it. | An available design generation tool sits unused. | MODERATE |
| T-09 | **No cross-platform build verification** -- No way to verify that web and mobile outputs are functionally equivalent. | Dual-target projects require manual comparison. | LOW |

### Category 4: Missing Integration (5 gaps)

These connect existing pieces that are currently isolated.

| ID | Gap | Impact | Priority |
|---|---|---|---|
| I-01 | **No design-to-code pipeline** -- No workflow from design generation (Stitch/Figma) through spec extraction through code generation through validation. | The end-to-end pipeline does not exist as a connected system. Each step is manual. | HIGH |
| I-02 | **No Nexus-to-frontend bridge** -- Nexus auto-generates API endpoints from DataFlow models. There is no corresponding auto-generation of frontend API client types from Nexus schemas. | Frontend agents manually create TypeScript/Dart types that already exist in the Nexus schema. | HIGH |
| I-03 | **No primitive library distribution** -- Even if primitives are created, there is no mechanism for distributing them to new projects (npm package? git submodule? copy scaffold?). | Primitives exist but each project must manually copy them. | MODERATE |
| I-04 | **No /design + /implement handoff** -- The /design command loads principles but does not produce artifacts consumed by /implement. There is no structured handoff between design analysis and code generation. | Design decisions made during /design are lost by the time /implement runs. | MODERATE |
| I-05 | **No Marionette integration for frontend validation** -- The Marionette MCP server for Flutter exists but is not connected to the /i-audit or /i-harden workflow for automated UI validation. | A tool for inspecting running Flutter UI exists but is not used for quality validation. | LOW |

---

## Priority Matrix

### Must Have (blocks "enterprise quality in 1-2 sessions")

| Gap | Category | Effort (sessions) |
|---|---|---|
| P-01: Design token system | Primitives | 1 |
| P-02: React component library | Primitives | 2-3 |
| P-03: Flutter component library | Primitives | 2-3 |
| G-01: Composition guide | Guidance | 1 |
| G-02: Design spec protocol | Guidance | 1 |

### Should Have (significant quality/speed improvement)

| Gap | Category | Effort (sessions) |
|---|---|---|
| P-04: Layout templates | Primitives | 1-2 |
| P-05: Page templates | Primitives | 1-2 |
| P-06: Form system | Primitives | 1 |
| P-07: Table/data grid | Primitives | 1 |
| G-03: Deeper React guidance | Guidance | 1 |
| G-05: Scaffold command | Guidance | 1 |
| T-01: Design-to-tokens pipeline | Tooling | 1 |
| T-02: Component scaffolder | Tooling | 1 |
| I-01: Design-to-code pipeline | Integration | 1-2 |
| I-02: Nexus-to-frontend bridge | Integration | 1 |

### Nice to Have (refinement)

All remaining gaps (P-08 through P-12, G-04/G-06/G-07/G-08, T-03 through T-09, I-03 through I-05).

---

## Cross-Reference with Success Criteria

| Success Criterion | Gaps That Block It |
|---|---|
| Frontend projects achieve production quality in 1-2 sessions | P-01, P-02, P-03, P-04, P-05, G-01, G-05 |
| Design consistency across projects without manual oversight | P-01, G-02, T-06 |
| Both web (React/Next.js) and mobile (Flutter) covered | P-02, P-03, G-04 |
| Enterprise-grade: accessible, responsive, hardened, performant | P-06, P-07, P-09, T-03, T-04, T-05 |
| The system compounds -- each project makes the next faster | I-03, G-02, T-01 |

The first criterion is blocked by 7 gaps. The compounding criterion is blocked by 3 gaps. This confirms that the primitives gap is the primary blocker and the integration/distribution gap prevents compounding.
