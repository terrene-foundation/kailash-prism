# Red Team (Security): Arbor Wave 2

**Date:** 2026-04-14
**Reviewer:** security-reviewer
**Scope:** Arbor M-01/M-02/M-03 migration files + Prism M-04 engine changes (DataTable / Form).

## Summary

No CRITICAL findings. The migrations ship clean of hardcoded secrets, no `dangerouslySetInnerHTML` in React output paths, no `eval` / `new Function`, and no client-side SQL. The payslip print-to-PDF flow (M-02) is the highest-concentration PII surface and is well-mitigated: HTML is built via a manual `escapeHtml` helper, the new window is opened with `"noopener,noreferrer"` and an empty URL (so no payslip data traverses URL query strings or the opener chain), and the download flow uses a typed error class. Two HIGH findings concern PII console-logging at INFO level (structured payslip IDs flow to the browser console in production, and the CPF calculator outputs a `compute()` error path that re-throws raw backend error messages), and the 0.2.0 Prism tarball is referenced via a `file:` path with no integrity hash — a supply-chain weakness for anyone else building the same repo. Multiple MEDIUM findings cover CSP / popup handling, missing CSRF surface for the ServerDataSource adapter, and metric / log cardinality for multi-tenant payslip rows. Auth posture is strong: all `-prism` routes inherit `(dashboard)/layout.tsx` → `<ProtectedRoute>`, so the side-by-side migration does not widen the authenticated surface. Authorization (per-user, per-template, per-payslip) is delegated to the arbor backend and not re-audited here — see "Auth/authz per new route" for the residual risk.

## CRITICAL findings

**NONE.**

## HIGH findings

### H1. PII fields console-logged at INFO in production (payslips datasource)

**File:** `/Users/esperie/repos/terrene/contrib/arbor/apps/web/src/lib/prism-payslips-datasource.ts` (lines 129, 142, 158, 379, 390, 403, 413)

Every fetch and every per-payslip download emits a `console.info` with `payslip_id=<id>` at INFO level. Fields logged include `count`, `payslip_id`, `latency_ms`. The row body (gross, net, CPF) is NOT logged, which is good — but the arbor `payslip_id` plus the signed-in user context in the browser is a reliable join key onto compensation data. In browser-side logging, any third-party script (analytics, error-reporting SDK, tag manager) with access to the console stream can correlate `payslip_id` to user and, if it also sees any page DOM, reconstruct compensation. Equivalent server-side log aggregators (Datadog browser RUM, Sentry breadcrumbs) forward console.info by default.

Per `rules/observability.md` §7 (bulk ops) and §8 (schema-revealing field names at DEBUG only), PII-adjacent identifiers should not be at INFO. These are schema-adjacent identifiers in a compensation context.

**Fix:**

1. Downgrade the `fetch.start` / `fetch.ok` / `download.start` / `download.ok` lines from `console.info` to `console.debug`, or route them through a structured logger that is disabled in production unless explicitly enabled.
2. For the `download.fetch_error` path, hash the payslip ID (e.g. first 8 chars of SHA-256) before logging.
3. Add a comment anchoring the choice to `rules/observability.md` §8 so the next refactor does not silently re-escalate the level.

### H2. Backend error messages re-thrown verbatim to users

**Files:**
- `calculators-prism/[type]/page.tsx` lines 60-66 (handleSubmit re-throws backend error → Form renders `{state.submitError}` verbatim via `form-root.tsx:245`)
- `my-payslips-prism/page.tsx` lines 46-50 (`err.message` surfaced directly)
- `documents-prism/page.tsx` lines 244-249 (same pattern)

If `calculatorsApi.cpf` returns a 500 with a verbose error body (e.g. `"violates check constraint on table users_cpf_contributions..."`), the UI renders the raw string. This is a reflection / information-disclosure vector: backend schema names, SQL errors, and internal stack hints leak into an HR calculator's error banner. The payslip datasource goes further — it surfaces `err.message` into the page error state, and any 4xx/5xx body from `/payroll/my-payslips` (which may contain Django/FastAPI stack traces in dev or improperly-configured prod) flows directly to the user.

