# /redteam Round 1 — Value Audit of Prism 0.6.0

**Date:** 2026-05-08
**Auditor perspective:** Enterprise frontend platform lead evaluating Prism for adoption (not end-user; Prism is a frontend SDK consumed by the application layer).
**Scope:** Brief 0001 promise vs. 0.6.0 deliverable parity, CHANGELOG value-claim integrity, demo credibility, migration credibility, spec self-containment, third-gap discipline, storybook/spec drift.
**Bar:** "Promise X claims Y; evidence Z." Verbatim quotes + file:line + command output. Read-only.
**Companion round:** `04-validate/02-round-1-security.md` (security audit, already filed). This round complements security with value/narrative coherence.

---

## Executive summary

Prism 0.6.0 delivers a coherent two-feature release that matches its brief. The core code (FilterBar molecule, `useFilterBarState` hook, `ColumnDef.field` relaxation, runtime synthetic-sortable guard) is real, tested, and the storybook scaffolds illustrate the three claimed consumer shapes with stateful React components — not static prop pass-throughs. No CRITICAL or HIGH findings.

What weakens the buyer-side narrative is **secondary-artefact drift**: the FilterBar spec (`specs/components/filter-bar.yaml`) lists 14 `filter-bar.*` design tokens that do not exist anywhere in the implementation (the actual code consumes generic `--prism-*` tokens), the third-gap analysis labels two unrelated findings as `BLOCKING-1`, the spec's "vapourware" claim about `DataTableAdapter.filterDimensions` is itself slightly inaccurate (only a docstring mention, not an actual property), the "120 LOC eliminated" headline is prospective (realised once `M05-arbor-migration-followup.md` lands — admitted in spec), and the `__rowType` phantom field declared in the public type is omitted from the runtime return literal (already flagged as M-1 in round-1 security; recorded here as a value-narrative finding too).

**Verdict:** `CONVERGED` (0 CRIT, 0 HIGH; 4 MEDIUM, 4 LOW; all actionable in 0.6.1). The release ships honestly enough that a CTO would adopt it, but the **spec layer leaks credibility** in ways that compound across migrations.

---

## Findings

### CRITICAL

_None._

### HIGH

_None._

### MEDIUM

#### V-M-1 — Spec lists 14 `filter-bar.*` design tokens that do not exist in code or compiler

**Promise** — `specs/components/filter-bar.yaml:154-169` declares 14 tokens consumed:

```yaml
tokens:
  consumes:
    - filter-bar.default.bg
    - filter-bar.default.border
    - filter-bar.default.radius
    - filter-bar.default.padding
    - filter-bar.default.gap
    - filter-bar.search.bg
    - filter-bar.search.border
    - filter-bar.dimension.bg
    - filter-bar.dimension.text
    - filter-bar.dimension.active_bg
    - filter-bar.dimension.active_text
    - filter-bar.viewMode.bg
    - filter-bar.viewMode.active_bg
    - filter-bar.sticky.z_index
```

**Evidence** — `grep -rn "filter-bar\.default\|filter-bar\.search\|filter-bar\.dimension\|filter-bar\.viewMode" web/src/ specs/ compiler/` returns matches only inside the spec file itself (lines 156-168). The actual molecule (`web/src/molecules/filter-bar/filter-bar.tsx`) consumes generic tokens: `--prism-spacing-1/2/3`, `--prism-color-surface-default`, `--prism-color-text-primary/secondary/on-primary`, `--prism-color-interactive-primary`, `--prism-color-border-default`, `--prism-radius-md`, `--prism-font-size-body/caption`. None of the 14 `filter-bar.*` tokens exist as CSS variables anywhere.

**Impact for an adopting team** — A platform lead reading the spec to learn "what tokens do I need to define for FilterBar to look right under my theme?" will define 14 tokens that the molecule never reads. The molecule renders against generic Prism tokens; the spec's `tokens.consumes` block is fiction. This is a `rules/spec-accuracy.md` Rule 1 violation — every cited symbol MUST resolve.

**Disposition** — In 0.6.1, either (a) rewrite the spec's `tokens.consumes` block to enumerate the actual `--prism-*` tokens consumed (and add fallback chain documentation), or (b) introduce the namespaced `filter-bar.*` tokens in the compiler so the spec's claim becomes truth.

---

#### V-M-2 — `__rowType` phantom field declared in public type but absent from runtime return value

