# Implementation Plan: kailash-prism

## Execution Model

**All platforms simultaneously.** The two-engine architecture (web + flutter) enables parallel execution. Agents building React components and agents building Flutter widgets work from the same specs without blocking each other. Tauri extensions run as a parallel sub-track within the web engine.

## Phase 1: Foundation (4-5 sessions, parallelized)

Three parallel workstreams sharing the spec layer.

### Workstream A: Specs + Compiler (1-2 sessions)

Shared foundation for ALL platforms. Must complete first sprint before engines begin consuming tokens.

- [ ] **design-system.yaml schema** — Three-tier token architecture:
  - Tier 1: Primitive values (raw color/spacing/type/radius/shadow/motion scales)
  - Tier 2: Semantic intent (interactive.primary, surface.page, text.primary)
  - Tier 3: Component-scoped (button.primary.bg, card.shadow, input.border-focus)
  - Constraint annotations: contrast minimums, touch targets, pairing rules
- [ ] **3 starter themes** — Enterprise (navy/slate), Modern (vibrant/clean), Minimal (monochrome/spacious)
- [ ] **Token compiler** — `@kailash/prism-compiler`:
  - design-system.yaml → tailwind.config.ts + CSS variables (web)
  - design-system.yaml → ThemeData + Dart constants (flutter)
  - Constraint validator (contrast ratios, touch target minimums)
  - DESIGN.md ↔ design-system.yaml bidirectional converter
- [ ] **Component contracts** — YAML specs for each component: props/parameters, states, variants, accessibility requirements, responsive behavior
- [ ] **Layout grammar** — YAML definition of 6 layout primitives (Stack, Row, Grid, Split, Layer, Scroll) with responsive rules
- [ ] **Page template definitions** — YAML for 11 templates (dashboard, list, detail, form, settings, auth, conversation, split, wizard, kanban, calendar) with zone definitions
- [ ] **Brief-to-DESIGN.md prompt template** — Structured prompt the agent uses to generate a project-specific DESIGN.md from a natural language brief

### Workstream B: Web Engine (3-4 sessions, parallel with A after Sprint 1)

React components shared by React SPA, Next.js, and Tauri.

**Sprint B1 — High-value engines (reweight by time savings):**
- [ ] DataTable engine — sort, filter, paginate, select, bulk actions, virtual scroll (@tanstack/virtual), loading/empty/error states, column config, responsive (→ CardGrid on mobile)
- [ ] Form engine — validation (zod/yup), multi-section, conditional fields, file upload, submission handling, reset, loading states
- [ ] Navigation engine — Sidebar (collapsible, nested, responsive rail/drawer/full) + AppHeader + Breadcrumbs + routing integration
- [ ] Layout engine — Stack, Row, Grid, Split with responsive breakpoint rules; zone composition for templates
- [ ] Theme engine — Token provider (CSS variables), dark mode toggle, brand switching, `prefers-color-scheme` detection

**Sprint B2 — Atom + molecule primitives (consistency enforcement):**
- [ ] 25 atoms: Button (all variants), Input, TextArea, Select, Checkbox, Radio, Toggle, Label, Badge, Avatar, Icon, Tag, Tooltip, Spinner, ProgressBar, Skeleton, Divider, Link, Typography, Image, VisuallyHidden, Kbd, StatusDot, Separator, IconButton
- [ ] 22 molecules: FormField, SearchBar, SelectField, DatePicker, FileUpload, NavItem, Breadcrumb, Pagination, Tab, AlertBanner, Toast, EmptyState, MetricCard, UserCard, ListItem, MenuItem, DropdownMenu, Popover, DialogActions, TagInput, ToggleGroup, StepIndicator
- [ ] Remaining organisms: Modal/Dialog, CommandPalette, SlideOver, FilterPanel, CardGrid, ListView, Toolbar, StatsRow, FormWizard, NotificationCenter, SettingsSection