**Fix:** Replace the raw `err.message` in the UI banner with a user-safe string. Log the detailed message to console.debug for operator debugging. Pattern used by M-02's `PayslipDownloadBlockedError` (typed error class with pre-composed user-safe message) is the template; extend it to the generic fetch error path.

### H3. Prism 0.2.0 tarball referenced by path with no integrity hash

**File:** `/Users/esperie/repos/terrene/contrib/arbor/apps/web/package.json` line 15

```json
"@kailash/prism-web": "file:../../../../../../../../tmp/kailash-prism-web-0.2.0.tgz",
```

Three issues:

1. `/tmp/kailash-prism-web-0.2.0.tgz` is a machine-local path. On any other developer's machine or the CI runner, `npm install` will fail or silently resolve to a stale version if a tarball with that name happens to exist.
2. No SRI / integrity hash — if an attacker gains write access to `/tmp`, they can substitute a malicious tarball on the next `npm install` and inject arbitrary code into every `-prism` route. Because the Prism engine is loaded into the dashboard layout, a poisoned tarball gets full access to the authenticated session, the auth token cookies (via `document.cookie` if the token is not HttpOnly), and every payslip / document payload.
3. Reproducibility: a clean build on a fresh machine fails. That is a Zero-Tolerance Rule 1 scenario once CI is wired up.

**Fix:** Publish `@kailash/prism-web@0.2.0` to GitHub Packages (per project-distribution memory note) and consume via `"@kailash/prism-web": "github:terrene-foundation/kailash-prism#v0.2.0"` — or commit the tarball to the repo with an SHA-512 integrity in `package-lock.json` generated from a clean install. Either way, the `/tmp` reference must be removed before the migration merges.

### H4. Client-side-only search / filter = information disclosure timing channel

**File:** `prism-documents-datasource.ts` lines 54-75 + `documents-prism/page.tsx` search input

The documents page fetches the FULL template set up-front via `documentsApi.listTemplates()` (no server-side auth filtering on the search/filter dimension) and filters client-side. If `listTemplates()` returns templates the current user is NOT authorized to generate (e.g. a role-scoped "Retrenchment Letter" template the current employee role should not see), the user can inspect the full list via the network tab before the client filters it. This is a backend authorization concern, not a frontend bug, but the migration codifies the "fetch-all-client-filter" pattern as a Prism convention. If `documentsApi.listTemplates()` is role-gated strictly server-side (only returns templates the caller can use), this is fine; if not, every client-side filter on HR-sensitive data becomes a reflection of what the server should have filtered.

**Action:** Before merge, confirm with HR backend owner that `documentsApi.listTemplates()` is strictly role-filtered server-side. Document the contract in `prism-documents-datasource.ts` header comment. If the backend is NOT role-filtering, file a backend issue and switch the adapter to a server-filtered query param before shipping.

## MEDIUM / LOW findings

### M1. `win.document.write(html)` in payslip print flow — acceptable but fragile

**File:** `prism-payslips-datasource.ts` lines 409-411

`document.write` is not a vulnerability here because the HTML is assembled via `escapeHtml` on every user-controlled string. However, `escapeHtml` only escapes five characters (`&<>"'`). Two concerns:

- **Missing:** backtick escaping is not strictly required inside a double-quoted HTML attribute, but defense-in-depth would also escape `\`` and `\\`.
- **CSS context:** the escape helper is applied to values that land in `<title>`, `<td>`, etc., but NOT to values that could land in a `<style>` block. Today no user data lands in `<style>`, but a future refactor that adds a period label to `<style>` (e.g. a per-period accent color) would bypass the escape. Add a code comment at the helper: "DO NOT use this helper for CSS / URL / JavaScript contexts — text-content only."
- **`window.print()` auto-trigger:** inline `<script>` is included in the printable HTML. This runs in the NEW window's context with the app's same-origin cookies accessible. If the opened window is later re-used (browser returns focus to it) and the user navigates it, same-origin is retained. Lower risk because the window is unnamed and opened with `noopener`, but flag for the M-02 follow-up: convert the print trigger to a message from the parent (`postMessage`) rather than an inline `<script>` that auto-runs.

