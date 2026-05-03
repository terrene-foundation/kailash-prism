---
shard: 4
release: 0.6.0
estimated_loc: 100
specialist: orchestrator (direct) OR release-specialist
branch: release/v0.6.0
depends_on: M01 + M02 + M03 (all merged to main)
---

# M04 — Spec Authority + CHANGELOG + Release Prep

## Goal

Lock the spec authority surfaces, document the migration, bump the version, and prepare the 0.6.0 release PR. Per `git.md` § Release-Prep PRs, this lands on `release/v0.6.0` branch (auto-skips PR-gate matrix on metadata-only diff).

## Tasks

### Spec authority — `specs/components/data-table.yaml`

- [ ] **T01** — Update `specs/components/data-table.yaml` § version to `"0.6.0"`.
- [ ] **T02** — Append changelog entry under `changelog:`:
  ```yaml
  - version: "0.6.0"
    date: "2026-05-03"
    changes:
      - "ColumnDef.field relaxed from `string & keyof T` to `string` to support synthetic computed columns (Profile-completeness bars, aggregate badges, derived totals, cross-field labels)."
      - "ColumnDef.render value param widened from `T[keyof T] | undefined` to `unknown` — necessary for synthetic-field support; existing render callbacks may need explicit `as` cast or guard at consumer recompile."
      - "defaultSortComparator key param relaxed from `keyof T` to `string`. Backward-compatible widening."
      - "Runtime guard: synthetic field with `sortable: true` throws at first non-empty render with actionable error message. Catches latent silent-wrong-sort bug."
  ```
- [ ] **T03** — Update the `props:` section, `field` prop description (currently inline within `columns: ColumnDef[]`) — find the ColumnDef contract entry in this YAML and update `field` documentation to the dual-contract language from M01 T01 JSDoc.
- [ ] **T04** — If `field`'s contract isn't already a top-level entry in this YAML (verify), add an inline note in the `props:` description for `columns` pointing to `docs/specs/05-engine-specifications.md` § DataTable § ColumnDef.

### Spec authority — `specs/components/filter-bar.yaml` (NEW)

- [ ] **T05** — Create `specs/components/filter-bar.yaml` modelled on `filter-panel.yaml` shape but for the new horizontal FilterBar molecule. Include:
  - `version: "0.6.0"` (introduced in this release)
  - `name: FilterBar`
  - `category: molecule`
  - `description`: "Horizontal filter bar with search input + dimension filters (chip-row or dropdown) + optional view-mode toggle. Composes with DataTable via consumer-managed adapter rebuild on filter delta."
  - `composed_of`: atoms (Input, Select, IconButton, Tag), molecules (none)
  - `props:` — full schema for `FilterBarProps` from M03 T01
  - `state_hook`: section describing `useFilterBarState<T, TFilters>()` — input + result shapes from M02 T02
  - `composition_slots`: search, dimensions (per-dimension), viewMode
  - `accessibility:` — keyboard navigation per M03 T10–T13 (Escape clears search; arrow keys navigate dimension chips + viewMode)
  - `responsive:` — mobile/tablet/desktop/wide breakpoint behaviors (wrappable; sticky on tablet+ when consumer opts in)
  - `tokens.consumes:` — list all design tokens consumed (spacing, color, radius, z-index)
  - `changelog:` — single entry for 0.6.0

### Spec authority — `specs/_index.md`

- [ ] **T06** — Add `filter-bar.yaml` to the `components/` line in the YAML Specs table — verify the table format exists or update the line that mentions `components/`.

### Detailed spec — `docs/specs/05-engine-specifications.md`

- [ ] **T07** — Append new subsection § Filter Engine (or extend if section exists) covering:
  - The `FilterBar` molecule contract (props, state hook, derivation, effective-fallback semantics)
  - Why the engine layer is NOT extended for filterDimensions (orphan-detection rule — no consumer demand)
  - Three canonical consumer shapes with code samples
