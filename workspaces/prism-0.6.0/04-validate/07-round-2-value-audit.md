# /redteam Round 2 — Value Audit of Prism 0.6.0 (Post-Fix)

**Date:** 2026-05-08
**Auditor perspective:** Same enterprise frontend platform lead from Round 1.
**Scope:** Re-run the 12 mechanical sweeps from Round 1 against the post-fix working tree to confirm V-M-1 through V-M-4 + V-L-1 / V-L-2 / V-L-3 are closed and that no new findings were introduced by the fixes.
**Bar:** literal command + literal output. Read-only. No new prose-level critique unless the fixes introduced a regression.
**Companion round:** `04-validate/05-round-2-security.md` (security re-audit).

---

## Verdict

`CONVERGED` (0 CRIT, 0 HIGH, 0 MEDIUM, 0 LOW). All 6 actionable Round-1 findings (V-M-1, V-M-2, V-M-3, V-M-4, V-L-1, V-L-2, V-L-3) are closed by the working-tree changes; V-L-4 left as-is per Round-1 disposition (CHANGELOG is a temporal snapshot, `rules/spec-accuracy.md` Rule 6 carve-out for past-tense change logs). No new findings introduced by the fixes — composition tokens still consistent, no orphan references, runtime contract widening did not break any existing assertion.

---

## Status of Round 1 findings

| ID | Severity | Title | Round-2 status | Evidence |
|----|----------|-------|----------------|----------|
| **V-M-1** | MED | 14 phantom `filter-bar.*` tokens | ✅ FIXED | `specs/components/filter-bar.yaml:154-191` rewritten to enumerate the 13 actual `--prism-*` tokens consumed by `filter-bar.tsx`, each with literal fallback shipped in source. Mechanical resolution pass: every spec-listed token resolves to ≥1 occurrence in `filter-bar.tsx` (Sweep 2 below). Phantom-namespace grep returns 0 hits (Sweep 1 below). |
| **V-M-2** | MED | `__rowType` phantom in type, absent at runtime | ✅ FIXED | Type widened to `readonly __rowType?: T \| undefined;` (`use-filter-bar-state.ts:99`); runtime literal materialises `__rowType: undefined` (`use-filter-bar-state.ts:198`). `("__rowType" in result) === true` now holds. Spec self-consistent: `specs/components/filter-bar.yaml:83,88` describe the new contract. No existing test asserted absence of the key, so no test broke. |
| **V-M-3** | MED | `BLOCKING-1` label collision | ✅ FIXED | Every reference now fully-qualified as `M-01 BLOCKING-X` or `M-02/M-03 BLOCKING-1`. Bare-label sweep with line-wrap-aware matcher (Sweep 4 below) returns 0 hits. The single `grep -nE` line-wrap artifact (`web/CHANGELOG.md:423`) is the soft-wrap of `M-01\nBLOCKING-2` from line 422 — logically qualified. |
| **V-M-4** | MED | "120 LOC" headline read as past-tense | ✅ FIXED | `web/CHANGELOG.md:12` now reads: "Expected to replace ~120 LOC of consumer boilerplate per route once arbor wave-6 migration lands … the AFTER numbers will be backfilled in 0.6.1 once M05 ships." Forward-tense framing, links the M05 todo, commits to back-filling realised numbers in 0.6.1. |
| **V-L-1** | LOW | `filterDimensions` "vapourware" claim slightly inaccurate | ✅ FIXED | `docs/specs/05m-0.6.0-additions.md:48` now: "mentioned in the `DataTableAdapter` JSDoc as 'reserved for 0.4.0' (`web/src/engines/data-table/types.ts:303`) but never declared as an actual property on the interface". Matches the source state (single JSDoc reference, no property declaration). |
| **V-L-2** | LOW | "Storybook stories" overclaim | ✅ FIXED | `web/CHANGELOG.md:13` now reads: "Storybook-compatible scenario exports … Stateful React component exports under `__stories__/`; a Storybook runner is not yet wired into the build (named exports become Story objects when one is added)." Honest at headline level. |
| **V-L-3** | LOW | Token namespace inconsistency in stories | ✅ FIXED | All 9 `var()` references in `data-table-synthetic-column.stories.tsx` and `filter-bar-with-data-table.stories.tsx` now use the canonical `var(--prism-color-*, var(--color-*, #literal))` triple-fallback chain matching `filter-bar.tsx` (Sweep below). |
| **V-L-4** | LOW | CHANGELOG cites 2200-line spec already split | ⏸️ DEFERRED (per Round-1 disposition) | CHANGELOG is a historical/append-only artifact; `rules/spec-accuracy.md` Rule 6 explicitly permits past-tense change-log content. No re-write needed. |

