# Round 1: Internal Consistency Review

**Reviewer**: Quality Reviewer Agent
**Date**: 2026-04-11
**Scope**: Specs 01-10, cross-reference accuracy, naming consistency, number consistency, rule consistency, completeness gaps

---

## Summary

- **Overall Status**: Issues Found
- **Critical**: 3
- **High**: 8
- **Medium**: 7
- **Low**: 4
- **Total findings**: 22

---

## CRITICAL Issues (Must Fix Before Commit)

### C-1: Breakpoint "wide" boundary conflict across specs

**Specs in conflict**:
- Spec 01 (Design System Protocol), Section 1.1.10: `wide` MUST be >= 1440 and <= 1920. The example theme sets `wide: 1440px`.
- Spec 01, Section 1.2.2 (design-system.yaml primitives): `wide: 1440`.
- Spec 01, Section 1.2.3 (semantic breakpoints): `desktop: { min: 1024, max: 1439 }`, `wide: { min: 1440, max: null }`.
- Spec 02 (Token Architecture), Section 2.1.7: `wide` MUST be in range [1440, 1920].
- Spec 04 (Layout Grammar), Section 4.2.1: `wide` range is 1280px+. `WIDE_MIN: 1280`. Dart: `if (width < 1280) return desktop; return wide;`
- Spec 05 (Engine Specifications): All responsive tables use `wide (1280px+)`.
- Spec 06 (Page Templates): All responsive tables use `wide (1280px+)`.

**Conflict**: Specs 01 and 02 define `wide` as starting at 1440px. Spec 04 defines it as starting at 1280px. Specs 05 and 06 consistently use 1280px+. The `WIDE_MIN` constant in Spec 04 is 1280, the semantic breakpoint in Spec 01 says 1440, and the Flutter dart code in Spec 04 uses `< 1280`.

**Impact**: An implementation following Spec 04/05/06 (1280px) would violate the constraints in Spec 01/02 (must be >= 1440). This makes the specs unimplementable as written.

**Resolution**: Decide on one boundary. The 1280px value from Spec 04 is used more pervasively (engines, templates, layout grammar). Either:
- Option A: Change Specs 01 and 02 to allow `wide` in range [1280, 1920], OR
- Option B: Change Spec 04 `WIDE_MIN` to 1440 and update the dart code, but then also change Spec 04 `DESKTOP_MAX` to 1439 (currently 1279), and update all responsive tables in Specs 05 and 06 from `wide (1280px+)` to `wide (1440px+)`.

Additionally the `desktop` breakpoint max is inconsistent:
- Spec 04: `DESKTOP_MAX: 1279`
- Spec 01 semantic breakpoints: `desktop: { max: 1439 }`

These are mutually exclusive. If wide starts at 1440, desktop must end at 1439. If wide starts at 1280, desktop must end at 1279.

---

### C-2: Breakpoint "tablet" starting value conflict between Spec 01 example and Spec 04 ranges

**Specs in conflict**:
- Spec 01 (Design System Protocol), Section 1.1.10: `tablet` MUST be >= 640 and <= 768. Example theme: `tablet: 768px`. design-system.yaml primitives: `tablet: 768`. Semantic breakpoints: `tablet: { min: 768, max: 1023 }`.
- Spec 02 (Token Architecture), Section 2.1.7: `tablet` MUST be in range [640, 768].
- Spec 04 (Layout Grammar), Section 4.2.1: `tablet` range is 640--1023px. `TABLET_MIN: 640`. Dart: `if (width < 640) return mobile; if (width < 1024) return tablet;`
- Spec 05 (Engine Specifications): All responsive tables use `tablet (640-1023px)`.
- Spec 06 (Page Templates): All responsive tables use `tablet (640-1023px)`.