- [ ] **T08** — In § DataTable, add subsection § ColumnDef contract relaxation (0.5.0 → 0.6.0):
  - Why the relaxation (synthetic computed columns recurring class)
  - Dual contract for `field` (keyof T vs synthetic)
  - Migration note for `render` callback type narrowing
  - Runtime guard on `sortable + synthetic` (with example error message)

### Release prep — `web/CHANGELOG.md`

- [ ] **T09** — Append `## 0.6.0 — 2026-05-03` section. Cover all 4 shards:
  - `### Added`: FilterBar molecule + useFilterBarState hook (#24)
  - `### Changed`: ColumnDef.field relaxed; defaultSortComparator key widened; render value widened (#25)
  - `### Migration`: explicit notes for consumer recompile — render callbacks may need `as` cast or guard; sortable+synthetic combo throws now (catches latent bug)
  - `### Internal`: spec authority updates, storybook coverage

### Release prep — version bump (per `zero-tolerance.md` Rule 5)

- [ ] **T10** — `web/package.json` — bump `version` from `0.5.0` → `0.6.0`.
- [ ] **T11** — Verify version consistency: only `web/package.json` ships in 0.6.0 (no Flutter / Tauri / compiler changes in this release). Confirm `web/src/index.ts` does not export a version constant; if it does, update it.
- [ ] **T12** — If `compiler/`, `flutter/`, or `tauri-rs/` versions are coupled by a shared workspace tool, verify no accidental bump. This release is web-only.

### Release prep — PR

- [ ] **T13** — Open release PR from `release/v0.6.0` → `main` (per `git.md` § Release-Prep PRs MUST Use `release/v*` Branch Convention). Title: `release(prism-web): v0.6.0`. Body covers:
  - Summary: 2 features (#24 FilterBar, #25 synthetic columns)
  - Closes #24, #25
  - Migration notes (link to CHANGELOG)
  - Test plan: Tier-1 unit suite passes; storybook stories render; manual smoke test against arbor-prism routes (see follow-up M05 for actual arbor migration verification)

### Pre-FIRST-push CI parity (per `git.md`)

- [ ] **T14** — Before the FIRST push: run local CI parity — `npm run lint`, `npm run typecheck`, `npm test` (or repo-equivalents). All MUST exit 0 before push.

## Acceptance criteria

- [ ] `web/package.json` version is `0.6.0`
- [ ] CHANGELOG entry covers all 4 shards + migration notes
- [ ] `specs/components/data-table.yaml` updated with 0.6.0 changelog
- [ ] `specs/components/filter-bar.yaml` exists and matches the molecule shape
- [ ] `specs/_index.md` registers filter-bar.yaml
- [ ] `docs/specs/05-engine-specifications.md` has Filter Engine + ColumnDef relaxation subsections
- [ ] Release PR opened from `release/v0.6.0` (auto-skips PR-gate matrix)
- [ ] Local CI parity green before push
- [ ] All citations in spec edits resolve to existing code (per `spec-accuracy.md` Rule 1 + audit protocol)

## Risks

- **`docs/specs/05-engine-specifications.md` may be > 300 lines** — per `specs-authority.md` MUST 8, split if exceeded. Verify before appending; if appending pushes past 300, split the existing file or create `docs/specs/05a-filter-engine.md` as a sibling.
- **Sibling-spec re-derivation (`specs-authority.md` Rule 5b)** — any spec edit triggers full sibling sweep. After T01–T08, grep `specs/components/*.yaml` for references to `ColumnDef.field` / `defaultSortComparator` / FilterBar; if any sibling spec references stale signatures, update in same PR.
- **Spec-accuracy audit (`spec-accuracy.md` Rule 1)** — before merging, run the audit protocol: `rg -i 'phase-?1.*phase-?2|target.state|promised.*current|TBD|backend.follow-?up' specs/` should be zero on the new content.

## References

- Brief: `briefs/0001-prism-0.6.0-design-cycle.md`
- Plan: `02-plans/01-prism-0.6.0-design.md`
- Analysis: `01-analysis/01-issue-24-filterbar-evidence.md`, `02-issue-25-synthetic-columns-surface.md`
- Journal: `journal/0001-DECISION-prism-0.6.0-scope-two-features.md`
