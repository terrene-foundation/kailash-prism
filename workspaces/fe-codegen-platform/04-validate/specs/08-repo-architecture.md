# Spec 08: Repo Architecture

**Spec version**: 0.1.0
**Governs**: Directory structure, package boundaries, build system, testing strategy, distribution

---

## 8.1 Directory Structure

### Complete Tree

```
kailash-prism/
│
├── specs/                                  # Layer 1: Platform-agnostic source of truth
│   ├── tokens/
│   │   ├── schema.yaml                     # Token schema: tier definitions, constraint annotations
│   │   └── themes/
│   │       ├── enterprise.yaml             # Navy/slate professional theme
│   │       ├── modern.yaml                 # Vibrant/clean startup theme
│   │       └── minimal.yaml               # Monochrome/spacious theme
│   ├── components/
│   │   ├── _schema.yaml                    # Component contract schema (meta-schema)
│   │   ├── button.yaml                     # Button: props, states, variants, a11y
│   │   ├── input.yaml                      # Input: types, validation, states
│   │   ├── select.yaml                     # Select: single/multi, search, async
│   │   ├── data-table.yaml                 # DataTable: columns, sort, filter, page, select
│   │   ├── form.yaml                       # Form: sections, validation, conditional
│   │   ├── sidebar.yaml                    # Sidebar: items, nesting, collapse, responsive
│   │   ├── modal.yaml                      # Modal: sizes, scroll, focus trap
│   │   └── ...                             # One YAML per component (see Spec 03)
│   ├── templates/
│   │   ├── _schema.yaml                    # Template zone schema (meta-schema)
│   │   ├── dashboard.yaml                  # Zones: stats, charts, activity, alerts
│   │   ├── list.yaml                       # Zones: filter-bar, content, pagination
│   │   ├── detail.yaml                     # Zones: header, tabs, content, actions
│   │   ├── form.yaml                       # Zones: header, sections, actions
│   │   ├── settings.yaml                   # Zones: nav, sections
│   │   ├── auth.yaml                       # Zones: branding, card
│   │   ├── conversation.yaml               # Zones: sidebar, messages, input-panel
│   │   ├── split.yaml                      # Zones: master, detail
│   │   ├── wizard.yaml                     # Zones: steps, content, navigation
│   │   ├── kanban.yaml                     # Zones: columns
│   │   └── calendar.yaml                   # Zones: grid, detail-panel
│   ├── layouts/
│   │   └── grammar.yaml                    # 6 primitives: VStack, Row, Grid, Split, Layer, Scroll
│   └── navigation/
│       └── patterns.yaml                   # Sidebar, top-nav, bottom-nav, breadcrumb, command-palette
│
├── compiler/                               # Token compiler (build-time tool)
│   ├── src/
│   │   ├── index.ts                        # CLI entry point
│   │   ├── parse.ts                        # YAML parser for design-system.yaml + DESIGN.md
│   │   ├── web.ts                          # Emit: CSS custom properties + tailwind.config.ts
│   │   ├── flutter.ts                      # Emit: ThemeData factory + Dart const files
│   │   ├── validate.ts                     # Constraint validator (contrast, touch targets, pairings)
│   │   └── designmd.ts                     # DESIGN.md <-> design-system.yaml bidirectional converter
│   ├── test/
│   │   ├── parse.test.ts                   # Parser unit tests with YAML fixtures
│   │   ├── web.test.ts                     # Web output snapshot tests
│   │   ├── flutter.test.ts                 # Flutter output snapshot tests
│   │   ├── validate.test.ts                # Constraint validation tests
│   │   └── fixtures/                       # Input YAML files for snapshot testing
│   │       ├── enterprise.yaml
│   │       ├── modern.yaml
│   │       ├── minimal.yaml
│   │       ├── invalid-contrast.yaml       # Intentionally fails contrast check
│   │       └── invalid-touch-target.yaml   # Intentionally fails touch target check
│   ├── package.json                        # @kailash/prism-compiler
│   └── tsconfig.json
│
├── web/                                    # Web engine (React + TypeScript + Tailwind)
│   ├── src/
│   │   ├── atoms/
│   │   │   ├── index.ts                    # Barrel: named exports for all atoms
│   │   │   ├── button.tsx                  # Button + ButtonGroup
│   │   │   ├── input.tsx                   # Input (text, number, email, password, search)
│   │   │   ├── textarea.tsx                # TextArea (auto-resize, character count)
│   │   │   ├── select.tsx                  # Select (single, searchable)
│   │   │   ├── checkbox.tsx                # Checkbox + CheckboxGroup
│   │   │   ├── radio.tsx                   # Radio + RadioGroup
│   │   │   ├── toggle.tsx                  # Toggle switch
│   │   │   ├── label.tsx                   # Label (with required indicator)
│   │   │   ├── badge.tsx                   # Badge (status, count, dot)
│   │   │   ├── avatar.tsx                  # Avatar (image, initials, icon)
│   │   │   ├── icon.tsx                    # Icon wrapper (Lucide icons)
│   │   │   ├── tag.tsx                     # Tag (removable, selectable)
│   │   │   ├── tooltip.tsx                 # Tooltip (hover, focus)
│   │   │   ├── spinner.tsx                 # Spinner (size variants)
│   │   │   ├── progress-bar.tsx            # ProgressBar (determinate, indeterminate)
│   │   │   ├── skeleton.tsx                # Skeleton (text, circle, rectangle)
│   │   │   ├── divider.tsx                 # Divider (horizontal, vertical, with label)
│   │   │   ├── link.tsx                    # Link (internal, external, with icon)
│   │   │   ├── typography.tsx              # Typography (h1-h6, body, caption, overline)
│   │   │   ├── image.tsx                   # Image (lazy loading, fallback, aspect ratio)
│   │   │   ├── visually-hidden.tsx         # VisuallyHidden (screen reader only)
│   │   │   ├── kbd.tsx                     # Kbd (keyboard shortcut display)
│   │   │   ├── status-dot.tsx              # StatusDot (online, offline, busy, away)
│   │   │   ├── separator.tsx               # Separator (section divider)
│   │   │   └── icon-button.tsx             # IconButton (icon-only clickable)
│   │   ├── molecules/
│   │   │   ├── index.ts                    # Barrel: named exports for all molecules
│   │   │   ├── form-field.tsx              # FormField (label + input + error + hint)
│   │   │   ├── search-bar.tsx              # SearchBar (input + icon + clear + shortcut)
│   │   │   ├── select-field.tsx            # SelectField (label + select + error)
│   │   │   ├── date-picker.tsx             # DatePicker (input + calendar popup)
│   │   │   ├── file-upload.tsx             # FileUpload (drag-and-drop + progress)
│   │   │   ├── nav-item.tsx                # NavItem (icon + label + badge + nested)
│   │   │   ├── breadcrumb.tsx              # Breadcrumb (separator, truncation)
│   │   │   ├── pagination.tsx              # Pagination (pages + per-page + total)
│   │   │   ├── tab.tsx                     # Tab + TabList + TabPanel
│   │   │   ├── alert-banner.tsx            # AlertBanner (info, warn, error, success)
│   │   │   ├── toast.tsx                   # Toast (auto-dismiss, action, stack)
│   │   │   ├── empty-state.tsx             # EmptyState (icon + message + action)
│   │   │   ├── metric-card.tsx             # MetricCard (value + label + trend + sparkline)
│   │   │   ├── user-card.tsx               # UserCard (avatar + name + role + actions)
│   │   │   ├── list-item.tsx               # ListItem (icon + content + actions + drag)
│   │   │   ├── menu-item.tsx               # MenuItem (icon + label + shortcut + nested)
│   │   │   ├── dropdown-menu.tsx           # DropdownMenu (trigger + items + sections)
│   │   │   ├── popover.tsx                 # Popover (trigger + content + arrow)
│   │   │   ├── dialog-actions.tsx          # DialogActions (confirm + cancel + danger)
│   │   │   ├── tag-input.tsx               # TagInput (multi-value input with tag display)
│   │   │   ├── toggle-group.tsx            # ToggleGroup (exclusive/multi selection)
│   │   │   └── step-indicator.tsx          # StepIndicator (numbered steps, progress)
│   │   ├── organisms/
│   │   │   ├── index.ts                    # Barrel: named exports for all organisms
│   │   │   ├── data-table.tsx              # DataTable (standalone, without engine state)
│   │   │   ├── form.tsx                    # Form (standalone, without engine orchestration)
│   │   │   ├── sidebar.tsx                 # Sidebar (collapsible, nested, responsive)
│   │   │   ├── modal.tsx                   # Modal (sizes, scroll, focus trap, nested)
│   │   │   ├── command-palette.tsx          # CommandPalette (search + keyboard navigation)
│   │   │   ├── slide-over.tsx              # SlideOver (side panel, sizes)
│   │   │   ├── filter-panel.tsx            # FilterPanel (dynamic filters, apply/reset)
│   │   │   ├── card-grid.tsx               # CardGrid (responsive grid of cards)
│   │   │   ├── list-view.tsx               # ListView (virtual scroll, grouping)
│   │   │   ├── toolbar.tsx                 # Toolbar (actions, search, view toggle)
│   │   │   ├── stats-row.tsx               # StatsRow (multiple MetricCards in a row)
│   │   │   ├── form-wizard.tsx             # FormWizard (multi-step form with navigation)
│   │   │   ├── notification-center.tsx     # NotificationCenter (popover list + mark read)
│   │   │   ├── settings-section.tsx        # SettingsSection (grouped settings with controls)
│   │   │   └── app-header.tsx              # AppHeader (top header bar with logo, nav, user menu)
│   │   ├── ai/
│   │   │   ├── index.ts                    # Barrel: named exports for all AI components
│   │   │   ├── chat-message.tsx            # ChatMessage (user/AI, citations, widgets, branches)
│   │   │   ├── chat-input.tsx              # ChatInput (textarea + attachments + sources)
│   │   │   ├── stream-of-thought.tsx       # StreamOfThought (step list with states)
│   │   │   ├── action-plan.tsx             # ActionPlan (numbered, approve/modify/reject)
│   │   │   ├── citation-panel.tsx          # CitationPanel (source links + preview)
│   │   │   ├── conversation-sidebar.tsx    # ConversationSidebar (history list + search)
│   │   │   └── suggestion-chips.tsx        # SuggestionChips (prompt suggestions)
│   │   ├── engines/
│   │   │   ├── index.ts                    # Barrel: named exports for all engines
│   │   │   ├── data-table.tsx              # DataTableEngine: sort/filter/page/select/bulk/virtual
│   │   │   ├── form.tsx                    # FormEngine: validate/step/conditional/submit
│   │   │   ├── navigation.tsx              # NavigationEngine: sidebar+breadcrumb+routing
│   │   │   ├── layout.tsx                  # LayoutEngine: VStack/Row/Grid/Split responsive
│   │   │   ├── theme.tsx                   # ThemeEngine: token provider+dark mode+brand switch
│   │   │   └── chat.tsx                    # ChatEngine: streaming+tools+citations+conversation
│   │   ├── templates/
│   │   │   ├── index.ts                    # Barrel: named exports for all templates
│   │   │   ├── dashboard-layout.tsx        # DashboardLayout (stats+charts+activity zones)
│   │   │   ├── list-layout.tsx             # ListLayout (filter+content+pagination zones)
│   │   │   ├── detail-layout.tsx           # DetailLayout (header+tabs+content zones)
│   │   │   ├── form-layout.tsx             # FormLayout (header+sections+actions zones)
│   │   │   ├── settings-layout.tsx         # SettingsLayout (nav+sections zones)
│   │   │   ├── auth-layout.tsx             # AuthLayout (branding+card zones)
│   │   │   ├── conversation-layout.tsx     # ConversationLayout (sidebar+messages+input zones)
│   │   │   ├── split-layout.tsx            # SplitLayout (master+detail zones)
│   │   │   ├── wizard-layout.tsx           # WizardLayout (steps+content+nav zones)
│   │   │   ├── kanban-layout.tsx           # KanbanLayout (columns zone)
│   │   │   └── calendar-layout.tsx         # CalendarLayout (grid+detail zones)
│   │   ├── hooks/
│   │   │   ├── index.ts                    # Barrel: named exports for all hooks
│   │   │   ├── use-nexus.ts                # Nexus API integration (React Query wrapper)
│   │   │   ├── use-dataflow.ts             # DataFlow model binding
│   │   │   ├── use-theme.ts                # Theme access and switching
│   │   │   ├── use-breakpoint.ts           # Current breakpoint detection
│   │   │   ├── use-keyboard-shortcut.ts    # Keyboard shortcut registration
│   │   │   └── use-media-query.ts          # Reactive media query matching
│   │   └── layouts/
│   │       ├── index.ts                    # Barrel: named exports for all layout primitives
│   │       ├── vstack.tsx                   # VStack (vertical flow, gap)
│   │       ├── row.tsx                      # Row (horizontal flow, gap, align)
│   │       ├── grid.tsx                     # Grid (columns, responsive)
│   │       ├── split.tsx                    # Split (resizable panes)
│   │       ├── layer.tsx                    # Layer (z-axis stacking, overlays)
│   │       └── scroll.tsx                   # Scroll (virtual, infinite, snap)
│   ├── next/
│   │   ├── server/
│   │   │   ├── index.ts                    # Server component wrappers
│   │   │   ├── metadata.ts                 # generateMetadata() from template specs
│   │   │   └── streaming.ts                # Suspense boundary helpers for streaming
│   │   ├── routing/
│   │   │   ├── index.ts                    # Page factory exports
│   │   │   └── create-page.ts              # Template YAML -> page.tsx/layout.tsx/loading.tsx
│   │   └── middleware/
│   │       ├── index.ts                    # Middleware factory exports
│   │       ├── auth.ts                     # Auth guard middleware
│   │       └── i18n.ts                     # i18n routing middleware
│   ├── tauri/
│   │   ├── hooks/
│   │   │   ├── index.ts                    # Tauri hook exports
│   │   │   ├── use-invoke.ts               # Type-safe Tauri invoke()
│   │   │   ├── use-window.ts               # Window management
│   │   │   ├── use-tray.ts                 # System tray
│   │   │   ├── use-fs.ts                   # Native file system
│   │   │   ├── use-notify.ts               # OS notifications
│   │   │   ├── use-clipboard.ts            # System clipboard
│   │   │   └── use-global-shortcut.ts      # System-wide shortcuts
│   │   ├── components/
│   │   │   ├── index.ts                    # Tauri component exports
│   │   │   ├── title-bar.tsx               # Custom window title bar
│   │   │   ├── native-dialog.tsx           # OS file picker / save / message
│   │   │   └── system-tray.tsx             # Tray menu configuration
│   │   └── bridge/
│   │       └── index.ts                    # Generated IPC type definitions
│   ├── package.json                        # @kailash/prism-web
│   ├── tsconfig.json
│   ├── tailwind.config.ts                  # Generated by compiler from design-system.yaml
│   └── vite.config.ts
│
├── flutter/                                # Flutter engine
│   ├── lib/
│   │   ├── atoms/
│   │   │   ├── k_button.dart               # KButton (elevated, filled, outlined, text, icon)
│   │   │   ├── k_input.dart                # KInput (text, number, email, password, search)
│   │   │   ├── k_textarea.dart             # KTextArea (multi-line, auto-resize)
│   │   │   ├── k_select.dart               # KSelect (dropdown, searchable)
│   │   │   ├── k_checkbox.dart             # KCheckbox + KCheckboxGroup
│   │   │   ├── k_radio.dart                # KRadio + KRadioGroup
│   │   │   ├── k_toggle.dart               # KToggle switch
│   │   │   ├── k_label.dart                # KLabel (with required indicator)
│   │   │   ├── k_badge.dart                # KBadge (status, count, dot)
│   │   │   ├── k_avatar.dart               # KAvatar (image, initials, icon)
│   │   │   ├── k_icon.dart                 # KIcon wrapper
│   │   │   ├── k_tag.dart                  # KTag (removable, selectable)
│   │   │   ├── k_tooltip.dart              # KTooltip
│   │   │   ├── k_spinner.dart              # KSpinner (size variants)
│   │   │   ├── k_progress_bar.dart         # KProgressBar (determinate, indeterminate)
│   │   │   ├── k_skeleton.dart             # KSkeleton (text, circle, rectangle)
│   │   │   ├── k_divider.dart              # KDivider (horizontal, vertical, labeled)
│   │   │   ├── k_link.dart                 # KLink (tap handler, external indicator)
│   │   │   ├── k_typography.dart           # KTypography (headline, body, caption, overline)
│   │   │   ├── k_image.dart                # KImage (cached, fallback, aspect ratio)
│   │   │   ├── k_kbd.dart                  # KKbd (keyboard shortcut display)
│   │   │   ├── k_status_dot.dart           # KStatusDot (online, offline, busy, away)
│   │   │   ├── k_separator.dart            # KSeparator
│   │   │   ├── k_icon_button.dart          # KIconButton
│   │   │   └── k_visually_hidden.dart      # KVisuallyHidden (screen reader only)
│   │   ├── molecules/
│   │   │   ├── k_form_field.dart           # KFormField (label + input + error + hint)
│   │   │   ├── k_search_bar.dart           # KSearchBar
│   │   │   ├── k_select_field.dart         # KSelectField
│   │   │   ├── k_date_picker.dart          # KDatePicker
│   │   │   ├── k_file_upload.dart          # KFileUpload
│   │   │   ├── k_nav_item.dart             # KNavItem
│   │   │   ├── k_breadcrumb.dart           # KBreadcrumb
│   │   │   ├── k_pagination.dart           # KPagination
│   │   │   ├── k_tab.dart                  # KTab + KTabBar + KTabView
│   │   │   ├── k_alert_banner.dart         # KAlertBanner
│   │   │   ├── k_toast.dart                # KToast (overlay, auto-dismiss)
│   │   │   ├── k_empty_state.dart          # KEmptyState
│   │   │   ├── k_metric_card.dart          # KMetricCard
│   │   │   ├── k_user_card.dart            # KUserCard
│   │   │   ├── k_list_item.dart            # KListItem
│   │   │   ├── k_menu_item.dart            # KMenuItem
│   │   │   ├── k_dropdown_menu.dart        # KDropdownMenu
│   │   │   ├── k_popover.dart              # KPopover
│   │   │   ├── k_dialog_actions.dart       # KDialogActions
│   │   │   ├── k_tag_input.dart            # KTagInput
│   │   │   ├── k_toggle_group.dart         # KToggleGroup
│   │   │   └── k_step_indicator.dart       # KStepIndicator
│   │   ├── organisms/
│   │   │   ├── k_data_table.dart           # KDataTable (standalone)
│   │   │   ├── k_form.dart                 # KForm (standalone)
│   │   │   ├── k_sidebar.dart              # KSidebar
│   │   │   ├── k_modal.dart                # KModal / KBottomSheet
│   │   │   ├── k_command_palette.dart       # KCommandPalette
│   │   │   ├── k_slide_over.dart           # KSlideOver
│   │   │   ├── k_filter_panel.dart         # KFilterPanel
│   │   │   ├── k_card_grid.dart            # KCardGrid
│   │   │   ├── k_list_view.dart            # KListView (sliver-based)
│   │   │   ├── k_toolbar.dart              # KToolbar
│   │   │   ├── k_stats_row.dart            # KStatsRow
│   │   │   ├── k_form_wizard.dart          # KFormWizard
│   │   │   ├── k_notification_center.dart  # KNotificationCenter
│   │   │   ├── k_settings_section.dart     # KSettingsSection
│   │   │   └── k_app_header.dart           # KAppHeader
│   │   ├── ai/
│   │   │   ├── k_chat_message.dart         # KChatMessage
│   │   │   ├── k_chat_input.dart           # KChatInput
│   │   │   ├── k_stream_of_thought.dart    # KStreamOfThought
│   │   │   ├── k_action_plan.dart          # KActionPlan
│   │   │   ├── k_citation_panel.dart       # KCitationPanel
│   │   │   ├── k_conversation_sidebar.dart # KConversationSidebar
│   │   │   └── k_suggestion_chips.dart     # KSuggestionChips
│   │   ├── engines/
│   │   │   ├── data_table_engine.dart      # KDataTableEngine
│   │   │   ├── form_engine.dart            # KFormEngine
│   │   │   ├── navigation_engine.dart      # KNavigationEngine
│   │   │   ├── layout_engine.dart          # KLayoutEngine
│   │   │   ├── theme_engine.dart           # KThemeEngine
│   │   │   └── chat_engine.dart            # KChatEngine
│   │   ├── templates/
│   │   │   ├── k_dashboard_layout.dart     # KDashboardLayout
│   │   │   ├── k_list_layout.dart          # KListLayout
│   │   │   ├── k_detail_layout.dart        # KDetailLayout
│   │   │   ├── k_form_layout.dart          # KFormLayout
│   │   │   ├── k_settings_layout.dart      # KSettingsLayout
│   │   │   ├── k_auth_layout.dart          # KAuthLayout
│   │   │   ├── k_conversation_layout.dart  # KConversationLayout
│   │   │   ├── k_split_layout.dart         # KSplitLayout
│   │   │   ├── k_wizard_layout.dart        # KWizardLayout
│   │   │   ├── k_kanban_layout.dart        # KKanbanLayout
│   │   │   └── k_calendar_layout.dart      # KCalendarLayout
│   │   ├── theme/
│   │   │   ├── k_theme.dart                # KTheme widget + ThemeData factory
│   │   │   ├── k_colors.dart               # Generated: static const Color values
│   │   │   ├── k_spacing.dart              # Generated: static const double values
│   │   │   ├── k_typography.dart           # Generated: static const TextStyle values
│   │   │   ├── k_shadows.dart              # Generated: static const BoxShadow values
│   │   │   ├── k_radii.dart                # Generated: static const BorderRadius values
│   │   │   └── k_motion.dart               # Generated: static const Duration + Curve values
│   │   ├── providers/
│   │   │   ├── nexus_provider.dart         # Riverpod provider for Nexus API calls
│   │   │   └── dataflow_provider.dart      # Riverpod provider for DataFlow model binding
│   │   └── kailash_prism.dart              # Library barrel export
│   ├── test/
│   │   ├── atoms/                          # Widget tests per atom
│   │   ├── molecules/                      # Widget tests per molecule
│   │   ├── organisms/                      # Widget tests per organism
│   │   ├── engines/                        # Widget tests per engine
│   │   ├── templates/                      # Widget tests per template
│   │   ├── theme/                          # Theme generation tests
│   │   └── goldens/                        # Golden screenshot reference images
│   ├── pubspec.yaml                        # kailash_prism
│   ├── analysis_options.yaml               # Strict lint rules
│   └── dartdoc_options.yaml
│
├── tauri-rs/                               # Tauri Rust-side extensions
│   ├── src/
│   │   ├── lib.rs                          # Crate root, plugin registration
│   │   ├── commands/
│   │   │   ├── mod.rs                      # Command module root
│   │   │   ├── fs.rs                       # File system commands
│   │   │   ├── tray.rs                     # System tray commands
│   │   │   ├── notify.rs                   # Notification commands
│   │   │   ├── clipboard.rs                # Clipboard commands
│   │   │   ├── shortcuts.rs                # Global shortcut commands
│   │   │   └── updater.rs                  # Auto-update commands
│   │   ├── state/
│   │   │   ├── mod.rs                      # State module root
│   │   │   ├── window.rs                   # Window position/size persistence
│   │   │   └── preferences.rs              # App preference storage
│   │   └── bridge/
│   │       ├── mod.rs                      # Bridge module root
│   │       └── typegen.rs                  # TypeScript type generation from command sigs
│   ├── tests/
│   │   ├── commands_test.rs                # Command unit tests
│   │   └── bridge_test.rs                  # Type generation tests
│   └── Cargo.toml                          # kailash-prism-tauri
│
├── stitch/                                 # Stitch MCP integration (optional accelerator)
│   ├── normalizer.ts                       # Stitch extract_design_context -> design-system.yaml
│   └── mcp-config.yaml                     # MCP server configuration for Stitch
│
├── examples/                               # Reference applications
│   ├── react-spa/                          # Minimal React SPA using Prism
│   ├── nextjs-app/                         # Next.js App Router using Prism
│   ├── tauri-desktop/                      # Tauri desktop app using Prism
│   └── flutter-app/                        # Flutter mobile/desktop app using Prism
│
├── .claude/                                # COC artifacts (populated by loom /sync)
│   └── CLAUDE.md
│
├── .github/
│   └── workflows/
│       ├── ci.yml                          # Lint + type-check + test + build on every PR
│       ├── release.yml                     # Tag -> publish to registries
│       └── visual-regression.yml           # Chromatic/Percy + Flutter golden tests
│
├── LICENSE                                 # Apache 2.0 (Terrene Foundation)
├── CONTRIBUTING.md                         # Contribution guidelines
└── VERSION                                 # Single version source: X.Y.Z
```

