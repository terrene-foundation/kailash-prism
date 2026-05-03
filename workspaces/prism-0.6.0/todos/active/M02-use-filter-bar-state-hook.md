---
shard: 2
release: 0.6.0
issue: terrene-foundation/kailash-prism#24 (state hook portion)
estimated_loc: 200
specialist: react-specialist
worktree: .claude/worktrees/0.6.0-shard2
branch: feat/prism-0.6.0-shard2-use-filter-bar-state
parallel_with: M01
blocks: M03
---

# M02 — `useFilterBarState` Hook

## Goal

Implement the typed state hook that owns FilterBar's search + filter dimensions. Internally handles derive-options-from-data + effective-filter-fallback (the two unfiled patterns absorbed per journal 0002).

## Tasks

### Build

- [ ] **T01** — Create directory `web/src/molecules/filter-bar/` with `.gitkeep` removed.
- [ ] **T02** — `web/src/molecules/filter-bar/use-filter-bar-state.ts` (new file) — implement hook:

  ```typescript
  export interface UseFilterBarStateInput<
    T,
    TFilters extends Record<string, string>,
  > {
    data: T[];
    initial: TFilters;
    searchInitial?: string;
    derive?: { [K in keyof TFilters]?: (rows: T[]) => string[] };
  }

  export interface UseFilterBarStateResult<
    T,
    TFilters extends Record<string, string>,
  > {
    search: string;
    setSearch: (v: string) => void;
    filters: TFilters; // EFFECTIVE values (fallback applied)
    setFilter: <K extends keyof TFilters>(k: K, v: string) => void;
    options: { [K in keyof TFilters]: string[] }; // derived option lists
  }

  export function useFilterBarState<T, TFilters extends Record<string, string>>(
    input: UseFilterBarStateInput<T, TFilters>,
  ): UseFilterBarStateResult<T, TFilters>;
  ```

- [ ] **T03** — Internal: `useState` for `search` initialised from `searchInitial ?? ""`.
- [ ] **T04** — Internal: `useState<TFilters>` for `filters` initialised from `input.initial`. This holds the _raw_ (consumer-set) value; effective fallback is computed below.
- [ ] **T05** — Internal: `useMemo` for each declared `derive[key]` callback — invoke with `input.data`, prepend `"All"` if not present, dedupe + sort. Result keyed by dimension key. If a dimension key has no `derive` entry, options is `[]` (consumer must pass options manually or the dimension is hardcoded; FilterBar molecule decides how to render).
- [ ] **T06** — Internal: `useMemo` for effective `filters` — for each key, if `rawFilters[key]` is in `options[key]`, use it; otherwise fall back to `input.initial[key]`. (Default-on effective fallback per journal 0002 § For Discussion #2.)
- [ ] **T07** — `setFilter<K>(k, v)` writes into the raw filters state; effective recomputes via the memo. `setSearch` writes search state.
- [ ] **T08** — `web/src/molecules/filter-bar/index.ts` — export `useFilterBarState`, `UseFilterBarStateInput`, `UseFilterBarStateResult`.

### Test (Tier 1 unit)

- [ ] **T09** — `web/src/molecules/filter-bar/__tests__/use-filter-bar-state.test.ts` (new file) — test cases:
  - Search state — `setSearch("foo")` updates `result.search`
  - Initial filter values — `useFilterBarState({ data: [], initial: { x: "All" } })` returns `filters.x === "All"`
  - Derive callback — `derive: { x: (rows) => [...new Set(rows.map(r => r.cat))] }` produces sorted unique options with `"All"` prepended
  - Effective fallback — set `filters.x = "stale"` (not in options); read effective `filters.x === "All"`; raw setter still wrote "stale"
  - Effective fallback — set `filters.x = "valid"` where `"valid"` IS in options; read effective `filters.x === "valid"`
  - Multiple dimensions — independent state per key
  - Re-derive on data change — `data` changes from `[a, b]` to `[a, b, c]`; options recompute
  - Search initialiser — `searchInitial: "preset"` → `result.search === "preset"`

### Coordination

- [ ] **T10** — DO NOT edit `web/package.json`, `web/CHANGELOG.md`, any spec file, OR create the FilterBar molecule component (that's M03). Stay strictly in `web/src/molecules/filter-bar/use-filter-bar-state.ts` + tests + index.

### Commit discipline

- [ ] After T01–T08: `git commit -m "feat(filter-bar): useFilterBarState hook with derive + effective fallback"`
- [ ] After T09: `git commit -m "test(filter-bar): useFilterBarState unit tests covering derive + fallback"`

## Acceptance criteria

- [ ] All 8 Tier-1 test cases pass
- [ ] No edits outside `web/src/molecules/filter-bar/use-filter-bar-state.ts` + index + tests
- [ ] No new `package.json` / CHANGELOG / spec edits
- [ ] Branch is `feat/prism-0.6.0-shard2-use-filter-bar-state`

## Risks

- **Re-derive cost on every keystroke** — `useMemo` keyed on `data`; data identity stable across keystrokes (search doesn't mutate data). Acceptable.
- **Effective fallback is opt-OUT not opt-IN** — chose default-on per journal 0002. If a future consumer needs raw values, expose `rawFilters` separately (not in 0.6.0; defer until demanded).

## References

- Brief: `briefs/0001-prism-0.6.0-design-cycle.md`
- Analysis: `01-analysis/01-issue-24-filterbar-evidence.md` § "Two recurring sub-patterns"
- Plan: `02-plans/01-prism-0.6.0-design.md` § Feature 1 § API surface
- Journal: `journal/0002-DISCOVERY-filterbar-absorbs-derived-options-and-effective-fallback.md`
- Issue: terrene-foundation/kailash-prism#24