### M2. Payslip PDF window URL is `""` — good, but verify no navigation leak

**File:** `prism-payslips-datasource.ts` line 400

`window.open("", "_blank", "noopener,noreferrer,...")` is the right pattern. Verified no query-string PII. However, the `noopener,noreferrer` feature string on `window.open` is **not** uniformly supported — in some browser versions the feature string is only parsed for named features, and `noopener`/`noreferrer` must be set via separate arguments or via `<a rel="noopener">`. Confirm behavior in the browser matrix the app targets; if in doubt, ALSO set `win.opener = null` after `win.document.close()` to force the disconnection.

### M3. ServerDataSource: no request correlation ID

**File:** `/Users/esperie/repos/loom/kailash-prism/web/src/engines/data-table/use-data-table.ts` lines 154-204

The new fetch effect does not generate or propagate a request correlation ID. When the ServerDataSource adapter forwards `fetchData(params)` to the arbor backend, every request is anonymous from a logging perspective — a user reporting "I saw the wrong payslip" cannot be traced to the exact `fetchData` call. Per `rules/observability.md` §2 (correlation ID on every log line), the engine SHOULD generate or accept a trace ID and pass it via `params`. Not a security vuln on its own, but makes cross-tenant leak forensics harder.

**Fix:** Add an optional `requestId` to `ServerFetchParams`, populate with a ULID/UUIDv7 per `fetchData` invocation, and emit a DEBUG-level log when the fetch starts/completes. Adapter implementations can forward it as an `X-Request-Id` header.

### M4. Cache key / tenant isolation in ServerDataSource (latent)

**File:** same as M3

The engine has no concept of tenant; a server adapter that caches the returned array (which the payslips adapter does NOT today, but a future DataFlow-backed adapter might) would be at risk of the `rules/tenant-isolation.md` §1 issue (cache key without tenant). When the engine gains a cache layer (post-M-04 roadmap item), the key scheme MUST include tenant. Document this constraint in the ServerDataSource contract JSDoc now so the next contributor doesn't miss it.

### M5. Abort on unmount vs stale response — correct, but no unit coverage for logout race

**File:** `use-data-table.ts` lines 154-204; test `web/src/__tests__/regression/server-data-source-wiring.test.ts`

The regression test covers initial-mount, param-change, and basic abort. It does NOT cover the "user logs out while `fetchData` is in flight, new user logs in, old response arrives" race. The monotonic `fetchSeqRef` + `AbortController` pattern handles it correctly because React unmounts the hook on route change — but there's no asserting test. A user session boundary is the highest-risk cross-tenant vector.

**Fix:** Add a test that renders the hook, kicks off a slow fetch, unmounts, mounts a new instance with a different source, resolves the old fetch, and asserts the old fetch's items do NOT appear in the new instance's rows.

### M6. `globalSearch` and `filters` query strings flow to the adapter unmodified

**File:** `use-data-table.ts` lines 162-168; `prism-payslips-datasource.ts` lines 194-211

The engine passes the raw search string to the adapter. For the payslips use case the adapter filters client-side over an already-fetched array, so no server-side injection is possible via this channel. When the adapter is upgraded to forward `globalSearch` to the arbor backend as a query parameter, the backend MUST treat it as an untrusted string. Add a code comment at the ServerDataSource contract site: "adapters forwarding globalSearch to a backend MUST URL-encode and length-bound the value; the engine does NOT do so."

### M7. Calculator free-form numeric inputs have upper bounds only on CPF calculator

**Files:** `prism-calculator-configs.ts` — CPF has `max: 100` on age; other calculators (cost-to-company, retrenchment, overtime, notice-period) have `min: 0` or `min: 1` on salary with **no upper bound**.

A user entering `salary = 1e308` or `Number.MAX_SAFE_INTEGER` crashes the display math (Infinity ↔ NaN) or produces `$Infinity`-labeled output. The `asNumber` helper returns finite numbers only via `Number.isFinite`, so the compute pipeline rejects non-finite inputs, but `Number.MAX_SAFE_INTEGER - 1` is still finite and produces nonsensical results. Low-impact because these are advisory calculators, but adds a DOS shape (repeatedly submitting very large numbers burns server compute on the CPF calculator, which is the only one with a real backend).