### File Naming Conventions

| Directory | Convention | Example |
|-----------|-----------|---------|
| `specs/components/` | `kebab-case.yaml` | `data-table.yaml`, `date-picker.yaml` |
| `specs/templates/` | `kebab-case.yaml` | `dashboard.yaml`, `split.yaml` |
| `specs/tokens/themes/` | `kebab-case.yaml` | `enterprise.yaml`, `modern.yaml` |
| `web/src/atoms/` | `kebab-case.tsx` | `button.tsx`, `icon-button.tsx` |
| `web/src/molecules/` | `kebab-case.tsx` | `form-field.tsx`, `search-bar.tsx` |
| `web/src/engines/` | `kebab-case.tsx` | `data-table.tsx`, `chat.tsx` |
| `web/src/templates/` | `kebab-case.tsx` | `dashboard-layout.tsx` |
| `web/src/hooks/` | `kebab-case.ts` (use- prefix) | `use-nexus.ts`, `use-theme.ts` |
| `flutter/lib/atoms/` | `snake_case.dart` (k_ prefix) | `k_button.dart`, `k_icon_button.dart` |
| `flutter/lib/engines/` | `snake_case.dart` | `data_table_engine.dart` |
| `tauri-rs/src/commands/` | `snake_case.rs` | `fs.rs`, `clipboard.rs` |
| `compiler/src/` | `kebab-case.ts` | `parse.ts`, `web.ts`, `validate.ts` |

