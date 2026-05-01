---
type: DECISION
date: 2026-04-28
created_at: 2026-04-28T17:30:00+08:00
author: co-authored
session_id: layout-delegation-2026-04-28
session_turn: post-implementation
project: fe-codegen-platform
topic: 0.5.0 Layout delegation wrapper — partial migration via VStack/Row/Grid delegation; Split/Layer/Scroll keep legacy semantics
phase: implement
tags:
  [
    layout,
    0.5.0,
    orphan-detection,
    delegation-wrapper,
    vestigial-cleanup,
    partial-migration,
  ]
---

# 0025 — DECISION — Layout delegation wrapper for 0.5.0 (partial migration); 9 vestigial symbols deleted

**Status**: Working-tree complete; commit deferred to user (BUILD repo).

## Context

`/autonomize` directive after Option 2 was approved per `01-analysis/layout-migration-scoping.md`. Goal: closes journal 0021's HIGH-1 (Layout engine orphan, zero production consumers) by making the legacy file a thin wrapper over the new engine.

The original analysis assumed all 6 legacy primitives (`VStack`, `Row`, `Grid`, `Split`, `Layer`, `Scroll`) could delegate cleanly. Reading the new engine implementations surfaced three structural divergences:

1. **`Split`** — legacy is `<Split ratio="2:1" gap={16}>` static-ratio + `useLayout()`-driven mobile collapse; new is interactive draggable divider with mouse + touch + keyboard. Templates use `<Split ratio="N:M">` heavily and depend on the static + mobile-collapse semantics. Delegation would change UI behaviour.
2. **`Layer`** — legacy has `backdrop`, `backdropDismiss`, `trapFocus`, `anchor` ("viewport"|"parent"); new is simpler positioned overlay. Different positions: legacy `'top'|'bottom'|'start'|'end'|'center'`; new `'top-left'|'top-right'|'bottom-left'|'bottom-right'|'center'`.
3. **`Scroll`** — legacy has `indicator: boolean` (toggle scrollbar); new always shows the styled scrollbar.

`VStack`, `Row`, `Grid` delegate cleanly with a `gap: number → spacing: SpacingToken` translator that exact-preserves non-canonical values via inline `style.gap` override.

## Decision: Partial delegation, not full

**Delegate**: `VStack`, `Row`, `Grid` → new engine. These three share clean API mappings; the wrapper preserves legacy `gap: number` API at the surface, translating canonical values (16→md, 24→lg) to tokens and preserving non-canonical px exactly via inline override.

**Keep legacy**: `Split`, `Layer`, `Scroll`. Each has unique behaviour the new engine does not replicate, and the templates (or potential future consumers) may depend on it. Migrating these requires consumer demand AND an intentional UI change — the right shape is "next shard when a real use case surfaces", not "force-delegate now and silently shift behaviour".

**Closes orphan-detection partially**: 3 of 6 new-engine primitives now have production call sites in the framework hot path (legacy `VStack` → new `Stack`, legacy `Row` → new `Row`, legacy `Grid` → new `Grid`). Templates and external consumers (arbor) inherit these via the unchanged top-level barrel exports. The remaining 3 stay orphaned w.r.t. templates AND remaining "no current consumers" externally — acceptable per `orphan-detection.md` Rule 1's "facade-shaped" qualifier (these are React components, not facade managers).

## What shipped (working tree)

- `web/src/engines/layout.tsx`:
  - `VStack`/`Row`/`Grid` rewritten as delegates over `engines/layout/{stack,row,grid}.js`
  - `resolveLegacyGap()` helper translates `gap: number` → `{ spacing: SpacingToken, styleOverride }` for canonical/non-canonical values
  - `Split`/`Layer`/`Scroll` kept legacy
  - `LayoutProvider`/`useLayout`/`useLayoutMaybe`/`Zone` kept legacy
  - 9 symbols unexported (see Removed below)
- `web/src/index.ts`:
  - Drops `useResponsive`, `resolveBreakpoint`, `BREAKPOINTS`, `LayoutEngineConfig`, `LayoutContextValue`, `ZoneContent`, `ResponsiveValue` from the public package barrel
  - Adds `useLayoutMaybe` (was missing from the barrel; used by conversation-template)
- `web/src/engines/layout-delegation.test.tsx` (new, 16 cases) — verifies delegation parity
- `web/CHANGELOG.md` — replaces "Unreleased" section with "0.5.0 — 2026-04-28"
- `web/package.json` — version bump 0.4.0 → 0.5.0

Net delta: ~150 LOC removed (vestigial symbols + replaced primitive bodies), ~80 LOC added (delegate wrappers + translator + tests).

Verification: `tsc --noEmit` clean, `eslint src` exit 0 (with the pre-existing v9 config-migration notice), `vitest run` 403/403 passing across 26 test files (387 prior + 16 new delegation parity).

## Removed (consumer audit AND spec sweep both clean)

