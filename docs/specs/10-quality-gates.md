# Spec 10: Quality Gates

**Spec version**: 0.1.0
**Governs**: /i-audit scoring, /i-harden checklist, automated validation, convergence criteria

---

## 10.1 /i-audit Scoring (Prism-Adapted)

### Scoring System

10 dimensions, each scored 1-5. Maximum score: 50.

| Score | Meaning |
|-------|---------|
| 1 | Fundamentally broken — violates basic usability |
| 2 | Below acceptable — multiple obvious problems |
| 3 | Acceptable — functional but unremarkable |
| 4 | Good — deliberate and consistent, minor refinements possible |
| 5 | Excellent — polished, intentional, production-ready |

### Dimension 1: Visual Hierarchy

**What it measures**: Whether the page guides the user's eye to the most important content first, and whether the importance ordering matches the template zone priority.

| Score | Criteria |
|-------|----------|
| 1 | No discernible hierarchy; all content at equal visual weight |
| 2 | Some hierarchy present but inconsistent; heading levels skipped |
| 3 | Clear primary/secondary/tertiary levels; heading hierarchy correct |
| 4 | Hierarchy matches template zone priorities; focal point is intentional |
| 5 | Hierarchy reinforced by size, color, spacing, AND position; works on all breakpoints |

**Prism-specific check**: Template YAML defines zone priorities (e.g., dashboard stats zone = priority 1, activity zone = priority 2). Verify that visual weight of rendered zones matches declared priority order.

**Automated verification**: Parse template YAML zone priorities. Measure rendered font-size and contrast ratio of each zone's primary content. Zone with highest priority MUST have largest font-size or highest contrast ratio.

### Dimension 2: Information Architecture

**What it measures**: Whether content is organized logically, navigation is predictable, and the user can find what they need.

| Score | Criteria |
|-------|----------|
| 1 | Content placement is arbitrary; no navigation structure |
| 2 | Basic navigation exists but content grouping is inconsistent |
| 3 | Content grouped logically; navigation covers all sections |
| 4 | Navigation matches user mental model; breadcrumbs accurate; URL structure reflects IA |
| 5 | IA validated against navigation engine route structure; all routes reachable within 3 clicks from any page |

**Prism-specific check**: Navigation engine route structure defines the IA. Verify that rendered navigation items match route definitions. Every route in the navigation engine MUST have a corresponding rendered nav item.

**Automated verification**: Extract route definitions from navigation engine config. Extract rendered nav items from DOM/widget tree. Diff: routes without nav items = finding.

### Dimension 3: Typography

**What it measures**: Whether text is readable, consistent, and uses the design system type scale.

| Score | Criteria |
|-------|----------|
| 1 | Multiple unrelated fonts/sizes; no type scale |
| 2 | Some type scale adherence but hardcoded sizes present |
| 3 | Type scale from design system used consistently |
| 4 | Type scale used consistently AND line-height/letter-spacing from tokens |
| 5 | Full token adherence; no hardcoded font-size, line-height, or letter-spacing anywhere |

**Prism-specific check**: All typography MUST come from token values. Grep for hardcoded `font-size`, `fontSize`, `TextStyle(fontSize:` values — count MUST be 0.

**Automated verification**:
- Web: `grep -rn "font-size:" web/src/ --include="*.tsx" | grep -v "var(--"` must return 0 results
- Web: `grep -rn "fontSize:" web/src/ --include="*.tsx" | grep -v "theme\|token\|var("` must return 0 results
- Flutter: `grep -rn "fontSize:" flutter/lib/ --include="*.dart" | grep -v "KTypography\|Theme.of\|k_typography"` must return 0 results

### Dimension 4: Color and Contrast

**What it measures**: Whether colors are accessible, consistent, and derived from the design system.

| Score | Criteria |
|-------|----------|
| 1 | Hardcoded colors throughout; contrast violations; no system |
| 2 | Some token usage but hardcoded colors present; 1+ WCAG AA violations |
| 3 | All colors from tokens; WCAG AA contrast ratios met |
| 4 | WCAG AA met; dark mode functional; color not sole information carrier |
| 5 | WCAG AAA on body text; AA on all interactive elements; high contrast mode supported |

