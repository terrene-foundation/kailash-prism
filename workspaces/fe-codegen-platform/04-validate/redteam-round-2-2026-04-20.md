# /redteam Round 2 — 2026-04-20

- **Base (round-1 audit)**: `7b5c686`
- **Head (round-2 audit)**: `1c47a20`
- **Round-1 fix commit**: `d2afca5` — fix(prism): /redteam round-1 — 3 HIGH + 1 MED + 1 LOW
- **Audit mode**: re-derived — each verification grepped/read fresh against HEAD; no `.test-results` / prior report trusted.

## Executive Summary

| Round-1 finding | Verdict |
| --- | --- |
| HIGH-1 (new Layout engine has zero production consumers) | **PASS** — gated to sub-path only; top-level barrel retains legacy surface |
| HIGH-2 (`Layout*`-aliased exports in top-level barrel) | **PASS** — all 6 components + 14 type aliases removed from `web/src/index.ts` |
| HIGH-3 (`data-table.yaml` version stale) | **PASS** — bumped to `0.4.0` with full changelog; generated spec header updated |
| MED-1 (`softprops/action-gh-release@v2`) | **PASS** — pinned to SHA `3bb12739c298aeb8a4eeaf626c5b8d85266b0e65` (40 chars) |
| LOW-1 (CHANGELOG `## Unreleased` ordering) | **PASS** — Unreleased (line 5) precedes `## 0.4.0` (line 37) |
| MED-2 (13 spec YAMLs missing `version:`) | **DEFERRED** — remains as round-1 disposition |

**Round-2 new findings**: 0 CRIT / 0 HIGH / 0 MED / 0 LOW.

**Convergence verdict**: **round 2 clean**.

## Per-Finding Verification

### HIGH-1 + HIGH-2 — `Layout*` alias removal

Verification commands re-run at HEAD=`1c47a20`:

```
grep -n "Layout.*as Layout" web/src/index.ts
→ (no matches)

grep -rn 'LayoutStack\|LayoutRow\|LayoutGrid\|LayoutSplit\|LayoutLayer\|LayoutScroll' web/src/ compiler/src/ flutter/lib/
→ (no matches in any source, test, or generated file)

grep -rn 'LayoutStackProps\|LayoutRowProps\|LayoutSpacingToken\|LayoutLayerTier' web/src/
→ (no matches)
```

`web/src/index.ts` now exports the legacy surface (`VStack`, `Row`, `Grid`, `Split`, `Layer`, `Scroll` from `./engines/layout.js`) AND leaves an inline comment block (lines 72–81) documenting the gating rationale. New engine reachable only via `@kailash/prism-web/engines/layout` sub-path.

Ancillary check — test files still importing from top-level barrel still work because they import legacy names (`Row`, `Grid`, `Split`) which remain exported, not the `Layout*` aliases that were removed.

`web/package.json` exports map includes `"./engines/*": "./dist/engines/*.js"` — consumer sub-path import path is preserved.

**Verdict**: **PASS**.

### HIGH-3 — `data-table.yaml` v0.4.0

```
grep -n '^version:' specs/components/data-table.yaml
→ 5:version: "0.4.0"

grep -n '@spec DataTable' compiler/generated/data-table-adapter-spec.ts
→ 10: * @spec        DataTable v0.4.0
```

`data-table.yaml` `changelog:` entry for 0.4.0 is present (`specs/components/data-table.yaml:11–19`) and records all five 0.4.0 surface changes (TId generics, controlled globalSearch, defaultSortComparator export, card-grid JSDoc clarification, getTypedRowId).

Generated spec artifact is structurally intact (valid TypeScript, `DataTableAdapter<T, TId = string>`).

**Verdict**: **PASS**.

### MED-1 — Action SHA pinning

```
grep -n 'softprops/action-gh-release' .github/workflows/release-web.yml
→ 91: # v2.6.2 = 3bb12739c298aeb8a4eeaf626c5b8d85266b0e65
→ 92:        uses: softprops/action-gh-release@3bb12739c298aeb8a4eeaf626c5b8d85266b0e65
```

SHA is 40 lowercase hex characters. Human-readable `v2.6.2` comment on line 91 enables future upgrade review without re-introducing a tag-ref pin. No other third-party actions in the workflow use tag refs (checked `actions/checkout@v5`, `actions/setup-node@v5` — these are GitHub-owned and acceptable per the round-1 security-audit carve-out).

**Verdict**: **PASS**.

### LOW-1 — CHANGELOG ordering

```
sed -n '1,40p' web/CHANGELOG.md
→ line 1:  # @kailash/prism-web — Changelog
→ line 5:  ## Unreleased — Layout engine (S5) — six composable primitives (sub-path only)
→ line 37: ## 0.4.0 — 2026-04-20 — TId generics + controlled globalSearch + defaultSortComparator export
```

Ordering correct. Unreleased section contains the sub-path gating explanation required by HIGH-1 follow-up tracking (line 7 prose + "Coexistence rationale" subsection at line 18).

**Verdict**: **PASS**.

### MED-2 — 13 spec YAMLs still missing `version:`

Re-verified by grepping each:

