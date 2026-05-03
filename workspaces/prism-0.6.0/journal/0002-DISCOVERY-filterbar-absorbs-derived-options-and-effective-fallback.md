---
type: DISCOVERY
date: 2026-05-03
created_at: 2026-05-03T06:51:00Z
author: agent
project: prism-0.6.0
topic: FilterBar molecule absorbs two unfiled patterns as internal properties
phase: analyze
tags: [filter-bar, api-design, recurring-pattern]
---

# FilterBar absorbs `derive-options-from-data` + `effective-filter-fallback` as molecule-internal properties

## What was discovered

The agent-A consumer sweep surfaced two recurring patterns that look like separate gaps but are actually properties of what `FilterBar` IS:

1. **Derive filter options from data** (3 consumers — documents, clients, employees)
   - `documents-prism:483` — `useMemo(() => deriveCategories(templates), [templates])`
   - `clients-prism:448` — `useMemo(() => deriveSectors(clients), [clients])`
   - employees-prism (per journal 0029) — derives status filter list
   - Each consumer hand-rolls ~20 LOC of `Set` + sort + `["All", ...]`.

2. **Effective-filter fallback** (2 consumers — documents, clients)
   - `documents-prism:488-490` — `effectiveCategory = categories.includes(active) ? active : "All"`
   - `clients-prism:453-455` — same shape for sector
   - Protects against orphaned selection when last item of a category is deleted.

## Why they are not separate gaps

A separate "derive-options" hook + a separate "effective-fallback" hook + the `FilterBar` molecule = three pieces a consumer must wire together. The same call shape that motivated promoting `FilterBar` (consumer hand-rolls layout + state + adapter rebuild) re-emerges if we leave these patterns outside the molecule.

Putting both inside `useFilterBarState`:

```typescript
useFilterBarState<Client, { sector: string }>({
  data: clients,
  initial: { sector: "All" },
  derive: { sector: (rows) => deriveSectors(rows) },
});
```

…produces `state.options.sector` (derived) and `state.filters.sector` (with effective fallback applied) as natural outputs of the same hook. Consumer writes one call, gets both behaviors.

## Why this matters for scope decisions

The brief gate said "if `/analyze` surfaces a _third_ candidate, we may add it." A naïve reading would have surfaced "derive-options" and "effective-fallback" as candidates 3 and 4. The right disposition is: they are FilterBar's internal contract, not separate features. Counting them as gaps would have padded the 0.6.0 release without adding API surface.

Generalisation: when a recurring pattern across consumers is **always co-located with another already-filed pattern**, prefer absorption into the larger molecule's API over filing as a standalone gap. The "molecule scope" is determined by what consumers do together, not by what looks like a feature in isolation.

## Connection to existing rules

- `orphan-detection.md` — keeps `DataTableAdapter.filterDimensions` vapourware (declared in spec, no engine wiring) until a consumer demands it. This DISCOVERY confirms that decision: even with FilterBar shipping, no consumer needs the engine-side faceted-filter wiring; the molecule-level state hook is sufficient.
- `spec-accuracy.md` Rule 5 — code-first; spec edits to `filter-bar.yaml` land AFTER the molecule code merges.

## Consequences

- `useFilterBarState` API has more surface than the brief implied (now owns derivation + fallback). Document carefully in spec.
- Storybook stories for FilterBar must cover the three observed consumer shapes — search-only, search+chips, search+dropdown+toggle — so future migrations have a copy-paste pattern that handles derivation + fallback automatically.
- The migration recipe (`workspaces/fe-codegen-platform/.session-notes` references `co-setup/12-consumer-migration-pattern.md` as a future destination) should be updated post-0.6.0 to use `useFilterBarState` instead of hand-rolled `useMemo` derivation + effective-fallback.

## For Discussion

1. **Counterfactual** — if a future consumer needs derived options that depend on **two** data sources (e.g. sectors derived from `clients` ∪ `archivedClients`), does the `derive` callback signature `(rows: T[]) => string[]` need to widen to `(rows: T[], extra?: unknown) => string[]`? Or do we say "compose at consumer level via `useMemo(() => allClients, ...)`"? The latter is simpler; the former is more expressive. We're starting with the simpler shape — accept the known-narrow decision?
2. **Specific data** — 3 of 4 known consumers derive options; 2 of 4 need effective-fallback. The molecule MUST handle the 3-of-4 case (`derive`); should `effective fallback` be opt-out (default on) or opt-in (default off)? Default on is safer (prevents stuck-empty-state); default off matches consumer mental model where `setFilter("X")` writes whatever the consumer says. We're proposing default-on; concur?
3. **Bundling counterfactual** — what evidence would persuade us this absorption is wrong? Specifically: if a consumer needs `useFilterBarState` WITHOUT the molecule (e.g., custom layout but same state), the hook is still useful standalone. If a consumer needs `FilterBar` molecule WITHOUT derivation (e.g., hardcoded option lists), the molecule still works (consumer passes `dimensions` directly without going through `useFilterBarState`). Both decoupled paths are supported — does this satisfy the "three pieces a consumer must wire" concern, or are we papering over a real fragmentation?