### Package Boundary Rules

| Source | May import from | MUST NOT import from |
|--------|----------------|---------------------|
| `web/src/atoms/` | Nothing in `web/src/` (leaf nodes) | molecules, organisms, engines, templates |
| `web/src/molecules/` | `atoms/` | organisms, engines, templates |
| `web/src/organisms/` | `atoms/`, `molecules/` | engines, templates |
| `web/src/engines/` | `atoms/`, `molecules/`, `organisms/`, `hooks/`, `layouts/` | templates |
| `web/src/templates/` | `atoms/`, `molecules/`, `organisms/`, `engines/`, `hooks/`, `layouts/` | Nothing — top of hierarchy |
| `web/src/hooks/` | No UI imports | atoms, molecules, organisms, engines, templates |
| `web/src/layouts/` | No UI imports (CSS primitives only) | atoms, molecules, organisms, engines, templates |
| `web/next/` | Anything in `web/src/` | `web/tauri/` |
| `web/tauri/` | Anything in `web/src/` | `web/next/` |
| `flutter/lib/atoms/` | `theme/` only | molecules, organisms, engines, templates |
| `flutter/lib/engines/` | `atoms/`, `molecules/`, `organisms/`, `theme/`, `providers/` | templates |
| `compiler/` | Nothing in `web/` or `flutter/` | All runtime packages |