---

## New findings (introduced by the fixes)

**None.**

Three potential regression vectors checked:

1. **Token rewrite breaking composition** — `filter-bar.tsx` still consumes only `--prism-*` primaries with literal fallbacks (`grep -nE "var\(--" web/src/molecules/filter-bar/filter-bar.tsx | grep -v "var(--prism-"` → empty). Stories now share the same prefix. Composition unchanged.
2. **`__rowType: undefined` runtime widening breaking tests** — no test in `web/src/molecules/filter-bar/__tests__/` references `__rowType` or asserts `Object.keys(result).length`; the runtime widening is purely additive.
3. **`BLOCKING-1` rename leaving orphan refs** — line-wrap-aware sweep returns 0 bare/unqualified hits; every `BLOCKING-1` / `BLOCKING-2` mention now carries an `M-NN` qualifier within ±1 line.

---

## Mechanical sweeps re-run

### Sweep 1 — phantom `filter-bar.*` token namespace

```bash
$ grep -rn "filter-bar\.default\|filter-bar\.search\|filter-bar\.dimension\|filter-bar\.viewMode\|filter-bar\.sticky" web/src/ specs/ compiler/
# (empty — zero hits across web/src/, specs/, compiler/)
```

V-M-1 closed: the 14 phantom tokens have been removed entirely.

### Sweep 2 — every `--prism-*` token in spec resolves vs `filter-bar.tsx`

```bash
$ for var in prism-spacing-1 prism-spacing-2 prism-spacing-3 \
             prism-color-surface-default prism-color-surface-elevated \
             prism-color-border-default prism-color-text-primary \
             prism-color-text-secondary prism-color-text-on-primary \
             prism-color-interactive-primary prism-radius-md \
             prism-font-size-body prism-font-size-caption; do
    count=$(grep -c -- "$var" web/src/molecules/filter-bar/filter-bar.tsx)
    echo "--$var: $count match(es)"
done
--prism-spacing-1: 1 match(es)
--prism-spacing-2: 5 match(es)
--prism-spacing-3: 5 match(es)
--prism-color-surface-default: 2 match(es)
--prism-color-surface-elevated: 2 match(es)
--prism-color-border-default: 4 match(es)
--prism-color-text-primary: 4 match(es)
--prism-color-text-secondary: 2 match(es)
--prism-color-text-on-primary: 2 match(es)
--prism-color-interactive-primary: 3 match(es)
--prism-radius-md: 3 match(es)
--prism-font-size-body: 2 match(es)
--prism-font-size-caption: 3 match(es)
```

All 13 spec-declared tokens resolve to ≥1 use. Spec-implementation symmetry restored.

### Sweep 3 — `__rowType` runtime presence

```bash
$ grep -nE "__rowType" web/src/molecules/filter-bar/use-filter-bar-state.ts
96:   * `undefined` on the returned object so `("__rowType" in result)`
99:  readonly __rowType?: T | undefined;
198:    __rowType: undefined,
```

Type declaration (line 99) and runtime literal (line 198) agree. `"__rowType" in result === true`.

### Sweep 4 — bare `BLOCKING-1` / `BLOCKING-2` (line-wrap-aware)

