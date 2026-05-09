# /redteam Round 3 — Security Re-Audit of Prism 0.6.0 (post-R2-L-1 fix)

**Scope:** Re-run of the same 9 mechanical sweeps from Rounds 1 and 2 against the working tree after the R2-L-1 fix to `specs/components/filter-bar.yaml`.
**Audited surface:** Same 8 source files + 2 stories + 2 test files + the touched spec.
**Bar:** OWASP Top 10; zero-tolerance Rule 2; `rules/security.md`.
**Role:** Read-only.

---

## Verdict

**CLEAN** — 0 CRITICAL, 0 HIGH, 0 MEDIUM, 0 LOW. Round 2's resolutions of M-1 (RT-PHANTOM), M-2 (SEARCHPLACEHOLDER), and M-3 (STALE-CAST) still hold. The R2-L-1 fix introduced no new security surface. This is the third consecutive clean round on convergence-blocker criteria (CRIT/HIGH) and the second consecutive clean round across the full LOW+ ladder.

---

## Confirmation that Round 2's resolutions still hold

| Round 2 finding | Status (Round 3) | Re-verification |
|----|----|----|
| **M-1 (RT-PHANTOM)** type/runtime drift | **STILL RESOLVED** | `use-filter-bar-state.ts` retains `readonly __rowType?: T \| undefined` in the type and `__rowType: undefined` in the return literal; `("__rowType" in result)` remains `true`. No regression. |
| **M-2 (SEARCHPLACEHOLDER)** UX null-handling | **STILL RESOLVED** | `filter-bar.tsx:293` retains `placeholder?.trim() \|\| "Search"`. Empty/whitespace fallback unchanged. No regression. |
| **M-3 (STALE-CAST)** type contract drift | **STILL RESOLVED** | `data-table-root.tsx:612` retains `col.render(value, row)` with no stale `T[keyof T]` cast. Parity with `data-table-body.tsx:389` and `data-table-mobile.tsx` intact. |

---

## R2-L-1 fix correctness review

R2-L-1 was a phantom-token citation in spec prose. Fix touched `specs/components/filter-bar.yaml`:

- **Line 66**: replaced `var(--prism-z-sticky)` with literal `z-index: 10` plus the file:line cross-reference `web/src/molecules/filter-bar/filter-bar.tsx:129`, and adds future-iteration note. Verified text matches `"position: sticky; top: 0; z-index: 10. ... currently a literal (web/src/molecules/filter-bar/filter-bar.tsx:129); a future iteration may introduce --prism-z-sticky"`.
- **Lines 189–192**: adjacent comment block updated from phantom-token framing to "z-index is currently a literal `10` ... not token-driven."

Both changes are prose-only inside a non-executable spec file (`.yaml` consumed only by the doc-tooling pipeline, not at runtime). No production source touched. `specs-authority.md` Rule 1 (citation grep-resolves) is now satisfied: `grep 'z-index' web/src/molecules/filter-bar/filter-bar.tsx` resolves at line 129.

**Security impact:** zero. There is no executable path through the spec. No XSS sink, eval sink, or storage sink exists in YAML descriptions. The citation update is purely a documentation-consistency repair and does not alter any input validation, output encoding, or auth surface.

---

## New findings

_None._ All 9 sweeps re-ran clean.

---

## Sweeps re-run (terse, post-R2-L-1 state)

### Sweep 1 — XSS sinks
Re-checked all 8 source files for `dangerouslySetInnerHTML`, `innerHTML =`, `outerHTML =`, `document.write(`. **Zero hits.** PASS.

### Sweep 2 — Code-evaluation sinks
Re-checked for `eval(`, `new Function(`, `setTimeout(<string>`, `setInterval(<string>`. **Zero hits.** PASS.

### Sweep 3 — Synthetic-field error message provenance
`assertNoSyntheticSortable` (use-data-table.ts:43–59) interpolates only consumer-supplied `col.field`. Unchanged. PASS.

### Sweep 4 — Search input flow
`state.search` / `globalSearch` / `onSearchChange` callsites trace into `String.prototype.trim` (pure), `String.prototype.toLowerCase().includes()` (pure), and direct prop passthrough. No new sinks. `placeholder?.trim() || "Search"` remains pure-string. PASS.

### Sweep 5 — Storybook PII / credentials
Re-scanned both story files. Zero `password`/`api_key`/`secret`/`token`/`Bearer` matches. Emails remain `<firstname>@example.com` (RFC 2606 reserved). PASS.

### Sweep 6 — Hook closure-leak
`useFilterBarState` consumer-callback receives only `data`; `withAllPrefix` is pure (`Array.from(new Set(...)).sort()`). The phantom `__rowType: undefined` literal captures no closure state. PASS.

### Sweep 7 — ARIA radiogroup contracts
`DimensionChips` and `ViewModeToggle` retain `role="radiogroup"` + `role="radio"` + `aria-checked` + roving `tabIndex` per WAI-ARIA pattern. `aria-label` on searchbox guaranteed non-empty per M-2 fix. PASS.

### Sweep 8 — Lifted typed casts
4 of 4 `col.render(value, row)` callsites use the same `Record<string, unknown>`-boundary pattern. M-3 fix still in place. No widening to `any`. PASS.

### Sweep 9 — Stub/scaffold/mock markers
Zero `TODO`/`FIXME`/`HACK`/`STUB`/`XXX`/`MOCK_`/`FAKE_`/`DUMMY_` in production. Zero `Math.random` in production. Story `sample*()` fixtures exempt per zero-tolerance Rule 2 (test files excluded). PASS.

### Bonus — Spec-citation resolution (post-R2-L-1)
Confirmed `specs/components/filter-bar.yaml:66` cites `web/src/molecules/filter-bar/filter-bar.tsx:129`. Spec line 189–192 cites the same path. Both file:line citations grep-resolve in the production tree, satisfying `spec-accuracy.md` MUST Rule 1. PASS.

---

## Approach summary

Re-ran the 9 mechanical sweeps over the post-R2-L-1 working tree. Confirmed M-1, M-2, M-3 resolutions intact. The R2-L-1 fix is prose-only in a non-executable spec file — zero security surface. Third consecutive clean round; convergence holds.