**Enforcement**: ESLint `no-restricted-imports` rules for web. Dart `import_of_sibling_file` custom lint for Flutter. CI fails on boundary violations.

---

## 8.2 Build System

### Web Engine Build

| Tool | Role | Configuration |
|------|------|---------------|
| Vite 6+ | Development server (HMR, ES modules) | `web/vite.config.ts` |
| Rollup (via Vite) | Production build (tree-shaking, code splitting) | Configured in `web/vite.config.ts` `build` section |
| TypeScript 5.x | Type checking and compilation | `web/tsconfig.json` with `strict: true` |
| Tailwind CSS 4 | Utility class generation | `web/tailwind.config.ts` (generated by compiler) |
| PostCSS | CSS processing | Integrated with Tailwind |

**Build outputs**:
```
web/dist/
├── atoms/          # ES modules, one per atom
├── molecules/      # ES modules, one per molecule
├── organisms/      # ES modules, one per organism
├── ai/             # ES modules, one per AI component
├── engines/        # ES modules, one per engine
├── templates/      # ES modules, one per template
├── hooks/          # ES modules, one per hook
├── layouts/        # ES modules, one per layout primitive
├── next/           # ES modules, Next.js extensions
├── tauri/          # ES modules, Tauri extensions
└── index.d.ts      # TypeScript declaration bundle
```

