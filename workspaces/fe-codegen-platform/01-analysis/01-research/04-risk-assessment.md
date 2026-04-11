# Risk Assessment: Frontend Codegen Platform

## Executive Summary

This analysis identifies 14 risks across four dimensions: over-engineering, under-delivery, technology coupling, and organizational/process risks. Three risks are Critical (must mitigate before proceeding), four are Major (require mitigation plans), and seven are Significant or Minor. The single highest risk is building a system that is too complex to maintain -- the backend SDK took years of development to reach 140+ nodes, and attempting the same scope for frontend in a few sessions would fail.

---

## Risk Register

### Critical Risks (High Probability + High Impact)

#### RISK-01: Over-engineering the Architecture

**Description**: Attempting to build a full four-layer system (Specs, Primitives, Engines, Interface) mirroring the Kailash backend SDK, including a custom "frontend orchestration engine."

**Probability**: HIGH (the brief explicitly uses the four-layer Kailash pattern as the reference architecture).

**Impact**: HIGH. An over-engineered system would take 10-15 sessions to build, be fragile, and impose more overhead than it removes. The backend SDK's engine layer (WorkflowBuilder, DAG runtime, cycle detection) is the product of hundreds of hours of development. There is no equivalent engine to build for frontend -- React and Flutter already are the engines.

**Root Cause**: The Kailash backend pattern is being treated as a template to copy rather than a principle to learn from. The principle is "composition from primitives beats generation from scratch." The implementation is domain-specific.

**Mitigation**:
- Accept that the frontend architecture is three layers (specs, primitives, composition guidance), not four.
- Do NOT build a custom frontend runtime, orchestration engine, or "workflow builder for components."
- Scope the engine layer as "the COC agent system itself" -- skills, agents, and commands are the orchestrator.
- Review every proposed artifact against the question: "Does this reduce time-to-production, or does it add a layer of abstraction?"

**Residual Risk After Mitigation**: LOW.

---

#### RISK-02: Primitives That Rot

**Description**: Building a component library that becomes stale, diverges from framework updates, and eventually becomes a maintenance burden rather than a speed multiplier.

