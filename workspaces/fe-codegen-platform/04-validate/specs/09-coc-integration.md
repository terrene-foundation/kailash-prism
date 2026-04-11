# Spec 09: COC Integration

**Spec version**: 0.1.0
**Governs**: Loom relationship, sync manifest entry, variant structure, artifact inventory, extraction loop

---

## 9.1 Loom Relationship

kailash-prism is a BUILD repo in the Kailash ecosystem. It follows the same architecture as kailash-py and kailash-rs.

### Repo Topology

```
loom/.claude/ (source of truth for ALL COC artifacts)
  │
  ├── Global + variants/py/   → kailash-coc-claude-py   → kailash-py     (Python SDK)
  ├── Global + variants/rs/   → kailash-coc-claude-rs   → kailash-rs     (Rust SDK)
  ├── Global + variants/rb/   → kailash-coc-claude-rb   → downstream     (Ruby SDK)
  └── Global + variants/prism/ → kailash-coc-claude-prism → kailash-prism (Frontend engines)
```

### Definitions

| Term | Meaning for Prism |
|------|-------------------|
| **BUILD repo** | `kailash-prism` — where component code, engines, compiler, and specs live. Equivalent to `kailash-py`. |
| **Template repo** | `kailash-coc-claude-prism` — COC artifact distribution target. Contains `.claude/` directory with agents, skills, rules, commands, hooks for Prism developers. Rebuilt entirely by `/sync`. |
| **Variant** | `prism` — the identifier used in `sync-manifest.yaml` to select Prism-specific artifact overrides. |
| **Global artifacts** | COC artifacts that apply to ALL targets (py, rs, rb, prism). Synced unchanged. |
| **Variant artifacts** | COC artifacts specific to Prism. Override the global version when synced to `kailash-coc-claude-prism`. |

### Flow Direction

```
loom/.claude/                          (source of truth)
     │
     │  /sync prism
     │  (Gate 1: review, Gate 2: distribute)
     ▼
kailash-coc-claude-prism/.claude/      (template — never edited directly)
     │
     │  Developer clones or COC sync
     ▼
kailash-prism/.claude/                 (BUILD repo's working copy)
```

**Rules** (inherited from `rules/artifact-flow.md`):
- `/sync` at loom/ is the ONLY outbound path to template repos
- Template repos are NEVER edited directly — rebuilt entirely by `/sync`
- BUILD repo changes flow back via `/codify` proposals, not direct push

---

## 9.2 Sync Manifest Entry

### Exact YAML Addition

Add the following to `loom/.claude/sync-manifest.yaml` under the `repos:` section:

```yaml
repos:
  # ... existing py, rs, rb entries ...
  prism:
    build: kailash-prism
    template: kailash-coc-claude-prism
    variant: prism
    description: Kailash Prism — Frontend composable engines (React, Next.js, Flutter, Tauri)
```

### Tier Membership for New Prism-Only Artifacts

New artifacts created specifically for Prism that have no global equivalent are added as COC tier entries:

```yaml
tiers:
  coc:
    # ... existing entries ...
    # Prism-specific (added)
    - agents/frontend/prism-architect.md
    - skills/36-prism-engines/**
    - skills/37-prism-specs/**
    - commands/scaffold.md
    - rules/prism-patterns.md
```

Note: `agents/frontend/**` is already in the COC tier (line 87 of current manifest). The existing react-specialist, flutter-specialist, and uiux-designer are already covered. Only the NEW `prism-architect.md` agent needs explicit listing if it falls outside the glob.

### Variant Declarations for Existing Globals

These existing global artifacts get prism-specific overrides:

```yaml
variants:
  # ... existing variant declarations ...

  # Prism variant overrides for existing globals
  agents/frontend/react-specialist.md:
    py: null
    rs: null
    rb: null
    prism: variants/prism/agents/frontend/react-specialist.md

  agents/frontend/flutter-specialist.md:
    py: null
    rs: null
    rb: null
    prism: variants/prism/agents/frontend/flutter-specialist.md

  agents/frontend/uiux-designer.md:
    py: null
    rs: null
    rb: null
    prism: variants/prism/agents/frontend/uiux-designer.md

  skills/11-frontend-integration/SKILL.md:
    py: variants/py/skills/11-frontend-integration/SKILL.md           # existing
    rs: variants/rs/skills/11-frontend-integration/SKILL.md           # existing
    rb: null
    prism: variants/prism/skills/11-frontend-integration/SKILL.md

  skills/11-frontend-integration/react-integration-quick.md:
    py: variants/py/skills/11-frontend-integration/react-integration-quick.md
    rs: variants/rs/skills/11-frontend-integration/react-integration-quick.md
    rb: null
    prism: variants/prism/skills/11-frontend-integration/react-integration-quick.md

  skills/11-frontend-integration/react-patterns.md:
    py: variants/py/skills/11-frontend-integration/react-patterns.md
    rs: variants/rs/skills/11-frontend-integration/react-patterns.md
    rb: null
    prism: variants/prism/skills/11-frontend-integration/react-patterns.md

  skills/11-frontend-integration/flutter-integration-quick.md:
    py: variants/py/skills/11-frontend-integration/flutter-integration-quick.md
    rs: variants/rs/skills/11-frontend-integration/flutter-integration-quick.md
    rb: null
    prism: variants/prism/skills/11-frontend-integration/flutter-integration-quick.md

  skills/11-frontend-integration/flutter-patterns.md:
    py: null
    rs: variants/rs/skills/11-frontend-integration/flutter-patterns.md
    rb: null
    prism: variants/prism/skills/11-frontend-integration/flutter-patterns.md

  skills/11-frontend-integration/frontend-developer.md:
    py: variants/py/skills/11-frontend-integration/frontend-developer.md
    rs: variants/rs/skills/11-frontend-integration/frontend-developer.md
    rb: null
    prism: variants/prism/skills/11-frontend-integration/frontend-developer.md

  commands/sync.md:
    py: variants/py/commands/sync.md
    rs: variants/rs/commands/sync.md
    rb: variants/rb/commands/sync.md
    prism: variants/prism/commands/sync.md

  rules/patterns.md:
    py: null
    rs: variants/rs/rules/patterns.md
    rb: variants/rb/rules/patterns.md
    prism: variants/prism/rules/patterns.md

  rules/testing.md:
    py: null
    rs: variants/rs/rules/testing.md
    rb: variants/rb/rules/testing.md
    prism: variants/prism/rules/testing.md

  rules/framework-first.md:
    py: null
    rs: variants/rs/rules/framework-first.md
    rb: null
    prism: variants/prism/rules/framework-first.md
```

---

## 9.3 Variant Structure

### Complete Listing of `variants/prism/`