Every output file is an ES module with `sideEffects: false` in `package.json`. No CommonJS output.

### Compiler Build

| Tool | Role |
|------|------|
| esbuild | Bundle compiler CLI into single executable |
| TypeScript | Type checking |
| Node.js | Runtime for CLI execution |

**CLI interface**:
```
npx prism-compiler compile --input specs/tokens/themes/enterprise.yaml --web --flutter
npx prism-compiler validate --input specs/tokens/themes/enterprise.yaml
npx prism-compiler convert --from DESIGN.md --to design-system.yaml
```

### Flutter Build

| Tool | Role |
|------|------|
| `flutter analyze` | Static analysis (strict mode) |
| `flutter format` | Code formatting (enforced) |
| `dart fix --apply` | Automated lint fixes |
| `flutter build` | AOT compilation (mobile), dart2js (web) |
| `flutter test` | Widget tests + integration tests |

### Tauri Rust Build

| Tool | Role |
|------|------|
| `cargo check` | Type checking |
| `cargo clippy` | Linting |
| `cargo fmt` | Formatting |
| `cargo test` | Unit tests |
| Tauri CLI | Bundle web + Rust into desktop app |

### CI/CD Pipeline (GitHub Actions)

**On every PR** (`ci.yml`):

```
Jobs (parallel):
  ├── web-lint:      eslint + prettier check
  ├── web-typecheck: tsc --noEmit
  ├── web-test:      vitest run --coverage
  ├── web-build:     vite build + bundlesize check
  ├── flutter-analyze: flutter analyze --fatal-infos
  ├── flutter-format:  dart format --set-exit-if-changed .
  ├── flutter-test:    flutter test --coverage
  ├── compiler-test:   vitest run (compiler tests)
  ├── rust-check:      cargo check + clippy + fmt
  └── rust-test:       cargo test
```

