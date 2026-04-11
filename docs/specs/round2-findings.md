# Round 2 Red Team Findings

**Date**: 2026-04-11
**Reviewer**: Quality Reviewer Agent (Prism Spec Round 2)
**Scope**: Verify Round 1 fixes applied; find new or residual issues

---

## Summary

- **Overall Status**: Issues Found
- **Round 1 Fix Verification**: 24 of 25 fixes confirmed applied; 1 partially applied (H-5 radius.component.none)
- **New Issues Found**: 0 CRITICAL, 2 HIGH, 3 MEDIUM, 1 LOW

**Convergence status**: NOT YET -- 2 HIGH findings must be resolved before the first clean round.

---

## Round 1 Fix Verification

### Confirmed Fixed

| Fix # | Description | Status |
|-------|-------------|--------|
| 1 | Breakpoint standardization (0/768/1024/1440) | CONFIRMED -- Specs 01, 02, 04, 05, 06, 07, 10 all use identical breakpoint values |
| 2 | Tablet starting at 768px | CONFIRMED -- all specs consistent |
| 3 | Spacing scale reconciled (4px grid, no 2px/20px) | CONFIRMED -- Spec 04 scale is `[0, 4, 8, 12, 16, 24, 32, 48, 64, 80, 96, 128]` with required subset per Spec 02 documented |
| 4 | Error boundary section (5.7) | CONFIRMED -- zone-level boundaries, fallback UI, retry with exponential backoff |
| 5 | Kailash SDK integration (5.8) | CONFIRMED -- Nexus, DataFlow, Kaizen integration all present and internally consistent |
| 6 | Offline behavior (5.9) | CONFIRMED -- detection, visual indicator, per-engine behavior, reconnection, service worker |
| 7 | RTL support (4.5) | CONFIRMED -- direction token, primitive adaptation table, icon mirroring, auto-mirroring |
| 8 | Breakpoint naming sm/md/lg/xl -> mobile/tablet/desktop/wide | CONFIRMED -- no remnant sm/md/lg/xl in any spec |
| 9 | Button variant "outline" -> "tertiary" in test | CONFIRMED -- Spec 08 line 544 uses "tertiary" |
| 10 | Conversation sidebar widths aligned | CONFIRMED -- 320/260/380/280 consistent between Spec 05 and Spec 06 |
| 11 | Token count "~250" -> "all tokens" | CONFIRMED |
| 12 | radius.component.none added to semantic tier | PARTIALLY -- see H-1 below |
| 13 | Missing spacing tokens added to Spec 02 | CONFIRMED -- all 6 optional tokens present |
| 14 | AI organism directory split documented | CONFIRMED |
| 15 | RSC boundary language corrected | CONFIRMED -- "server-component-compatible" with full explanation |
| 16 | Stack -> VStack rename | CONFIRMED -- no remnant bare "Stack" as layout primitive name in any spec |
| 17 | Row render budget <2ms -> <5ms | CONFIRMED |
| 18 | Atoms+molecules budget 50KB -> 65KB | CONFIRMED |
| 19 | AI Chat engine budget added (<80KB) | CONFIRMED |
| 20 | ColumnDef priority field added | CONFIRMED |
| 21 | Per-component subpath exports | CONFIRMED |
| 22 | tauri-specta specified | CONFIRMED |
| 23 | Toast stacking rules | CONFIRMED |
| 24 | i18n section (7.7) | CONFIRMED -- ICU MessageFormat, platform implementations, component labels, text expansion, RTL cross-ref, non-Latin fonts |
| 25 | WillPopScope -> PopScope | CONFIRMED |

---

## Findings

### HIGH Issues (Must Fix)

#### H-1: Spec 05 responsive contract contradicts ColumnDef priority semantics

**Location**: `05-engine-specifications.md`, line 201

**Description**: The DataTable responsive contract table says:

> `tablet` (768-1023px) | Table with reduced columns. Columns with `priority < 3` hidden.

But the ColumnDef definition at line 111 says:

> Lower number = higher priority (shown on smaller viewports). Columns with priority >= the viewport threshold are hidden. Tablet threshold: 3.

These contradict each other. Priority 0, 1, 2 (< 3) are the HIGHEST priority columns and should be SHOWN. The responsive table has the comparison operator inverted.

**Fix**: Change line 201 from "Columns with `priority < 3` hidden" to "Columns with `priority >= 3` hidden".

---

#### H-2: Spec 04 Layer position prop type does not include logical values referenced by RTL section

**Location**: `04-layout-grammar.md`, line 233 (Layer prop definition) vs lines 716 and 721 (RTL section)

**Description**: The RTL section (added in Round 1) states:

> All layout primitives use LOGICAL properties (`start`/`end`) not PHYSICAL (`left`/`right`) for alignment and positioning.

And the RTL adaptation table for Layer says:

> Logical mapping: `position: "start"` = right edge in RTL

But the Layer `position` prop type (line 233) is defined as:

> `"center" | "top" | "bottom" | "left" | "right" | PositionXY`

