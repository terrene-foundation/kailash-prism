---
shard: 5 (downstream — separate workstream)
release: post-0.6.0 (arbor-side)
status: deferred until 0.6.0 ships
specialist: react-specialist (against arbor repo)
repo: terrene-foundation/arbor
not_part_of_prism_release: true
---

# M05 — arbor migration follow-up (after 0.6.0 ships)

## Goal

After Prism 0.6.0 publishes, migrate the four shipped arbor `*-prism` consumer routes to use `FilterBar` + `useFilterBarState` instead of hand-rolled filter UI + state. Verifies the molecule's API design against real consumer code.

## Why this is its OWN milestone

This work is in **terrene-foundation/arbor**, not kailash-prism. It's the consumer-validation pass that proves 0.6.0's API holds under real use. Tracking it here keeps the cross-repo loop visible without bundling arbor commits into a Prism release PR.

Per `agents.md` `MUST: Worktree Isolation for Compiling Agents`: do this in its own session, against the arbor repo, after 0.6.0 publishes.

## Tasks (deferred to post-0.6.0 session)

- [ ] **T01** — Update arbor's `apps/web/package.json` to `@kailash/prism-web@^0.6.0` once published.
- [ ] **T02** — Migrate `documents-prism/page.tsx` — replace ~135 LOC of inline filter CSS + `useState` cluster with `useFilterBarState` + `<FilterBar>`. Verify visual parity.
- [ ] **T03** — Migrate `clients-prism/page.tsx` — same treatment, ~122 LOC removal.
- [ ] **T04** — Migrate `my-payslips-prism/page.tsx` — minimal-shape FilterBar (search-only) — confirms the search-only story shape works.
- [ ] **T05** — Migrate `employees-prism/page.tsx` — FilterBar above the multi-DataTable layout. Profile-completeness column re-added (was dropped in wave-5; now possible via #25 relaxation).
- [ ] **T06** — Open arbor PR `feat(web): adopt Prism 0.6.0 — FilterBar + synthetic columns` consolidating all four migrations.

## Codify follow-up

- [ ] **T07** — Update the migration recipe in `workspaces/fe-codegen-platform/journal/` (or eventual `co-setup/12-consumer-migration-pattern.md`) to use `useFilterBarState` instead of hand-rolled `useMemo` derivation + effective-fallback. Note the LOC savings (~120 LOC per consumer).

## Acceptance

- [ ] All 4 routes ship without inline filter CSS (zero `style={{...}}` blocks for filter-related elements)
- [ ] employees-prism re-introduces Profile-completeness column
- [ ] LOC savings documented per route
- [ ] Migration recipe updated

## NOT covered by this milestone

- Wave-6 — pivot to next migration target only after M05 ships AND 0.6.0 has 1 week of consumer use without follow-up issues (smoke test for premature release).

## References

- All `01-analysis/` files
- `journal/0002-DISCOVERY-filterbar-absorbs-derived-options-and-effective-fallback.md` — migration recipe consequences
- arbor PRs from waves 3-5: terrene-foundation/arbor#23, #25, #26, #28
