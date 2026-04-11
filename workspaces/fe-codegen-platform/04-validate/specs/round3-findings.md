# Round 3 Red Team Findings

**Date**: 2026-04-11
**Reviewer**: Quality Reviewer Agent (Prism Spec Round 3)
**Scope**: Verify Round 2 fixes applied; targeted review of RTL, i18n, Kailash integration, error boundary, offline sections; check for residual VStack/Stack issues

---

## Summary

- **Overall Status**: ROUND 3 CLEAN
- **Round 2 Fix Verification**: 5 of 5 findings verified; 2 HIGH fixes confirmed, 3 MEDIUM fixes confirmed (2 applied, 1 carried forward as MEDIUM)
- **New Issues Found**: 0 CRITICAL, 0 HIGH, 2 MEDIUM (1 carried from Round 2), 1 LOW (carried from Round 2)

**Convergence status**: ROUND 3 CLEAN (0 CRITICAL, 0 HIGH). One more clean round (Round 4) needed for convergence.

---

## Round 2 Fix Verification

### HIGH Fixes

| Finding | Description | Status |
|---------|-------------|--------|
| H-1 | DataTable priority comparison inverted (`priority < 3` vs `priority >= 3`) | CONFIRMED FIXED -- Line 201 now reads "Columns with `priority >= 3` hidden (lower number = higher priority = shown)". Consistent with ColumnDef definition at line 111. |
| H-2 | Layer position prop type missing logical values `start`/`end` | CONFIRMED FIXED -- Line 233 now reads `"center" \| "top" \| "bottom" \| "start" \| "end" \| PositionXY` with description noting logical property resolution in RTL. |

### MEDIUM Fixes

| Finding | Description | Status |
|---------|-------------|--------|
| M-1 | Spec 01 radius.component required keys table missing `none` | NOT FIXED -- Line 723 of Spec 01 still reads `radius.component \| default, small, large, pill` without `none`. Spec 02 line 324 requires `radius.component.none`. Carried forward as M-1. |
| M-2 | Spec 02 spacing.inline.gap-tight range allowed values violating 4px grid | CONFIRMED FIXED -- Line 289 now reads `MUST be in range [4, 8]`. Consistent with Section 2.1.2 minimum value of 4 and divisible-by-4 rule. |
| M-3 | Spec 05 Chat error message used non-existent AlertBanner variant "destructive" | CONFIRMED FIXED -- Line 950 now reads `AlertBanner variant (\`error\`) with optional retry button`. Consistent with Spec 03 AlertBanner variants (`info \| success \| warning \| error`). |

### LOW Fixes

| Finding | Description | Status |
|---------|-------------|--------|
| L-1 | Spec 08 Flutter KButton comment uses Material variant names | NOT FIXED -- Line 225 still reads `# KButton (elevated, filled, outlined, text, icon)` instead of contract variants. Carried forward as L-1. |

---

## New Findings

### CRITICAL Issues

None.

### HIGH Issues

None.

### MEDIUM Issues

#### M-1 (Carried): Spec 01 radius.component required keys table missing `none`

**Location**: `01-design-system-protocol.md`, line 723

**Description**: Same as Round 2 M-1. The required semantic token keys table lists `radius.component | default, small, large, pill` but omits `none`. Spec 02 (line 324) defines `radius.component.none` as required with constraint `MUST equal 0`.

**Fix**: Change line 723 from:
```
| `radius.component` | `default`, `small`, `large`, `pill` |
```
to:
```
| `radius.component` | `none`, `default`, `small`, `large`, `pill` |
```

---

#### M-2 (New): Spec 04 RTL adaptation table for Layer still references invalid position value `"left"`

**Location**: `04-layout-grammar.md`, line 716

**Description**: The H-2 fix correctly updated the Layer `position` prop type (line 233) to use logical values `"start" | "end"` instead of physical `"left" | "right"`. However, the RTL adaptation table at line 716 was not updated to match. It still reads:

> Layer | `position: "left"` = left edge | `position: "left"` maps to right edge in RTL

The value `"left"` is no longer in the Layer position prop's type union. The RTL table should reference `"start"` and `"end"` to be consistent with the updated prop definition.

