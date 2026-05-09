# /redteam Round 1 — Security Review of Prism 0.6.0

**Scope:** PRs #27, #28, #29, #30 (M01–M04), already merged to main.
**Audited surface:** `web/src/engines/data-table/{types,use-data-table,data-table-body,data-table-mobile}.{ts,tsx}` + `web/src/molecules/filter-bar/**`.
**Bar:** OWASP Top 10 (`rules/security.md`); zero-tolerance Rule 2 for ship-mocks; reviewer mechanical sweeps per `rules/agents.md`.
**Role:** Read-only; no edits.

---

## Findings

### CRITICAL

_None._

### HIGH

_None._

### MEDIUM

#### M-1 — `useFilterBarState` returns object whose declared `__rowType?: T` field is omitted at runtime (interface lies about runtime shape)

- **File:** `web/src/molecules/filter-bar/use-filter-bar-state.ts:98`, `:191-198`
- **Class:** Spec-accuracy / API-contract drift (not a memory-safety issue, but consumer-trust class).
- **Reproduction:**
  - `UseFilterBarStateResult<T, TFilters>` declares `readonly __rowType?: T;` (line 98) with a comment promising "Always `undefined` at runtime".
  - The hook's actual `return { search, setSearch, filters, setFilter, options };` on lines 191–197 omits `__rowType` entirely (not even set to `undefined`).
  - Any consumer asserting `"__rowType" in result` would get `false`, contradicting the docstring at line 96.
  - The filter-bar.yaml spec at `specs/components/filter-bar.yaml:88` calls this a "load-bearing phantom field" that "M03/M04 must NOT remove or rename" — but it has been functionally removed at runtime; only the type signature carries it.
- **Why MEDIUM, not HIGH:** Pure type-system phantom; no runtime/security impact. Surfaces only as spec-accuracy drift per `rules/spec-accuracy.md` Rule 1 (every cited symbol resolves) — the spec promises `readonly __rowType?: T` is on the runtime object, but it isn't. Recommend either (a) explicitly include `__rowType: undefined` in the return literal so the field is observable, or (b) update the docstring/spec to say "type-only phantom, never present at runtime."
- **Recommendation:** Reconcile docstring/spec with runtime in next minor. Not blocking 0.6.0.

#### M-2 — `FilterBar` SearchInput places user-supplied placeholder string directly into `aria-label`

- **File:** `web/src/molecules/filter-bar/filter-bar.tsx:290` (`const ariaLabel = placeholder ?? "Search";`)
- **Class:** A11y assistive-tech soundness, not a XSS surface (React escapes attribute values).
- **Reproduction:** Consumer passes `searchPlaceholder="Search clients <by name>"` → the `<input aria-label="Search clients <by name>" placeholder="..."/>` is rendered. React safely encodes the attribute; no XSS. However, if the placeholder is empty string `""`, `ariaLabel = "" ?? "Search"` evaluates to `""` (NOT the fallback) because `??` only catches `null`/`undefined`; the search input would announce as "blank" to screen readers.
- **Why MEDIUM, not HIGH:** Empty-string placeholder is not a documented contract — spec says default `"Search…"` (filter-bar.yaml:46). However, a consumer passing `searchPlaceholder=""` defeats the fallback. Should be `placeholder?.trim() || "Search"` or spec-block empty strings.
- **Recommendation:** Tighten the fallback to `placeholder?.trim() ? placeholder : "Search"` in next minor; non-blocking.

### LOW

#### L-1 — `view-mode` toggle uses raw mode key as `aria-label` without translation/sanitization

- **File:** `web/src/molecules/filter-bar/filter-bar.tsx:448` (`aria-label={opt}`)
- **Class:** A11y i18n drift; React attribute encoding prevents XSS.
- **Reproduction:** A consumer passes `viewMode={{ options: ["grid", "list"], ... }}` → buttons announce as "grid" / "list". With non-English labels (e.g. `["lưới", "danh sách"]`) screen readers receive the raw string, no localized fallback. No injection vector — React escapes.
- **Recommendation:** Document that `viewMode.options[]` strings ARE the screen-reader announcement (already implicit in spec line 130). Non-blocking.

#### L-2 — `assertNoSyntheticSortable` error message echoes consumer-supplied `col.field` literally