**Prism-specific check**: Token compiler validates contrast ratios at build time. Runtime check: 0 hardcoded color values in component code.

**Automated verification**:
- Compiler: `npx prism-compiler validate` reports 0 contrast violations
- Web: `grep -rn "#[0-9a-fA-F]\{3,8\}" web/src/ --include="*.tsx"` must return 0 results (no hex colors)
- Web: `grep -rn "rgb\|rgba\|hsl" web/src/ --include="*.tsx" | grep -v "var(--"` must return 0 results
- Flutter: `grep -rn "Color(0x\|Colors\." flutter/lib/ --include="*.dart" | grep -v "KColors\|k_colors"` must return 0 results
- Accessibility: axe-core scan reports 0 color-contrast violations

### Dimension 5: Spatial Design

**What it measures**: Whether spacing is consistent, intentional, and derived from the spacing scale.

| Score | Criteria |
|-------|----------|
| 1 | Random spacing; no consistent margins/padding |
| 2 | Some consistent spacing but magic numbers present (e.g., `padding: 13px`) |
| 3 | All spacing from token scale; consistent within each page |
| 4 | Spacing scale used consistently across all pages; section rhythm predictable |
| 5 | Full token adherence; density variants (comfortable/compact/spacious) work correctly |

**Prism-specific check**: No magic spacing numbers. All spacing values MUST come from the spacing token scale.

**Automated verification**:
- Web: `grep -rn "padding:\|margin:\|gap:" web/src/ --include="*.tsx" | grep -v "var(--\|token\|spacing"` — only Tailwind utility classes or CSS variables permitted
- Flutter: `grep -rn "EdgeInsets\.\|SizedBox(" flutter/lib/ --include="*.dart" | grep -v "KSpacing\|k_spacing"` — only token constants permitted

### Dimension 6: Interaction Design

**What it measures**: Whether interactive elements behave predictably and provide appropriate feedback.

| Score | Criteria |
|-------|----------|
| 1 | Clickable elements not visually distinguishable; no hover/focus states |
| 2 | Basic hover states; some interactive elements missing feedback |
| 3 | All interactive elements have hover, focus, active, and disabled states |
| 4 | States match engine event contracts; loading states present for async actions |
| 5 | Optimistic updates where appropriate; error recovery for failed actions; micro-interactions for confirmation |

**Prism-specific check**: Engine event contracts define the required interaction states for each component. Verify that rendered components implement all states defined in their contract YAML.

**Automated verification**: Parse component contract YAML `states` field. For each declared state, verify a corresponding CSS class / widget state exists in the component implementation. Missing states = finding.

### Dimension 7: Motion Design

**What it measures**: Whether animations are purposeful, performant, and respect user preferences.

| Score | Criteria |
|-------|----------|
| 1 | No transitions; jarring state changes |
| 2 | Some transitions but inconsistent duration/easing |
| 3 | Transitions use motion tokens (duration + easing from design system) |
| 4 | Animations GPU-only (transform, opacity); `prefers-reduced-motion` respected |
| 5 | Motion tokens used consistently; reduced motion fully functional; no layout-triggering animations |

**Prism-specific check**: Motion tokens define duration and easing values. Animations MUST use only GPU-composited properties.

**Automated verification**:
- Web: `grep -rn "transition:" web/src/ --include="*.tsx" | grep -v "var(--\|token\|motion"` — must use motion tokens
- Web: Grep for layout-triggering animation properties (`width`, `height`, `top`, `left`, `margin`, `padding` in transition/animation) — must return 0
- Web: `grep -rn "prefers-reduced-motion" web/src/` — must return at least 1 result per animated component
- Flutter: `grep -rn "Duration(" flutter/lib/ --include="*.dart" | grep -v "KMotion\|k_motion"` — must use motion token constants

### Dimension 8: State Coverage

**What it measures**: Whether all UI states are explicitly handled (not just the happy path).