**Promise** — `specs/components/filter-bar.yaml:88` describes `__rowType: T` as a "load-bearing phantom field" that "M03/M04 must NOT remove or rename"; `web/src/molecules/filter-bar/use-filter-bar-state.ts:96-98` declares `readonly __rowType?: T` with the JSDoc "Always `undefined` at runtime."

**Evidence** — `web/src/molecules/filter-bar/use-filter-bar-state.ts:191-197` returns `{ search, setSearch, filters, setFilter, options }`. No `__rowType` key is set (not even `undefined`). `("__rowType" in result)` is `false`.

**Impact for an adopting team** — A consumer using `Object.keys(result)` (a common pattern in dev-tools, devtools-formatter, or generic prop spread) sees 5 keys, not 6. A consumer asserting `"__rowType" in result` for type discrimination gets `false` and writes a false-negative branch. The type system says one thing, the runtime says another; users discover this only when their devtools hover lies to them.

This is also recorded as M-1 in `04-validate/02-round-1-security.md`. Re-flagged here from the value angle: documentation, spec, and runtime disagree, and the spec elevates the field to "load-bearing" — a buyer reading the spec would invest review time pinning a property the runtime doesn't carry.

**Disposition** — Either (a) materialise the phantom in the return literal as `__rowType: undefined`, or (b) downgrade spec/JSDoc to "type-only phantom; not present on runtime object". Pick one; the current state is the worst hybrid.

---

#### V-M-3 — `BLOCKING-1` label used to mean two different things in the same workspace

**Promise** — `workspaces/prism-0.6.0/01-analysis/03-third-gap-investigation.md:16` defines:

> **BLOCKING-1: ServerDataSource never invoked** … STALE — `ServerDataSource` was removed in 0.3.0

**Evidence** — `workspaces/prism-0.6.0/01-analysis/03-third-gap-investigation.md:53` and `:61` both use the SAME label `BLOCKING-1` to refer to a different finding:

```
- Form custom field render escape hatch (BLOCKING-1 in M-01; FormAdapter scope)
2. **Form custom field render (BLOCKING-1)** — if any wave-6 route needs combobox / currency / autocomplete.
```

`workspaces/prism-0.6.0/02-plans/01-prism-0.6.0-design.md:152` repeats the second sense: "Form engine changes (BLOCKING-1, BLOCKING-2)". `web/CHANGELOG.md:61` propagates: "Form custom field render escape hatch (`BLOCKING-1` from migration findings)". `web/CHANGELOG.md:337` and `:503` use a third sense (DataTable / `ServerDataSource`).

**Impact for an adopting team** — When a future migration cites `BLOCKING-1` from the changelog, the reader's grep returns conflicting definitions. Cross-workspace traceability breaks: `BLOCKING-1` resolves to "ServerDataSource (M-02/M-03 finding, stale)" or "Form custom field render (M-01 finding, deferred)" depending on which row they read. Per `rules/spec-accuracy.md`, finding tags MUST be unambiguously scoped.

**Disposition** — In 0.6.1, normalize finding labels to fully-qualified form (e.g. `M-01-BLOCKING-1` for the Form finding, `M-02-BLOCKING-1` for the ServerDataSource finding) wherever they appear in workspaces and CHANGELOG.

---

#### V-M-4 — "120 LOC of consumer boilerplate per route" headline value claim is prospective, not retrospective

**Promise** — `web/CHANGELOG.md:12`:

> Internally absorbs derive-options-from-data (3 arbor consumers hand-rolled) + effective-filter-fallback (2 arbor consumers hand-rolled), so the molecule replaces ~120 LOC of consumer boilerplate per route.

`docs/specs/05m-0.6.0-additions.md:64-71` shows a table claiming `documents-prism: ~135 LOC → ~15 LOC = ~120 LOC reduction` etc., **but** line 71 admits:

> (Realised once `M05-arbor-migration-followup.md` lands post-0.6.0.)

**Evidence** — The migration plan that would realise the headline savings does not yet exist as a PR, todo, or merged diff in this repo or in `workspaces/fe-codegen-platform/`. The `135 LOC` and `122 LOC` numbers come from `workspaces/prism-0.6.0/01-analysis/01-issue-24-filterbar-evidence.md:13` which counts the BEFORE-state in arbor (downstream); the AFTER-state is hypothetical until M05 ships. The CHANGELOG headline reads as if savings are already realised; only the "(Realised once …)" parenthetical in the spec reveals the prospective framing.