- **File:** `web/src/engines/data-table/use-data-table.ts:51-56`
- **Class:** Confirms non-leak (positive finding).
- **Reproduction:** Audit asks "does the synthetic-field error message leak any data not provided by the consumer?" Answer: NO. The error template at line 52-56 echoes only `col.field` (the consumer-supplied identifier) — never `firstRow` contents, never adapter state, never any other column. Throw is via `new Error(...)`; React's error boundary or browser console would render text-only. Confirmed safe.
- **Recommendation:** No action needed. Documented here for audit-trail completeness.

#### L-3 — `useFilterBarState.derive` callback runs in consumer's lexical scope; no closure-leak surface

- **File:** `web/src/molecules/filter-bar/use-filter-bar-state.ts:148-150`
- **Class:** Confirms non-leak (positive finding).
- **Reproduction:** Consumer passes `derive[K]: (rows) => string[]` callbacks; the hook invokes `fn(data)` at line 150 with ONLY `data` (consumer's own input). The callback receives no `rawFilters`, `setRawFilters`, `options`, `initial`, or any other internal hook state. Return value is fed through `withAllPrefix` (line 105–112) which calls `Array.from(new Set(values))` then `.sort()` — both pure. No `this` binding, no internal-state ref leakage. The callback CAN throw; the throw propagates through `useMemo` and React error boundary handles it normally.
- **Recommendation:** No action needed. Confirmed safe.

#### L-4 — Storybook sample data uses `@example.com` placeholder addresses; no realistic-looking PII

- **Files:** `web/src/molecules/filter-bar/__stories__/filter-bar.stories.tsx:57-79` (no emails); `filter-bar-with-data-table.stories.tsx:114-188`.
- **Class:** Confirms safe-to-publish (positive finding).
- **Evidence:** All emails follow `<firstname>@example.com` (RFC 2606 reserved domain — guaranteed safe). No API keys, no tokens, no real customer data, no internal hostnames. Names are alliterative placeholders ("Alice Anderson", "Bob Brown", etc.) typical of demo fixtures. ID format `"EMP-001"` carries zero identifying info.
- **Recommendation:** No action. Stories are publishable.

#### L-5 — DataTable client-side global-search builds a lower-cased query for `String.includes` (no eval/regex/Function constructor)

- **File:** `web/src/engines/data-table/use-data-table.ts:403-411`
- **Class:** Confirms non-injection (positive finding).
- **Evidence:** `globalSearch.toLowerCase()` then `.includes(query)` on each cell. Pure string membership — no `new RegExp(query)` (which would be ReDoS-vulnerable on `(a+)+$` patterns), no `eval`, no `Function`. `assertNoSyntheticSortable` likewise uses only `field in firstRow` (line 50) and `String.toLowerCase` — no dynamic code paths.
- **Recommendation:** No action. Search input does not flow into any code-evaluating sink.

#### L-6 — DataTableBody `<a href={sanitizeHref(...)}>` chain reuses the existing 0.5.x sanitizer (allowlist of `https?:|mailto:|tel:|[/?#]`)

- **File:** `web/src/engines/data-table/data-table-body.tsx:514`, sanitizer at `web/src/engines/data-table/sanitize-href.ts:18-27`
- **Class:** Confirms continuity (positive finding).
- **Evidence:** The lifted-cast refactor in M01 did not touch the row-actions `href` path. `sanitizeHref` still strips whitespace and rewrites non-allowlisted schemes (e.g. `javascript:`, `data:`, `vbscript:`) to `#`. No regression.
- **Recommendation:** No action.

---

## Mechanical sweeps run

These are file-content-resident checks executed by reading the files directly (the agent harness available here is Read-only — no Bash). Findings cite exact `file:line` and quoted line text where they appear.

### Sweep 1 — XSS sinks (`dangerouslySetInnerHTML`, raw HTML interpolation)

**Question:** Any `dangerouslySetInnerHTML`, `eval`, `new Function`, raw HTML string interpolation in the four 0.6.0 changed files?

**Method:** Read full text of each of the 5 changed source files + 2 story files. Searched in-memory for the literal substrings.

**Results:** ZERO occurrences across:

- `web/src/engines/data-table/types.ts` (interfaces only — no JSX)
- `web/src/engines/data-table/use-data-table.ts` (state hook — no JSX)
- `web/src/engines/data-table/data-table-body.tsx`
- `web/src/engines/data-table/data-table-mobile.tsx`
- `web/src/molecules/filter-bar/filter-bar.tsx`
- `web/src/molecules/filter-bar/use-filter-bar-state.ts`
- `web/src/molecules/filter-bar/__stories__/filter-bar.stories.tsx`
- `web/src/molecules/filter-bar/__stories__/filter-bar-with-data-table.stories.tsx`

**Verdict:** PASS. All user-controlled values render via React's text-node path (`{value}`, `{String(...)}`) which auto-encodes; no innerHTML sinks introduced.

### Sweep 2 — Code-evaluation sinks on user input (`eval`, `Function`, `new RegExp`)

**Method:** Read all 8 files; searched for `eval(`, `new Function`, `new RegExp`, `setTimeout(string)`, `setInterval(string)`.

**Results:** ZERO occurrences. The only `RegExp` literal in scope is the static `SAFE_HREF_SCHEME = /^(?:https?:|mailto:|tel:|[/?#])/i` at `sanitize-href.ts:18` (compile-time literal, not user-controlled).

**Verdict:** PASS. User search input flows only into `String.prototype.toLowerCase().includes()` (use-data-table.ts:403-411) — no dynamic code path.

### Sweep 3 — Synthetic-field error message contents

**Method:** Read `assertNoSyntheticSortable` (use-data-table.ts:43-59); enumerated every interpolation (`${col.field}`).

**Results:** Single template at lines 52-56:

```
column "${col.field}" has sortable: true but is a synthetic field
(no row[field] lookup). Synthetic columns MUST set sortable: false.
To sort by a derived value, pre-compute it into the row data before
passing to DataTable.
```

The only interpolation is `col.field` (consumer-supplied per the type contract at types.ts:49). No `firstRow` value, no adapter state, no other column data.

**Verdict:** PASS (see L-2).

### Sweep 4 — Search input → eval/regex/Function

**Method:** Read all callsites of `state.search`, `globalSearch`, `onSearchChange`, `setSearch`, `handleGlobalSearch` across the 0.6.0 surface.

**Results:**

- `filter-bar.tsx:301` — `onChange((e) => onChange(e.target.value))` — direct string passthrough.
- `filter-bar.tsx:283-289` — `Escape` handler calls `onChange("")` — empty string only.
- `use-data-table.ts:404-410` — `globalSearch.toLowerCase()` + `String(val).toLowerCase().includes(query)` — no dynamic code.
- `use-data-table.ts:531-541` — `handleGlobalSearch(query)` either calls `onGlobalSearchChange?.(query)` or `setUncontrolledGlobalSearch(query)` — both string state.
- Story files filter via `String.includes` only.

**Verdict:** PASS. Search input is a pure string flowing into `Set/state`, never into a code-evaluating sink.

### Sweep 5 — Storybook hardcoded credentials / API keys / PII

**Method:** Read both story files (`filter-bar.stories.tsx`, `filter-bar-with-data-table.stories.tsx`) line by line; searched for `password`, `api_key`, `secret`, `token`, `Bearer`, real-looking emails, real phone numbers, internal hostnames, IP addresses.

**Results:**

- `filter-bar.stories.tsx`: zero emails, zero credentials. Sample data is `{id: "p1", month: "2026-01", amount: 5000}` — no PII.
- `filter-bar-with-data-table.stories.tsx:114-188`: 8 emails, ALL `<firstname>@example.com` (RFC 2606 reserved domain). Names are alliterative placeholders. No tokens, no keys, no internal infra references.

**Verdict:** PASS (see L-4). Stories are publishable.

### Sweep 6 — `useFilterBarState` consumer-callback closure leakage

**Method:** Read the hook body (use-filter-bar-state.ts:128-198); enumerated every place `derive[K]` is invoked. Checked what arguments are passed and what the callback can observe.

**Results:**

- Line 150: `out[k] = withAllPrefix(fn(data));` — callback receives only `data` (which is the consumer's own `input.data`).
- `withAllPrefix` (lines 105-112): `Array.from(new Set(values)); .sort(); …["All", ...unique]` — consumes the array, no callback re-invocation.
- No `setRawFilters`, no `options`, no `rawFilters`, no `initial` is passed into the user callback.
- The hook's internal `useState` setters (`setSearch`, `setRawFilters`) are exposed only via the explicit `setSearch` / `setFilter` returned-result fields — they are functions over closed-over React state, not refs into the hook's internals.

**Verdict:** PASS (see L-3). No closure-leak surface.

### Sweep 7 — ARIA roles/contracts (chip-row "radiogroup", view-mode "radiogroup")

**Method:** Read `DimensionChips` (filter-bar.tsx:344-402) and `ViewModeToggle` (filter-bar.tsx:408-464); cross-checked against WAI-ARIA Radio Group Pattern.

**Pattern compliance:**

- `<div role="radiogroup" aria-label={dimension.label}>` ✓ (line 374-375)
- Each chip: `<button role="radio" aria-checked={active} tabIndex={active ? 0 : -1}>` ✓ (lines 385-387) — roving tabindex correct.
- ArrowLeft / ArrowRight cycle and move focus to new active chip ✓ (lines 348-369). Uses `groupRef.current?.querySelectorAll('button[role="radio"]')` to focus the next button.
- Click invokes `dimension.onChange(opt)` ✓ (line 389) — same handler as keyboard.
- `dimension.label` rendered as a `<span>` adjacent to the radiogroup AND used as `aria-label` (line 375). The visible label is also inside the radiogroup div (line 378) — this is a minor double-announcement (the label appears as both `aria-label` and as accessible-name-via-text-content) but not a contract violation; screen readers prefer `aria-label`.
- ViewModeToggle uses `aria-label="View mode"` on the group + `aria-label={opt}` on each radio — same pattern, no violations.

**Verdict:** PASS. Radiogroup pattern correctly implemented for both chip dimension and view-mode toggle. Roving tabindex + arrow-key focus management both present.

### Sweep 8 — Lifted typed casts (CHANGELOG "latent unguarded reads" claim)

**Method:** Read the cast sites in `data-table-body.tsx` and `data-table-mobile.tsx`. Verified they use `Record<string, unknown>` (the documented boundary cast) and never widen to `any`.

**Results:**

- `data-table-body.tsx:382` — `const value = (row as Record<string, unknown>)[col.field];` — typed cast, no `any`.
- `data-table-mobile.tsx:159` — `const rowRecord = row as Record<string, unknown>;` (lifted once per render); used at lines 185, 186, 192, 193, 205, 206. Same `Record<string, unknown>` boundary.
- `use-data-table.ts:407, 420, 760, 761` — all use `Record<string, unknown>` cast at the boundary. Consistent pattern.

**Verdict:** PASS. The "latent unguarded reads" fix is internally consistent; no `any` smuggling.

### Sweep 9 — Stub/scaffold/mock markers in shipping code (zero-tolerance Rule 2)

**Method:** Searched for `TODO`, `FIXME`, `HACK`, `STUB`, `XXX`, `MOCK_`, `FAKE_`, `DUMMY_`, `Math.random`, `mock` (case-insensitive) in all 8 files.

**Results:**

- Zero `TODO`/`FIXME`/`HACK`/`STUB`/`XXX`/`MOCK_`/`FAKE_`/`DUMMY_` in the 0.6.0 source files.
- Zero `Math.random` in source files.
- The string "mock" appears only inside docstring/comment narrative (e.g., adapter doc-comments referring to "in-memory fixture" patterns) — never as a stub return value or fake-data generator.
- Story files contain `samplePayslips()`, `sampleDocuments()`, `sampleClients()`, `sampleEmployees()` — these are storybook fixtures and exempt per zero-tolerance Rule 2 ("Test files excluded").

**Verdict:** PASS. No production stubs.

---

## Verdict line

**CONVERGED** — 0 CRITICAL, 0 HIGH. Two MEDIUM findings (M-1 type-system phantom drift, M-2 empty-string placeholder fallback) and 6 LOW (4 confirmations + 2 minor a11y polish) are all non-blocking and recommended for the next minor.

---

## Summary of approach (<100 words)

Read all 8 source files from PRs #27–#30 plus the FilterBar barrel and href sanitizer. Performed 9 mechanical sweeps grounded in literal file-content reads: XSS sinks, code-evaluation sinks, error-message provenance, search-input flow, storybook PII/credential audit, hook-callback closure scope, ARIA radiogroup conformance, lifted-cast typing, and stub markers. No CRITICAL or HIGH findings: React's auto-encoding plus the existing 0.5.x `sanitizeHref` allowlist contain every user-controlled string; consumer-supplied `derive` callbacks receive only their own `data` argument; storybook fixtures use only RFC 2606 placeholder emails. Two MEDIUM polish items recorded for follow-up.