**Fix**: Change line 716 from:
```
| Layer | `position: "left"` = left edge | `position: "left"` maps to right edge in RTL (physical positioning is auto-mirrored via CSS `inset-inline-start`). |
```
to:
```
| Layer | `position: "start"` = left edge in LTR | `position: "start"` = right edge in RTL. Logical properties resolve automatically. |
```

---

### LOW Issues

#### L-1 (Carried): Spec 08 Flutter KButton comment uses Material variant names

**Location**: `08-repo-architecture.md`, line 225

**Description**: Same as Round 2 L-1. The directory tree comment says `# KButton (elevated, filled, outlined, text, icon)` using Flutter Material 3 widget types instead of the Prism component contract variants (`primary`, `secondary`, `tertiary`, `destructive`, `ghost`).

**Fix**: Change line 225 to: `# KButton (primary, secondary, tertiary, destructive, ghost)`

---

## Cross-Reference Validation

### VStack / Stack Naming

Full-text search for bare `Stack` as a layout primitive name across all live spec files (01 through 10):

| File | References found | Status |
|------|-----------------|--------|
| `03-component-contracts.md` | "Stack vertically" (verb usage, line 1092, 2609) | OK -- verb, not primitive name |
| `04-layout-grammar.md` | "Flutter's `Stack` widget" (line 13, naming rationale) | OK -- explains why VStack was chosen |
| `07-cross-platform-strategy.md` | "Technology Stack" (line 103, 170), "Font Stack" (line 502) | OK -- different meaning |
| All other live specs | Zero matches | Clean |

**Verdict**: No residual bare "Stack" as a layout primitive name. The VStack rename from Round 1 is fully applied.

### RTL / i18n Cross-References

| Cross-reference | From | To | Status |
|-----------------|------|-----|--------|
| RTL layout primitives | Spec 07 Section 7.7 | Spec 04 Section 4.5 | Clean -- Spec 07 line 500 references "Spec 04 Section 4.5 (Directionality)" |
| AlertBanner variant in offline banner | Spec 05 Section 5.9 | Spec 03 AlertBanner contract | Clean -- uses `variant: "warning"` (valid) |
| AlertBanner variant in error boundary | Spec 05 Section 5.7 | Spec 03 AlertBanner contract | Clean -- uses `variant: "error"` (valid) |
| AlertBanner variant in chat error | Spec 05 message types table | Spec 03 AlertBanner contract | Clean -- uses `variant: "error"` (valid, fixed in Round 2) |
| connectivity_plus in offline detection | Spec 05 Section 5.9 | Spec 07 Flutter dependencies | Clean -- listed at line 181 |
| Nexus hook names | Spec 05 Section 5.8 | Spec 05 engine data sources | Clean -- `useNexusQuery`/`useNexusMutation` pattern consistent |
| Kaizen streaming protocol | Spec 05 Section 5.8 | Spec 05 AI Chat message types | Clean -- SSE events map to MessageType union |
| Error boundary zone-level placement | Spec 05 Section 5.7 | Spec 04 zone definitions | Clean -- aligns with zone composition model |

### Engine / Layout Primitive Consistency

| Check | Status |
|-------|--------|
| Breakpoint values (0/768/1024/1440) across all specs | Clean |
| Spacing token values consistent between Spec 02 and Spec 04 | Clean |
| Component count (25 atoms, 22 molecules, 22 organisms = 69) | Clean |
| Engine count (6: DataTable, Form, Navigation, Layout, Theme, AI Chat) | Clean |
| Layout primitive count (6: VStack, Row, Grid, Split, Layer, Scroll) | Clean |

---

## Convergence Assessment

| Criterion | Status |
|-----------|--------|
| 0 CRITICAL | PASS (0 found) |
| 0 HIGH | PASS (0 found) |
| 2 consecutive clean rounds | IN PROGRESS (Round 3 clean; need Round 4 clean) |

**Next step**: Fix M-1 (Spec 01 radius table), M-2 (Spec 04 RTL table), and optionally L-1 (Spec 08 KButton comment). Then run Round 4. If Round 4 is also clean (0 CRITICAL, 0 HIGH), convergence is achieved.