| Score | Criteria |
|-------|----------|
| 1 | Only happy path rendered; no loading, error, or empty states |
| 2 | Loading state exists but error and empty states missing |
| 3 | Loading, error, and empty states all present |
| 4 | States match component state machine definitions; transitions between states are smooth |
| 5 | All states from engine contracts implemented; edge cases (timeout, partial data, stale cache) handled |

**Prism-specific check**: Engine contracts define state machines (e.g., DataTable: idle | loading | error | empty | populated). Each declared state MUST have a corresponding rendered output.

**Automated verification**: Parse engine contract `states` field. For each engine instance in the codebase, verify that all declared states have corresponding render branches (JSX conditional / widget builder). Missing state branches = finding.

### Dimension 9: Responsive Design

**What it measures**: Whether the layout adapts correctly across all defined breakpoints.

| Score | Criteria |
|-------|----------|
| 1 | Single fixed-width layout; breaks on mobile |
| 2 | Some responsive behavior but breakpoint transitions are jarring |
| 3 | All 4 breakpoints (mobile/tablet/desktop/wide) handled; content reflows without overflow |
| 4 | Responsive behavior matches layout grammar rules; navigation collapses correctly |
| 5 | All breakpoints smooth; touch targets >=44px on mobile; no horizontal scroll on any breakpoint |

**Prism-specific check**: Layout grammar defines responsive rules per breakpoint. Verify that rendered output at each breakpoint matches the grammar's declared behavior.

**Automated verification**:
- Playwright: Test each page at 4 viewport sizes (375px, 768px, 1024px, 1440px)
- At each size: no horizontal overflow (`document.body.scrollWidth <= window.innerWidth`)
- At each size: no text truncation that hides meaning (visual regression comparison)
- At mobile (375px): all interactive elements have minimum 44x44px touch target
- Flutter: Widget tests at 4 sizes (mobile: 375x812, tablet: 768x1024, desktop: 1024x768, wide: 1440x900)

### Dimension 10: Distinctiveness (Anti-AI-Slop)

**What it measures**: Whether the design has intentional character or looks like generic AI output.

| Score | Criteria |
|-------|----------|
| 1 | Generic template appearance; no design decisions visible |
| 2 | Some customization but heavy reliance on defaults |
| 3 | Theme tokens applied consistently; not obviously generic |
| 4 | Design reflects DESIGN.md intent; brand personality visible |
| 5 | Distinctive without being distracting; passes the "screenshot test" (recognizable from a thumbnail) |

**AI slop fingerprints** (indicators of score 1-2):
- Uniform border radius on all elements (everything is `rounded-lg`)
- Generic gradient backgrounds (linear-gradient for decoration, not data)
- Identical card shadows throughout (no shadow hierarchy)
- Stock illustration style (undraw/storyset) without customization
- Default Tailwind color palette with no semantic intent

**Prism-specific check**: Theme tokens MUST be customized from the starter theme, not used as-is. DESIGN.md MUST specify at least: primary color rationale, typography choice rationale, and one intentional design decision that differs from the starter theme.

**Automated verification**: Diff project's `design-system.yaml` against the starter theme YAML. A diff of 0 lines (identical to starter) = score capped at 2. At least 5 semantic token overrides required for score 3+.

### Scoring Summary

| Dimension | Prism baseline (primitives guarantee) | Requires project effort |
|-----------|--------------------------------------|------------------------|
| 1. Visual hierarchy | 3 (template zones provide structure) | 4-5 |
| 2. Information architecture | 3 (navigation engine provides structure) | 4-5 |
| 3. Typography | 4 (token-only by construction) | 5 |
| 4. Color/contrast | 4 (constraint validation by construction) | 5 |
| 5. Spatial design | 4 (token-only by construction) | 5 |
| 6. Interaction design | 3 (engine contracts provide states) | 4-5 |
| 7. Motion | 4 (motion tokens + GPU-only by construction) | 5 |
| 8. State coverage | 3 (engines handle loading/error/empty) | 4-5 |
| 9. Responsive | 4 (layout grammar enforces breakpoints) | 5 |
| 10. Distinctiveness | 2 (starter themes are generic by design) | 3-5 |

