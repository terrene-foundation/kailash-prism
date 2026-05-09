# /redteam Round 2 — Security Review of Prism 0.6.0 (post-fix)

**Scope:** Re-run of Round 1's 9 mechanical sweeps against the post-fix working tree (commit base `78add91` + uncommitted Round-1-fix patches).
**Audited surface:** Same 8 source files + 2 story files + spec/CHANGELOG + 2 test files.
**Bar:** OWASP Top 10 (`rules/security.md`); zero-tolerance Rule 2 for ship-mocks; reviewer mechanical sweeps per `rules/agents.md`.
**Role:** Read-only; no edits.

---

## Verdict

**CONVERGED** — 0 CRITICAL, 0 HIGH, 0 MEDIUM, 0 LOW. Round 1 MEDIUMs M-1 (RT-PHANTOM) and M-2 (SEARCHPLACEHOLDER) verified RESOLVED. The fixes are surgical (≤6 LOC across 3 files), introduce no new failure modes, and the same 9 sweeps now pass cleanly.

This is the second consecutive clean round on convergence-blocker criteria (CRIT/HIGH); the prior round had 2 MED + 6 LOW polish items, all of which are either resolved this round or correctly deferred per Round-1 aggregate disposition.

---

## Status of Round 1 findings

| ID | Class | Status | Evidence |
|----|-------|--------|----------|
| **M-1 (RT-PHANTOM)** | type/runtime drift | **RESOLVED** | `use-filter-bar-state.ts:99` declares `readonly __rowType?: T \| undefined;`; return literal at `:198` includes `__rowType: undefined`. Both surfaces agree: `("__rowType" in result) === true` after fix. Spec at `specs/components/filter-bar.yaml:88` updated to describe the corrected runtime contract. |
| **M-2 (SEARCHPLACEHOLDER)** | UX null-handling | **RESOLVED** | `filter-bar.tsx:293` — `const ariaLabel = placeholder?.trim() \|\| "Search";` replaces the `placeholder ?? "Search"` form. Empty-string AND all-whitespace placeholders correctly fall back to `"Search"` because `"".trim() \|\| "Search"` and `"   ".trim() \|\| "Search"` both evaluate to `"Search"` (trim returns empty string → falsy → `\|\|` selects fallback). |
| **M-3 (STALE-CAST)** | type contract drift | **RESOLVED** | `data-table-root.tsx:612` — cast `as T[keyof T] \| undefined` is gone; the call site is now `col.render(value, row)`, mirroring `data-table-body.tsx:389`. |
| **MED-4/5/6 + LOW-1/4/5/6** | spec/CHANGELOG/story polish | **OUT OF SECURITY-REVIEW SCOPE** (covered by reviewer + value-auditor agents in Round 1; non-security-impacting per Round-1 aggregate). |

---

## Verification of fix correctness (M-1)

Per task: confirm `("__rowType" in result) === true` after the fix.

The hook return literal at `use-filter-bar-state.ts:192–199` is:

```ts
return {
  search,
  setSearch,
  filters,
  setFilter,
  options,
  __rowType: undefined,
};
```

The `in` operator returns `true` when the property is present on the object regardless of value (per ECMA-262 §13.10.1). Because `__rowType: undefined` is an *own enumerable property* (object-literal initializer), `("__rowType" in result)` evaluates to `true`. This holds even though the value is `undefined`.

The type declaration `readonly __rowType?: T | undefined` is the canonical TypeScript form for a property that is **always-present-but-may-be-undefined** under `exactOptionalPropertyTypes: true`. Without the explicit `| undefined`, `exactOptionalPropertyTypes` would forbid assigning `undefined` to an optional `?` field. The type and runtime now agree.

**No consumer breakage from `__rowType: undefined`:**

- The 8 test cases in `web/src/molecules/filter-bar/__tests__/use-filter-bar-state.test.ts` access `result.current.search`, `.setSearch`, `.filters`, `.setFilter`, `.options` only — none enumerate keys or destructure `__rowType`. No spread-into-state pattern observed.
- The barrel re-export at `web/src/index.ts:31–38` exports the type but no consumer in this repo destructures the result.
- Object-spread `{...result}` would now carry `__rowType: undefined` — semantically identical to the prior "field absent" behavior for any consumer that reads `obj.__rowType` (still `undefined`).