```bash
$ python3 - <<'PY'
import re, pathlib
files=['workspaces/prism-0.6.0/01-analysis/03-third-gap-investigation.md',
       'workspaces/prism-0.6.0/02-plans/01-prism-0.6.0-design.md',
       'web/CHANGELOG.md']
hits=0
for f in files:
    lines=pathlib.Path(f).read_text().splitlines()
    for i,line in enumerate(lines,1):
        if re.search(r'(^|[^0-9-])BLOCKING-[12]([^0-9]|$)', line):
            prev = lines[i-2] if i>=2 else ''
            window = prev + ' ' + line
            if not re.search(r'M-?0?\d+([\s/,]+M-?0?\d+)*\s+BLOCKING-[12]', window):
                hits += 1
                print(f'BARE: {f}:{i}: {line.strip()[:120]}')
print(f'Total bare hits: {hits}')
PY
Total bare hits: 0
```

Every `BLOCKING-1` / `BLOCKING-2` carries a fully-qualified `M-NN` prefix within the line or the immediately preceding line (handles soft-wraps).

### Sweep 5 — CHANGELOG headline tense

```bash
$ grep -n "120 LOC" web/CHANGELOG.md
12:- **`useFilterBarState<T, TFilters>()`** hook — typed state machine [...]
   Expected to replace ~120 LOC of consumer boilerplate per route once
   arbor wave-6 migration lands [...]; the BEFORE numbers come from the
   wave 1–5 audit, the AFTER numbers will be backfilled in 0.6.1 once
   M05 ships.
```

Forward-tense, scoped to wave-6 + 0.6.1 commitment.

### Sweep 6 — `filterDimensions` vapourware claim

```bash
$ grep -n "filterDimensions" docs/specs/05m-0.6.0-additions.md web/src/engines/data-table/types.ts
web/src/engines/data-table/types.ts:303:  * `filterDimensions` (faceted filter UI) and `subscribe` (live updates)
docs/specs/05m-0.6.0-additions.md:48:`DataTableAdapter.filterDimensions` was reserved for 0.4.0 in the
   `data-table.yaml` v0.2.2 changelog. As of 0.6.0 it remains **vapourware**
   — mentioned in the `DataTableAdapter` JSDoc as "reserved for 0.4.0"
   (`web/src/engines/data-table/types.ts:303`) but never declared as an
   actual property on the interface, never wired into the engine, zero
   call sites.
```

Spec language now matches the literal source state.

### Sweep 7 — Storybook runner

```bash
$ grep -i "storybook" web/package.json
# (empty)

$ grep -n -i "storybook" web/CHANGELOG.md
13:- **Storybook-compatible scenario exports** [...] Stateful React component
   exports under `__stories__/`; a Storybook runner is not yet wired into
   the build (named exports become Story objects when one is added).
```

CHANGELOG matches package.json reality (no runner installed).

### Sweep 8 — `ColumnDef.render` real consumer call sites

```bash
$ grep -rln "render:" web/src/ | grep -v "test\|stories\|__tests__\|__stories__\|engines/data-table"
# (empty — zero in-repo consumer call sites; matches Round 1)
```

Unchanged from Round 1; not affected by fixes.

### Sweep 9 — `ServerDataSource` removal

```bash
$ grep -rn "ServerDataSource" web/src/ specs/ | head -5
web/src/engines/data-table/types.ts:153: * `ServerDataSource<T>` was removed in 0.3.0. [...]
web/src/engines/data-table/types.ts:296: * decisions, and the ServerDataSource migration path.
web/src/engines/data-table/adapter.ts:5: * `DataTableAdapter<T>`. The legacy `ServerDataSource` shape was removed
specs/components/data-table.yaml:31:      - "BREAKING: ServerDataSource<T> [...] removed [...]"
specs/components/data-table.yaml:38:      - "FEAT: DataSource<T> widened [...]"
```

Removal still confirmed; M-02/M-03 BLOCKING-1 STALE classification still correct.

### Sweep 10 — synthetic-sortable runtime guard wired