Original deletion list was 9 symbols, BUT a final spec sweep across `docs/specs/` and `specs/` surfaced 3 symbols that the spec mandates as public API (zero current consumers ≠ zero contract). Per `rules/specs-authority.md`, the spec is the contract; restored those 3 to the public barrel.

| Symbol               | Type     | Disposition                                                                                                                                          |
| -------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useResponsive`      | hook     | **Removed** — no spec mention, no consumers                                                                                                          |
| `LayoutContextValue` | type     | **Removed** — no spec mention, no consumers                                                                                                          |
| `VStackProps`        | type     | **Removed** — no spec mention, no consumers                                                                                                          |
| `ZoneProps`          | type     | **Removed** — no spec mention, no consumers                                                                                                          |
| `resolveBreakpoint`  | helper   | **Removed from barrel** — no JS-export spec mention; organisms/card-grid has a local copy. Module-internal export retained for tests.                |
| `BREAKPOINTS`        | constant | **Removed from barrel** — no spec mention. Module-internal retained.                                                                                 |
| `LayoutEngineConfig` | type     | **Retained** — `docs/specs/05-engine-specifications.md` § 5.4 declares it                                                                            |
| `ZoneContent`        | type     | **Retained** — same spec, used as `Record<string, ZoneContent>` in LayoutEngineConfig                                                                |
| `ResponsiveValue<T>` | type     | **Retained** — `docs/specs/04-layout-grammar.md` § 4.4 + `specs/components/{card-grid,stats-row}.yaml` + `specs/layouts/grammar.yaml` use it heavily |

Net public API removal: 6 symbols (4 from layout file + `resolveBreakpoint` and `BREAKPOINTS` from barrel only). Internal-test exports of `resolveBreakpoint` and `ZoneContent` from `engines/layout.tsx` retained for `layout.test.tsx` boundary coverage.

### Spec-sweep rigor lesson

The original Shard A "vestigial" audit grepped `web/src/` and `arbor/apps/web/` only — it missed `docs/specs/**` and `specs/**`. A symbol with 0 code consumers but appearing in a spec is contract-bound, not vestigial. The fix-immediately path (`rules/autonomous-execution.md` § 4) caught and corrected this in-shard before commit.

## What did NOT happen

- **No template migrations.** All 10 templates continue to import `VStack`, `Row`, `Grid` from `@kailash/prism-web` — same names, same `gap: number` API. The delegation is invisible to them.
- **No external consumer breakage.** Arbor's wave-1/2/3 pages that import `LayoutProvider`, `VStack`, `Row`, `Grid` continue to work without source changes. The `gap: number` API at the legacy surface is preserved.
- **No `Split`/`Layer`/`Scroll` migration.** Future shard, when consumer demand justifies the API change.

## Cost

~1 session (estimate matched: ~3 hours of context). Two formatter pass-throughs after edits required re-reading the file mid-edit; otherwise straightforward.

## For Discussion

1. **Counterfactual**: If we had attempted full delegation (force `Split` to delegate by passing `resizable={false}` + ratio translation, force `Layer` to delegate by losing backdrop/focus-trap, force `Scroll` to delegate by losing `indicator`) — would template tests have caught the behavioural shifts, or would the changes have been silent until a real user noticed? The 387-test suite passed THROUGH the delegation refactor; would it have passed through a force-delegate of the diverging primitives?
2. **Data**: The audit found exactly 9 symbols with zero internal+external consumers — a 47% reduction in the public Layout API (9 of 19 exports). Was this a "Layout was over-exported by accident" situation, or does this generalise — every long-lived public API of a similar size carries ~30-50% vestigial weight that the original author shipped speculatively?
3. **Orphan-detection partial-resolution**: We claim "3 of 6 new-engine primitives now have production call sites." Is this a _meaningful_ closure of journal 0021's HIGH-1, or is the "orphan" framing wrong from the start because Stack/Row/Grid/Split/Layer/Scroll are React components (not facade managers) whose "production consumer" model is "applications that import them" — making the fact that templates don't use Split/Layer/Scroll evidence of "no demand", not "orphan"?

## Outstanding work

- **0.5.0 release** — `web/package.json` is at 0.5.0, CHANGELOG dated. User commits and runs `/release` (BUILD repo prudence).
- **Arbor 0.4.0 upgrade PR** (still local on `feat/prism-0.4.0-upgrade` per journal 0024) — when PR #17 squash-merges, this branch needs rebase + push to ship the G-1 simplifications. After the upgrade lands, arbor consumers also get 0.5.0 in the same lockfile bump.
- **Wave-4 `/clients` migration** (per `01-analysis/arbor-wave4-route-selection.md`) — proceed once arbor is on 0.5.0.
- **Future Layout shard** — if consumer demand surfaces for new `Split` (draggable), new `Layer` (different position model), or new `Scroll` (no toggle), migrate intentionally with the corresponding template/page changes.