**Sprint B3 — AI Chat engine + platform extensions:**
- [ ] AI Chat engine — ChatMessage (user/AI with citations, widgets, branch indicator), ChatInput (open input + attachments + sources), StreamOfThought (step list with states), ActionPlan (numbered with approve/modify/reject), CitationPanel, ConversationSidebar, SuggestionChips
- [ ] Page templates — DashboardLayout, ListLayout, DetailLayout, FormLayout, SettingsLayout, AuthLayout, ConversationLayout, SplitLayout, WizardLayout, KanbanLayout, CalendarLayout
- [ ] **Next.js extensions** — RSC wrappers for server-renderable organisms, App Router page factories, metadata helpers, streaming SSR for chat engine
- [ ] **Tauri extensions** — useInvoke/useWindow/useTray/useFs hooks, TitleBar/SystemTray/NativeDialog components, Rust IPC type generation bridge, window state persistence

### Workstream C: Flutter Engine (3-4 sessions, parallel with A after Sprint 1)

Mirrors web engine structure with Flutter/Dart idioms.

**Sprint C1 — High-value engines:**
- [ ] KDataTable engine — sort, filter, paginate, select, bulk, sliver-based virtual scroll, responsive (→ KCardGrid on phone)
- [ ] KForm engine — validation, multi-section, conditional, file picker, submission, keyboard handling, focus management
- [ ] KNavigation engine — KSidebar (collapsible, responsive NavigationRail/Drawer), KAppBar, KBreadcrumb, GoRouter integration
- [ ] KLayout engine — Column/Row/GridView/Split with responsive LayoutBuilder rules; platform-adaptive (iOS safe areas, Android system bars)
- [ ] KTheme engine — Generated ThemeData from design-system.yaml, dark mode, brand switching, platform-adaptive (Cupertino on iOS, Material on Android)

**Sprint C2 — Atom + molecule widgets:**
- [ ] 25 atom widgets: KButton, KInput, KTextArea, KSelect, KCheckbox, KRadio, KToggle, KLabel, KBadge, KAvatar, KIcon, KTag, KTooltip, KSpinner, KProgressBar, KSkeleton, KDivider, KLink, KTypography, KImage, etc.
- [ ] 22 molecule widgets: KFormField, KSearchBar, KSelectField, KDatePicker, KFileUpload, KNavItem, KBreadcrumb, KPagination, KTab, KAlertBanner, KToast, KEmptyState, KMetricCard, KUserCard, KListItem, KMenuItem, KDropdownMenu, KPopover, KDialogActions, KTagInput, KToggleGroup, KStepIndicator
- [ ] Remaining organisms: KModal, KCommandPalette, KSlideOver, KFilterPanel, KCardGrid, KListView, KToolbar, KStatsRow, KFormWizard, KNotificationCenter, KSettingsSection

**Sprint C3 — AI Chat engine + platform adaptations:**
- [ ] AI Chat engine — KChatMessage, KChatInput, KStreamOfThought, KActionPlan, KCitationPanel, KConversationSidebar, KSuggestionChips
- [ ] Page templates — All 11 KLayout templates
- [ ] **Mobile adaptations** — Safe areas, notch handling, haptic feedback, swipe actions, pull-to-refresh, push notification integration
- [ ] **Desktop adaptations** — Window chrome, keyboard shortcuts, menu bar, multi-window, system tray (macOS/Windows/Linux)

### Workstream D: COC Artifacts (parallel, 1-2 sessions)

Updates to loom/ to support Prism across the ecosystem.