```
loom/.claude/variants/prism/
│
├── agents/
│   └── frontend/
│       ├── react-specialist.md             # OVERRIDE: Prism component composition awareness
│       ├── flutter-specialist.md           # OVERRIDE: Prism widget composition awareness
│       └── uiux-designer.md               # OVERRIDE: DESIGN.md generation, brief-to-spec workflow
│
├── skills/
│   ├── 11-frontend-integration/
│   │   ├── SKILL.md                        # OVERRIDE: Prism-focused (build with engines, not backend integration)
│   │   ├── react-integration-quick.md      # OVERRIDE: React + Prism engine usage
│   │   ├── react-patterns.md              # OVERRIDE: React patterns using Prism atoms/molecules
│   │   ├── flutter-integration-quick.md   # OVERRIDE: Flutter + Prism engine usage
│   │   ├── flutter-patterns.md            # OVERRIDE: Flutter patterns using Prism widgets
│   │   ├── frontend-developer.md          # OVERRIDE: Prism-first developer guide
│   │   └── composition-grammar.md         # ADDITION: YAML layout grammar reference
│   │
│   ├── 36-prism-engines/                  # ADDITION: Engine documentation
│   │   ├── SKILL.md                       # Engine overview + when to use each
│   │   ├── data-table-engine.md           # DataTable engine API, configuration, patterns
│   │   ├── form-engine.md                 # Form engine API, validation, multi-step
│   │   ├── navigation-engine.md           # Navigation engine API, routing integration
│   │   ├── layout-engine.md               # Layout engine API, responsive rules, zones
│   │   ├── theme-engine.md                # Theme engine API, dark mode, brand switching
│   │   └── chat-engine.md                 # AI Chat engine API, streaming, tools, citations
│   │
│   └── 37-prism-specs/                    # ADDITION: Specification authoring
│       ├── SKILL.md                       # Spec system overview
│       ├── design-system-protocol.md      # DESIGN.md format + design-system.yaml schema
│       └── token-architecture.md          # Three-tier token system, compiler usage
│
├── commands/
│   ├── scaffold.md                        # ADDITION: /scaffold for Prism project generation
│   └── sync.md                            # OVERRIDE: Prism-specific sync behavior
│
└── rules/
    ├── patterns.md                        # OVERRIDE: Prism component authoring patterns
    ├── testing.md                         # OVERRIDE: Prism testing rules (Vitest, widget tests, goldens)
    └── framework-first.md                 # OVERRIDE: Prism engine-first, not raw React/Flutter
```

### Override Descriptions

| Variant file | What it overrides | Why |
|-------------|-------------------|-----|
| `agents/frontend/react-specialist.md` | Global react-specialist | Global version knows generic React. Prism variant knows Prism atoms, engines, layout grammar, and composition rules. It instructs the agent to compose from Prism primitives before generating custom components. |
| `agents/frontend/flutter-specialist.md` | Global flutter-specialist | Global version knows generic Flutter. Prism variant knows K-prefixed widgets, engine widgets, Riverpod providers, and Prism theme integration. |
| `agents/frontend/uiux-designer.md` | Global uiux-designer | Global version knows design principles. Prism variant can generate DESIGN.md from a brief, use the design-system.yaml schema, and validate token compliance. |
| `skills/11-frontend-integration/SKILL.md` | Global frontend integration | Global version teaches "how to connect a React/Flutter app to your Kailash backend." Prism variant teaches "how to build with Prism engines that already integrate with Kailash backends." |
| `skills/11-frontend-integration/react-*.md` | Global React patterns | Global versions teach generic React + Kailash API integration. Prism variants teach Prism engine usage, atom composition, and template zone population. |
| `skills/11-frontend-integration/flutter-*.md` | Global Flutter patterns | Global versions teach generic Flutter + Kailash API integration. Prism variants teach Prism widget composition, engine widget usage, and Riverpod provider patterns. |
| `commands/sync.md` | Global sync command | Prism sync knows about the compiler build step, multi-package publishing, and cross-engine consistency checks. |
| `rules/patterns.md` | Global patterns | Prism patterns enforce: token-only styling, engine-first composition, package boundary rules, component contract compliance. |
| `rules/testing.md` | Global testing | Prism testing rules add: Vitest for web, widget tests for Flutter, golden screenshot requirements, visual regression with Chromatic, bundle size checks. |
| `rules/framework-first.md` | Global framework-first | Prism framework-first rule: use Prism engines before building custom organisms. Use Prism atoms before creating custom components. Check engine contracts before implementing from scratch. |

### Addition Descriptions

| Variant file | Purpose |
|-------------|---------|
| `skills/11-frontend-integration/composition-grammar.md` | Reference for the YAML layout grammar. VStack/Row/Grid/Split/Layer/Scroll definitions with responsive rules. Used by agents when composing page layouts. |
| `skills/36-prism-engines/` | Complete documentation for each of the 6 engines. Configuration options, composition patterns, customization points, performance characteristics. |
| `skills/37-prism-specs/` | How to author and maintain spec-layer artifacts: DESIGN.md format, design-system.yaml schema, component contract format, token tier rules. |
| `commands/scaffold.md` | `/scaffold` command: reads DESIGN.md + data model, generates project structure with template selections, token files, and component skeletons for the chosen target (React, Next.js, Flutter, Tauri). |

