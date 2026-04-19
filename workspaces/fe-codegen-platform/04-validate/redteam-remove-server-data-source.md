# Redteam Review — Shard 3 (0.3.0) Remove ServerDataSource

**Branch**: `feat/remove-server-data-source` vs `main`
**Commit**: `0809927`
**Reviewer**: quality-reviewer
**Date**: 2026-04-17

## Summary

**Status**: Clean with 2 LOW findings (stale spec references) and 1 LOW finding (CHANGELOG test count typo). No CRITICAL / HIGH / MEDIUM findings. The removal is mechanically complete, barrel exports are clean, full vitest suite collects and passes (264/264), and the public surface no longer exposes the five removed symbols.

## Checklist

| # | Check | Result |
|---|---|---|
| 1 | Orphan Rule 4 — test files deleted with symbols | PASS — `server-data-source-wiring.test.ts` deleted; `data-table-adapter.test.tsx` has zero imports of removed symbols; `npx vitest run` collects cleanly (11 files, 264 tests, 0 import errors) |
| 2 | Public surface clean sweep | PASS — only references in `web/src` are doc-block narrative comments in `adapter.ts:5-8` and `types.ts:127-130,166,267`. All acceptable. |
| 3 | Barrel exports | PASS — `web/src/index.ts`, `web/src/engines/data-table.tsx`, `web/src/engines/data-table/index.ts` export only `isDataTableAdapter`, `resolveDataSource`, plus DataTable adapter types. |
| 4 | Spec § 5.1.1 release sequence | PASS for the "Relationship to ServerDataSource" rewrite (L639-655). Sequence 0.1.x orphan → 0.2.0 wire → 0.2.2 shim → 0.3.0 remove is accurate. See L-2 for stale DD-5 summary bullet. |
| 5 | Migration cheatsheet (`items→rows`, `fetchData→fetchPage`) | PASS — matches current `DataTablePage.rows`, `DataTableAdapter.fetchPage`. No other field renames required. |
| 6 | Adapter test suite | PASS — 22 tests, all green, covers `isDataTableAdapter` guard discrimination (test at L321-327), the interface contract, rowActions, bulkActions, onRowActivate, fetch lifecycle, and href sanitization. |
| 7 | Version bump | PASS — `web/package.json` 0.2.2 → 0.3.0. BREAKING correctly signaled by minor bump in pre-1.0. |
| 8 | Hook state lifecycle | PASS — `use-data-table.ts` handles only two paths: array (L134 `isClientSide`) and adapter (L208 `if (adapter === null) return`). No dead legacy branches. |
| 9 | CHANGELOG 0.3.0 entry | PASS for content — calls out deleted test file (L50-52), removed exports (L7-9), migration pointer (L23-46). See L-3 for test count arithmetic error. |
| 10 | data-table.yaml 0.3.0 entry + data prop | PASS — changelog L12-17, `data` prop type `T[] | DataTableAdapter<T>` at L53. See L-1 for stale `proposed_adapter` block. |
| 11 | Tests still importing 2-shape union with ServerDataSource | PASS — grep for removed symbols returns zero matches in any `.test.*` file. |
| 12 | Dangling `@deprecated` tags | PASS — `@deprecated` returns zero matches across `web/src/`. |

## Findings

### LOW-1 — Stale `proposed_adapter` block in data-table.yaml

**File**: `specs/components/data-table.yaml:224-316`

The YAML file's `proposed_adapter` block still reads like the pre-implementation design doc. Specifically:

- L229: `version_introduced: "0.2.0-pending"` (should be `"0.2.2"`)
- L306: `serverDataSource_deprecation: "one-release window: deprecate M-06, remove 0.2.0"` (should reference 0.2.2 → 0.3.0)
- L225-226 header comment: "deprecated M-06, removed in 0.2.0 minor release" (same drift)

The top-level `changelog:` entries (L11-35) are correct for 0.3.0 / 0.2.2 / 0.2.0 so external consumers reading the changelog section are fine. The `proposed_adapter` block is historical scaffolding that should either be updated with actual shipped versions OR labeled `# HISTORICAL — see changelog for shipped versions`.

**Suggested fix**: update L229 to `"0.2.2"`, L306 to `"two-release window: deprecate 0.2.2, remove 0.3.0"`, L225-226 to match.

### LOW-2 — DD-5 bullets in spec § 5.1.1 still describe the pre-execution plan

**File**: `docs/specs/05-engine-specifications.md:710-716`

DD-5 ("Deprecation plan for ServerDataSource") summary bullets read:

```
- M-04 wires the orphan so existing consumers get correct behavior.
- M-06 ships `DataTableAdapter`, accepts both shapes via union, marks `ServerDataSource` `@deprecated`, ships migration cheatsheet.
- Next minor (0.2.0) removes `ServerDataSource` entirely.
```

The last bullet "Next minor (0.2.0)" is stale — the actual removal landed in 0.3.0. The authoritative "Relationship to ServerDataSource" section immediately above (L639-655) is correct; the DD-5 summary just wasn't updated to match. Trivial fix: change "Next minor (0.2.0)" → "0.3.0 (Shard 3)".

### LOW-3 — CHANGELOG adapter test count disagrees with reality

**File**: `web/CHANGELOG.md:53-55`

```
- Deleted 4 adaptLegacy-specific cases from `data-table-adapter.test.tsx`.
- Adapter test suite: 20 cases (down from 24 in 0.2.2); full suite:
  264 tests (down from 270).
```

Running `npx vitest run data-table-adapter` reports **22 tests passed**, not 20. The full-suite count of 264 is correct. The arithmetic is off by 2: either 0.2.2 had 26 cases (24+2) and 4 were deleted to reach 22, or 2 cases weren't actually deleted. Either way, the claim "20 cases" does not match the live test file.

**Suggested fix**: replace with verified counts. Verifying command:

```bash
cd web && npx vitest run data-table-adapter 2>&1 | grep "Tests" | tail -1
# Output: Tests  22 passed (22)
```

Update CHANGELOG to "22 cases (down from 26 in 0.2.2)" or whatever the actual diff shows.

This maps to `rules/testing.md` § "Verified Numerical Claims In Session Notes" — hand-typed counts are BLOCKED; verify via a command.

## Notes

- All three findings are LOW (documentation-only, no runtime impact, no import breakage).
- The deletion itself is clean: doc blocks in `adapter.ts` and `types.ts` deliberately retain `ServerDataSource` name as narrative migration context, which is the correct pattern per the review spec ("any reference outside a git-history comment in a doc block is a leak").
- The `git show 8489bc9:web/src/engines/data-table/adapter.ts` reference is a useful escape hatch for downstream consumers who need the 30-LOC shim — valid pattern, documented in two places (adapter.ts and CHANGELOG) for redundancy.
- Orphan-detection Rule 4 compliance is textbook: test file deleted in the same commit as the API, no collection orphans.
- Full vitest run — 11 files, 264 tests passed, duration 1.38s. No warnings, no errors.

## Recommendation

Merge after resolving LOW-3 (verified test count in CHANGELOG). LOW-1 and LOW-2 can be addressed in the same commit or folded into the next spec polish pass — neither blocks the release.