**Prism baseline total**: 35/50 (primitives alone, before project customization)
**Target with project effort**: 40+/50

---

## 10.2 /i-harden Checklist (Prism-Adapted)

### Category 1: Text Resilience

| Check | Pass criterion | Engine mapping |
|-------|---------------|----------------|
| Long text overflow | No text overflows its container at any breakpoint | Typography atom `overflow` prop; component contract `maxLines` field |
| Empty text | Components render gracefully with empty string input | Component contract `empty` state |
| Single character | Components render gracefully with 1-character input | Component contract test fixture |
| 1000+ character text | Components truncate or scroll; no layout break | Typography atom `truncate` prop; organism scroll behavior |
| Special characters | `<>&"'` render correctly (no XSS, no broken HTML) | Output encoding in all text rendering |
| Numeric overflow | Large numbers (999,999,999) fit in metric cards | MetricCard molecule `format` prop |
| RTL text | Components render correctly with RTL content | Token system `direction` support; layout grammar `direction` rule |

### Category 2: Internationalization

| Check | Pass criterion | Engine mapping |
|-------|---------------|----------------|
| Text expansion (1.5x) | Layout does not break with 50% longer text (German, Finnish) | Layout engine responsive rules; component contract `minWidth` constraints |
| RTL layout | Full layout mirrors correctly in RTL locales | Layout grammar `direction: rtl` rule; navigation engine RTL support |
| Date formatting | Dates display in locale-appropriate format | DatePicker molecule `locale` prop |
| Number formatting | Numbers use locale-appropriate separators | MetricCard molecule `locale` prop |
| Currency formatting | Currency symbols and placement follow locale | Token system does not constrain; application-level concern |
| Pluralization | UI strings handle 0, 1, and many correctly | Application-level concern; not a Prism engine responsibility |

### Category 3: Error States

| Check | Pass criterion | Engine mapping |
|-------|---------------|----------------|
| Network failure | User sees error message + retry action, not blank screen | Engine contract `error` state with `onRetry` callback |
| Timeout | Loading indicator transitions to error after timeout threshold | Engine contract `timeout` parameter; loading state with timer |
| Partial data | Components render available data; indicate missing fields | Engine contract `partial` state handling |
| Validation errors | Form fields show inline errors; form shows summary | Form engine validation integration; FormField molecule error prop |
| 401 Unauthorized | Redirect to auth page; no flash of protected content | Navigation engine auth guard; AuthLayout template |
| 403 Forbidden | Show permission denied message; suggest contact admin | Engine contract `forbidden` state |
| 404 Not Found | Show helpful not-found page with navigation options | Page template fallback; navigation engine 404 route |
| 500 Server Error | Show generic error with retry; no stack traces in production | Engine contract `error` state; error boundary wrapping |

### Category 4: Edge Cases

| Check | Pass criterion | Engine mapping |
|-------|---------------|----------------|
| Empty list | Empty state component rendered (icon + message + CTA) | Engine contract `empty` state; EmptyState molecule |
| Single item list | Renders correctly without styling artifacts | DataTable/ListView organisms; no "last-child" only styling |
| 10,000+ item list | Virtual scrolling active; no frame drops | DataTable engine virtual scroll; ListView organism SliverList.builder |
| Rapid clicks | No duplicate submissions; button disables during async | Form engine submit handling; Button atom `loading` state |
| Back/forward navigation | State preserved or correctly reset | Navigation engine state management; URL state persistence |
| Browser refresh | Critical state not lost (URL params or localStorage) | Engine state persistence strategy |
| Concurrent updates | Optimistic update with rollback on conflict | Engine contract `conflict` state; React Query/Riverpod cache invalidation |
| Slow network (3G) | Loading states visible; no timeout on normal operations | Engine contract loading state; skeleton atoms |

### Category 5: Accessibility

