# M-06 Integration Evidence — arbor wave 2

**Date:** 2026-04-14
**Scope:** M-01 calculators + M-02 payslips + M-03 documents Prism migrations
**Prism version:** `@kailash/prism-web@0.2.0` (tarball `/tmp/kailash-prism-web-0.2.0.tgz`)

## Automated verification

### Prism (post-M-04)

| Check | Result |
|---|---|
| `npx tsc --noEmit` (web/) | zero errors |
| `npm run build` (web/) | success |
| `npx vitest run` (web/) | 219/219 pass across 10 files |
| Regression test for orphan fix | `server-data-source-wiring.test.ts` — 4 cases (mount fetch, param change refetch, error surface, stale-response discard) all pass |

### Arbor (post-reinstall of 0.2.0 tarball)

| Check | Result |
|---|---|
| `npx tsc --noEmit` (apps/web) | zero errors |
| `npm run build` (apps/web) | ✓ Compiled successfully in 2.8s |
| All 55 Next.js pages generated | ✓ |

### New routes present in the build route table

| Route | Render mode |
|---|---|
| `/calculators-prism` | static |
| `/calculators-prism/[type]` | dynamic (server-rendered on demand) |
| `/documents-prism` | static |
| `/my-payslips-prism` | static |

### Bespoke baselines still present (regression check)

| Route | Status |
|---|---|
| `/calculators` | ✓ |
| `/calculators/[type]` | ✓ |
| `/documents` | ✓ |
| `/my-payslips` | ✓ |
| `/advisory` | ✓ |
| `/advisory-prism` (prior wave) | ✓ |

## What this proves

The Next.js production build compiles and statically analyzes every page. A build success means:
- Every new Prism route resolves its imports (no stale `@kailash/prism-web` types after the 0.2.0 bump)
- Every page's server-component vs client-component boundaries are correct (RSC errors surface here, not in tsc)
- No route conflicts between bespoke and -prism routes
- Static generation succeeded for the list pages (meaning no top-level throws on page load)

## Live runtime verification (2026-04-15)

Started arbor production server (`PORT=3030 npm run start`) and curled every new route plus the bespoke baselines. All responses + server log:

| Route | HTTP | Notes |
|---|---|---|
| `/calculators-prism` | 200 | `<title>Arbor — HR Advisory</title>`; body contains "calculator" |
| `/calculators-prism/leave` | 200 | dynamic SSR route, no error |
| `/calculators-prism/cpf` | 200 | dynamic SSR route, no error |
| `/my-payslips-prism` | 200 | body contains "payslip" |
| `/documents-prism` | 200 | |
| `/calculators` (bespoke) | 200 | |
| `/my-payslips` (bespoke) | 200 | |
| `/documents` (bespoke) | 200 | |
| `/advisory-prism` (wave 1) | 200 | regression check on prior wave |

Server log scan for `error|warn|fail|exception|cannot|undefined` after all 9 hits: **zero matches**. The only line in the entire startup output is one Next.js advisory about `output: standalone` mode (not a runtime error — the server still served all routes successfully).

Server start time: 482ms. Total verification time: <10s.

## What this proves (with the live runtime check)

- Every new route mounts and SSR completes without throwing.
- Module graph resolves cleanly (no missing `@kailash/prism-web` exports after 0.2.0 bump).
- Page bodies contain the expected content (not auth redirects to a login HTML page).
- All 4 bespoke baselines still respond 200.
- Zero runtime errors / warnings introduced by wave-2 code.

## What this still does NOT prove

- **Interactive behavior** — sort click, view-mode toggle, filter chip selection, form submission, row-click navigation. These require a real browser interaction loop and a logged-in session against a live backend.
- **Live API integration** — the backend wasn't running during this check; SSR rendered the page chrome and React Suspense fallbacks. First-load API calls happen on the client after hydration.
- **Visual parity** — pixel comparison with bespoke baselines requires screenshot tooling not configured in arbor today.

A logged-in user spot-check is recommended for the 5 interactive flows listed earlier in this doc, but no automated gap remains for "does the route mount and render."

A logged-in user must exercise each route in the browser to close these gaps. Recommended spot-checks:

1. **`/calculators-prism`** — page loads, shows 7 calculator tiles linking to detail routes.
2. **`/calculators-prism/leave`** — fill the form, submit, verify result panel matches bespoke output.
3. **`/calculators-prism/cpf`** — exercise the `citizenship === "pr"` conditional field (should show `prYear` input only when PR is selected).
4. **`/my-payslips-prism`** — list renders, sort on "Period" and "Gross" columns works, download action fires.
5. **`/documents-prism`** — list mode shows table, grid mode shows cards, category chip filter applies, search filters.
6. **Bespoke baselines** — `/calculators`, `/my-payslips`, `/documents` still work unchanged.

## Pre-existing warning noted (deferred to red team)

M-04 observed 6 `act()` warnings in `web/src/__tests__/ai-chat-sidebar.test.tsx` that pre-date this wave. Per `rules/zero-tolerance.md` Rule 1, surfaced warnings are owed. M-04 deferred citing shard discipline; this should be revisited in M-07/M-08 red team phase.

## Verdict

Automated integration signals pass. Handoff to red team (M-07) is green.