The value `"start"` and `"end"` do not exist in this type union. An implementer following the RTL spec would try to use `position: "start"` and find it is not a valid prop value.

**Fix**: Either (a) add `"start"` and `"end"` to the Layer position prop type union, or (b) clarify in the RTL section that Layer still uses physical `left`/`right` and the logical mapping is internal (the framework translates at render time, not at the prop level). Option (b) also requires softening the blanket statement at line 721 from "All layout primitives use LOGICAL properties" to "Row, Grid, and VStack alignment props use logical values. Layer and Split use physical values that are automatically mirrored in RTL contexts."

---

### MEDIUM Issues (Should Fix)

#### M-1: Spec 01 required keys table missing radius.component.none

**Location**: `01-design-system-protocol.md`, line 723

**Description**: The Round 1 fix added `radius.component.none` to the YAML example (line 651) and Spec 02 lists it as required (line 324). But the required semantic token keys table at line 723 still reads:

> `radius.component` | `default`, `small`, `large`, `pill`

The value `none` is missing from this table. The example and the table are inconsistent within the same spec.

**Fix**: Change line 723 to: `radius.component` | `none`, `default`, `small`, `large`, `pill`

---

#### M-2: Spec 02 spacing.inline.gap-tight range [2, 8] allows values that violate the 4px grid

**Location**: `02-token-architecture.md`, line 289

**Description**: The semantic token `spacing.inline.gap-tight` is defined with range `[2, 8]`. But Section 2.1.2 (line 36) states "Every value MUST be divisible by 4" with "Minimum value: 4" (line 47). The lower bound of 2 cannot exist in the primitive spacing scale because:
1. Value 2 is not divisible by 4
2. The minimum primitive spacing value is 4

Section 2.2.2 (line 270) says "Every value MUST be an integer that appears in `spacing.raw`" -- so a spacing.inline.gap-tight value of 2 would be invalid.

The actual usage in Spec 04 (line 653) sets this token to 4, which is valid. Only the constraint range definition in Spec 02 is wrong.

**Fix**: Change range from `[2, 8]` to `[4, 8]` on line 289.

---

#### M-3: Spec 05 AI Chat error message uses non-existent AlertBanner variant "destructive"

**Location**: `05-engine-specifications.md`, line 950

**Description**: The chat message type table says:

> `error` | Error message. | AlertBanner variant (destructive) with optional retry button.

But the AlertBanner contract in Spec 03 (line 2694) defines variants as `"info" | "success" | "warning" | "error"`. There is no "destructive" variant. Other references in the same spec correctly use "error" (line 1224 in Section 5.7) or "warning" (line 1312 in Section 5.9).

**Fix**: Change "AlertBanner variant (destructive)" to "AlertBanner variant `error`" on line 950.

---

### LOW Issues (Can Defer)

#### L-1: Spec 08 Flutter KButton comment uses Material variant names instead of contract variant names

**Location**: `08-repo-architecture.md`, line 225

**Description**: The directory tree comment says:

> `k_button.dart  # KButton (elevated, filled, outlined, text, icon)`

These are Flutter Material 3 widget types, not the Prism component contract variants (`primary`, `secondary`, `tertiary`, `destructive`, `ghost`). While the comment may refer to underlying Material widgets used internally, it could confuse an implementer about which API variants the KButton exposes.

**Fix**: Change comment to `# KButton (primary, secondary, tertiary, destructive, ghost)` or `# KButton (primary, secondary, tertiary, destructive, ghost) -- uses Material ElevatedButton/FilledButton/OutlinedButton/TextButton internally`.

---

## Cross-Reference Validation (New Sections)

The three new sections added by Round 1 (Error Boundary 5.7, Kailash Integration 5.8, Offline Behavior 5.9) and two new sections (RTL 4.5, i18n 7.7) were checked for internal consistency with the rest of the specs:

| New Section | Cross-references checked | Status |
|-------------|------------------------|--------|
| 5.7 Error Boundary | AlertBanner variant names vs Spec 03, retry semantics vs React Query | Clean (uses correct "error" variant) |
| 5.8 Kailash SDK | Nexus/DataFlow/Kaizen definitions vs CLAUDE.md, hook API shapes vs React Query/TanStack Query v5 | Clean |
| 5.9 Offline Behavior | AlertBanner variant vs Spec 03, connectivity_plus vs Spec 07 Flutter deps, React Query terminology | Clean |
| 4.5 RTL | Primitive prop types vs logical property claims | H-2 found (Layer position mismatch) |
| 7.7 i18n | react-intl/flutter_localizations vs Spec 07 tech stack, RTL cross-reference to Spec 04 Section 4.5 | Clean |

---

## Convergence Assessment

| Criterion | Status |
|-----------|--------|
| 0 CRITICAL | PASS (0 found) |
| 0 HIGH | FAIL (2 found: H-1, H-2) |
| 2 consecutive clean rounds | FAIL (this is Round 2, not yet clean) |

**Next step**: Fix H-1 and H-2 (and ideally M-1, M-2, M-3). Then run Round 3. If Round 3 is clean, run Round 4 to confirm convergence.
