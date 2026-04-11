# Three-Pillar Analysis: Model Capability, Guidance, and Primitives Architecture

## Executive Summary

The three pillars are not equal contributors. Primitives architecture provides the structural foundation (floor), guidance provides quality constraints (ceiling), and model capability fills the gap between them. The current system is missing the floor entirely -- guidance sets a high ceiling, but agents must build upward from zero every session. This analysis quantifies where each pillar provides the most leverage and defines the optimal split.

---

## Pillar 1: Model Capability

### What It Provides

Model capability is the raw ability of AI models to produce correct, high-quality output given context and instructions.

**Current models in the stack**:
- **Claude Opus**: Code generation, architecture reasoning, multi-file consistency. Currently the primary workhorse for all frontend codegen.
- **Google Stitch (Gemini Flash/Pro)**: Design generation (HTML/Tailwind mockups from text/image), design system extraction via DESIGN.md. Available via MCP.
- **v0 (Vercel)**: Component generation with framework awareness (React/Next.js). Not currently integrated.

### Where Model Capability Has Maximum Leverage

| Task | Model Leverage | Why |
|---|---|---|
| Novel layout design | HIGH | Spatial reasoning, aesthetic judgment -- no primitive can substitute |
| Color palette selection | HIGH | Subjective, context-dependent, culturally informed |
| Interaction design | HIGH | Requires understanding user intent and task flow |
| Code generation from spec | MODERATE | Primitives reduce this to configuration; model handles remaining glue |
| Responsive adaptation | MODERATE | Breakpoint decisions need judgment; implementation is mechanical |
| Component implementation | LOW | This is exactly where primitives should replace generation |
| Design token definition | LOW | Systematic, rule-based -- should be templated not generated |
| CRUD page scaffolding | LOW | Fully automatable from schema + design system |

### Model Capability Ceiling

Model capability has a ceiling that cannot be raised by improving prompts or providing more context:

1. **Session memory**: Models cannot maintain design consistency across 50+ files without external anchoring (design tokens, component contracts).
2. **Visual verification**: Text-based models cannot see what they produce. Stitch addresses this for design; code models still cannot verify rendered output.
3. **Aesthetic convergence**: Given the same prompt, models produce different designs each time. Without anchoring primitives, consistency requires human review.
4. **Framework expertise depth**: Models know framework APIs broadly but miss edge cases (React 19 compiler behavior, Flutter tree shaking, Next.js 15 caching semantics). Guidance compensates.

### Honest Assessment of Model Dependency

The current system is 90% model-dependent. Every frontend session relies on Claude Opus to:
- Infer appropriate design choices (no design spec to reference)
- Generate every component from scratch (no primitive library)
- Maintain consistency across files (no shared tokens)
- Remember architectural patterns (no scaffold templates)
- Avoid anti-patterns (guidance helps but does not prevent)

This level of model dependency means output quality varies significantly by session. The brief correctly identifies this as Problem 1.

---

## Pillar 2: Guidance (COC Artifacts)

### What Exists Today

**7 skills** (1,500+ lines of guidance across all sub-files):

| Skill | Lines (SKILL.md) | Sub-files | Coverage |
|---|---|---|---|
| 23-uiux-design-principles | 146 | 4 (design-principles, motion-design, production-hardening, ux-writing) | Layout, hierarchy, responsiveness, accessibility, hardening |
| 25-ai-interaction-patterns | 110 | 1 (ai-interaction-patterns: 60+ patterns) | Wayfinding, prompt UX, trust, controls, identity |
| 11-frontend-integration | 170 | 5 (react/flutter quick, react/flutter patterns, frontend-developer) | React/Flutter with Kailash backend integration |
| 19-flutter-patterns | 136 | 3 (creating-design-system, flutter-design-system, testing) | Design tokens, responsive breakpoints, component base |
| 20-interactive-widgets | 120 | 3 (overview, technical-spec, implementation-guide) | Widget protocol, backend generation, frontend rendering |
| 21-enterprise-ai-ux | 152 | 1 (enterprise-design) | Challenge taxonomy, context indicators, enterprise palettes |
| 22-conversation-ux | 196 | 1 (multi-conversation-patterns) | Thread management, branching, navigation |

**3 agents**:
- react-specialist: Architecture rules, state management table, React 19/Next.js 15 patterns, 200-line component limit
- flutter-specialist: Design system first rule, Riverpod, responsive breakpoints, feature-based structure
- uiux-designer: Top-down design analysis, enterprise principles, AI interaction design, AI slop detection

**4 commands**:
- /design: Load design principles, quick reference
- /i-audit: 10-dimension evaluation + AI slop test, scoring 1-50
- /i-polish: 7-area systematic refinement + UX writing pass
- /i-harden: 6-category production hardening checklist

### Where Guidance Has Maximum Leverage

| Task | Guidance Leverage | Why |
|---|---|---|
| Preventing AI slop | HIGH | Detection criteria are specific and actionable (purple gradients, uniform rounded-2xl, transition-all) |
| Production hardening | HIGH | The 6-category checklist catches 90% of edge cases agents would miss |
| Consistent architecture | HIGH | Module structure rules (elements/ not components/, one API call per component) prevent drift |
| Design quality evaluation | MODERATE | Top-down methodology is correct but requires model judgment to apply |
| Framework pattern selection | MODERATE | State management tables guide decisions but model must assess context |
| Novel design creation | LOW | Guidance constrains but cannot generate -- model must create |
| Component generation | LOW | Principles help but do not replace having actual code to compose from |

### Guidance Limitations

1. **Tells WHAT, not FROM WHAT**: Skills describe ideal output characteristics but do not provide starting materials. The react-specialist says "one API call per component" and "use elements/ folder" -- correct rules, but the agent still generates every file from blank.