**Fix:** Add `max` constraints on every salary field (e.g. `max: 1_000_000` = SGD 1M/month is far beyond any realistic input), and a matching `rule: "max"` validation entry. Apply to `salary`, `years`, `hoursWorked`, `totalWorkers`, `wpCount` etc.

### M8. Calculator detail route does not validate `type` param server-side

**File:** `calculators-prism/[type]/page.tsx` lines 43-45

`const { type } = use(params)` — the param flows into `getCalculatorConfig(type)` and `getCalculatorBySlug(type)`. Both validate against a whitelist (`isCalculatorType`), so an attacker cannot reach unknown calculator logic. But the raw `type` is reflected in the 404 message at line 87 (`The calculator type "{type}" does not exist.`). JSX auto-escapes this, so no XSS. Minor issue: the unescaped param appears in the page title / error text, which could be weaponized as a phishing vector (`/calculators-prism/click-here-for-free-money` → rendered verbatim in the 404 body). Not a security finding per se; content-policy concern. Consider replacing the reflected message with a generic "That calculator does not exist."

### L1. CPF calculator `compute()` validates `request.pr_year` as a parsed int but does not range-check

**File:** `prism-calculator-configs.ts` lines 140-142

```ts
pr_year: citizenship === "pr" && prYearStr ? parseInt(prYearStr, 10) : null,
```

`prYearStr` comes from a select with values `"1"|"2"|"3"` only, so in practice it's bounded. But `parseInt("99", 10)` would pass through. Form's `select` bounds the real-user channel, but a browser extension or direct DOM manipulation can submit arbitrary strings. Backend should validate. Low priority.

### L2. `prism-document-card.tsx` — image icons hardcoded by category

Category → icon map at `categoryIcon` is an object literal. If a future backend adds a new category, the card falls back to a generic `FileText`. Not a security issue; note for M-03 polish.

### L3. Focus-trap on the print window

When the print window opens, the parent app retains focus history. Pressing "Close" in the print window returns focus to the app, which is correct. The print HTML does NOT set `<meta name="referrer" content="no-referrer">`, so if a link inside the printable HTML is added in the future, referrer policy would leak `arbor.app/my-payslips-prism` with the payslip ID possibly in the URL. Add the meta tag defensively.

## PII / data-handling audit

| File | PII touched | Storage | Network | Logs | Verdict |
|------|-------------|---------|---------|------|---------|
| `calculators-prism/page.tsx` | None (static calculator list) | In-memory | None | None | Clean |
| `calculators-prism/[type]/page.tsx` | Form values (salary, age, citizenship) — transient | Form state only | CPF → `calculatorsApi.cpf` | Error messages re-rendered — see H2 | Clean (H2 caveat) |
| `prism-calculator-configs.ts` | Salary, age, years-of-service, CPF parameters | Form state only | CPF HTTP call | None | Clean |
| `prism-calculator-results.tsx` | Renders computed amounts into DOM | None | None | None | Clean — fully React-escaped |
| `my-payslips-prism/page.tsx` | Payslip IDs, gross/net, status | In-memory only during view | Read-only fetch | **Payslip ID at INFO → H1** | H1 open |
| `my-payslips-prism/elements/*` | Renders payslip fields | None | None | None | Clean |
| `prism-payslips-datasource.ts` | **Full payslip detail in print HTML**, payslip IDs in logs | Blob-like HTML written to new window DOM | `payrollApi.myPayslips`, `payrollApi.myPayslipDetail` | **INFO-level payslip IDs → H1** | H1 open; escape strategy solid |
| `documents-prism/page.tsx` | Template metadata (no PII in the templates themselves; generated documents are a different route) | In-memory | `documentsApi.listTemplates` | None | Clean (H4 authz caveat) |
| `prism-documents-datasource.ts` | Template list | In-memory | Fetch-once pattern | None | Clean (H4 authz caveat) |
| `prism-document-card.tsx` | Template name, description, compliance notes (not user PII) | None | None (Link only) | None | Clean |
| Prism engine changes (use-data-table, types, form-*) | Channel for arbitrary row data | In-memory | Adapter-mediated | None in engine code | Clean; M3/M4/M5 latent |