This is a soft `rules/spec-accuracy.md` Rule 2 risk: the headline value claim is presented in present tense ("replaces ~120 LOC") while the realisation is future-tense in the spec body. A buyer reading only the CHANGELOG would believe the savings are demonstrated.

**Impact for an adopting team** — The number 120 is the most quotable headline in the release. If wave-6 migration shipping reveals the actual reduction is, say, 60–80 LOC (because the FilterBar surface couples with adapter rebuild patterns that don't migrate cleanly), the number will need a public revision. Better to publish the realised number after M05 ships and mark 0.6.0's claim as a forecast.

**Disposition** — In 0.6.1 CHANGELOG / spec, re-word the headline as "expected to replace ~120 LOC per route once arbor wave-6 migration lands" OR commit to back-fill the actual realised numbers in 0.6.1 once `M05-arbor-migration-followup.md` lands. Do not leave the headline as present-tense forever.

---

### LOW

#### V-L-1 — `DataTableAdapter.filterDimensions` "vapourware" claim is itself slightly inaccurate

**Promise** — `docs/specs/05m-0.6.0-additions.md:46-48`:

> `DataTableAdapter.filterDimensions` was declared in `data-table.yaml` v0.2.2 and reserved for 0.4.0. As of 0.6.0 it remains **vapourware** — declared in the type, never wired, zero call sites in the engine.

**Evidence** — `grep -rn "filterDimensions" web/src/` returns ONLY `web/src/engines/data-table/types.ts:303` which is a JSDoc comment ("`filterDimensions` (faceted filter UI) and `subscribe` (live updates) are reserved for 0.4.0…") — NOT an actual property declaration on `DataTableAdapter<T>`. The interface fields end at `invalidate?` before the vapourware-citing comment block. The analysis 01 file even says this correctly at line 68: "(`types.ts:274-277`, `rg "filterDimensions" web/src` returns only the comment.)".

**Impact for an adopting team** — A buyer following the spec's "vapourware" framing assumes the symbol IS in the type and will appear in TypeScript autocomplete. Actually it doesn't; it's only described in prose. Minor narrative drift; doesn't affect adoption decision.

**Disposition** — Reword the spec line to "mentioned in the `DataTableAdapter` JSDoc as reserved for 0.4.0; not yet declared as a property" in 0.6.1.

---

#### V-L-2 — Storybook scaffolds are React component exports, not runnable Storybook

**Promise** — `web/CHANGELOG.md:13`:

> Storybook stories for the three FilterBar shapes plus a composite `FilterBar + DataTable` integration story.

**Evidence** — `find web/src -name "*stories.tsx"` returns 3 files; `grep -i storybook web/package.json` returns nothing. `web/src/molecules/filter-bar/__stories__/filter-bar.stories.tsx:21-24` admits in its docstring:

> When a Storybook runner is wired into the build, the named exports become Story objects without needing to rewrite scenario logic.

**Impact for an adopting team** — A reader of the CHANGELOG who runs `npm run storybook` (not defined) gets nothing. The "stories" are stateful React component exports that compile under TypeScript strict — useful as in-source examples, but a buyer expecting `localhost:6006` is surprised. This is acceptable as Tier-2 documentation but the CHANGELOG word "Storybook stories" overpromises by current convention.

**Disposition** — In 0.6.1 either wire a Storybook runner (low effort given the file shape is already compatible) OR reword as "Storybook-compatible scenario exports (runner pending)". Current state is honest in source comments but misleading at headline level.

---

#### V-L-3 — Token namespace inconsistency between FilterBar source and adjacent stories

**Promise** — Implicit: a single 0.6.0 release should consume tokens from one namespace.

**Evidence** —

- `web/src/molecules/filter-bar/filter-bar.tsx` consumes `--prism-*` tokens with fallback chains, e.g. `var(--prism-color-surface-default, var(--color-surface-default, #ffffff))` (filter-bar.tsx:131).
- `web/src/engines/data-table/__stories__/data-table-synthetic-column.stories.tsx:68,77,79,80` consumes `var(--color-surface-muted)` / `var(--color-feedback-success)` etc. with NO fallback and NO `prism-` prefix.
- `web/src/molecules/filter-bar/__stories__/filter-bar-with-data-table.stories.tsx:78,87,89,90` uses `var(--color-feedback-success, #16a34a)` (no `prism-` prefix, with fallback) — and at line 292 switches mid-file to `var(--prism-color-text-secondary, #64748b)` (`prism-` prefix).

**Impact for an adopting team** — Three different token-namespace conventions across 0.6.0 stories and source. A theme author looking at the demo to learn "which CSS variables are the contract" gets three answers. Per `rules/specs-authority.md`, naming should be consistent.

**Disposition** — In 0.6.1, normalise all stories to the same `--prism-*`-with-fallback convention used in `filter-bar.tsx`.

---

#### V-L-4 — Spec authority stays in a 2200+ line `05-engine-specifications.md` despite split recommendation

**Promise** — `web/CHANGELOG.md:54`:

> `docs/specs/05-engine-specifications.md` — appended § Filter Engine + § DataTable § ColumnDef relaxation. Future split recommended (file is now 2200+ lines; out of M04 scope).

**Evidence** — Recent commit `e8cc809 docs(specs): split 05-engine-specifications.md into 13 sub-domain files (#35)` (post-0.6.0) DID land the split. So the spec was split LATER. The CHANGELOG entry above implies a still-monolithic 2200-line file; today's reader sees 13 sub-domain files. The 0.6.0 CHANGELOG is a snapshot but a reader cross-referencing today won't find the cited file at the cited size.

**Impact for an adopting team** — Minor; affects only readers who try to grep the citation. Per `rules/specs-authority.md` Rule 8, files over 300 lines MUST be split — the split is correct; the CHANGELOG is just temporally stale.

**Disposition** — Acceptable as-is; CHANGELOG is historical record. Future CHANGELOG entries should cite stable section anchors rather than file lengths.

---

## Mechanical sweeps run

```bash
# 1. Promise vs deliverable parity — count features shipped in 0.6.0 and check brief alignment
$ git -C /Users/esperie/repos/loom/kailash-prism log --all --oneline --grep="0.6.0\|filter-bar\|FilterBar\|synthetic" | head -10
1d6ccf9 chore(codify): prism-0.6.0 lessons → loom proposal (#32)
b504b38 docs(workspace): /implement closure artefacts for prism-0.6.0 (#31)
78add91 release(prism-web): v0.6.0 — FilterBar + ColumnDef.field relaxation (#30)
73e8c90 feat(filter-bar): FilterBar molecule (#24 part 2) (#29)
1b89205 feat(filter-bar): useFilterBarState hook (#24 part 1) (#28)
b509b22 feat(data-table): relax ColumnDef.field for synthetic computed columns (#25) (#27)
# → Two features shipped: #24 FilterBar + #25 ColumnDef.field. Third gap deferred per analysis 03. Matches brief.

# 2. Token-claim verification — does any filter-bar.* token exist?
$ grep -rn "filter-bar\.default\|filter-bar\.search\|filter-bar\.dimension\|filter-bar\.viewMode" web/src/ specs/ compiler/
specs/components/filter-bar.yaml:156:    - filter-bar.default.bg     [...]
specs/components/filter-bar.yaml:168:    - filter-bar.viewMode.active_bg
# (only inside the spec file declaring them — zero implementations)

# 3. CSS-var sweep — what tokens does FilterBar actually consume?
$ grep -n "var(--" web/src/molecules/filter-bar/filter-bar.tsx | wc -l
44+
$ grep -n "var(--" web/src/molecules/filter-bar/filter-bar.tsx | head -3
119:    gap: "var(--prism-spacing-3, 12px)",
131:        "var(--prism-color-surface-default, var(--color-surface-default, #ffffff))",
141:  gap: "var(--prism-spacing-3, 12px)",
# → All actual tokens are --prism-*, none of the 14 filter-bar.* tokens

# 4. Render-callsite migration credibility check
$ grep -rln "render:" web/src/ | grep -v "test\|stories\|__tests__\|__stories__\|engines/data-table"
# (empty — zero ColumnDef.render call sites in real consumer code in this repo;
#  all 5 callsites are in tests + stories. Migration claim "MOST CALL SITES
#  already use value ?? defaultValue" is unverifiable inside this repo.)

# 5. ServerDataSource removal verification (analysis 03 BLOCKING-1 stale claim)
$ grep -rn "ServerDataSource" web/src/ specs/ | head -5
web/src/engines/data-table/types.ts:153: * `ServerDataSource<T>` was removed in 0.3.0.
specs/components/data-table.yaml:31: BREAKING: ServerDataSource removed [...]
# → Confirmed removed; analysis 03 STALE classification is correct.

# 6. filterDimensions vapourware claim — is it really a property?
$ grep -rn "filterDimensions" web/src/
web/src/engines/data-table/types.ts:303: * `filterDimensions` (faceted filter UI) and `subscribe` (live updates)
# (single match, in a JSDoc — NOT a property declaration; spec says "declared
#  in the type" which is inaccurate)

# 7. Storybook runner check
$ grep -i "storybook" web/package.json
# (empty — no Storybook tooling installed)

# 8. BLOCKING-1 label disambiguation
$ grep -n "BLOCKING-1" workspaces/prism-0.6.0/01-analysis/03-third-gap-investigation.md web/CHANGELOG.md workspaces/prism-0.6.0/02-plans/01-prism-0.6.0-design.md
03-third-gap-investigation.md:16:| **BLOCKING-1: ServerDataSource never invoked** ... STALE
03-third-gap-investigation.md:53:- Form custom field render escape hatch (BLOCKING-1 in M-01; FormAdapter scope)
03-third-gap-investigation.md:61:2. **Form custom field render (BLOCKING-1)** — ...
01-prism-0.6.0-design.md:152:- Form engine changes (BLOCKING-1, BLOCKING-2)
CHANGELOG.md:61:- Form custom field render escape hatch (`BLOCKING-1` from migration findings ...)
CHANGELOG.md:337:[...] M-02 / M-03 BLOCKING-1 finding. The deprecated `ServerDataSource` shape
# → Same label, two referents — confirmed inconsistency.

# 9. Synthetic-sortable runtime guard exists and is wired
$ grep -n "assertNoSyntheticSortable" web/src/engines/data-table/use-data-table.ts
24: * Assert that no column declared sortable: true is a synthetic field
43:function assertNoSyntheticSortable<T extends DataTableRow>(
274:    assertNoSyntheticSortable(columns, firstRow);   # ← actual call site
751: * field is rejected upstream by assertNoSyntheticSortable; this
# → Defined and called from useDataTable. Real wiring.

# 10. Test count for 0.6.0 surfaces
$ grep -c "it(\|test(" web/src/molecules/filter-bar/__tests__/* web/src/engines/data-table/__tests__/synthetic-fields.test.tsx
web/src/engines/data-table/__tests__/synthetic-fields.test.tsx:6
web/src/molecules/filter-bar/__tests__/filter-bar.test.tsx:14
web/src/molecules/filter-bar/__tests__/use-filter-bar-state.test.ts:9
# → 29 tests across the 0.6.0 surface. Real coverage.

# 11. Storybook story interactivity check (not just static prop pass-through)
$ grep -n "fireEvent\|useState" web/src/molecules/filter-bar/__stories__/filter-bar.stories.tsx | head -5
29:import { useState, type ReactNode } from "react";
212:  const [view, setView] = useState<string>("grid");
# → Stories are stateful (real useState + filtered arrays). Demonstrate the feature, not just render it.

# 12. __rowType phantom omission verification
$ grep -n "__rowType\|return {" web/src/molecules/filter-bar/use-filter-bar-state.ts
96:   * input shape). Always undefined at runtime.
98:  readonly __rowType?: T;
191:  return {
# → Type declared at 98; return literal at 191 omits the key entirely
#   (not even __rowType: undefined). Phantom is type-only.
```

---

## Verdict

`CONVERGED` (0 CRIT, 0 HIGH, 4 MEDIUM, 4 LOW).

The two-feature 0.6.0 deliverable matches the brief; the code is real, tested, and the storybook scaffolds plausibly demonstrate consumer shapes. Findings cluster in the **secondary spec/CHANGELOG layer** — phantom token namespace, prospective LOC headline, label disambiguation, runtime/spec phantom-field gap. Not blocking adoption; recommend bundling into 0.6.1.

---

## Approach summary (<100 words)

Read brief 0001 + analyses 01/02/03 + design plan 01 + CHANGELOG + filter-bar.yaml + 05m-0.6.0-additions.md + 3 storybook files + 4 journal entries. Mechanically swept (a) `filter-bar.*` token claim against code, (b) `filterDimensions` vapourware claim, (c) ServerDataSource removal, (d) `__rowType` phantom runtime presence, (e) `BLOCKING-1` label uniqueness across workspace, (f) Storybook runner installation, (g) render-callsite count for migration claim, (h) test counts, (i) git log for 0.6.0 commit cohort. Cross-checked CHANGELOG against actual file shape (e.g. 2200-line spec already split by #35).