---

## 9.4 Global vs Variant Artifacts

### Artifacts That Stay GLOBAL (synced to ALL targets including py/rs/rb/prism)

These contain universal design and interaction knowledge that benefits all Kailash projects, even backend-only ones that may eventually add a frontend.

| Artifact | Path | Reason it stays global |
|----------|------|----------------------|
| UX design principles | `skills/23-uiux-design-principles/**` | Universal design principles apply to any UI, regardless of framework |
| AI interaction patterns | `skills/25-ai-interaction-patterns/**` | AI UX patterns (streaming, tool calls, citations) apply to Kaizen agents across all SDKs |
| Enterprise AI UX | `skills/21-enterprise-ai-ux/**` | Enterprise AI design patterns are framework-agnostic |
| Conversation UX | `skills/22-conversation-ux/**` | Conversation patterns apply to any chat implementation |
| Interactive widgets | `skills/20-interactive-widgets/**` | Widget interaction concepts are framework-agnostic |
| Flutter patterns (base) | `skills/19-flutter-patterns/**` | Base Flutter patterns useful for any Flutter project, not just Prism |
| `/i-audit` command | `commands/i-audit.md` | UI audit applies to any frontend project |
| `/i-polish` command | `commands/i-polish.md` | UI polish applies to any frontend project |
| `/i-harden` command | `commands/i-harden.md` | UI hardening applies to any frontend project |
| `/design` command | `commands/design.md` | Design review applies to any frontend project |

### Artifacts That Become PRISM VARIANTS (only for prism template)

| Artifact | Path | What changes for Prism |
|----------|------|----------------------|
| react-specialist agent | `agents/frontend/react-specialist.md` | Adds Prism composition awareness, engine usage, atom/molecule preference |
| flutter-specialist agent | `agents/frontend/flutter-specialist.md` | Adds Prism widget awareness, K-prefixed components, engine widgets |
| uiux-designer agent | `agents/frontend/uiux-designer.md` | Adds DESIGN.md generation, design-system.yaml authoring |
| Frontend integration skill | `skills/11-frontend-integration/**` | Shifts from "integrate frontend with Kailash backend" to "build with Prism engines" |
| Patterns rule | `rules/patterns.md` | Adds component boundary rules, token-only styling, engine-first composition |
| Testing rule | `rules/testing.md` | Adds Vitest, widget tests, golden screenshots, visual regression, bundle size |
| Framework-first rule | `rules/framework-first.md` | Adds Prism engine-first before custom organisms |
| Sync command | `commands/sync.md` | Adds compiler build step, multi-package consistency |

### Artifacts That Are PRISM-ONLY ADDITIONS (no global equivalent)

| Artifact | Path (in variant) | Purpose |
|----------|-------------------|---------|
| prism-architect agent | `agents/frontend/prism-architect.md` | Cross-platform engine design, spec authoring, token system architecture |
| Prism engines skill | `skills/36-prism-engines/**` | Engine documentation (6 engines, configuration, patterns) |
| Prism specs skill | `skills/37-prism-specs/**` | Spec layer documentation (DESIGN.md, tokens, contracts) |
| Composition grammar skill | `skills/11-frontend-integration/composition-grammar.md` | YAML layout grammar reference |
| `/scaffold` command | `commands/scaffold.md` | Project generation from DESIGN.md + data model |
| Prism patterns rule | `rules/prism-patterns.md` | Component authoring constraints specific to Prism |

---

## 9.5 Artifact Inventory

Complete list of artifacts that should exist in `kailash-prism/.claude/` after a full `/sync prism`.