| Check | Pass criterion | Engine mapping |
|-------|---------------|----------------|
| Keyboard navigation | All interactive elements reachable via Tab; logical order | Component contract `tabIndex` and `role` fields |
| Focus visible | Focus indicator visible on all interactive elements | Token system `focus-ring` token; component contract `focus` state |
| Screen reader | All content has meaningful text alternative | Component contract `aria` field; VisuallyHidden atom |
| Skip navigation | Skip-to-content link present on every page | Layout engine skip-link integration |
| Form labels | Every input has an associated `<label>` or `aria-label` | FormField molecule label association; component contract `label` requirement |
| Error announcements | Form errors announced to screen reader on submission | Form engine ARIA live region; AlertBanner molecule `role="alert"` |
| Color independence | Information not conveyed by color alone | Component contract colorblind-safe variants (icon + color for status) |
| Touch targets | All interactive elements >= 44x44px on mobile | Component contract `minTouchTarget` constraint; token system enforcement |
| Heading hierarchy | h1-h6 in order; no skipped levels | Typography atom heading level enforcement; template zone heading rules |
| Landmark regions | `main`, `nav`, `header`, `footer` landmarks present | Layout engine landmark wrapping; template ARIA landmarks |

### Category 6: Performance

| Check | Pass criterion | Engine mapping |
|-------|---------------|----------------|
| Initial load | Largest Contentful Paint < 2.5s | Engine lazy loading; template code splitting |
| Interaction response | First Input Delay < 100ms | Engine event handlers non-blocking |
| Layout stability | Cumulative Layout Shift < 0.1 | Skeleton atoms prevent CLS; image aspect ratios fixed |
| Virtual scroll | 10,000 rows render without jank (60fps) | DataTable engine virtual scroll; ListView organism SliverList.builder |
| Lazy loading | Images below fold load on demand | Image atom lazy loading; IntersectionObserver (web) |
| Bundle size | Atoms + molecules < 65KB gzipped | Tree-shaking; sideEffects: false |
| Memory | No memory leaks on route change | Engine cleanup on unmount; Riverpod auto-dispose |
| Animations | All animations GPU-composited | Motion tokens constrain to transform/opacity; no layout animations |

---

## 10.3 Automated Validation

### Token Compliance

**Rule**: Zero hardcoded color, spacing, typography, shadow, radius, or motion values in component code.

| Check | Command | Pass criterion |
|-------|---------|---------------|
| No hex colors (web) | `grep -rn "#[0-9a-fA-F]\{3,8\}" web/src/ --include="*.tsx"` | 0 results |
| No rgb/rgba/hsl (web) | `grep -rn "rgb\|rgba\|hsl" web/src/ --include="*.tsx" \| grep -v "var(--"` | 0 results |
| No hardcoded px spacing (web) | `grep -rn "padding:\|margin:\|gap:" web/src/ --include="*.tsx" \| grep -v "var(--\|className"` | 0 results (only Tailwind classes or CSS vars) |
| No hardcoded font-size (web) | `grep -rn "font-size:\|fontSize:" web/src/ --include="*.tsx" \| grep -v "var(--\|token"` | 0 results |
| No raw Color() (flutter) | `grep -rn "Color(0x\|Colors\." flutter/lib/ --include="*.dart" \| grep -v "KColors\|k_colors"` | 0 results |
| No raw EdgeInsets values (flutter) | `grep -rn "EdgeInsets\.(all\|only\|symmetric)(" flutter/lib/ --include="*.dart" \| grep -v "KSpacing\|k_spacing"` | 0 results |
| No raw fontSize (flutter) | `grep -rn "fontSize:" flutter/lib/ --include="*.dart" \| grep -v "KTypography\|k_typography\|Theme.of"` | 0 results |

**Enforcement**: CI job `token-compliance` runs all checks. ANY non-zero result blocks merge.

### Component Compliance

**Rule**: >70% of UI components in a project should come from Prism primitives.

| Check | Method | Pass criterion |
|-------|--------|---------------|
| Import ratio (web) | Count imports from `@kailash/prism-web` vs total component imports | >= 70% |
| Import ratio (flutter) | Count imports from `package:kailash_prism` vs total widget imports | >= 70% |

