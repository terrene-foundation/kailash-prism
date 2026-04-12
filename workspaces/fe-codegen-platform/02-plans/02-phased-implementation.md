# Implementation Plan: kailash-prism

## Execution Model

**All platforms simultaneously.** The two-engine architecture (web + flutter) enables parallel execution. Agents building React components and agents building Flutter widgets work from the same specs without blocking each other. Tauri extensions run as a parallel sub-track within the web engine.

## Phase 1: Foundation (6-7 sessions, parallelized)

Four parallel workstreams sharing the spec layer. Revised from 4-5 sessions to 6-7 based on red team round 2 feasibility assessment — engine complexity and atom count require more session budget.

### Workstream A: Specs + Compiler (1-2 sessions)

Shared foundation for ALL platforms. Compiler MVP must ship end of Sprint A1 to unblock engine workstreams.

- [ ] **YAML spec population** (FIRST TASK — prerequisite for everything else) — Translate detailed markdown specs in `docs/specs/` into machine-readable YAML files in `specs/`. Currently ALL YAML files are stubs. Specifically:
  - `specs/tokens/schema.yaml` — Populate with full 3-tier structure from docs/specs/02-token-architecture.md
  - `specs/tokens/themes/{enterprise,modern,minimal}.yaml` — Populate with actual color/spacing/typography/radius/shadow/motion values from docs/specs/01-design-system-protocol.md
  - `specs/components/*.yaml` — Create per-component YAML contracts from docs/specs/03-component-contracts.md
  - `specs/templates/*.yaml` — Create per-template zone definitions from docs/specs/06-page-templates.md
  - `specs/layouts/grammar.yaml` — Populate with full props, responsive rules, nesting matrix from docs/specs/04-layout-grammar.md
  - `specs/navigation/patterns.yaml` — Populate with behavioral definitions from docs/specs/ navigation sections
  - The compiler cannot compile empty stubs. This task MUST complete before compiler MVP begins.
- [ ] **design-system.yaml schema** — Three-tier token architecture:
  - Tier 1: Primitive values (raw color/spacing/type/radius/shadow/motion scales)
  - Tier 2: Semantic intent (interactive.primary, surface.page, text.primary)
  - Tier 3: Component-scoped (button.primary.bg, card.shadow, input.border-focus)
  - Constraint annotations: contrast minimums, touch targets, pairing rules
- [ ] **3 starter themes** — Enterprise (navy/slate), Modern (vibrant/clean), Minimal (monochrome/spacious)
- [ ] **Token compiler MVP** (unblocking deliverable for Workstreams B/C) — `@kailash/prism-compiler`:
  - Minimum: design-system.yaml → tailwind.config.ts + CSS variables (web) AND ThemeData + Dart constants (flutter) for 1 theme (enterprise)
  - Full: all 3 themes, constraint validator (contrast ratios, touch targets), DESIGN.md ↔ design-system.yaml bidirectional converter
  - MVP ships end of Sprint A1; full compiler completes in Sprint A2
- [ ] **Theme customization guide** — Skill sub-file showing how to modify a starter theme: change primary color, adjust spacing scale, swap typography. Prevents FAIL-08 (generic themes, no customization path)
- [ ] **Component contracts** — YAML specs for each component: props/parameters, states, variants, accessibility requirements, responsive behavior
- [ ] **Layout grammar** — YAML definition of 6 layout primitives (VStack, Row, Grid, Split, Layer, Scroll) with responsive rules. Includes `Custom` escape hatch for layouts the grammar cannot express (prevents FAIL-09)
- [ ] **Page template definitions** — YAML for 11 templates (dashboard, list, detail, form, settings, auth, conversation, split, wizard, kanban, calendar) with zone definitions
- [ ] **Brief-to-DESIGN.md prompt template** — Structured prompt the agent uses to generate a project-specific DESIGN.md from a natural language brief
- [ ] **Default DESIGN.md quick-start** — `/scaffold` accepts `--theme enterprise|modern|minimal` to generate a working DESIGN.md from a starter theme + brief without requiring design expertise. Backend developers who provide only "CRM dashboard, blue and gray" get a complete DESIGN.md in seconds, not a blank template they can't fill. This is the primary authoring path for Phase 1 (addresses red team FAIL-02).