**Conflict**: The Spec 01 example theme uses 768px as the tablet breakpoint, and the semantic breakpoint definition says `tablet: { min: 768, max: 1023 }`. But Spec 04, 05, and 06 all use 640px as the start of the tablet range. The constraint in Spec 01 and 02 says "640 to 768" is allowed, but the example and semantic tier lock it to 768.

**Impact**: A viewport at 650px would be classified as `mobile` by Spec 01's example theme but as `tablet` by Spec 04's ranges. This affects every responsive layout, every engine responsive contract, and every template responsive transformation.

**Resolution**: The specs need to be internally consistent. If the example theme uses 768, then Spec 04's range tables should show `tablet (768-1023px)` and `mobile (0-767px)`. But since the constraints allow 640-768, the example can be 640 too. The key issue is the Spec 04 hardcoded ranges, dart code, and engine/template tables all assume 640, while the only authoritative example uses 768. Either:
- Option A: Change the Spec 01 example and semantic breakpoints to use `tablet: 640`, making them match Spec 04/05/06.
- Option B: Change Spec 04 ranges, constants, dart code, and all engine/template tables to use 768.

---

### C-3: Spacing scale conflict between Spec 02 and Spec 04

**Specs in conflict**:
- Spec 02 (Token Architecture), Section 2.1.2: Required spacing scale is `[4, 8, 12, 16, 24, 32, 48, 64]`.
- Spec 01 (Design System Protocol), Section 1.2.2: `spacing.scale: [4, 8, 12, 16, 24, 32, 48, 64]`.
- Spec 04 (Layout Grammar), Section 4.4.1: `spacing.scale: [0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128]`.

**Conflict**: Spec 04 has a significantly different spacing scale. It includes values 0, 2, 20, 40, 80, 96, 128 that are not in the Spec 02 required scale. Spec 04 also states "No spacing value outside this scale is valid."

Additionally, Spec 02 requires all spacing values be divisible by 4, but Spec 04's scale includes `2` which is NOT divisible by 4.

**Impact**: Code referencing the spacing system would fail validation depending on which spec is considered authoritative.

**Resolution**: Reconcile the two scales. The Spec 02 scale is the minimum required set. Spec 04's scale should be marked as a superset that includes additional permitted values. Also, the value `2` in Spec 04 violates Spec 02's "every value MUST be divisible by 4" rule and must be either removed or Spec 02's constraint relaxed.

---

## HIGH Issues (Should Fix in Current Session)

### H-1: Breakpoint naming inconsistency (sm/md/lg/xl vs mobile/tablet/desktop/wide)

**Specs in conflict**:
- Spec 07 (Cross-Platform Strategy), Section 7.2: "Same breakpoint definitions (sm/md/lg/xl)"
- Spec 10 (Quality Gates), Section 10.1 Dimension 9: "All 4 breakpoints (sm/md/lg/xl) handled"
- Every other spec (01, 02, 04, 05, 06): Uses `mobile/tablet/desktop/wide` consistently.

**Impact**: The sm/md/lg/xl naming in Specs 07 and 10 contradicts the canonical naming used everywhere else. Implementers may create two parallel breakpoint systems.

**Resolution**: Change "sm/md/lg/xl" to "mobile/tablet/desktop/wide" in Spec 07 Section 7.2 and Spec 10 Section 10.1 Dimension 9 to match the canonical naming.

---

### H-2: Button variant name mismatch in test example (Spec 08)

**Spec in conflict**:
- Spec 08 (Repo Architecture), Section 8.3: Test example lists `it('renders all variants (primary, secondary, outline, ghost, destructive)')`.
- Spec 03 (Component Contracts), Section 3.2.1 Button contract: Variants are `primary, secondary, tertiary, destructive, ghost`.

**Conflict**: The test uses "outline" but the Button contract defines "tertiary". There is no "outline" variant in the Button contract.

**Resolution**: Change "outline" to "tertiary" in the Spec 08 test example.

---

### H-3: Conversation template sidebar widths conflict between Spec 05 and Spec 06