**Overall PII exposure risk: MEDIUM** — driven entirely by H1 (console-log cardinality in a compensation context). Resolving H1 and H2 brings the wave-2 files to LOW risk.

## Auth/authz per new route

| Route | Auth | Authorization verification |
|-------|------|----------------------------|
| `/calculators-prism` | ✅ `(dashboard)/layout.tsx` wraps in `<ProtectedRoute>` | N/A — calculators are advisory, no per-record access |
| `/calculators-prism/[type]` | ✅ same | CPF backend call inherits arbor session auth; no client-side authz claim |
| `/my-payslips-prism` | ✅ same | Arbor `/payroll/my-payslips` endpoint is (assumed) scoped to the signed-in user. Client does NOT filter by user_id — if the backend returns another user's payslips, the UI will render them. Trust boundary is the arbor API. |
| `/documents-prism` | ✅ same | `documentsApi.listTemplates` is assumed role-filtered — see H4. Per-template `/preview` / `/generate` links delegate to existing arbor routes which are (presumed) role-gated. |
| Print-to-PDF flow (M-02) | Inherits payslip fetch auth | `payrollApi.myPayslipDetail(id)` is (assumed) authorized server-side — a user cannot download another user's payslip by editing the URL. |

**Auth posture verdict: ADEQUATE** — the `(dashboard)/layout.tsx` chain means no new routes escape the existing auth middleware. All per-resource authorization is delegated to the arbor backend, which is the correct trust boundary. The residual risks are (a) the H4 listTemplates scoping (confirm with backend owner before merge) and (b) the general assumption that `payrollApi.myPayslipDetail(id)` rejects IDs not owned by the caller. No migration file directly bypasses these; they're inherited posture. Recommend adding a Tier 2 integration test that exercises the cross-user case: user A authenticates, calls `downloadPayslipPdf(userB.payslipId)`, asserts the backend returns 403/404 and no payslip HTML is rendered in a new window.

## Print-to-PDF flow audit (M-02)

Specific checks against the M-02 download flow in `prism-payslips-datasource.ts`:

1. **URL vs data: URL** — `window.open("")` with empty URL. Payslip data is NOT in the URL. Good.
2. **postMessage vs document.write** — `document.write` used. Acceptable because of (a) empty URL, (b) unnamed window, (c) `escapeHtml` on every user string, (d) `noopener,noreferrer` feature string. See M1 for future-proofing note.
3. **Opener reference** — `noopener,noreferrer` in feature string. Browser support is inconsistent for the feature-string form; see M2. Recommend also setting `win.opener = null` defensively.
4. **XSS in escape fields** — audit of every `${escapeHtml(...)}` call site:
   - Period start/end (user-controlled date from backend) — escaped
   - Status (user-controlled from backend) — escaped
   - Gross/net (numeric → formatted via `formatCurrencySGD` → escaped) — escaped
   - Line item names (`i.name` — backend-controlled, can contain arbitrary text e.g. "Performance Bonus") — escaped
   - Item amounts — escaped
   - SHG fund name — escaped
   - All fields routed through `escapeHtml` before interpolation. No unescaped interpolation sites found.
5. **Inline script execution** — `<script>` inside the print window runs in that window's context. Only calls `window.print()` after a 150ms timeout. No user data reaches the script. Acceptable today, flagged in M1 for future-proofing.
6. **Popup blocker handling** — typed `PayslipDownloadBlockedError` with user-safe message. Good.
7. **Data exfiltration vectors** — the printable HTML contains full compensation detail. It lives in a new window with no cookies (empty URL, so same-origin inherits). If the user screen-shares or leaves the browser tab open, the window persists. Document this in M-02 findings as a UX/privacy consideration; not strictly a security vuln, but noteworthy for compensation data.

**Print flow verdict: PASSES** with M1/M2/L3 as improvement items.

## Supply chain notes