### Workstream B: Web Engine (4-5 sessions, parallel with A after Sprint 1)

React components shared by React SPA, Next.js, and Tauri.

**Sprint B1 — High-value engines (reweight by time savings, 2 sessions):**
- [ ] DataTable engine — sort, filter, paginate, select, bulk actions, virtual scroll (@tanstack/virtual), loading/empty/error states, column config, responsive (-> CardGrid on mobile)
- [ ] Form engine — validation (zod/yup), multi-section, conditional fields, file upload, submission handling, reset, loading states
- [ ] Navigation engine — Sidebar (collapsible, nested, responsive rail/drawer/full) + AppHeader + Breadcrumbs + routing integration
- [ ] Layout engine — VStack, Row, Grid, Split, Layer, Scroll with responsive breakpoint rules; zone composition for templates; template resolution algorithm (registry-based engine-to-zone binding)
- [ ] Theme engine — Token provider (CSS variables), dark mode toggle, brand switching, `prefers-color-scheme` detection

**Sprint B2 — Atom + molecule primitives (consistency enforcement, 2 sessions with parallel agents):**
- [ ] 25 atoms: Button (all variants), Input, TextArea, Select, Checkbox, Radio, Toggle, Label, Badge, Avatar, Icon, Tag, Tooltip, Spinner, ProgressBar, Skeleton, Divider, Link, Typography, Image, VisuallyHidden, Kbd, StatusDot, Separator, IconButton
- [ ] 22 molecules: FormField, SearchBar, SelectField, DatePicker, FileUpload, NavItem, Breadcrumb, Pagination, Tab, AlertBanner, Toast, EmptyState, MetricCard, UserCard, ListItem, MenuItem, DropdownMenu, Popover, DialogActions, TagInput, ToggleGroup, StepIndicator
- [ ] Remaining organisms: Modal/Dialog, CommandPalette, SlideOver, FilterPanel, CardGrid, ListView, Toolbar, StatsRow, FormWizard, NotificationCenter, SettingsSection

**Sprint B3a — AI Chat engine (dedicated — at least as complex as DataTable):**
- [ ] AI Chat engine — ChatMessage (user/AI with citations, widgets, branch indicator), ChatInput (open input + attachments + sources), StreamOfThought (step list with states), ActionPlan (numbered with approve/modify/reject), CitationPanel, ConversationSidebar, SuggestionChips
- [ ] Streaming SSR support for chat in Next.js