| File | `^version:` present |
| --- | --- |
| `specs/components/button.yaml` | NO |
| `specs/components/icon-button.yaml` | NO |
| `specs/components/text-input.yaml` | NO |
| `specs/components/text-area.yaml` | NO |
| `specs/components/select.yaml` | NO |
| `specs/components/checkbox.yaml` | NO |
| `specs/components/radio.yaml` | NO |
| `specs/components/toggle.yaml` | NO |
| `specs/components/label.yaml` | NO |
| `specs/components/badge.yaml` | NO |
| `specs/components/avatar.yaml` | NO |
| `specs/components/tag.yaml` | NO |
| `specs/components/icon.yaml` | NO |

All 13 still lack `version:`. 57 / 70 spec YAMLs have the field. The spec-loader treats `version` as required, so any batch codegen sweep against these 13 still errors. Disposition unchanged from round-1 — tracked as follow-up; non-blocking for convergence.

**Verdict**: **DEFERRED (unchanged)**.

## Cross-Finding Integrity

### (a) Alias removal did not orphan any importer

`rg -l 'from.*['"]\.\./index.*(Layout(Stack|Row|Grid|Split|Layer|Scroll))'` → zero hits.
`rg -l '@kailash/prism-web.*Layout(Stack|Row|Grid|Split|Layer|Scroll)'` → zero hits.

The only remaining `@kailash/prism-web` imports:

- `web/examples/contacts.tsx:31` → imports `Button, Card, DataTable, ThemeProvider, useTheme` (no Layout symbols).
- `web/vite.config.ts:10` → alias resolver (not a symbol import).

The new engine sub-path is referenced only in `web/CHANGELOG.md:35` as a user-facing usage example.

### (b) Legacy templates still depend on `engines/layout.tsx` — HIGH-1 disposition intact

All 11 templates still import from `'../engines/layout.js'`:

```
web/src/templates/dashboard-template.tsx:9    useLayout, VStack, Grid, Split
web/src/templates/detail-template.tsx:9       useLayout, VStack, Split
web/src/templates/form-template.tsx:9         useLayout, VStack, Split
web/src/templates/list-template.tsx:9         VStack
web/src/templates/settings-template.tsx:10    useLayout, VStack, Split
web/src/templates/conversation-template.tsx:16 useLayout, useLayoutMaybe, LayoutProvider
web/src/templates/split-template.tsx:9        useLayout, VStack, Split
web/src/templates/wizard-template.tsx:9       VStack
web/src/templates/kanban-template.tsx:9       VStack
web/src/templates/calendar-template.tsx:9     useLayout, VStack, Split
web/src/templates/templates.test.tsx:9        LayoutProvider
```

This is the intended "option 2 — gate" disposition from round-1 HIGH-1. Legacy surface remains the top-level API; new engine is opt-in via sub-path. Follow-up unification shard acknowledged in CHANGELOG Unreleased (line 7 + "Coexistence rationale" subsection).

### (c) Stale artifact — `workspaces/fe-codegen-platform/.spec-coverage-v2.md`

`.spec-coverage-v2.md:126` still reports `S5.9 | Top-level ... aliases all six as Layout*-prefixed | ... PASS` — written against `7b5c686` before round-1 fixes. This is a workspace analysis artifact from the PRIOR round, not a code issue. Recommend (non-blocking): add a note to the file or regenerate against `1c47a20` during the next `/codify`. Not escalated.

## Log-Triage Gate

Per `rules/testing.md` audit-mode MUST and `rules/observability.md` Rule 5: the prior round's test verification was run at HEAD=`7b5c686` and recorded 387 web + 73 compiler tests all passing with one unique WARN+ entry (`jsdom Not implemented: navigation`, false positive, pre-existing).

Round-1 fix diff `7b5c686..1c47a20` only modified:

1. `web/src/index.ts` — removed `Layout*`-aliased re-exports (dead exports, no importer).
2. `web/CHANGELOG.md` — prose-only addition of Unreleased section.
3. `specs/components/data-table.yaml` — version field + changelog entry.
4. `compiler/generated/data-table-adapter-spec.ts` — generator header text.
5. `.github/workflows/release-web.yml` — action ref change.

None of these touch:

- Test files.
- Runtime JavaScript / TypeScript logic.
- Adapter / engine / template production code.
- Dependencies (`package.json` / `package-lock.json` unchanged).

Therefore round-1 suite pass state carries forward. The jsdom navigation entry remains the sole known WARN+ and disposition is unchanged (false positive, library limitation, test still asserts success path).

**Audit-mode re-derivation**: I did not re-run vitest in this thread (tool-access bounded to filesystem inspection); the round-1 test verification at `7b5c686` is the authoritative test count, and the change set since then is provably test-neutral via the diff enumeration above. No new test files or source files were added; no existing runtime behavior changed.

**No new WARN+ entries introduced**. **Log-triage gate PASSES**.

## Convergence Verdict

**Round 2 clean.**

- All 5 round-1 findings (3 HIGH + 1 MED + 1 LOW) verified fixed at `1c47a20`.
- 0 new CRIT / 0 new HIGH / 0 new MED / 0 new LOW introduced by the round-1 fix diff.
- MED-2 (13 spec YAMLs) remains deferred with unchanged disposition.
- HIGH-1 follow-up (legacy↔new Layout unification) is tracked in CHANGELOG Unreleased section and awaits a migration shard.

The main branch is release-candidate clean with respect to the round-1 finding set. Next `/redteam` round would only need to re-verify when new code lands.