- [ ] **Sync manifest update** — Add prism repo entry, variant declarations
- [ ] **Prism variant directory** — `variants/prism/` with enhanced agents, skills, commands
- [ ] **Updated react-specialist** — Prism component composition awareness, engine usage patterns
- [ ] **Updated flutter-specialist** — Prism widget composition awareness, engine usage patterns
- [ ] **New prism-architect agent** — Cross-platform engine design, spec authoring, token system
- [ ] **Updated uiux-designer** — DESIGN.md generation capability, brief-to-spec workflow
- [ ] **New /scaffold command** — Reads DESIGN.md + data model → project structure with template selections, token files, component skeletons
- [ ] **New prism-engines skill** — Engine documentation (DataTable, Form, Navigation, Layout, Theme, AI Chat)
- [ ] **New prism-specs skill** — DESIGN.md protocol, token architecture, component contracts
- [ ] **Composition grammar skill** — YAML layout grammar reference
- [ ] **Updated 11-frontend-integration** — Global version: "how to use Prism with your Kailash backend"; Prism variant: "how to build with Prism engines"
- [ ] **Guidance compression** — For every engine built, compress corresponding prose in existing skills. Net reduction target: 300+ lines removed as engines absorb what was previously guidance

### Phase 1 Validation Gate

- [ ] Reference application (React + Next.js) composed entirely from Prism engines scores 40+/50 on /i-audit
- [ ] Reference application (Flutter) composed from Prism engines scores 40+/50 on /i-audit
- [ ] Tauri desktop app renders the same screens as the Next.js app with native window chrome
- [ ] Token compiler produces identical visual output from the same design-system.yaml across web and Flutter
- [ ] `/scaffold` generates a working project skeleton in <2 minutes for each target
- [ ] All engines tree-shake correctly (unused engines not in bundle)

---

## Phase 2: Validation + Extraction Loop (2-3 sessions + real projects)

### Activities
- [ ] **3 real projects** using Prism engines (at least 1 web, 1 mobile, 1 desktop)
- [ ] Measure: session count vs comparable no-Prism project
- [ ] Identify: missing engines, edge cases, composition patterns that need codifying
- [ ] **Build extraction loop**: project → /codify → kailash-prism proposals → loom/ review → sync
- [ ] **Iterate engines** based on real project friction (5-10 additions/modifications per project)
- [ ] **Cross-project consistency test**: 3 projects using the same theme produce visually consistent output without manual design review

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
- [ ] Build normalizer: Stitch `extract_design_context` → design-system.yaml
- [ ] Extend /scaffold: optional Stitch visual exploration before spec generation
- [ ] Test: Stitch-accelerated path produces equivalent /i-audit scores, 5x faster to DESIGN.md

### Nexus-to-Prism Bridge
- [ ] Type extraction: Nexus API schema → TypeScript interfaces → React Query hooks → Prism DataTable columns
- [ ] Type extraction: Nexus API schema → Dart classes → Riverpod providers → Prism KDataTable config
- [ ] This eliminates manual type creation for ALL Kailash backend integrations

### Marionette Integration (Flutter Testing)
- [ ] Connect Marionette MCP to /i-audit for automated Flutter UI validation
- [ ] Golden screenshot tests for all Flutter engines
- [ ] Playwright integration for web engine visual regression

---

## Parallel Execution Map

```
Session 1  ──┬── [A] Specs + schema + themes + compiler
              ��── [D] Loom sync manifest + variant structure
              └── [D] New skills/agents/commands (drafts)

Session 2  ──┬── [A] Token compiler complete + component contracts
              ├── [B1] Web engines start (DataTable, Form, Nav)
              └── [C1] Flutter engines start (KDataTable, KForm, KNav)

Session 3  ──┬── [B1] Web engines complete + [B2] atoms/molecules start
              ├── [C1] Flutter engines complete + [C2] atoms/molecules start
              └── [D] Updated agents + /scaffold command

Session 4  ──┬── [B2/B3] Web atoms/molecules + AI Chat + Next.js/Tauri extensions
              ├── [C2/C3] Flutter atoms/molecules + AI Chat + platform adaptations
              └── [D] Composition grammar + guidance compression

Session 5  ──┬── [B3] Web templates + validation
              ├── [C3] Flutter templates + validation
              └── Phase 1 gate: reference apps + /i-audit scoring

Session 6+  ── Phase 2: Real projects + extraction loop
```

**All four targets are live by Session 5.** No phasing, no waiting.

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