**On tag push** (`release.yml`):

```
Jobs (sequential):
  1. Run all CI checks (same as PR)
  2. npm publish @kailash/prism-web (with provenance)
  3. npm publish @kailash/prism-compiler (with provenance)
  4. flutter pub publish kailash_prism (with verification)
  5. cargo publish kailash-prism-tauri
  6. Create GitHub Release with changelog
```

**Visual regression** (`visual-regression.yml`, on PR):

```
Jobs (parallel):
  ├── chromatic:     Upload Storybook to Chromatic, flag visual diffs
  └── flutter-golden: flutter test --update-goldens=false (fail on diff)
```

---

## 8.3 Testing Strategy

### Web Engine Testing

| Tier | Tool | Scope | Count target |
|------|------|-------|-------------|
| Unit | Vitest | Individual component props, states, callbacks | 1 test file per component |
| Integration | Vitest + Testing Library | Engine composition (DataTable with filter + sort + page) | 1 test file per engine |
| E2E | Playwright | Full page flows (navigate, fill form, submit, verify) | 1 test file per template |
| Visual regression | Chromatic (or Percy) | Screenshot comparison for all components in all states | Automated via Storybook |

**Unit test example structure** (every component):
```
describe('Button', () => {
  it('renders all variants (primary, secondary, tertiary, ghost, destructive)')
  it('renders all sizes (sm, md, lg)')
  it('renders disabled state')
  it('renders loading state with spinner')
  it('calls onClick handler')
  it('renders as link when href provided')
  it('has correct ARIA attributes')
  it('is keyboard accessible (Enter and Space activate)')
})
```