**Specs in conflict**:
- Spec 05 (Engine Specifications), Section 5.6 AI Chat Engine Responsive Contract:
  - `wide`: Conversation list 320px, citation panel 380px.
  - `desktop`: Conversation list 280px, citation panel 320px.
- Spec 06 (Page Templates), Section 6.2.7 Conversation:
  - Zone schemas: `conv-sidebar` width 280px (wide), 260px (desktop). `info-panel` width 320px (wide), 280px (desktop).
  - Responsive transformations: `wide`: sidebar 320px, info-panel 380px. `desktop`: sidebar 260px, info-panel 280px.

**Conflict**: The zone schema widths (280px/260px for sidebar, 320px/280px for info-panel) do not match the responsive transformation widths below them (320px/260px for sidebar, 380px/280px for info-panel). The zone schema says 280px wide-sidebar but the responsive table says 320px. The Spec 05 engine responsive contract uses yet different values (desktop citation: 320px vs Spec 06's 280px).

**Resolution**: Align all three sources (zone schema, responsive transformations table, engine responsive contract) to use the same width values.

---

### H-4: Token count "~250" not verifiable

**Spec in conflict**:
- Spec 05 (Engine Specifications), Section 5.5 Theme Engine Performance: "Resolving all ~250 tokens for a theme + mode combination MUST complete in < 5ms."

**Issue**: No spec provides a total token count derivation. Counting the required tokens from Spec 02 gives:
- 19 required semantic color tokens + optional variants
- 4 required spacing semantic tokens + optional variants  
- 9 required typography semantic tokens
- 5 required radius semantic tokens
- 5 required shadow semantic tokens
- 4 required motion semantic tokens
- 4 required breakpoint semantic tokens
- Plus all Tier 3 component tokens (25 atoms + 22 molecules + 22 organisms with multiple variant/state combos)

The Tier 3 tokens alone for Button (5 variants x 6 states x ~5 properties) could be 150+. The total is likely well above 250.

**Resolution**: Either derive the actual token count and update the ~250 figure, or change the performance contract to say "all tokens" without specifying a count.

---

### H-5: Spec 01 "radius.component" semantic naming differs from Spec 02

**Specs in conflict**:
- Spec 01 (Design System Protocol), Section 1.2.3 semantic tokens: Uses `radius.component.default`, `radius.component.small`, `radius.component.large`, `radius.component.pill`.
- Spec 02 (Token Architecture), Section 2.2.4: Uses `radius.component.none`, `radius.component.small`, `radius.component.default`, `radius.component.large`, `radius.component.pill` (5 tokens).

**Conflict**: Spec 01 omits `radius.component.none` from its example semantic tier. Spec 02 requires it.

**Resolution**: Add `radius.component.none` to Spec 01's semantic tier example.

---

### H-6: Spec 04 semantic spacing tokens differ from Spec 02

**Specs in conflict**:
- Spec 04 (Layout Grammar), Section 4.4.2 defines 10 semantic spacing tokens including `spacing.page.gutter`, `spacing.component.gap-tight`, `spacing.component.gap-loose`, `spacing.inline.gap`, `spacing.inline.gap-tight`.
- Spec 02 (Token Architecture), Section 2.2.2 defines only 4 required semantic spacing tokens: `spacing.component.padding`, `spacing.component.gap`, `spacing.page.margin`, `spacing.section.gap`. The others from Spec 04 are not listed even as optional.

**Conflict**: Spec 04 references tokens that Spec 02 does not define. For example, `spacing.page.gutter`, `spacing.section.padding`, `spacing.component.gap-tight`, `spacing.component.gap-loose`, `spacing.inline.gap`, `spacing.inline.gap-tight` are all used in the spacing application map in Spec 04 but not declared as required or optional in Spec 02.

**Resolution**: Add these tokens to Spec 02's semantic spacing token list (as required or optional, depending on whether they're mandatory for the spacing application map to work). Or mark them as application-specific extensions in Spec 04.

