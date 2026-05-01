# Layout Migration — Option 1 vs Option 2 Scoping

**Date**: 2026-04-28
**Prism baseline**: 0.4.0 (web), legacy `engines/layout.tsx` (557 LOC) at top-level barrel; new `engines/layout/` (6 primitives) at sub-path only
**Closes**: journal 0021 Discussion #2 (per-symbol load-bearing-vs-vestigial breakdown)
**Scope**: Read-only analysis. Recommend ONE migration path for 0.5.0.

---

## Executive summary

**Recommendation: Option 2 (delegation wrapper) for 0.5.0.** One session, no external breaking changes, trivially proves the new engine can implement the legacy contract, and unblocks `useResponsive` + 6 vestigial type cleanup as a same-PR side effect.

**Option 1 (grow new engine to cover orchestration → migrate templates → delete legacy)** is the architecturally cleaner endpoint, but it's a 2–3-session effort that breaks the top-level barrel, ripples into every external consumer (arbor's wave-1/2/3 in flight), and contradicts the new engine's "6 minimal primitives" design by adding `LayoutProvider`/`useLayout`/`Zone` orchestration surface.

The right sequencing: ship Option 2 first (delegation, 0.5.0); migrate consumers off legacy at their own pace; then ship Option 1 once external consumers are sub-path-only.

---

## Per-symbol load-bearing-vs-vestigial breakdown

`engines/layout.tsx` exports 19 symbols (8 components + 3 hooks + 8 types). The new `engines/layout/index.ts` re-implements 6 components + their types. The "compatibility gap" is the 12 legacy-only symbols — what the new engine would need to grow to cover the legacy surface.