**Engine integration test example**:
```
describe('DataTableEngine', () => {
  it('sorts by column on header click')
  it('filters rows by search input')
  it('paginates with correct page size')
  it('selects individual rows')
  it('selects all rows on header checkbox')
  it('triggers bulk action on selected rows')
  it('renders loading skeleton during fetch')
  it('renders empty state when no data')
  it('renders error state on fetch failure')
  it('virtual scrolls for 10,000+ rows without frame drops')
})
```

### Flutter Engine Testing

| Tier | Tool | Scope | Count target |
|------|------|-------|-------------|
| Widget | flutter_test | Individual widget rendering, interaction | 1 test file per widget |
| Integration | integration_test | Multi-widget flows | 1 test file per engine |
| Golden | golden_toolkit | Screenshot comparison | 1 golden per widget, per theme, per breakpoint |
| Marionette | Marionette MCP (Phase 3) | Automated UI validation via AI | Per template |

**Widget test requirements**:
- Every public widget has a corresponding `test/` file
- Tests cover: rendering, interaction, theme compliance, accessibility semantics
- All tests run with `const` widget construction to verify const-correctness

**Golden screenshot matrix**:
- Each component x 3 themes (enterprise, modern, minimal) x 2 modes (light, dark) x 3 sizes (phone, tablet, desktop)
- Total per component: up to 18 golden screenshots
- Stored in `flutter/test/goldens/`

### Compiler Testing

| Test type | Method | What it verifies |
|-----------|--------|-----------------|
| Snapshot | Input YAML -> expected output files | Web output (CSS vars + tailwind.config.ts) matches snapshot |
| Snapshot | Input YAML -> expected output files | Flutter output (ThemeData + Dart consts) matches snapshot |
| Constraint | Invalid input YAML -> expected errors | Contrast ratio violations detected |
| Constraint | Invalid input YAML -> expected errors | Touch target violations detected |
| Round-trip | DESIGN.md -> YAML -> DESIGN.md | Converter preserves all information |

Snapshot files stored in `compiler/test/fixtures/__snapshots__/`.

### Coverage Targets

| Package | Minimum coverage | Enforcement |
|---------|-----------------|-------------|
| `@kailash/prism-compiler` | 90% line coverage | CI fails below threshold |
| `@kailash/prism-web` engines | 80% line coverage | CI fails below threshold |
| `@kailash/prism-web` atoms+molecules | 80% line coverage | CI fails below threshold |
| `kailash_prism` engines | 80% line coverage | CI fails below threshold |
| `kailash_prism` atoms+molecules | 80% line coverage | CI fails below threshold |
| `kailash-prism-tauri` | 80% line coverage | CI fails below threshold |

---

## 8.4 Distribution

### npm Publishing

| Field | Value |
|-------|-------|
| Scope | `@kailash` |
| Registry | `https://registry.npmjs.org` |
| Provenance | Enabled (npm provenance via GitHub Actions OIDC) |
| Access | `public` |
| Tag | `latest` for stable, `next` for pre-release |
| Files | Only `dist/`, `package.json`, `README.md`, `LICENSE` |
| Changelog | Generated from conventional commits via `changesets` |