---

## Verification of fix correctness (M-2)

Per task: confirm empty/whitespace placeholders correctly fall back to `"Search"` aria-label.

The fixed line at `filter-bar.tsx:293`:

```ts
const ariaLabel = placeholder?.trim() || "Search";
```

Edge-case enumeration:

| Input | `placeholder?.trim()` | `... || "Search"` | aria-label |
|-------|-----------------------|-------------------|------------|
| `undefined` (prop omitted) | `undefined` (optional chain short-circuits) | `"Search"` (undefined is falsy) | `"Search"` ✓ |
| `null` | `null?.trim()` → `undefined` | `"Search"` | `"Search"` ✓ |
| `""` (empty) | `""` | `"Search"` (empty string is falsy) | `"Search"` ✓ |
| `"   "` (all whitespace) | `""` (trim removes all) | `"Search"` | `"Search"` ✓ |
| `"  Search clients…  "` | `"Search clients…"` | `"Search clients…"` | `"Search clients…"` ✓ |
| `"Search clients…"` | `"Search clients…"` | `"Search clients…"` | `"Search clients…"` ✓ |

Note: the `placeholder` prop is passed UNCHANGED to the input element's `placeholder` attribute on line 301. This is intentional — the visible placeholder retains the consumer's literal value (whitespace and all), while the screen-reader `aria-label` always carries a non-empty fallback. This preserves the visual contract while fixing the a11y contract. No regression.

A regression test exists at `filter-bar.test.tsx:186–191`:

```tsx
it("falls back to 'Search' aria-label when no placeholder is provided", () => {
  render(<FilterBar search="" onSearchChange={vi.fn()} />);
  const input = screen.getByRole("searchbox", { name: "Search" });
  expect(input).toBeDefined();
});
```

This covers the `undefined` case. The empty-string and all-whitespace cases are not explicitly covered by a test, but the fix is sufficiently mechanical (one expression) that the existing test plus the manual edge-case audit above is adequate. (LOW finding deferred — see "Observations" below.)

---

## New findings

_None._ Re-running the 9 sweeps surfaced zero new CRIT/HIGH/MED/LOW issues. The fixes themselves introduce no new attack surface, no new error-handling paths, and no new dependencies.

---

## Mechanical sweeps re-run (post-fix state)

Each sweep executed against the working-tree copy of the 8 source files + 2 stories + 2 test files, mirroring Round 1's method (file-content-resident grep equivalents via Read tool).

### Sweep 1 — XSS sinks (`dangerouslySetInnerHTML`, raw HTML interpolation)

**Method:** Searched in-memory copies of all 8 changed files for `dangerouslySetInnerHTML`, `innerHTML =`, `outerHTML =`, `document.write(`.

**Files inspected:**
- `web/src/engines/data-table/types.ts`
- `web/src/engines/data-table/use-data-table.ts`
- `web/src/engines/data-table/data-table-body.tsx`
- `web/src/engines/data-table/data-table-mobile.tsx`
- `web/src/engines/data-table/data-table-root.tsx`
- `web/src/molecules/filter-bar/filter-bar.tsx`
- `web/src/molecules/filter-bar/use-filter-bar-state.ts`
- `web/src/molecules/filter-bar/__stories__/filter-bar.stories.tsx`
- `web/src/molecules/filter-bar/__stories__/filter-bar-with-data-table.stories.tsx`

**Results:** ZERO occurrences of any HTML-injection sink.

**Verdict:** PASS. All user-controlled values render through React's text-node path (`{value}`, `{String(...)}`).

### Sweep 2 — Code-evaluation sinks on user input

**Method:** Searched all 8 files for `eval(`, `new Function(`, `new RegExp(`, `setTimeout(<string>`, `setInterval(<string>`, `Function(`.

**Results:** ZERO `eval`, `new Function`, `setTimeout(string)`, `setInterval(string)`. The sole `RegExp` literal in scope (from `sanitize-href.ts:18`) is the static `SAFE_HREF_SCHEME = /^(?:https?:|mailto:|tel:|[/?#])/i` — a compile-time literal, no user input.

