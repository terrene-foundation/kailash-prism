# Frontend Codegen Platform Analysis

## Problem Statement

Current COC frontend capabilities have two fundamental limitations:

1. **Model dependency** — Design quality relies entirely on Claude's native abilities. No structured system ensures consistent, production-grade output. Results vary by prompt, session, and model capability.

2. **Cold-start penalty** — Every frontend project builds from scratch. Despite comprehensive COC guidance (7 skills, 3 agents, 4 commands), the agent still generates raw code against principles rather than composing from proven primitives. This is slow and error-prone.

## Hypothesis

The Kailash SDK achieves speed and quality through a layered architecture: **Specs → Primitives → Engines → Interface**. This same pattern should apply to frontend codegen:

- **Specs**: Design system specifications (like Stitch's DESIGN.md), component contracts, layout grammars
- **Primitives**: Pre-built, tested component libraries, design tokens, layout templates
- **Engines**: Orchestration that composes primitives into screens/flows (like Kailash Core SDK composes nodes into workflows)
- **Interface**: The final rendered application (web, mobile, desktop)

## Three Pillars to Evaluate

### 1. Model Capability
What AI models bring to the table — Google Stitch (design generation via Gemini), Claude Opus (code generation), v0 (component generation). How do we leverage the best of each?

### 2. Guidance (COC Artifacts)
Institutional knowledge that constrains and directs the model — design principles, component specs, interaction patterns, production hardening checklists. What exists, what's missing, what needs restructuring?

### 3. Specs → Primitives → Engines → Interface
The architectural pattern that transforms guidance into speed:
- Can we create a "frontend SDK" analogous to Kailash's backend SDK?
- Component libraries as "nodes", layout systems as "orchestration"
- Design tokens as the equivalent of Kailash's parameter system

## Key Questions

1. Is the COC/Kailash layered approach the right reference architecture for frontend codegen?
2. How does Google Stitch's approach (design-first, DESIGN.md protocol, MCP integration) inform our architecture?
3. What's the optimal split between model capability and structured guidance?
4. How do we achieve "enterprise production quality in one session" for both web and mobile?
5. What primitives need to exist before the speed multiplier kicks in?

## Success Criteria

- Frontend projects achieve production quality in 1-2 sessions (not 5-10)
- Design consistency maintained across projects without manual oversight
- Both web (React/Next.js) and mobile (Flutter) covered
- Enterprise-grade: accessible, responsive, hardened, performant
- The system compounds — each project makes the next one faster

## External Research

### Google Stitch (Acquired Galileo AI, May 2025)
- Design-first AI tool generating high-fidelity UI mockups + HTML/Tailwind CSS
- DESIGN.md protocol: machine-readable design system specification
- MCP server with 7 tools for agent integration
- Dual-tier Gemini models (Flash for speed, Pro for fidelity)
- Does NOT generate framework-specific code, JS interactivity, or backend logic
- Key insight: separates design generation from code generation

### Current COC Frontend Stack
- 7 skills (design principles, Flutter, React, AI patterns, widgets, conversation UX, enterprise UX)
- 3 specialist agents (react-specialist, flutter-specialist, uiux-designer)
- 4 commands (/design, /i-audit, /i-polish, /i-harden)
- Comprehensive guidance but no structured primitives or component composition system
- Gap: guidance tells the model WHAT to do, but doesn't give it pre-built pieces to compose FROM