**`package.json` exports field** (subpath exports):
```json
{
  "exports": {
    "./atoms": "./dist/atoms/index.js",
    "./atoms/*": "./dist/atoms/*.js",
    "./molecules": "./dist/molecules/index.js",
    "./molecules/*": "./dist/molecules/*.js",
    "./organisms": "./dist/organisms/index.js",
    "./organisms/*": "./dist/organisms/*.js",
    "./ai": "./dist/ai/index.js",
    "./ai/*": "./dist/ai/*.js",
    "./engines": "./dist/engines/index.js",
    "./engines/*": "./dist/engines/*.js",
    "./templates": "./dist/templates/index.js",
    "./hooks": "./dist/hooks/index.js",
    "./layouts": "./dist/layouts/index.js",
    "./layouts/*": "./dist/layouts/*.js",
    "./next/server": "./dist/next/server/index.js",
    "./next/routing": "./dist/next/routing/index.js",
    "./next/middleware": "./dist/next/middleware/index.js",
    "./tauri/hooks": "./dist/tauri/hooks/index.js",
    "./tauri/components": "./dist/tauri/components/index.js",
    "./tauri/bridge": "./dist/tauri/bridge/index.js"
  },
  "sideEffects": false
}
```

Per-component subpath exports (e.g., `./atoms/button`, `./molecules/toast`) provide a guaranteed escape hatch when barrel re-export tree-shaking is incomplete. Consumers can import individual components directly:
```typescript
import { Button } from '@kailash/prism-web/atoms/button'
import { Toast } from '@kailash/prism-web/molecules/toast'
```

### pub.dev Publishing

| Field | Value |
|-------|-------|
| Package name | `kailash_prism` |
| Publisher | Terrene Foundation verified publisher |
| SDK constraint | `sdk: '>=3.0.0 <4.0.0'` |
| Flutter constraint | `flutter: '>=3.0.0'` |
| Platforms | `android`, `ios`, `linux`, `macos`, `windows`, `web` |

### crates.io Publishing

| Field | Value |
|-------|-------|
| Crate name | `kailash-prism-tauri` |
| License | `Apache-2.0` |
| Categories | `gui`, `web-programming` |
| Keywords | `tauri`, `kailash`, `prism`, `desktop` |

### Versioning Protocol

1. All four packages share ONE version number, tracked in `/VERSION`
2. Version bump follows semver:
   - MAJOR: Breaking API change in ANY package
   - MINOR: New feature in any package, backward compatible
   - PATCH: Bug fix, documentation, performance improvement
3. Release process:
   - Update `/VERSION`
   - Generate changelogs from conventional commits
   - Tag: `git tag v{VERSION}`
   - Push tag triggers `release.yml` pipeline
4. All four packages publish atomically in one CI run

### License

Apache 2.0, Terrene Foundation. Every source file includes the standard Apache 2.0 header. `LICENSE` file at repository root.

---

## 8.5 Development Workflow

### Branch Strategy

| Branch type | Naming | Merges to | Lifetime |
|-------------|--------|-----------|----------|
| Feature | `feat/{description}` | `main` via PR | Deleted after merge |
| Bug fix | `fix/{description}` | `main` via PR | Deleted after merge |
| Chore | `chore/{description}` | `main` via PR | Deleted after merge |
| Release | `release/v{X.Y.Z}` | `main` via PR | Deleted after merge |
| Main | `main` | Protected | Permanent |

No long-lived feature branches. No develop branch. Trunk-based development with short-lived branches.

### Pre-Commit Checks

Enforced via `lefthook` or `husky`:

```
pre-commit:
  parallel: true
  commands:
    eslint:
      glob: "web/**/*.{ts,tsx}"
      run: npx eslint {staged_files}
    prettier:
      glob: "web/**/*.{ts,tsx,json,yaml}"
      run: npx prettier --check {staged_files}
    tsc:
      glob: "web/**/*.{ts,tsx}"
      run: npx tsc --noEmit
    dart-format:
      glob: "flutter/**/*.dart"
      run: dart format --set-exit-if-changed {staged_files}
    dart-analyze:
      glob: "flutter/**/*.dart"
      run: flutter analyze
    cargo-fmt:
      glob: "tauri-rs/**/*.rs"
      run: cargo fmt -- --check
    cargo-clippy:
      glob: "tauri-rs/**/*.rs"
      run: cargo clippy -- -D warnings
```

### PR Requirements

Every PR to `main` requires:

1. All CI checks pass (lint + type-check + test + build)
2. Bundle size within budget (web)
3. No coverage regression below minimum thresholds
4. Conventional commit messages
5. Spec traceability: PR description references governing spec section(s)

### Release Process

1. Create `release/v{X.Y.Z}` branch from `main`
2. Update `/VERSION` to `{X.Y.Z}`
3. Generate changelog: `npx changeset version`
4. PR to `main`, merge
5. Tag `main`: `git tag v{X.Y.Z}`
6. Push tag: triggers `release.yml`
7. CI publishes all four packages
8. Create GitHub Release with changelog body