### Agents

| File | Source | Purpose |
|------|--------|---------|
| `agents/analysis/analyst.md` | Global | Failure point analysis, requirements breakdown, ADRs |
| `agents/quality/reviewer.md` | Global | Code review, doc validation |
| `agents/quality/gold-standards-validator.md` | Global | Naming, licensing compliance |
| `agents/quality/security-reviewer.md` | Global | Security audit |
| `agents/implementation/pattern-expert.md` | Global | SDK pattern guidance |
| `agents/implementation/tdd-implementer.md` | Global | Test-driven implementation |
| `agents/implementation/build-fix.md` | Global | Build failure diagnosis |
| `agents/testing/testing-specialist.md` | Global | Test strategy and implementation |
| `agents/release/release-specialist.md` | Global | CI/CD, publishing, deployment |
| `agents/open-source-strategist.md` | Global | Open source strategy |
| `agents/value-auditor.md` | Global | Value assessment |
| `agents/management/todo-manager.md` | Global | Task management |
| `agents/management/gh-manager.md` | Global | GitHub operations |
| `agents/frontend/react-specialist.md` | **Variant** (prism) | React + Prism composition |
| `agents/frontend/flutter-specialist.md` | **Variant** (prism) | Flutter + Prism widget composition |
| `agents/frontend/uiux-designer.md` | **Variant** (prism) | DESIGN.md generation, brief-to-spec |
| `agents/frontend/prism-architect.md` | **Variant** (prism, addition) | Cross-platform engine design |
| `agents/frameworks/dataflow-specialist.md` | Global | DataFlow integration |
| `agents/frameworks/nexus-specialist.md` | Global | Nexus API integration |
| `agents/frameworks/kaizen-specialist.md` | Global | Kaizen agent integration |
| `agents/frameworks/mcp-specialist.md` | Global | MCP integration |
| `agents/frameworks/mcp-platform-specialist.md` | Global | MCP platform server |
| `agents/frameworks/pact-specialist.md` | Global | PACT governance |
| `agents/frameworks/ml-specialist.md` | Global | ML lifecycle |
| `agents/frameworks/align-specialist.md` | Global | LLM alignment |

### Skills

| Directory | Source | Purpose |
|-----------|--------|---------|
| `skills/01-core-sdk/` | Global | Core SDK reference (workflow orchestration) |
| `skills/02-dataflow/` | Global | DataFlow database operations |
| `skills/03-nexus/` | Global | Nexus API deployment |
| `skills/04-kaizen/` | Global | Kaizen AI agents |
| `skills/05-kailash-mcp/` | Global | MCP server integration |
| `skills/06-cheatsheets/` | Global | Quick reference |
| `skills/07-development-guides/` | Global | Development guides |
| `skills/08-nodes-reference/` | Global | Node type reference |
| `skills/09-workflow-patterns/` | Global | Workflow composition patterns |
| `skills/10-deployment-git/` | Global | Deployment and git patterns |
| `skills/11-frontend-integration/` | **Variant** (prism) | Prism-focused frontend development |
| `skills/12-testing-strategies/` | Global | Testing strategy reference |
| `skills/13-architecture-decisions/` | Global | ADR patterns and decision trees |
| `skills/14-code-templates/` | Global | Code templates |
| `skills/16-validation-patterns/` | Global | Validation patterns |
| `skills/17-gold-standards/` | Global | Gold standard references |
| `skills/18-security-patterns/` | Global | Security patterns |
| `skills/19-flutter-patterns/` | Global | Base Flutter patterns |
| `skills/20-interactive-widgets/` | Global | Interactive widget concepts |
| `skills/21-enterprise-ai-ux/` | Global | Enterprise AI UX patterns |
| `skills/22-conversation-ux/` | Global | Conversation UX patterns |
| `skills/23-uiux-design-principles/` | Global | UI/UX design principles |
| `skills/24-value-audit/` | Global | Value audit methodology |
| `skills/25-ai-interaction-patterns/` | Global | AI interaction patterns |
| `skills/28-coc-reference/` | Global | COC methodology reference |
| `skills/29-pact/` | Global | PACT governance reference |
| `skills/30-claude-code-patterns/` | Global (CC tier) | Claude Code patterns |
| `skills/31-error-troubleshooting/` | Global | Error troubleshooting |
| `skills/34-kailash-ml/` | Global | ML framework reference |
| `skills/35-kailash-align/` | Global | Alignment framework reference |
| `skills/36-prism-engines/` | **Variant** (prism, addition) | Prism engine documentation |
| `skills/37-prism-specs/` | **Variant** (prism, addition) | Prism spec layer documentation |
| `skills/co-reference/` | Global (CO tier) | CO methodology reference |
| `skills/26-eatp-reference/` | Global (CO tier) | EATP reference |
| `skills/spec-compliance/` | Global | Spec compliance verification |