**Measurement script**:
```bash
# Web: count Prism imports vs total component-like imports
PRISM_IMPORTS=$(grep -rn "from '@kailash/prism-web" src/ --include="*.tsx" | wc -l)
TOTAL_IMPORTS=$(grep -rn "from '" src/ --include="*.tsx" | grep -v "node_modules\|react\|next" | wc -l)
RATIO=$((PRISM_IMPORTS * 100 / TOTAL_IMPORTS))
# RATIO must be >= 70
```

**Enforcement**: CI job `component-compliance` runs measurement. Below 70% emits a warning. Below 50% blocks merge.

### Layout Compliance

**Rule**: Layout composition MUST use layout primitives, not raw CSS flex/grid.

| Check | Command | Pass criterion |
|-------|---------|---------------|
| No raw flex (web) | `grep -rn "display:\s*flex\|display:\s*grid" web/src/ --include="*.tsx" \| grep -v "layouts/"` | 0 results outside of layout primitive implementations |
| No raw Column/Row (flutter) | `grep -rn "^\\s*Column(\|^\\s*Row(" flutter/lib/ --include="*.dart" \| grep -v "atoms/\|molecules/\|organisms/\|engines/\|layouts/"` | 0 results in templates and pages (allowed in primitive implementations) |

**Enforcement**: CI job `layout-compliance`. Violations in templates or pages block merge. Violations in primitive implementations are expected.

### Accessibility

**Rule**: 0 CRITICAL axe-core violations.

| Check | Tool | Pass criterion |
|-------|------|---------------|
| axe-core scan (web) | `@axe-core/playwright` in E2E tests | 0 violations with impact "critical" |
| axe-core scan (web) | `@axe-core/playwright` in E2E tests | 0 violations with impact "serious" |
| Semantics audit (flutter) | `flutter test` with `SemanticsHandle` checks | All interactive widgets have Semantics annotations |

**Enforcement**: Playwright E2E tests include axe-core scan on every page. ANY critical or serious violation fails the test.

### Bundle Size

**Rule**: Base atoms + molecules must fit within 65KB gzipped.

| Check | Tool | Pass criterion |
|-------|------|---------------|
| Atoms + molecules bundle | `npx bundlesize` with config in `package.json` | < 65KB gzipped |
| Single engine (except AI Chat) | `npx bundlesize` per engine entry point | < 30KB gzipped each |
| AI Chat engine | `npx bundlesize` for chat engine entry point | < 80KB gzipped (includes markdown + syntax highlighting) |
| Full page initial load | Lighthouse CLI `--only-categories=performance` | Transfer size < 150KB for initial route |
| Tree-shaking verification | Custom script: import 1 atom, measure bundle | 0 bytes from engines, templates, or unused atoms |

**Enforcement**: CI job `bundle-size`. Over-budget blocks merge.

### Lighthouse

**Rule**: Minimum scores on reference application.

| Metric | Minimum score | Measurement |
|--------|--------------|-------------|
| Performance | 90 | `npx lighthouse --only-categories=performance` |
| Accessibility | 95 | `npx lighthouse --only-categories=accessibility` |
| Best Practices | 90 | `npx lighthouse --only-categories=best-practices` |

**Enforcement**: CI job `lighthouse` runs against reference Next.js app. Below minimum blocks merge.

---

## 10.4 Convergence Criteria

### Definition

Convergence is the state where the kailash-prism codebase meets ALL quality gates with zero outstanding findings. Convergence is required before any release tag.

### Required Conditions