---

### H-7: Spec 01 DESIGN.md spacing entries not aligned with Spec 02 constraints

**Specs in conflict**:
- Spec 01, Section 1.1.6: Spacing `md` MUST equal 12 or 16.
- Spec 01, example theme: `md: 16px`.
- Spec 02, Section 2.1.2: Required spacing scale has both 12 and 16. No constraint on which should be "md".

**Issue**: The constraint "MUST equal 12 or 16" is defined in the DESIGN.md format but has no corresponding constraint in the design-system.yaml schema. If a theme uses `md: 12` in DESIGN.md but the semantic tier uses `spacing.component.gap: 12`, the bidirectional converter would need to know this mapping, but no mapping is specified.

**Resolution**: Clarify in Spec 01 how DESIGN.md spacing names (xs, sm, md, lg, xl, 2xl, 3xl) map to the semantic spacing tokens in design-system.yaml.

---

### H-8: Organisms list in Spec 08 web directory is missing 7 AI organisms

**Specs in conflict**:
- Spec 03 (Component Contracts), Section 3.5.5: Lists 22 organisms including 7 AI-specific: ChatMessage, ChatInput, StreamOfThought, ActionPlan, CitationPanel, ConversationSidebar, SuggestionChips.
- Spec 08 (Repo Architecture), Section 8.1: The `web/src/organisms/` directory lists only 15 organisms (no AI organisms). The 7 AI organisms are in `web/src/ai/`.
- Spec 02 (Token Architecture), Section 2.3.2: Lists all 22 organisms including AI ones under "Organisms (22)" heading.

**Conflict**: Spec 03 categorizes all 22 as organisms, Spec 02 lists all 22 under organisms for token requirements, but Spec 08 splits them into `organisms/` (15) and `ai/` (7). This means the AI organisms are categorized differently at the file-system level than at the contract level. The organism count discrepancy (15 in organisms/ + 7 in ai/ = 22 total) is reconcilable but the category split is not documented in Spec 03.

**Resolution**: Either:
- Option A: Add a note in Spec 03 that AI-specific organisms are physically located in the `ai/` directory but are contractually organisms. OR
- Option B: Add a "3.4.AI Organisms" sub-category in Spec 03 that explicitly notes the directory separation.

The current Spec 03 does label them with "(AI-specific)" which partially addresses this, but the physical/logical split should be documented.

---

## MEDIUM Issues

### M-1: Spec 07 responsive section mentions "sm/md/lg/xl" but layout primitives only list 4 named primitives

**Location**: Spec 07, Section 7.2 "Similar But Adapted" table, Layout primitives row.

**Issue**: Lists `<Stack>, <Row>, <Grid>, <Split>` as web layout primitives but omits `<Layer>` and `<Scroll>`. Spec 04 defines 6 layout primitives.

**Resolution**: Update the table to include all 6: `<Stack>, <Row>, <Grid>, <Split>, <Layer>, <Scroll>`.

---

### M-2: Design System Protocol "radius.none" constraint mismatch

**Specs in conflict**:
- Spec 01, Section 1.1.7: `radius.none` MUST equal `0`.
- Spec 01, example theme: `none: 0`.
- Spec 02, Section 2.2.4: `radius.component.none` MUST equal 0.

These are consistent, but note that Spec 01 uses short names (`none`, `sm`, `md`, `lg`, `pill`) while Spec 02 uses fully qualified names (`radius.component.none`, `radius.component.small`, etc.) and also uses `small` instead of `sm`, `default` instead of `md`, `large` instead of `lg`.

**Impact**: The DESIGN.md to design-system.yaml converter needs to map `sm->small`, `md->default`, `lg->large`. This mapping is not documented.

**Resolution**: Document the DESIGN.md-to-semantic-token mapping for radius names in Spec 01.

---

### M-3: Template count reference (11) is accurate but not listed in one place