The M-3 fix did not introduce any new sinks. Line 612 of `data-table-root.tsx` calls `col.render(value, row)` — `col.render` is a typed callback supplied by the consumer (`(v: unknown, row: T) => ReactNode`); React handles its return value through normal JSX rendering.

**Verdict:** PASS.

### Sweep 3 — Synthetic-field error message contents

**Method:** Re-read `assertNoSyntheticSortable` (use-data-table.ts:43–59).

**Results:** Single template at lines 51–56:

```
column "${col.field}" has sortable: true but is a synthetic field
(no row[field] lookup). Synthetic columns MUST set sortable: false.
To sort by a derived value, pre-compute it into the row data before
passing to DataTable.
```

Only `col.field` (consumer-supplied per `types.ts:49`) is interpolated. No `firstRow` value, no other column data, no adapter state.

**Verdict:** PASS (unchanged from Round 1).

### Sweep 4 — Search input → eval/regex/Function

**Method:** Re-traced every callsite of `state.search`, `globalSearch`, `onSearchChange`, `setSearch`, `handleGlobalSearch`.

**Results:**
- `filter-bar.tsx:303–305` — `onChange((e) => onChange(e.target.value))` direct string passthrough.
- `filter-bar.tsx:282–289` — `Escape` handler calls `onChange("")` (empty string only).
- `filter-bar.tsx:293` — `placeholder?.trim() || "Search"` — `String.prototype.trim` is pure, no dynamic code path. **Fix did not introduce any sink.**
- `use-data-table.ts:404–410` — `globalSearch.toLowerCase().includes(query)` (pure string membership).

**Verdict:** PASS. Search input + new placeholder `.trim()` flow into pure string operations; no eval/regex/Function sink.

### Sweep 5 — Storybook hardcoded credentials / API keys / PII

**Method:** Re-read both story files; searched for `password`, `api_key`, `secret`, `token`, `Bearer`, real-looking emails, internal hostnames, IPs.

**Results:**
- `filter-bar.stories.tsx`: zero emails, zero credentials. Sample data is `{id: "p1", month: "2026-01", amount: 5000}`.
- `filter-bar-with-data-table.stories.tsx:115–189`: 8 emails, ALL `<firstname>@example.com` (RFC 2606 reserved domain). Names are alliterative placeholders. Employee IDs are `EMP-001` through `EMP-008`.

No new story content was added in Round 1 fixes that would change this.

**Verdict:** PASS (unchanged).

### Sweep 6 — `useFilterBarState` consumer-callback closure leakage

**Method:** Re-read the post-fix hook body (use-filter-bar-state.ts:129–200).

**Results:**
- Line 151: `out[k] = withAllPrefix(fn(data));` — callback receives only `data`.
- `withAllPrefix` (lines 106–113) consumes the array via `Array.from(new Set(...))` + `.sort()` — pure.
- The new `__rowType: undefined` field at line 198 is a literal `undefined`; it does not capture or expose any closure state. It is statically `undefined` regardless of `T`.
- No `setRawFilters`, `options`, `rawFilters`, `initial` reach the user callback.

**Verdict:** PASS. The fix did not change the closure contract.

### Sweep 7 — ARIA roles/contracts (chip-row "radiogroup", view-mode "radiogroup")

**Method:** Re-read `DimensionChips` (filter-bar.tsx:347–405) and `ViewModeToggle` (filter-bar.tsx:411–467); cross-checked against WAI-ARIA Radio Group Pattern.

**Pattern compliance (unchanged):**
- `<div role="radiogroup" aria-label={dimension.label}>` ✓
- Each chip: `<button role="radio" aria-checked={active} tabIndex={active ? 0 : -1}>` ✓ (roving tabindex correct).
- ArrowLeft / ArrowRight cycle and move focus to new active chip ✓.
- Click invokes `dimension.onChange(opt)` ✓ (same handler as keyboard).
- ViewModeToggle uses `aria-label="View mode"` on group + `aria-label={opt}` on each radio.

**SearchInput aria-label fix (M-2):** the searchbox now always has a non-empty `aria-label` regardless of placeholder shape. This *strengthens* the a11y contract. `<input role="searchbox" aria-label={ariaLabel}>` where `ariaLabel` is guaranteed non-empty per Sweep 4's edge-case enumeration.