| # | Condition | Verification method | Pass/Fail |
|---|-----------|-------------------|-----------|
| C-1 | 0 CRITICAL findings across all red team agents | `/redteam` output parsed; count CRITICAL = 0 | Binary |
| C-2 | 0 HIGH findings across all red team agents | `/redteam` output parsed; count HIGH = 0 | Binary |
| C-3 | 2 consecutive clean rounds | Run `/redteam` twice; second round produces 0 new findings of any severity | Binary |
| C-4 | 100% spec coverage | Every section in Specs 01-10 verified via grep/AST against codebase | Binary |
| C-5 | Token compliance: 0 hardcoded values | All token compliance checks in section 10.3 pass | Binary |
| C-6 | Component compliance: >=70% Prism imports | Component compliance measurement in section 10.3 passes | Threshold |
| C-7 | Layout compliance: 0 raw CSS flex/grid in templates | Layout compliance checks in section 10.3 pass | Binary |
| C-8 | Accessibility: 0 CRITICAL/SERIOUS violations | axe-core scan returns 0 critical + serious violations | Binary |
| C-9 | Bundle size: within budget | All bundle size checks in section 10.3 pass | Binary |
| C-10 | Lighthouse: minimum scores met | Performance >= 90, Accessibility >= 95, Best Practices >= 90 | Threshold |
| C-11 | Test coverage: minimum met | Compiler >= 90%, engines >= 80%, atoms/molecules >= 80% | Threshold |
| C-12 | /i-audit baseline: 40+/50 on reference app | Reference application scored by /i-audit | Threshold |
| C-13 | All CI checks green | `ci.yml` workflow passes on `main` branch | Binary |
| C-14 | 0 TODO/FIXME/HACK markers in production code | `grep -rn "TODO\|FIXME\|HACK\|STUB\|XXX" web/src/ flutter/lib/ tauri-rs/src/ --include="*.tsx" --include="*.dart" --include="*.rs"` returns 0 | Binary |
| C-15 | 0 `any` types in TypeScript | `grep -rn ": any\b" web/src/ --include="*.ts" --include="*.tsx"` returns 0 | Binary |
| C-16 | 0 `dynamic` types in Dart | `grep -rn "dynamic " flutter/lib/ --include="*.dart"` returns 0 (excluding generated files) | Binary |

### Convergence Verification Process

1. Run all automated checks (C-5 through C-11, C-13 through C-16) via CI
2. Run `/redteam` (produces findings for C-1, C-2)
3. Fix all CRITICAL and HIGH findings
4. Run `/redteam` again (verification for C-3)
5. Run `/i-audit` on reference application (C-12)
6. Run spec coverage verification (C-4): for every numbered section in Specs 01-10, grep the codebase for the corresponding implementation artifact
7. All 16 conditions met = converged = eligible for release tag

### Phase 1 Validation Gate (Subset)

Phase 1 completion requires a subset of convergence criteria, applied to the reference applications:

| Condition | Phase 1 requirement |
|-----------|-------------------|
| C-1 | 0 CRITICAL findings |
| C-2 | 0 HIGH findings |
| C-5 | Token compliance passes |
| C-6 | Component compliance >= 70% on reference apps |
| C-9 | Bundle size within budget |
| C-11 | Test coverage minimums met |
| C-12 | /i-audit >= 40/50 on reference React+Next.js app AND reference Flutter app |
| C-13 | CI green |

Phase 1 does NOT require: C-3 (consecutive clean rounds), C-4 (full spec coverage — specs may still be evolving), C-10 (Lighthouse — reference app may not be production-optimized).

### Phase 2 Success Metrics

These are measured across the first 3 real projects using Prism:

| Metric | Target | Measurement |
|--------|--------|-------------|
| Session count reduction | < 50% of comparable no-Prism project | Count sessions for each project; compare to historical baseline |
| Component compliance | > 70% Prism imports | Import analysis per project |
| /i-audit without intervention | > 35/50 | Score each project before any manual polish |
| Patterns extracted per project | >= 5 new patterns | Count `/codify` proposals accepted per project |
| Constraint validator catch rate | > 90% of accessibility issues caught automatically | Compare automated findings to manual accessibility audit |

### Release Criteria

A version may be tagged and published when:
1. ALL 16 convergence conditions (C-1 through C-16) are met
2. Changelog is generated from conventional commits
3. All four packages build successfully
4. VERSION file updated
5. Human authorization (structural gate per `rules/autonomous-execution.md`)