**Sprint B3b — Page templates + platform extensions:**
- [ ] Page templates — DashboardLayout, ListLayout, DetailLayout, FormLayout, SettingsLayout, AuthLayout, ConversationLayout, SplitLayout, WizardLayout, KanbanLayout, CalendarLayout
- [ ] **Next.js extensions** — RSC wrappers for server-renderable organisms, App Router page factories, metadata helpers
- [ ] **Tauri extensions** — useInvoke/useWindow/useTray/useFs hooks, TitleBar/SystemTray/NativeDialog components, Rust IPC type generation bridge, window state persistence
- [ ] If Phase 1 runs long, B3b can defer to Phase 2 without losing the Kaizen UI (value audit's strongest fit)

### Workstream C: Flutter Engine (4-5 sessions, parallel with A after Sprint 1)

Mirrors web engine structure with Flutter/Dart idioms.

**Sprint C1 — High-value engines (2 sessions):**
- [ ] KDataTable engine — sort, filter, paginate, select, bulk, sliver-based virtual scroll, responsive (-> KCardGrid on phone)
- [ ] KForm engine — validation, multi-section, conditional, file picker, submission, keyboard handling, focus management
- [ ] KNavigation engine — KSidebar (collapsible, responsive NavigationRail/Drawer), KAppBar, KBreadcrumb, GoRouter integration
- [ ] KLayout engine — Column/Row/GridView/Split/Overlay/ListView.builder (all 6 layout primitives) with responsive LayoutBuilder rules; platform-adaptive (iOS safe areas, Android system bars); template resolution
- [ ] KTheme engine — Generated ThemeData from design-system.yaml, dark mode, brand switching, platform-adaptive (Cupertino on iOS, Material on Android)

**Sprint C2 — Atom + molecule widgets (2 sessions with parallel agents):**
- [ ] 25 atom widgets: KButton, KInput, KTextArea, KSelect, KCheckbox, KRadio, KToggle, KLabel, KBadge, KAvatar, KIcon, KTag, KTooltip, KSpinner, KProgressBar, KSkeleton, KDivider, KLink, KTypography, KImage, etc.
- [ ] 22 molecule widgets: KFormField, KSearchBar, KSelectField, KDatePicker, KFileUpload, KNavItem, KBreadcrumb, KPagination, KTab, KAlertBanner, KToast, KEmptyState, KMetricCard, KUserCard, KListItem, KMenuItem, KDropdownMenu, KPopover, KDialogActions, KTagInput, KToggleGroup, KStepIndicator
- [ ] Remaining organisms: KModal, KCommandPalette, KSlideOver, KFilterPanel, KCardGrid, KListView, KToolbar, KStatsRow, KFormWizard, KNotificationCenter, KSettingsSection

**Sprint C3a — AI Chat engine (dedicated):**
- [ ] AI Chat engine — KChatMessage, KChatInput, KStreamOfThought, KActionPlan, KCitationPanel, KConversationSidebar, KSuggestionChips

**Sprint C3b — Page templates + platform adaptations:**
- [ ] Page templates — All 11 KLayout templates
- [ ] **Mobile adaptations** — Safe areas, notch handling, haptic feedback, swipe actions, pull-to-refresh, push notification integration
- [ ] **Desktop adaptations** — Window chrome, keyboard shortcuts, menu bar, multi-window, system tray (macOS/Windows/Linux)

### Workstream D: COC Artifacts (parallel, 2-3 sessions)

Updates to loom/ to support Prism across the ecosystem. Composition grammar moved to Session 1-2 (not Session 4) to prevent FAIL-05.

- [ ] **Sync manifest update** — Add prism repo entry, variant declarations
- [ ] **Prism variant directory** — `variants/prism/` with enhanced agents, skills, commands
- [ ] **Composition grammar skill** (Session 1-2) — YAML layout grammar reference. Must ship before engines so agents compose correctly from the start.
- [ ] **Updated react-specialist** — Prism component composition awareness, engine usage patterns
- [ ] **Updated flutter-specialist** — Prism widget composition awareness, engine usage patterns
- [ ] **New prism-architect agent** — Cross-platform engine design, spec authoring, token system
- [ ] **Updated uiux-designer** — DESIGN.md generation capability, brief-to-spec workflow
- [ ] **New /scaffold command** — Reads DESIGN.md + data model -> project structure with template selections, token files, component skeletons
- [ ] **New prism-engines skill** — Engine documentation (DataTable, Form, Navigation, Layout, Theme, AI Chat)
- [ ] **New prism-specs skill** — DESIGN.md protocol, token architecture, component contracts
- [ ] **Updated 11-frontend-integration** — Global version: "how to use Prism with your Kailash backend"; Prism variant: "how to build with Prism engines"
- [ ] **Composition validator** — Lint-like tool that scans generated code for: hardcoded color/spacing values (should use tokens), non-Prism components where primitives exist, template zone violations, layout grammar non-compliance. Powers the ">70% primitive usage" Phase 2 success metric. Without this, quality pipeline has no way to verify Prism adoption.
- [ ] **Guidance compression** — For every engine built, compress corresponding prose in existing skills. Net reduction target: 300+ lines removed as engines absorb what was previously guidance

### Phase 1 Validation Gate

- [ ] Reference application (React + Next.js) composed entirely from Prism engines scores 40+/50 on /i-audit
- [ ] Reference application (Flutter) composed from Prism engines scores 40+/50 on /i-audit
- [ ] Tauri desktop app renders the same screens as the Next.js app with native window chrome
- [ ] Token compiler produces consistent token VALUES from the same design-system.yaml across web and Flutter (same numbers emitted; visual fidelity within 2px tolerance — pixel-perfect across platforms is not achievable due to CSS rem vs Flutter logical pixels)
- [ ] `/scaffold` generates a working project skeleton in <2 minutes for each target
- [ ] All engines tree-shake correctly (unused engines not in bundle)
- [ ] `/scaffold` accepts a theme selection (enterprise/modern/minimal) and generates a working DESIGN.md from the theme + brief without requiring design expertise (addresses FAIL-02)

### Mid-Phase 1 Decision Gate (after Sprint 1)

After Workstream A completes (specs + compiler MVP), evaluate before committing to full engine builds:

- [ ] Token compiler MVP produces valid Tailwind config AND Flutter ThemeData from the enterprise theme
- [ ] Brief-to-DESIGN.md prompt template generates an acceptable spec from a 1-2 sentence brief
- [ ] At least 1 starter theme (enterprise) passes constraint validation (contrast ratios, touch targets)

**If this gate fails**: Redesign the spec/compiler layer before investing in engine workstreams B and C. Do not build engines on a broken foundation.

**Auto-proceed**: If no human HALT signal within 4 hours of compiler MVP completion AND compiler produces valid output, Workstreams B/C proceed automatically.

### Flutter Go/No-Go Gate (after Web Sprint B1)

Flutter workstream C runs in parallel by default. However, if the web engine Sprint B1 reveals fundamental architectural problems:

- [ ] **HALT Flutter** if: web DataTable/Form/Nav engines require >2x estimated session time, or if the composition grammar proves unworkable
- [ ] **CONTINUE Flutter** if: web engines complete within estimates AND produce /i-audit >30/50 on a reference page
- [ ] This gate fires at Session 3. Decision documented in workspace journal.

**Rationale**: Parallel execution is the default (autonomous execution model). But if the foundational approach is wrong, building the same wrong thing in two frameworks doubles the wasted investment. This gate prevents FAIL-03 (dual-framework splits focus) without pre-emptively sequencing.

**Auto-proceed**: If no human HALT signal within 4 hours of Session 3 completion AND web engines score >30/50, Flutter continues automatically. Human can issue HALT retroactively.

### Speed Checkpoint (after Sprint B1, Session 3)

Lightweight validation that the fundamental premise (primitives save time) holds before investing in remaining engines, atoms, and AI Chat.

- [ ] Compose one reference page (e.g., contacts list) using Prism DataTable + Form engines with enterprise theme
- [ ] Time the composition (session-minutes from spec to working page)
- [ ] Estimate how long the same page would take without Prism (based on prior project experience)
- [ ] **CONTINUE** if: Prism composition takes <60% of the no-Prism estimate
- [ ] **PAUSE AND EVALUATE** if: no measurable improvement — diagnose whether the issue is the engines, the composition grammar, or the approach itself before committing to Sprints B2/B3/C2/C3

**Rationale**: The value audit's strongest critique is that 6-7 sessions are committed before any speed evidence. This checkpoint provides early signal at Session 3, when only 2 engines exist but the core pattern (spec -> tokens -> engine composition) is exercised end-to-end.

---

## Implementation Critical Path

Dependency ordering for Phase 1 — what must exist before each layer is viable:

```
YAML spec population (C-01)
  -> Token compiler MVP (needs populated schema.yaml + enterprise.yaml)
    -> Theme engine (needs compiled tokens)
      -> ALL atoms (consume tokens from Theme engine)
        -> Molecules (compose atoms)
          -> Organisms (compose molecules)

Layout grammar YAML (needs populated grammar.yaml)
  -> Layout engine (reads grammar rules)
    -> Page templates (compose via Layout engine zones)

Component contracts YAML (needs populated component specs)
  -> DataTable engine (implements contract)
  -> Form engine (implements contract)
  -> Navigation engine (implements contract)

Composition grammar skill (COC artifact)
  -> /scaffold command (reads grammar)
  -> Agent composition behavior (follows grammar)
```

**Engine prerequisites** (atoms that must exist before an engine is viable):
- DataTable: Button, Input, Checkbox, Badge, Pagination, Skeleton, EmptyState
- Form: Input, TextArea, Select, Checkbox, Radio, Toggle, Label, Button
- Navigation: Button, Badge, Avatar, Icon, Link, Tooltip
- AI Chat: Button, Input, Avatar, Badge, Spinner, Skeleton

Sprint B1 engines are built BEFORE Sprint B2 atoms. Engines define their own internal atoms initially, then refactor to use shared atoms when B2 delivers them. This avoids blocking engines on atom completion.

## Decision Authority

Choices during implementation fall into three categories:

**Spec-bound** (follow the spec literally, no deviation without spec update):
- Token values, color palettes, spacing scales
- Component prop interfaces and state machines
- Layout grammar rules and responsive breakpoints
- Engine public API contracts
- Accessibility requirements (ARIA roles, keyboard nav)

**Model-discretionary** (agent exercises judgment within spec constraints):
- Visual composition within template zones (which organisms in which zones)
- Aesthetic polish (shadow depth, border subtlety, spacing rhythm)
- Copy and microcopy (button labels, empty state messages, error text)
- Animation timing and easing (within token-defined ranges)
- Novel layouts when grammar primitives don't fit (use Custom escape hatch)

**Escalate to human** (don't guess, ask):
- Any deviation from spec contracts
- New component types not in spec 03
- Changes to token tier structure
- Engine scope additions beyond spec 05

---

## Phase 2: Validation + Extraction Loop (2-3 sessions + real projects)

### Activities
- [ ] **3 real projects** using Prism engines (at least 1 web, 1 mobile, 1 desktop)
- [ ] Measure: session count vs comparable no-Prism project
- [ ] Identify: missing engines, edge cases, composition patterns that need codifying
- [ ] **Build extraction loop**: project -> /codify -> kailash-prism proposals -> loom/ review -> sync
- [ ] **Iterate engines** based on real project friction (5-10 additions/modifications per project)
- [ ] **Cross-project consistency test**: 3 projects using the same theme produce visually consistent output without manual design review
- [ ] **Cross-platform visual regression**: Playwright screenshots (web) vs Flutter golden tests for shared screens. Verify token fidelity within 2px tolerance.

### Phase 2 Success Metrics
- Projects complete in <50% of comparable no-Prism session count
- >70% of components use Prism primitives (measured by import analysis)
- /i-audit >35/50 without manual intervention on all 3 projects
- At least 5 new patterns extracted back to Prism per project
- Token compiler constraint validator catches >90% of accessibility issues automatically

---

## Phase 3: Integration + Maturity (1-2 sessions)

### Stitch Integration
- [ ] Install `@_davideast/stitch-mcp`, evaluate reliability
- [ ] Build normalizer: Stitch `extract_design_context` -> design-system.yaml
- [ ] Extend /scaffold: optional Stitch visual exploration before spec generation
- [ ] Test: Stitch-accelerated path produces equivalent /i-audit scores, 5x faster to DESIGN.md

### Nexus-to-Prism Bridge
- [ ] Type extraction: Nexus API schema -> TypeScript interfaces -> React Query hooks -> Prism DataTable columns
- [ ] Type extraction: Nexus API schema -> Dart classes -> Riverpod providers -> Prism KDataTable config
- [ ] This eliminates manual type creation for ALL Kailash backend integrations

### Marionette Integration (Flutter Testing)
- [ ] Connect Marionette MCP to /i-audit for automated Flutter UI validation
- [ ] Golden screenshot tests for all Flutter engines
- [ ] Playwright integration for web engine visual regression

---

## Parallel Execution Map (Revised — Red Team Round 2)

```
Session 1  -- [A] Specs + schema + themes + compiler MVP (1 theme)
              [D] Sync manifest + variant structure + composition grammar DRAFT
              Mid-Phase 1 Decision Gate (compiler MVP validates?)

Session 2  -- [A] Full compiler + remaining themes + component contracts
              [B1] Web engines: DataTable + Form (highest time-savings)
              [C1] Flutter engines: KDataTable + KForm
              [D] /scaffold command + composition grammar final

Session 3  -- [B1] Web engines: Navigation + Layout + Theme
              [C1] Flutter engines: KNavigation + KLayout + KTheme
              [D] Updated specialists + guidance compression
              Flutter Go/No-Go Gate fires here

Session 4  -- [B2] Web atoms/molecules (parallel agents)
              [C2] Flutter atoms/molecules (parallel agents)
              [B3a] Web AI Chat engine start

Session 5  -- [B2] Web remaining organisms
              [B3a] AI Chat engine complete
              [C2] Flutter remaining organisms
              [C3a] Flutter AI Chat engine
              [D] Final skills + theme customization guide

Session 6  -- [B3b] Page templates + Next.js/Tauri extensions
              [C3b] Flutter templates + platform adaptations
              Phase 1 Validation Gate: reference apps + /i-audit

Session 7+ -- Phase 2: Real projects + extraction loop
```

**All four targets are live by Session 6.** Revised from 5 sessions to account for realistic engine complexity. Session 7+ begins real-project validation.

### Decision Gate Auto-Proceed Criteria

- **Mid-Phase 1 Gate**: Auto-proceed after 4 hours if compiler MVP passes automated checks and no human HALT signal.
- **Flutter Go/No-Go Gate**: Auto-proceed after 4 hours if web engines score >30/50 and no human HALT signal. Human can HALT retroactively.
- **Phase 1 Validation Gate**: REQUIRES human approval. No auto-proceed. This is a structural gate (see `rules/autonomous-execution.md`).

---

## Package Distribution

| Package | Platform | Install |
|---------|----------|---------|
| `@kailash/prism-web` | React + Next.js + Tauri (web layer) | `npm install @kailash/prism-web` |
| `@kailash/prism-compiler` | Token compilation (build tool) | `npm install -D @kailash/prism-compiler` |
| `kailash_prism` | Flutter (mobile + desktop + web) | `flutter pub add kailash_prism` |
| `kailash-prism-tauri` | Tauri Rust extensions | `cargo add kailash-prism-tauri` |

## Kailash Platform Table (Updated)

| Framework | Purpose | Install |
|-----------|---------|---------|
| Core SDK | Workflow orchestration, 140+ nodes | `pip install kailash` |
| DataFlow | Zero-config database operations | `pip install kailash-dataflow` |
| Nexus | Multi-channel deployment (API+CLI+MCP) | `pip install kailash-nexus` |
| Kaizen | AI agent framework | `pip install kailash-kaizen` |
| Trust | EATP + trust-plane governance | Included in `pip install kailash` |
| PACT | Organizational governance (D/T/R) | `pip install kailash-pact` |
| ML | Classical + deep learning lifecycle | `pip install kailash-ml` |
| Align | LLM fine-tuning/alignment + serving | `pip install kailash-align` |
| **Prism** | **Frontend composable engines** | **`npm install @kailash/prism-web`** |
| | | **`flutter pub add kailash_prism`** |