### Rules

| File | Source | Purpose |
|------|--------|---------|
| `rules/autonomous-execution.md` | Global (CO) | Autonomous execution model |
| `rules/communication.md` | Global (CO) | Communication style |
| `rules/zero-tolerance.md` | Global (CO) | Zero tolerance for failures |
| `rules/terrene-naming.md` | Global (CO) | Foundation naming |
| `rules/independence.md` | Global (CO) | Foundation independence |
| `rules/git.md` | Global (CO) | Git workflow |
| `rules/security.md` | Global (CO) | Security rules |
| `rules/agents.md` | Global (CO) | Agent orchestration |
| `rules/artifact-flow.md` | Global (CO) | Artifact flow control |
| `rules/journal.md` | Global (CO) | Journal rules |
| `rules/deploy-hygiene.md` | Global (CO) | Deploy hygiene |
| `rules/documentation.md` | Global (COC) | Documentation standards |
| `rules/env-models.md` | Global (COC) | Environment models |
| `rules/agent-reasoning.md` | Global (COC) | LLM-first reasoning |
| `rules/cc-artifacts.md` | Global (CC) | CC artifact quality |
| `rules/patterns.md` | **Variant** (prism) | Prism component patterns |
| `rules/testing.md` | **Variant** (prism) | Prism testing rules |
| `rules/framework-first.md` | **Variant** (prism) | Prism engine-first rule |
| `rules/prism-patterns.md` | **Variant** (prism, addition) | Component authoring constraints |
| All other COC rules | Global | Various (deployment, infra-sql, eatp, pact, trust, connection pool, etc.) |

### Commands

| File | Source | Purpose |
|------|--------|---------|
| `commands/analyze.md` | Global (COC) | Analysis phase |
| `commands/todos.md` | Global (COC) | Todo planning phase |
| `commands/implement.md` | Global (COC) | Implementation phase |
| `commands/redteam.md` | Global (COC) | Red team validation |
| `commands/codify.md` | Global (COC) | Knowledge extraction |
| `commands/validate.md` | Global (COC) | Validation |
| `commands/design.md` | Global (COC) | Design review |
| `commands/i-audit.md` | Global (COC) | UI audit |
| `commands/i-polish.md` | Global (COC) | UI polish |
| `commands/i-harden.md` | Global (COC) | UI hardening |
| `commands/deploy.md` | Global (COC) | Deployment |
| `commands/release.md` | Global (COC) | Release |
| `commands/learn.md` | Global (CO) | Learning |
| `commands/journal.md` | Global (CO) | Journal |
| `commands/ws.md` | Global (CO) | Workspace status |
| `commands/wrapup.md` | Global (CO) | Session wrapup |
| `commands/start.md` | Global (CO) | Session start |
| `commands/scaffold.md` | **Variant** (prism, addition) | Prism project scaffolding |
| `commands/sync.md` | **Variant** (prism) | Prism-specific sync |
| All other commands (sdk, db, api, ai, test) | Global (COC) | Various utility commands |