Internal-only consumer counts (excluding the engine's own files, the package barrel, and `__tests__/`):

| Legacy-only symbol | Internal consumers | External (arbor) | Status |
|---|---|---|---|
| `LayoutProvider` | 1 template (conversation-template) + nav engine + tests | **YES** (`documents-prism`, `my-payslips-prism`, `advisory-prism`) | **Load-bearing** |
| `VStack` | 9 of 10 templates (list/detail/form/dashboard/settings/calendar/split/kanban/wizard) | **YES** (`documents-prism` imports `VStack`) | **Load-bearing — heaviest** |
| `Zone` | 1 (template-shell.tsx) | No | **Load-bearing — single use** |
| `useLayout` | 8 (navigation engine + 7 templates) | No | **Load-bearing** |
| `useLayoutMaybe` | 1 (conversation-template) | No | **Load-bearing — niche** |
| `useResponsive` | **0** | No | **VESTIGIAL** |
| `LayoutEngineConfig` (type) | 0 | No | **VESTIGIAL** |
| `ZoneContent` (type) | 0 | No | **VESTIGIAL** |
| `ResponsiveValue<T>` (type) | 0 | No | **VESTIGIAL** |
| `LayoutContextValue` (type) | 0 | No | **VESTIGIAL** |
| `VStackProps` (type) | 0 | No | **VESTIGIAL** |
| `ZoneProps` (type) | 0 | No | **VESTIGIAL** |

**6 of 12 legacy-only symbols are completely unused** (`useResponsive` + 6 type aliases). They violate `orphan-detection.md` Rule 3 ("Removed = Deleted, Not Deprecated") and can be deleted immediately regardless of Option 1 or Option 2.

**The actual migration surface is just 5 load-bearing symbols**: `LayoutProvider`, `VStack`, `Zone`, `useLayout`, `useLayoutMaybe`.

---

## API contract divergence

### `VStack` vs `Stack`

```ts
// Legacy: gap is raw px number
<VStack gap={20} align="stretch">…</VStack>
interface VStackProps { gap?: number; padding?: number; align?: 'start' | 'center' | 'end' | 'stretch' }

// New: spacing is a SpacingToken
<Stack direction="vertical" spacing="md">…</Stack>
interface StackProps { spacing?: SpacingToken /* "xs" | "sm" | "md" | "lg" | "xl" */ }
```

**Empirical translation table** (from `grep "VStack" web/src/templates/*.tsx`):

| Legacy `gap=` value | Token equivalent | Used in N templates |
|---|---|---|
| `16` | `md` | majority of templates |
| `24` | `lg` | minority of templates |

Two distinct values across 9 templates. Translation is mechanical and unambiguous.

### `Row` exists in BOTH engines — contract drift hidden in plain sight

Legacy `Row` (`engines/layout.tsx:219`): `Row({gap: number, align, justify, wrap})`.
New `Row` (`engines/layout/types.ts`): `Row({spacing: SpacingToken, align, justify, wrap})`.

Top-level barrel currently exports legacy `Row`. Sub-path consumers get new `Row`. A consumer importing from both paths sees the same name with two different APIs — silent drift. Option 2 unifies by making the legacy `Row` delegate to new `Row` via the gap→spacing translation.

### `LayoutProvider` / `useLayout` / `useLayoutMaybe` / `Zone` — orchestration surface

These four symbols form the orchestration system the new engine deliberately omitted. The new engine ships 6 *primitives*; orchestration was scoped out as "the next layer." Bringing them into the new engine requires:

- React context + provider (~80 LOC)
- Two hooks (`useLayout`, `useLayoutMaybe`) (~30 LOC)
- `Zone` slot mechanism (~30 LOC)

That's ~140 LOC of orchestration to add to a "6 primitives" engine, which is a category-mixing decision that contradicts `docs/specs/04-layout-grammar.md`'s six-primitive thesis.

---

## Option 1 — Grow new engine to cover orchestration

### Steps
1. Add `LayoutProvider`, `useLayout`, `useLayoutMaybe`, `Zone` to `engines/layout/` (~140 LOC + tests)
2. Migrate 9 templates from `<VStack gap={N}>` to `<Stack direction="vertical" spacing="…">` per the translation table
3. Migrate the remaining `Row`/`Grid`/`Split`/`Layer`/`Scroll` template usages to the new engine's API (gap→spacing, etc.)
4. Migrate `template-shell.tsx`'s single `Zone` use
5. Migrate the navigation engine's `useLayout` use
6. Update top-level barrel (`web/src/index.ts`) to re-export from `engines/layout/` instead of `engines/layout.tsx`
7. Delete `engines/layout.tsx` (557 LOC removed)

### Costs
- **2–3 autonomous sessions** per journal 0021's estimate
- **Top-level barrel becomes a breaking change for external consumers** — arbor's `documents-prism`, `my-payslips-prism`, `advisory-prism` import `LayoutProvider` + `VStack` + `Row` + `Grid` from the top-level barrel. Either:
  - Accept the breakage, coordinate downstream upgrade (arbor wave-3 PR #17 + 0.4.0 upgrade in flight ⇒ now a third arbor PR before any new arbor work)
  - Add a backwards-compat shim layer at the top-level barrel that re-exports from `engines/layout/` under legacy names (`Stack` re-exported as `VStack`, gap-accepting wrapper) — but that's *exactly* Option 2 with a different label
- **Architectural drift**: pulls `LayoutProvider`/`useLayout`/`Zone` orchestration into a "primitives engine." `docs/specs/04-layout-grammar.md` would need to be updated to reflect the merged surface.
- **Cannot easily delete the 6 vestigial types as same-PR side effect** — they belong to the legacy file that Option 1 deletes; cleanup happens by attrition.

### When Option 1 makes sense
After all external consumers are on sub-path imports (`@kailash/prism-web/engines/layout`). At that point, the top-level barrel's legacy export has zero downstream users and can be removed without breakage. This is the natural endpoint, not the next step.

---

## Option 2 — Delegation wrapper

### Steps
1. Rewrite the 6 primitive bodies in `engines/layout.tsx` (`VStack`, `Row`, `Grid`, `Split`, `Layer`, `Scroll`) to delegate to `engines/layout/`'s primitives. Add a small `gap: number → spacing: SpacingToken` translator (16→md, 24→lg, others→nearest token).
2. Keep `LayoutProvider`, `useLayout`, `useLayoutMaybe`, `Zone` in legacy as-is — these are the orchestration layer the new engine deliberately doesn't cover.
3. **Delete the 7 vestigial symbols** (`useResponsive`, `LayoutEngineConfig`, `ZoneContent`, `ResponsiveValue`, `LayoutContextValue`, `VStackProps`, `ZoneProps`) per `orphan-detection.md` Rule 3 — same PR.
4. Update tests to verify the delegation round-trip: `<VStack gap={16}>` and `<Stack direction="vertical" spacing="md">` produce structurally equivalent DOM.
5. CHANGELOG entry: "0.5.0 — `engines/layout.tsx` primitives are now thin delegates over `engines/layout/`. No public-API change. 7 unused symbols removed (see `BREAKING.md` for the list — none had production consumers)."

### Costs
- **1 session** (estimate)
- **No external breaking change** — arbor's imports continue working; legacy `gap: number` API preserved at the top-level barrel.
- **Closes journal 0021's HIGH-1** — the new engine now has 9+ production call sites (every legacy primitive delegates to it), satisfying `orphan-detection.md` Rule 1.
- **Closes the `Row` API drift** — top-level barrel `Row({gap})` and sub-path `Row({spacing})` now share an implementation; gap is just translated at the boundary.
- **Validates Option 1's architectural premise** — if delegation works, we know the new engine *can* implement the legacy contract. If a primitive can't be expressed as a delegate (escape hatch needed), that's the real gap to address before Option 1 is even feasible.

### Risks
- **Token coercion at the boundary** — a `gap` value not in the translation table (other than 16 or 24) gets snapped to the nearest token, which changes pixel output. Mitigated by: empirical-survey shows ONLY 16 and 24 are used in templates; survey arbor's `apps/web` for additional values before snapping; either expand the table or document the snap range.
- **The delegation file size is bigger than expected** — if the wrapper layer is more than ~150 LOC, it stops being a "thin wrapper" and becomes a parallel implementation. Mitigated by: hard-cap the wrapper at one file, force re-implementation if it doesn't fit.

---

## Recommended sequence

### 0.5.0 — Option 2 + vestigial cleanup (1 session)
- Rewrite 6 legacy primitives as delegates
- Delete 7 vestigial symbols (`useResponsive` + 6 type aliases)
- Document `LayoutProvider`/`useLayout`/`Zone` as "orchestration surface, not yet in `engines/layout/`"
- Tests prove delegation parity

### 0.5.x — external consumer migration (per consumer)
- Arbor and other consumers move to sub-path imports for primitives (`@kailash/prism-web/engines/layout`)
- They keep using top-level `LayoutProvider`/`useLayout`/`Zone` for orchestration

### 0.6.0 — Option 1 promotion (when no external consumer imports primitives from top-level)
- Move `LayoutProvider`/`useLayout`/`Zone` into `engines/layout/`
- Delete `engines/layout.tsx`
- Top-level barrel re-exports from `engines/layout/` only
- This is the architectural endpoint — a single layout engine, no legacy

---

## What this doesn't cover

- **`Spinner`/`Card`/`Badge` etc.** — atom migration is independent of Layout. The atoms ARE token-driven via `engines/theme.tsx`; legacy `engines/layout.tsx` only exports layout symbols.
- **`engines/navigation.tsx`** — uses `useLayout`. Migrates with the orchestration layer in 0.6.0.
- **Token-driven token translation in `engines/layout.tsx`** — currently the legacy primitives use raw numbers (`gap: number`); the wrapper translates at the boundary. Long-term direction is token-only, but that's a 0.6.0 conversation tied to deleting the legacy file.

---

## Decision the human needs to make

**Approve Option 2 (delegation, 0.5.0, 1 session)?** If yes, the next session can scope todos and execute. If no, the alternative is Option 1 directly which requires:
- Coordinating arbor's downstream migration around the breaking top-level barrel change
- Updating `docs/specs/04-layout-grammar.md` to reflect orchestration in the engine
- 2–3 sessions instead of 1

The data on the table favours Option 2.