**Verdict:** PASS. Radiogroup pattern correctly implemented; searchbox a11y contract strengthened by M-2 fix.

### Sweep 8 — Lifted typed casts ("latent unguarded reads" claim)

**Method:** Re-read cast sites in `data-table-body.tsx`, `data-table-mobile.tsx`, `data-table-root.tsx`.

**Results:**
- `data-table-body.tsx:382` — `const value = (row as Record<string, unknown>)[col.field];` — typed `Record` cast.
- `data-table-mobile.tsx:159` — `const rowRecord = row as Record<string, unknown>;` (lifted once per render); used at lines 185, 186, 192, 193, 205, 206. Same boundary.
- `data-table-root.tsx:588` — `const value = (row as Record<string, unknown>)[col.field];` — typed `Record` cast (within `DataTableCardBody`).
- `data-table-root.tsx:612` — `col.render ? col.render(value, row) : String(value ?? "")` — **the M-3 fix removed the `as T[keyof T] | undefined` cast**, restoring parity with `data-table-body.tsx:389`.
- `use-data-table.ts:407, 420, 760, 761` — all use `Record<string, unknown>` cast at the boundary.

The M-3 fix INCREASED consistency: 4 of 4 `col.render(value, row)` call sites across `data-table-body.tsx`, `data-table-mobile.tsx`, and `data-table-root.tsx` now use the same `value: unknown` pattern. No cast widening to `any`. No new boundary holes.

**Verdict:** PASS. The fix is a strict improvement to the lifted-cast contract.

### Sweep 9 — Stub/scaffold/mock markers in shipping code (zero-tolerance Rule 2)

**Method:** Re-searched all 8 source files + 2 stories for `TODO`, `FIXME`, `HACK`, `STUB`, `XXX`, `MOCK_`, `FAKE_`, `DUMMY_`, `Math.random`, `mock` (case-insensitive).

**Results:**
- Zero `TODO`/`FIXME`/`HACK`/`STUB`/`XXX`/`MOCK_`/`FAKE_`/`DUMMY_` in production source files.
- Zero `Math.random` in production source files.
- The string "mock" appears only in docstring/narrative (e.g., `use-filter-bar-state.ts:7` "absorbs two recurring consumer patterns"). Story files use `samplePayslips()`, `sampleDocuments()`, `sampleClients()`, `sampleEmployees()` — storybook fixtures, exempt per zero-tolerance Rule 2 ("Test files excluded").
- The post-fix `__rowType: undefined` is **not** a stub: it is the canonical materialization of a TS phantom-field type-param symmetry pattern (documented at `use-filter-bar-state.ts:93–98` and `specs/components/filter-bar.yaml:88`). Stub markers are zero.

**Verdict:** PASS. No production stubs.

---

## Observations (non-findings — context for next round)

1. **Round 1 was already very clean**; the polish items were spec/narrative drift, not code defects. Round 2 confirms the codebase has zero security regressions and the fixes resolved the only two code-level findings cleanly.
2. **No regression test added for empty-string / all-whitespace placeholder.** Existing test at `filter-bar.test.tsx:186–191` covers `undefined` case; empty/whitespace cases are covered by the manual audit in this report. A future regression test (~6 LOC) would be belt-and-suspenders. **Disposition:** below LOW threshold; not blocking.
3. **`__rowType: undefined` adds one enumerable field** to `Object.keys(result)` and `JSON.stringify(result)`. No consumer in this repo enumerates the keys or serializes the result, so this is invisible in practice. Documented in `specs/components/filter-bar.yaml:88` per `spec-accuracy.md` Rule 1 (citation resolves to working code).

---

## Approach summary

Re-ran Round 1's 9 mechanical sweeps against the post-fix tree. Verified M-1 (`__rowType` field present at runtime, type/runtime now agree) and M-2 (`placeholder?.trim() || "Search"` correctly handles `undefined`/`null`/`""`/all-whitespace). M-3 confirmed: stale `T[keyof T]` cast removed at `data-table-root.tsx:612`, parity with `data-table-body.tsx:389` restored. No new XSS, eval, closure-leak, ARIA, or stub findings. Fixes are surgical (~6 LOC across 3 files) and strictly improve consistency.