- **Tarball reference:** `file:../../../../../../../../tmp/kailash-prism-web-0.2.0.tgz` (see H3). **BLOCKS** reproducible builds and is a supply-chain attack surface.
- **New indirect deps from 0.2.0 bump:** none detectable without building (engine changes are internal to `@kailash/prism-web`). The changelog entry `server-data-source-wiring.test.ts` confirms internal changes only.
- **React 19.2.3, Next 16.1.6:** current stable per package.json.
- **`rehype-sanitize@^6.0.0` present in deps** — good defensive hygiene for any markdown rendering elsewhere in arbor.
- **No new dependencies** added by the migration files.

**Supply-chain verdict: HIGH risk until H3 resolved.** The tarball path will either fail a clean CI build or resolve to a stale/poisoned artifact on any other machine. This is a merge-blocker-adjacent finding — not itself CRITICAL because the current dev machine has the tarball, but it will become CRITICAL the moment the PR is opened against CI.

## Disposition (2026-04-14, M-08 convergence)

| Finding | Status | Reference |
| --- | --- | --- |
| H1 (PII fields at `console.info` in prod) | FIXED | `prism-payslips-datasource.ts` — every `console.info` / `console.error` routed through a `debugLog()` helper gated on `process.env.NODE_ENV !== "production"`. Emits at `console.debug`, not INFO. All `eslint-disable-next-line no-console` directives removed. Production browser console is silent. |
| H2 (raw `err.message` echoed to UI) | FIXED | New helper `src/lib/prism-error-sanitize.ts` exporting `sanitizeErrorMessage(err)` and `UserFacingError` marker interface. Consumed by all three -prism pages. `PayslipDownloadBlockedError` declares `isUserFacing = true as const` so its popup-blocker message survives the sanitiser. Backend error bodies no longer reach the UI banner. |
| H3 (tarball ref has no integrity hash) | DEFERRED | Needs distribution-policy decision — GitHub Packages vs committed tarball vs pinned `file:` with lockfile integrity. Tracked for next ops cycle. Per `memory/project_distribution.md` the target is GitHub Packages, but the artifact isn't published yet. This is blocking reproducible CI builds, not blocking the migration locally. |
| H4 (client-side filter = potential authz timing channel) | DEFERRED | Needs arbor backend owner confirmation that `documentsApi.listTemplates()` is strictly role-scoped server-side. Filing a backend audit ticket; if listTemplates is NOT role-scoped, the prism adapter will need a server-filtered query. Documentation comment added at the datasource is an M-08 follow-up (out of scope for this convergence per user). |
| M1 (`document.write` fragility) | DEFERRED | Future-proofing per red-team recommendation — low priority; current escape strategy is sound. |
| M2 (`noopener,noreferrer` feature-string support) | DEFERRED | Defensive `win.opener = null` recommended for browser-matrix coverage. /codify. |
| M3 (no request correlation ID on ServerDataSource) | DEFERRED | Engine-side enhancement; Prism roadmap. |
| M4 (cache key tenant dimension latent) | DEFERRED | ServerDataSource has no cache layer today; tenant constraint MUST be documented when the cache lands. JSDoc note deferred to M-06 DataTableAdapter work. |
| M5 (no unit test for logout-race abort) | DEFERRED | Tier 2 / integration concern tracked for /codify. |
| M6 (`globalSearch` untrusted on future backend) | DEFERRED | Documentation comment for adapter contract; batched into /codify. |
| M7 (no max bound on numeric inputs) | DEFERRED | M-06 Form engine validation rules; batched into /codify. |
| M8 (reflected `type` param in 404) | DEFERRED | LOW content-policy; harmless today. |
| L1 (`pr_year` range check) | DEFERRED | Backend responsibility per red-team recommendation. |
| L2 (category icon fallback) | DEFERRED | Cosmetic. |
| L3 (referrer-policy meta in print window) | DEFERRED | Defensive only; no current link. |

Supply-chain / CI implications: H3 remains OPEN until the distribution decision is made. The local build passes because `/tmp/kailash-prism-web-0.2.0.tgz` exists on this machine; any fresh clone on CI will fail until the reference is replaced.