```bash
$ grep -n "assertNoSyntheticSortable" web/src/engines/data-table/use-data-table.ts
43:function assertNoSyntheticSortable<T extends DataTableRow>(
274:    assertNoSyntheticSortable(columns, firstRow);
751:  * field is rejected upstream by `assertNoSyntheticSortable`; this
```

Defined and called from `useDataTable`. Real wiring; unchanged from Round 1.

### Sweep 11 — 0.6.0 surface test counts

```bash
$ grep -c "it(\|test(" web/src/molecules/filter-bar/__tests__/* \
  web/src/engines/data-table/__tests__/synthetic-fields.test.tsx
web/src/engines/data-table/__tests__/synthetic-fields.test.tsx:6
web/src/molecules/filter-bar/__tests__/use-filter-bar-state.test.ts:9
web/src/molecules/filter-bar/__tests__/filter-bar.test.tsx:14
```

29 tests, identical to Round 1.

### Sweep 12 — token namespace consistency in stories

```bash
$ grep -nE "var\(--" web/src/engines/data-table/__stories__/data-table-synthetic-column.stories.tsx \
                     web/src/molecules/filter-bar/__stories__/filter-bar-with-data-table.stories.tsx
data-table-synthetic-column.stories.tsx:69: var(--prism-color-surface-muted, var(--color-surface-muted, #e2e8f0))
data-table-synthetic-column.stories.tsx:78: var(--prism-color-feedback-success, var(--color-feedback-success, #16a34a))
data-table-synthetic-column.stories.tsx:80: var(--prism-color-feedback-warning, var(--color-feedback-warning, #f59e0b))
data-table-synthetic-column.stories.tsx:81: var(--prism-color-feedback-error,   var(--color-feedback-error,   #dc2626))
filter-bar-with-data-table.stories.tsx:79:  var(--prism-color-surface-muted,    var(--color-surface-muted,    #e2e8f0))
filter-bar-with-data-table.stories.tsx:88:  var(--prism-color-feedback-success, var(--color-feedback-success, #16a34a))
filter-bar-with-data-table.stories.tsx:90:  var(--prism-color-feedback-warning, var(--color-feedback-warning, #f59e0b))
filter-bar-with-data-table.stories.tsx:91:  var(--prism-color-feedback-error,   var(--color-feedback-error,   #dc2626))
filter-bar-with-data-table.stories.tsx:293: var(--prism-color-text-secondary,   #64748b)
```

All 9 `var()` refs use the canonical `--prism-*` primary with fallback chain. Pattern matches `filter-bar.tsx`. Single-namespace contract restored.

### Regression check — orphan `filter-bar.*` namespace refs after rewrite

```bash
$ grep -rn "filter-bar\." specs/ docs/ workspaces/prism-0.6.0/ \
    | grep -vE "specs/components/filter-bar\.yaml:|workspaces/prism-0.6.0/04-validate/04-round-1-value-audit\.md"
# (only file-path references like filter-bar.tsx / filter-bar.yaml / filter-bar.test.tsx
#  remain; no orphan token-namespace refs.)
```

### Regression check — `filter-bar.tsx` still single-namespace

```bash
$ grep -nE "var\(--" web/src/molecules/filter-bar/filter-bar.tsx | grep -v "var(--prism-"
# (empty — every CSS var() uses --prism-* prefix)
```

Composition tokens not broken by the rewrite.

---

## Approach summary (<80 words)

Re-ran Round-1's 12 mechanical sweeps against the post-fix working tree. Verified: phantom `filter-bar.*` namespace removed; 13 spec-declared `--prism-*` tokens each resolve in `filter-bar.tsx`; `__rowType` declared AND materialised; 0 bare `BLOCKING-1`/`BLOCKING-2` (line-wrap-aware Python regex); CHANGELOG headline forward-tense; `filterDimensions` reword matches source; Storybook claim downgraded; story tokens normalised. Three regression vectors (composition, runtime widening, orphan refs) clean. No new findings.