**Verification**: Spec 05 says "One of the 11 defined templates." Spec 06 defines exactly 11: Dashboard, List, Detail, Form, Settings, Auth, Conversation, Split, Wizard, Kanban, Calendar. Spec 08 lists 11 template files. This is consistent.

**Minor issue**: Spec 06 Section 6.3.1 lists the selection table with 11 entries, which matches. However, Spec 08 template YAML files list `calendar.yaml` but no spec number links templates to a count in an easily verifiable way.

**Resolution**: No action required -- the count is consistent. This is noted for completeness.

---

### M-4: Spec 10 Flutter widget test viewport size uses 768 for tablet

**Location**: Spec 10, Section 10.1 Dimension 9 Responsive Design.

**Issue**: "Flutter: Widget tests at 3 sizes (phone: 375x812, tablet: 768x1024, desktop: 1440x900)". The tablet width 768 matches Spec 01's example theme but not Spec 04's 640px tablet start. The desktop test width 1440 matches Spec 01's wide breakpoint, not the desktop breakpoint (1024-1279 per Spec 04 or 1024-1439 per Spec 01).

**Resolution**: These test viewport sizes should be documented as testing the breakpoint boundaries defined by the theme. But the 1440px test size is labeled "desktop" when it should be "wide" per the breakpoint definitions.

---

### M-5: Spec 04 spacing "4px grid constraint" vs Spec 02 constraint conflict

**Location**: Spec 01, Section 1.1.6: "Every value MUST be divisible by 4 (4px grid constraint)."
Spec 02, Section 2.1.2: "Every value MUST be divisible by 4."
Spec 04, Section 4.4.1: Scale includes value `2`.

**Issue**: Also the Spec 01 example spacing uses `md: 16px` but lists `xs: 4px`. Both are divisible by 4. However Spec 04's scale has `2` which is not. This is a sub-finding of C-3 but specifically about the 4px grid rule.

**Resolution**: Remove `2` from Spec 04's spacing scale, or relax the 4px divisibility rule to "4px grid for semantic tokens; primitive scale may include sub-grid values for fine-tuning."

---

### M-6: Spec 01 DESIGN.md "instant" motion value uses `0ms` but constraint says <= 50ms

**Location**: Spec 01, example theme: `instant: 0ms ease`.
Spec 01, Section 1.1.9: `instant` MUST be <= 50ms.

**Issue**: While 0ms satisfies "<= 50ms", using 0ms may conflict with Spec 05 Section 5.5 which says reduced motion uses "duration: 1ms, not 0ms for rendering guarantees". If `instant` is 0ms and is used for animations, it may not trigger rendering.

**Resolution**: Consider changing the example to `1ms ease` or documenting that `instant` at 0ms means no transition (intentionally different from the reduced-motion 1ms guarantee).

---

### M-7: Spec 03 component contracts have inconsistent "inherits_from" semantics

**Location**: Spec 03, Sections 3.2.2-3.2.5.

**Issue**: IconButton lists `inherits_from: "Button"`, TextArea lists `inherits_from: "TextInput"`, Select lists `inherits_from: "TextInput"`. But the token architecture in Spec 02 does not define an inheritance mechanism for Tier 3 component tokens. The `inherits_from` field is defined in the contract schema but there is no specification of how token inheritance works (does it copy all tokens? only missing ones? override semantics?).

**Resolution**: Add a section to Spec 02 or Spec 03 that defines how `inherits_from` affects Tier 3 token resolution.

---

## LOW Issues

### L-1: Spec 08 missing `k_visually_hidden.dart` in Flutter atoms directory

**Location**: Spec 08, Section 8.1 Flutter directory tree lists atoms but does not include `k_visually_hidden.dart`. Spec 03, Section 3.5.5 lists VisuallyHidden as one of the 25 atoms. The web directory in Spec 08 includes `visually-hidden.tsx`.

**Resolution**: Add `k_visually_hidden.dart` to the Flutter atoms directory listing.

---