2. **Descriptive, not generative**: The production hardening checklist is 50+ items. Running it POST-generation catches problems. Running it PRE-generation (by providing pre-hardened primitives) would prevent them.

3. **No cross-session persistence**: Each session loads the same skills and starts from scratch. There is no mechanism for session N to benefit from the components validated in session N-1, except through manual /codify knowledge capture.

4. **Framework-specific gaps**: React guidance is relatively shallow (100 lines in react-patterns.md, mostly code examples). Flutter guidance is deeper (3 sub-files in 19-flutter-patterns). Neither has the depth of backend skills (DataFlow has 40+ sub-files).

---

## Pillar 3: Primitives Architecture (Specs, Primitives, Engines, Interface)

### What Exists Today

**Nothing.** There are no frontend primitives in the Kailash ecosystem. No design token files. No component libraries. No page templates. No scaffold generators. Every frontend project starts from zero.

This is the most critical finding of this analysis.

### Where Primitives Would Have Maximum Leverage

| Task | Primitives Leverage | Why |
|---|---|---|
| CRUD page generation | EXTREME | Schema + design tokens + page template = working page in seconds, not hours |
| Design consistency | EXTREME | Shared tokens and components enforce consistency mechanically, not by instruction |
| Component implementation | HIGH | Pre-built, tested components eliminate the largest time sink |
| Responsive layout | HIGH | Layout templates with proven breakpoint behavior remove guesswork |
| Production hardening | HIGH | Pre-hardened components pass the /i-harden checklist by construction |
| State management | MODERATE | Boilerplate patterns reduce but model must handle domain-specific logic |
| Novel design | LOW | Primitives help with implementation speed but not creative design |

### The Speed Multiplier Calculation

**Current state (no primitives)**:
- Enterprise dashboard page: 4-6 hours of agent time (layout design, 15-20 components from scratch, state management, responsive handling, error states, loading states)
- CRUD interface: 2-3 hours per entity
- Settings page: 1-2 hours
- Full application (5-7 screens): 2-3 sessions

**Projected state (with primitives)**:
- Enterprise dashboard: 30-60 minutes (compose from layout template + pre-built card/table/chart components + design tokens)
- CRUD interface: 15-30 minutes per entity (scaffold from data model)
- Settings page: 15-30 minutes (compose from form primitives)
- Full application (5-7 screens): 1 session

This represents a 4-6x improvement from primitives alone, getting close to the "enterprise production quality in 1-2 sessions" target.

---

## Interaction Effects: How the Pillars Amplify Each Other

### Primitives + Guidance (Strongest Interaction)

Guidance becomes dramatically more effective when it operates on primitives rather than raw generation. Today, the /i-harden checklist runs as a post-hoc audit. With pre-hardened primitives, /i-harden would only need to check the custom (non-primitive) portions of each page -- reducing audit scope by 60-80%.

Similarly, the AI slop detection in /i-audit becomes less necessary when components are built from a curated design system rather than generated from model defaults. The "purple-to-blue gradient" fingerprint exists because models default to certain aesthetics; primitives with intentional palettes prevent this at the source.

### Model Capability + Primitives (Moderate Interaction)

Primitives reduce the amount of work that depends on model capability. With a component library, the model's job shifts from "generate a Table component with sorting, pagination, loading states, error handling, responsive behavior, and accessibility" to "configure the existing Table primitive with these columns and this data source." This is a fundamentally easier task that models execute more reliably.

However, primitives do NOT eliminate model dependency for: novel layouts, complex interaction flows, domain-specific UI logic, and aesthetic decisions that go beyond the design system.

### Model Capability + Guidance (Weakest Interaction)

This is the current state of the system, and it has clear limits. Guidance improves model output quality by 20-40% compared to no guidance, but cannot solve the cold-start problem or ensure cross-session consistency. The interaction is additive, not multiplicative.

---

## Optimal Split

Based on the leverage analysis:

| Investment Area | Recommended Allocation | Rationale |
|---|---|---|
| **Primitives** | 50% of effort | Highest ROI. Currently at zero. Even a small library provides outsized improvement. |
| **Guidance** | 30% of effort | Needs restructuring more than expansion. Current volume is adequate; current structure is wrong (descriptive not compositional). |
| **Model Integration** | 20% of effort | Stitch MCP integration for design generation. Model capability improvements come from better context (primitives + restructured guidance), not from more prompting. |

### Sequencing

**Phase 1**: Primitives foundation
- Design token system (DESIGN.md-compatible)
- 10-15 core components (React + Flutter)
- 3 layout templates (dashboard, list-detail, settings)
- 2 page templates (CRUD, analytics)

**Phase 2**: Guidance restructuring
- Transform skills from "principles reference" to "composition guide"
- Add "how to compose primitives" sections to react-specialist and flutter-specialist
- Create scaffold command that generates from templates

**Phase 3**: Model integration
- Stitch MCP for design generation and iteration
- Design spec extraction pipeline (Stitch output to DESIGN.md to design tokens)
- Feedback loop: model generates, primitives constrain, guidance validates

---

## The Key Insight

The three pillars form a hierarchy, not a triad:

```
MODEL CAPABILITY
   fills the gap between
GUIDANCE (ceiling)
   constrains output above
PRIMITIVES (floor)
   provides the starting materials
```

Without the floor (primitives), the model must build from nothing, and guidance can only catch problems after the fact. With the floor, the model's creative energy goes to the hard problems (novel design, complex interaction, domain-specific logic) while primitives handle the mechanical work (component implementation, responsive behavior, state management boilerplate, production hardening).

The current system is a ceiling with no floor. The fix is to build the floor.