**Probability**: HIGH. Frontend frameworks update frequently (React 19, Next.js 15, Flutter's annual major releases). Component libraries that are not continuously updated become liabilities. The Kailash SDK has a full-time development workflow that keeps its 140+ nodes current; a frontend component library would need the same.

**Impact**: HIGH. Stale primitives are worse than no primitives -- agents would compose from outdated components, producing code with deprecated patterns, security vulnerabilities, and performance regressions. Users would encounter "it worked when we built it" failures.

**Root Cause**: Frontend frameworks move faster than backend runtimes. React had 3 major paradigm shifts in 5 years (hooks, server components, compiler). Dart/Flutter has annual breaking changes.

**Mitigation**:
- Start with THIN primitives: design tokens + component contracts (interfaces/types), not full implementations.
- Use Shadcn's model for React: components are COPIED into the project, not imported from a package. This means updates happen at the project level, not the library level.
- For Flutter: use a minimal design system file (tokens + base components) that extends Material 3 rather than replacing it.
- Version-pin primitives to framework versions. A "React 19 + Next.js 15" primitive set is a snapshot, not a living library.
- Build a /validate check that flags when project framework versions diverge from primitive versions.

**Residual Risk After Mitigation**: MODERATE. Degradation is slowed but not eliminated. Annual review cycles needed.

---

#### RISK-03: Dual-Target Complexity (React + Flutter)

**Description**: Building and maintaining primitives for BOTH React/Next.js AND Flutter doubles the development and maintenance surface.

**Probability**: HIGH. The brief requires both web and mobile coverage.

**Impact**: HIGH. Component libraries are not portable. A React Card component and a Flutter AppCard share concepts but zero code. Every primitive must be built twice, tested twice, documented twice. At 15 components x 2 frameworks = 30 components to build and maintain. Layout templates, page templates, and design tokens have SOME overlap (tokens can share values) but implementations diverge completely.

**Root Cause**: Web and mobile use fundamentally different rendering models (DOM vs widget tree), state management patterns (hooks/zustand vs Riverpod), and styling systems (CSS/Tailwind vs Flutter themes).

**Mitigation**:
- Phase the targets: React/Next.js first (web is the more common enterprise target), Flutter second.
- Share design tokens at the SPEC level (DESIGN.md defines colors and spacing as abstract values; each framework maps them to its own token format).
- Do NOT attempt a "universal component library" that targets both frameworks from one source.
- Accept that Flutter primitives will be 1-2 phases behind React primitives.

**Residual Risk After Mitigation**: MODERATE. Reduced scope but still 2x maintenance long-term.

---

### Major Risks (High Probability OR High Impact)

#### RISK-04: Stitch Dependency on Google

**Description**: Integrating Google Stitch as a core part of the design pipeline creates a dependency on a Google Labs product with no guaranteed stability, pricing, or long-term availability.

**Probability**: MODERATE. Google Labs products have a history of being discontinued (10+ products shut down in the last 5 years). Stitch is free today but may not remain free or available.

**Impact**: HIGH. If Stitch becomes the primary design generation tool and is discontinued or paywalled, the entire design-to-code pipeline breaks.

**Mitigation**:
- Treat Stitch as an OPTIONAL accelerator, not a required dependency.
- Design the DESIGN.md protocol as a standalone spec that can be written manually or generated by any tool (Stitch, Figma plugins, manual authoring, future AI tools).
- Ensure the pipeline works WITHOUT Stitch: manual DESIGN.md authoring as the fallback.
- Do NOT store Stitch-specific artifacts (project IDs, screen references) in the primitives layer.

**Residual Risk After Mitigation**: LOW. Stitch becomes a convenience, not a dependency.

---

#### RISK-05: Primitives That Constrain Rather Than Enable

**Description**: A rigid component library forces every project into a single aesthetic, making the system unsuitable for diverse client needs (different brands, different industries, different design languages).

**Probability**: MODERATE. The natural tendency when building primitives is to bake in design decisions (specific colors, specific border radii, specific animation curves). This produces a "design system" rather than a "design system framework."

**Impact**: HIGH. Enterprise clients require brand-specific customization. A primitives library that produces visually identical applications is a demo tool, not a production tool.

**Root Cause**: Conflating "design tokens" (the customizable values) with "design system" (the opinionated application of those values).

**Mitigation**:
- Separate tokens from components. Tokens are the customizable layer; components consume tokens.
- Build components as "unstyled" or "minimally styled" primitives that receive tokens via theme/config.
- Provide 2-3 example token sets (enterprise professional, startup modern, minimal/content-first) but make it clear these are examples, not defaults.
- Test every component with at least 2 different token sets to verify theming works.

**Residual Risk After Mitigation**: LOW if token/component separation is enforced.

---

#### RISK-06: Guidance Overload

**Description**: Adding composition guides, design spec protocols, scaffold commands, and cross-framework mappings to the existing 7 skills + 3 agents + 4 commands creates a guidance corpus so large that agents spend more time reading context than generating code.

**Probability**: MODERATE. The CC artifact quality rules (cc-artifacts.md) already flag this: skills must follow progressive disclosure, commands must be under 150 lines, agents under 400 lines. Adding more artifacts increases context pressure.

**Impact**: MODERATE. Excessive context causes agents to skip or misapply guidance. The model has finite attention; guidance beyond the attention budget is effectively absent.

**Root Cause**: Each gap identified in the gap analysis suggests a new artifact. Addressing all 34 gaps as separate artifacts would produce an unmanageable corpus.

**Mitigation**:
- Consolidate rather than expand. Merge composition guides INTO existing skills rather than creating new ones.
- Replace verbose guidance with primitives. "Generate a loading skeleton" is worse than "import LoadingSkeleton from primitives."
- Apply the 80/20 rule: 3-4 well-structured skills beat 10 mediocre ones.
- Measure: after adding guidance, run a test session and check whether the agent actually uses the new guidance or ignores it.

**Residual Risk After Mitigation**: LOW if discipline is maintained.

---

#### RISK-07: Under-Delivery on Quality Promise

**Description**: The system achieves speed (1-2 sessions) but the output does not meet "enterprise production quality" -- failing accessibility audits, lacking responsive behavior, missing error states, exhibiting AI slop.

**Probability**: MODERATE. Speed and quality are naturally in tension. Primitives address this partially (pre-tested components) but composition (how primitives are assembled) can still produce quality failures.

**Impact**: HIGH. "Fast but not production-ready" is worse than "slow but correct" because it creates false confidence. Projects ship faster but need rework, eroding trust in the system.

**Mitigation**:
- Make /i-audit and /i-harden mandatory gates in the frontend workflow (not optional commands).
- Ensure primitives pass /i-harden by construction (built with all states, responsive behavior, accessibility attributes).
- Build quality into the composition guidance: not just "how to assemble pages" but "how to assemble pages that pass the audit."
- Acceptance test: every primitive set must produce a reference application that scores 40+ on the /i-audit 50-point scale.

**Residual Risk After Mitigation**: MODERATE. Quality at the composition level still depends on model capability.

---

### Significant Risks (Medium Probability + Medium Impact)

#### RISK-08: Premature Optimization of the Primitives Library

**Description**: Building 50+ components before validating that the first 10 actually accelerate real projects.

**Probability**: MODERATE. The gap analysis identifies 12 missing primitive categories; the temptation is to build all of them.

**Impact**: MODERATE. Effort spent on unused primitives is wasted. The 80/20 rule suggests 10-15 components cover 80% of use cases.

**Mitigation**: Build the minimum viable primitive set (tokens + 10 components + 2 layouts), use it on 2-3 real projects, then expand based on actual needs.

---

#### RISK-09: Token Format Fragmentation

**Description**: Design tokens exist in multiple incompatible formats (CSS variables, Tailwind config, Flutter constants, DESIGN.md) with no single source of truth.

**Probability**: MODERATE. Each framework has its own token format.

**Impact**: MODERATE. Tokens drift between formats, producing inconsistent styling.

**Mitigation**: DESIGN.md (or similar) as the single source. Generate framework-specific formats from it.

---

#### RISK-10: Model Version Sensitivity

**Description**: Primitives and guidance are tuned to Claude Opus 4's capabilities. A model upgrade (or downgrade) changes code generation quality in ways that break the system.

**Probability**: MODERATE. Model capabilities shift with each version.

**Impact**: MODERATE. Guidance that works with one model may not work with another.

**Mitigation**: Test primitive composition with at least 2 model versions before depending on it. Keep guidance framework-focused (React/Flutter patterns) rather than model-focused (prompt engineering).

---

#### RISK-11: Stitch MCP Immaturity

**Description**: The Stitch MCP server (`@_davideast/stitch-mcp`) is a community package, not an official Google product. It may be buggy, incomplete, or abandoned.

**Probability**: MODERATE.

**Impact**: LOW-MODERATE. The MCP integration is a convenience, not a dependency (per RISK-04 mitigation).

**Mitigation**: Evaluate the MCP server independently before integrating. Have a manual fallback for every MCP-dependent step.

---

### Minor Risks (Low Probability + Low Impact)

#### RISK-12: Community Expectations Mismatch

**Description**: Open-sourcing frontend primitives creates community expectations for maintenance, support, and feature requests that the Foundation is not staffed to meet.

**Probability**: LOW. The primitives are initially for internal COC use.

**Impact**: LOW. Can be managed with clear documentation of scope.

**Mitigation**: Keep primitives internal until validated. Consider open-sourcing later as a separate decision.

---

#### RISK-13: Licensing Complexity with Stitch Outputs

**Description**: Stitch generates HTML/CSS from Google's Gemini models. The licensing status of AI-generated design artifacts may be ambiguous.

**Probability**: LOW. Google's terms of service for Stitch likely grant usage rights.

**Impact**: LOW. Design tokens derived from Stitch outputs are sufficiently transformed.

**Mitigation**: Review Stitch terms of service before integrating. Ensure all primitives are original implementations, not Stitch copy-pastes.

---

#### RISK-14: v0 Integration Adds Complexity Without Value

**Description**: Adding Vercel's v0 as a third model in the stack (alongside Claude and Stitch) creates integration complexity without clear incremental value.

**Probability**: LOW (v0 is not currently in the stack).

**Impact**: LOW. Each additional model adds a context-switching cost for agents.

**Mitigation**: Do not integrate v0 unless a specific capability gap is identified that neither Claude nor Stitch can fill.

---

## Risk Heat Map

```
                    IMPACT
              Low    Med    High
         ┌────────┬────────┬────────┐
  High   │        │ R-08   │ R-01   │
         │        │        │ R-02   │
Prob.    │        │        │ R-03   │
         ├────────┼────────┼────────┤
  Med    │ R-11   │ R-09   │ R-04   │
         │        │ R-10   │ R-05   │
         │        │        │ R-06   │
         │        │        │ R-07   │
         ├────────┼────────┼────────┤
  Low    │ R-12   │        │        │
         │ R-13   │        │        │
         │ R-14   │        │        │
         └────────┴────────┴────────┘
```

## Complexity Score

| Dimension | Score | Rationale |
|---|---|---|
| Governance | 5 | Foundation IP, no external dependencies beyond optional Stitch |
| Legal | 3 | Apache 2.0, Stitch TOS review needed |
| Strategic | 8 | Dual-framework, model dependency, primitives maintenance |
| Technical | 7 | Two frameworks, token pipeline, MCP integration |
| **Total** | **23** | **Complex** (threshold: 21+) |

This is a Complex initiative. It requires phased delivery with validation gates between phases. Attempting to deliver the full vision in a single sprint would trigger RISK-01 (over-engineering) and RISK-08 (premature optimization).

---

## Recommended Risk Mitigation Sequence

1. **Before any building**: Accept the three-layer architecture (not four). This mitigates RISK-01.
2. **Phase 1 gate**: Build minimum primitives for React only (tokens + 10 components). Validate on 1 real project. This mitigates RISK-02, RISK-03, RISK-05, RISK-08.
3. **Phase 2 gate**: Add composition guidance and scaffold command. Validate speed improvement. This mitigates RISK-06, RISK-07.
4. **Phase 3 gate**: Add Stitch MCP integration as optional accelerator. This mitigates RISK-04, RISK-11, RISK-13.
5. **Phase 4 gate**: Extend to Flutter. This mitigates RISK-03 (second framework).
