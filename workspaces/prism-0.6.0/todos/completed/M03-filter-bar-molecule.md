---
shard: 3
release: 0.6.0
issue: terrene-foundation/kailash-prism#24 (molecule portion)
estimated_loc: 250
specialist: react-specialist
worktree: .claude/worktrees/0.6.0-shard3
branch: feat/prism-0.6.0-shard3-filter-bar-molecule
depends_on: M02 (consumes UseFilterBarStateResult types)
---

# M03 — `FilterBar` Molecule

## Goal

The horizontal `FilterBar` molecule that wraps search input + filter dimensions (chip-row OR dropdown) + view-mode toggle. Consumes `useFilterBarState` from M02. Three storybook shapes match the three observed arbor consumer patterns.

## Tasks

### Build

- [ ] **T01** — `web/src/molecules/filter-bar/filter-bar.tsx` (new file) — implement molecule:

  ```typescript
  export interface FilterBarDimension {
    key: string;
    label: string;
    options: string[];
    value: string;
    onChange: (value: string) => void;
    shape: "dropdown" | "chips";
  }

  export interface FilterBarViewMode {
    active: string;
    options: string[];
    onChange: (mode: string) => void;
  }

  export interface FilterBarProps {
    search: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder?: string;
    dimensions?: FilterBarDimension[];
    viewMode?: FilterBarViewMode;
    className?: string;
    sticky?: boolean;
  }

  export function FilterBar(props: FilterBarProps): JSX.Element;
  ```

- [ ] **T02** — Layout: horizontal flexbox; `gap: var(--prism-spacing-3)`; `justify-content: space-between` for left (search + dimensions) vs right (viewMode toggle). Wrappable on small screens.
- [ ] **T03** — Search input subcomponent — uses Prism design tokens (`--prism-color-border`, `--prism-radius-md`, etc.); search icon (existing Icon atom) absolute-positioned inside the input; min-width responsive.
- [ ] **T04** — Dimension dropdown shape — uses existing `Select` atom from `web/src/atoms/select/`. Wired to `dimension.value` + `dimension.onChange`. Label rendered as a `<label>` paired with the select for a11y.
- [ ] **T05** — Dimension chip-row shape — horizontal scroll container with chip buttons (active state via `--prism-color-primary` background). Uses existing `Tag` atom or `Button` atom with `variant="chip"` if available; if not, a new minimal chip element inside the FilterBar file.
- [ ] **T06** — View-mode toggle — icon-button group (uses existing `IconButton` atom); active state highlighted; ARIA `role="group" aria-label="View mode"`.
- [ ] **T07** — `sticky?: boolean` (default false) — when true, applies `position: sticky; top: 0; z-index: var(--prism-z-sticky)`.
- [ ] **T08** — Update `web/src/molecules/filter-bar/index.ts` to export `FilterBar`, `FilterBarProps`, `FilterBarDimension`, `FilterBarViewMode`.
- [ ] **T09** — Update `web/src/index.ts` (top-level barrel) to re-export from `molecules/filter-bar` so consumers can `import { FilterBar, useFilterBarState } from "@kailash/prism-web"`.

### Accessibility (per Prism component contract conventions)

- [ ] **T10** — Search input: `<input type="search" aria-label={searchPlaceholder || "Search"}>`; clearing via Escape key resets to `""` and calls `onSearchChange("")`.
- [ ] **T11** — Dimension dropdown: native `<select>` underneath the styled wrapper for screen-reader baseline; visible label paired via `htmlFor`/`id`.
- [ ] **T12** — Dimension chip-row: `role="radiogroup" aria-label={dimension.label}`; each chip `role="radio" aria-checked`. Arrow keys navigate between chips.
- [ ] **T13** — View-mode toggle: `role="radiogroup"` with `role="radio"` per option, same arrow-key pattern.

### Test (Tier 1 unit)

- [ ] **T14** — `web/src/molecules/filter-bar/__tests__/filter-bar.test.tsx` (new file) — test cases:
  - Renders with search-only (no dimensions, no viewMode)
  - Renders with one dropdown dimension; clicking option calls `onChange` with selected value
  - Renders with one chip-row dimension; clicking chip calls `onChange` with chip value
  - Renders with viewMode; clicking toggle calls `onChange`
  - Search input: typing fires `onSearchChange` with new value
  - Search input: Escape clears to `""`
  - `sticky: true` applies `position: sticky` style
  - Renders all three shapes (search-only, search+chips, search+dropdown+toggle) without crash

### Test (Tier 2 storybook)

- [ ] **T15** — `web/src/molecules/filter-bar/__stories__/filter-bar.stories.tsx` (new file) — three stories matching #24 acceptance criteria:
  - **search-only** (matches my-payslips-prism use case post-migration)
  - **search + chip-row category** (matches documents-prism)
  - **search + dropdown sector + view-mode toggle** (matches clients-prism / employees-prism)
  - Each story uses `useFilterBarState` to demonstrate the integrated flow with mock data
- [ ] **T16** — `web/src/molecules/filter-bar/__stories__/filter-bar-with-data-table.stories.tsx` — one composite story showing FilterBar above a DataTable with adapter rebuilt from filter delta (proves the integration matches consumer migration pattern).

### Coordination

- [ ] **T17** — DO NOT edit `web/package.json`, `web/CHANGELOG.md`, any spec file, OR `useFilterBarState.ts` (M02's surface). May read M02's exports.

### Commit discipline

- [ ] After T01–T09: `git commit -m "feat(filter-bar): FilterBar molecule with search + dimensions + view-mode"`
- [ ] After T10–T13: `git commit -m "feat(filter-bar): a11y — keyboard nav + ARIA roles + screen reader labels"`
- [ ] After T14: `git commit -m "test(filter-bar): unit tests covering 3 shapes + interactions"`
- [ ] After T15–T16: `git commit -m "test(filter-bar): storybook stories for 3 shapes + DataTable composition"`

## Acceptance criteria

- [ ] All 8 Tier-1 unit tests pass
- [ ] All 4 storybook stories render without console errors
- [ ] Top-level `@kailash/prism-web` barrel exports `FilterBar` + `useFilterBarState` + types
- [ ] Keyboard navigation works in dimension chips, view-mode toggle, search input
- [ ] No edits to `package.json` / CHANGELOG / spec / `useFilterBarState.ts`
- [ ] Branch is `feat/prism-0.6.0-shard3-filter-bar-molecule`

## Risks

- **Atom dependencies (`Select`, `IconButton`, `Tag`)** — if any of these atoms is missing or has incompatible API, the shard MUST adapt (file follow-up issue if a new atom is needed) but proceed with inline minimal element. Document any inline element in the spec at M04.
- **a11y radiogroup pattern for dimensions** — chips-as-radio is unusual but matches the "exclusive selection" semantic. If user testing later prefers `combobox`/`listbox`, that's a 0.7.0 refinement.

## References

- Brief: `briefs/0001-prism-0.6.0-design-cycle.md`
- Analysis: `01-analysis/01-issue-24-filterbar-evidence.md` § "FilterBar API shape"
- Plan: `02-plans/01-prism-0.6.0-design.md` § Feature 1
- Journal: `journal/0002-DISCOVERY-filterbar-absorbs-derived-options-and-effective-fallback.md`
- Issue: terrene-foundation/kailash-prism#24