### L-2: Spec 07 Section 7.6 npm package organisms list does not mention AI organisms

**Location**: Spec 07, Section 7.6: `organisms/` description says "DataTable, Form, Sidebar, Modal, ..." which are only the non-AI organisms.

**Issue**: The `ai/` subdirectory IS listed separately, so this is not an error, just an observation that the `organisms/` listing comment doesn't mention the AI organisms exist elsewhere.

**Resolution**: No action required, but could add "(see also ai/)" in the organisms comment.

---

### L-3: Spec 08 web engine organism count is 14 in directory listing, Spec 03 says 15 non-AI

**Location**: Spec 08 web organisms directory lists: data-table, form, sidebar, modal, command-palette, slide-over, filter-panel, card-grid, list-view, toolbar, stats-row, form-wizard, notification-center, settings-section = 14 files.

Spec 03 lists 15 non-AI organisms: adds AppHeader. But `app-header.tsx` is not listed in Spec 08's `web/src/organisms/` directory.

**Resolution**: Add `app-header.tsx` to the web organisms directory in Spec 08. The organism AppHeader (Spec 03, Section 3.4.1) needs a corresponding file.

---

### L-4: Spec 06 Conversation zone schema sidebar width mismatch within the same section

**Location**: Spec 06, Section 6.2.7 Conversation template.

Zone schema table: `conv-sidebar` width = `280px (wide), 260px (desktop)`.
Responsive transformations table: `wide (1280px+)` sidebar = 320px; `desktop (1024-1279px)` sidebar = 260px.

The zone schema says 280px wide, the responsive table says 320px wide. These are in the same template section.

**Resolution**: Make the zone schema width match the responsive transformations table (or vice versa). Likely the responsive table is authoritative.

---

## Code Example Validation

No executable code examples in these specification documents (they are YAML and TypeScript type definitions, not runnable code). The Dart breakpoint-resolution function in Spec 04 Section 4.2.1 is syntactically valid but uses boundaries inconsistent with the token architecture (uses 640 for tablet, not 768 per Spec 01 example -- see C-2).

---

## Cross-Reference Accuracy Summary

| Reference | Source | Target | Status |
|-----------|--------|--------|--------|
| "25 atoms" | Spec 02 Section 2.3.2 | Spec 03 Section 3.5.5 | PASS (25 atoms listed in both) |
| "22 molecules" | Spec 02 Section 2.3.2 | Spec 03 Section 3.5.5 | PASS (22 molecules in both) |
| "22 organisms" | Spec 02 Section 2.3.2 | Spec 03 Section 3.5.5 | PASS (22 organisms in both) |
| "69 total components" | Spec 03 Section 3.5.5 | Spec 02 Section 2.3.2 | PASS (25+22+22=69) |
| "11 templates" | Spec 05 Section 5.4 | Spec 06 Section 6.3.1 | PASS (11 defined) |
| "6 engines" | Spec 09 Section 9.3 | Spec 05 | PASS (DataTable, Form, Navigation, Layout, Theme, AI Chat) |
| "6 layout primitives" | Spec 04 Section 4.1 | Spec 08 layouts/ | PASS (Stack, Row, Grid, Split, Layer, Scroll) |
| Component names | Spec 03 full list | Spec 08 directory | FAIL -- AppHeader missing from web/src/organisms, VisuallyHidden missing from Flutter atoms (L-1, L-3) |
| Breakpoint names | Spec 01/02/04 | Spec 07/10 | FAIL -- sm/md/lg/xl vs mobile/tablet/desktop/wide (H-1) |
| Breakpoint values | Spec 01/02 | Spec 04/05/06 | FAIL -- tablet and wide boundaries inconsistent (C-1, C-2) |
| Spacing scale | Spec 02 | Spec 04 | FAIL -- different scales (C-3) |
| Button variants | Spec 03 | Spec 08 test example | FAIL -- "outline" vs "tertiary" (H-2) |