### Hooks

Hooks follow the same global/variant pattern. Prism-specific hooks (if any) would be declared as variant additions. Initially, global hooks are sufficient.

---

## 9.6 Extraction Loop

### Pattern Flow: BUILD Repo to Loom to All Templates

```
kailash-prism (BUILD repo)
  │
  │  Developer discovers a new composition pattern while building a project
  │  (e.g., a recurring DataTable + FilterPanel + Export arrangement)
  │
  │  /codify
  │  ▼
  │
  │  kailash-prism/.claude/.proposals/latest.yaml
  │  (Proposal: extract "FilteredExportTable" pattern to engine skill)
  │
  │  Human reviews proposal at loom/
  │  ▼
  │
loom/.claude/
  │
  │  Human classifies: global or variant?
  │  - Global: pattern applies to any frontend project
  │  - Variant: pattern is Prism-specific
  │
  │  /sync prism
  │  ▼
  │
kailash-coc-claude-prism/.claude/
  │
  │  Pattern now available to all Prism project sessions
  ▼
```

### What Gets Extracted

| Category | Examples | Destination |
|----------|----------|-------------|
| **New composition patterns** | Recurring page layouts, engine configuration combinations, multi-engine coordination | `skills/36-prism-engines/` (variant) or `skills/11-frontend-integration/composition-grammar.md` (variant) |
| **Component refinements** | New atom variants discovered through real use, molecule combinations that recur | `specs/components/*.yaml` (in BUILD repo) + skill updates in loom variant |
| **Engine configuration recipes** | Common DataTable setups (user list, product catalog, audit log) | `skills/36-prism-engines/data-table-engine.md` (variant) |
| **Design system learnings** | Token naming improvements, constraint rule additions, new theme patterns | `skills/37-prism-specs/` (variant) |
| **Cross-engine patterns** | How Navigation engine coordinates with Layout engine, how Theme engine initializes for all engines | `skills/36-prism-engines/SKILL.md` (variant) |
| **Quality gate refinements** | New /i-audit criteria discovered through real projects, new /i-harden checks | `commands/i-audit.md` (global, if universal) or variant |
| **Agent behavior improvements** | Better react-specialist prompting for Prism composition, better flutter-specialist widget selection | `agents/frontend/*.md` (variant) |

### What Stays Local to the BUILD Repo

| Category | Examples | Why it stays local |
|----------|----------|-------------------|
| **Project-specific customizations** | Client brand tokens, custom theme YAML, business-specific component variants | These are per-project, not reusable patterns |
| **Custom engines** | Industry-specific engines (healthcare patient timeline, fintech trade blotter) | Too specialized for the general package |
| **Build configuration** | CI/CD pipeline specifics, deployment targets, registry credentials | Infrastructure, not COC knowledge |
| **Spec files** | `specs/components/*.yaml`, `specs/templates/*.yaml` | Code artifacts live in BUILD repo, not loom |
| **Component code** | All `.tsx`, `.dart`, `.rs` files | Code lives in BUILD repo — loom is COC artifacts only |

### Extraction Cadence

| Trigger | Action |
|---------|--------|
| After completing a project using Prism | Run `/codify`, review extracted patterns |
| After adding a new engine or major component | Skill documentation update proposal |
| After 3+ projects use the same ad-hoc pattern | Pattern graduates from project-local to Prism variant |
| After a pattern proves useful across React AND Flutter | Consider promoting from Prism variant to global |

### Feedback Signal: Guidance Compression Ratio

For every pattern extracted back to loom, measure the guidance compression:

- Lines of prose guidance REMOVED or compressed
- Lines of structured engine/skill documentation ADDED
- Target: net reduction in total COC artifact line count over time

This prevents the dual maintenance burden identified in the red team findings (FAIL-01). Primitives and engines absorb what was previously guidance. The extraction loop codifies this absorption.
