# Arbor Wave-2 Red-Team Convergence (M-08)

**Date:** 2026-04-14
**Inputs:** `redteam-arbor-wave2.md` (code, 3 HIGH / 7 MEDIUM / 7 LOW), `redteam-arbor-wave2-security.md` (security, 0 CRITICAL / 4 HIGH / 8 MEDIUM / 3 LOW)
**Session scope:** H1, H2, H3 (code), S1 (H1-sec), S2 (H2-sec), and 5 documented parity deviations. All MEDIUM / LOW batched to `/codify` except M4, M5, M7 (fixed opportunistically because they fit the same edits).

## What was fixed

### Prism-side (`kailash-prism/web`)

1. **`act()` warnings in `ai-chat-sidebar.test.tsx`** (H2) — the `finalizes message on stream complete` and `aborts stream when switching conversations` tests now wrap their triggering mutations in `await act(async () => ...)` + `waitFor(...)` so the downstream async effects (`refreshConversations()`, `loadMessages()`) settle inside `act`. Zero warnings, 219/219 tests pass.

### Arbor-side (`arbor/apps/web`)

2. **`ARBOR_FORM_CLASS_NAMES`** (H1) — new file `src/lib/prism-form-classnames.ts` exports a `FormConfig["classNames"]` constant that mirrors arbor's `AppInput` / `AppButton` Tailwind classes. Consumed at `calculators-prism/[type]/page.tsx`. This is the first real consumer of the M-04 `FormConfig.classNames` API — the orphan is now wired.

3. **`sanitizeErrorMessage(err)`** (S2) — new file `src/lib/prism-error-sanitize.ts` returns a user-safe message for every error shape (HTTP status → tailored generic, TypeError → network message, `UserFacingError` → verbatim, fallback → "Something went wrong"). Logs full error at `console.debug` in dev. Consumed by:
   - `calculators-prism/[type]/page.tsx` — re-throws sanitised Error so Prism Form's `submitError` banner shows controlled vocabulary.
   - `my-payslips-prism/page.tsx` — fetch + download error paths.
   - `documents-prism/page.tsx` — fetch error path.
   - `PayslipDownloadBlockedError` in `prism-payslips-datasource.ts` now declares `isUserFacing = true as const` so its popup-blocker message survives sanitisation.

4. **PII-adjacent logging removed** (S1) — `prism-payslips-datasource.ts` routes every log line through a new `debugLog()` helper gated on `process.env.NODE_ENV !== "production"`, emitting at `console.debug`. All `eslint-disable-next-line no-console` directives removed. Production browser console is silent; dev diagnostics preserved.

5. **Row-click navigation on /documents-prism** (H3) — `documents-prism/page.tsx` imports `useRouter` and passes `onRowClick={(row) => router.push(/documents/${row.id}/preview)}` to the `DataTable`. Matches bespoke `<Link>`-wrapped row affordance.

6. **Search parity restored** (M4) — `applyClientFilters` reverts to `name + description` only (was widened to include `category`, silently changing observable behaviour).

7. **Category order parity restored** (M5) — `deriveCategories` now emits `["All", ...CURATED_CATEGORY_ORDER-present, ...unknown alphabetical]`. Matches bespoke hardcoded order (`Contracts, Policies, Letters, Forms`); future backend-added categories still appear, just after the known ones.

### Pre-existing warning found and fixed

8. **Next.js workspace-root warning** — `next.config.ts` now sets `turbopack.root = path.resolve(__dirname)`. Surfaced during the post-fix build; per Rule 1 we own warnings we find. Not related to wave-2 migrations but blocked a clean build.

## Deviations documented (specs-authority Rule 6)

Appended "Visual / UX deviations" / "Capability deviations" / "Behaviour deviations" sections to:

- `migration-m01-findings.md` — Notice Period calc divergence (bespoke has latent bug; prism is correct), form styling fix, submit error sanitisation.
- `migration-m02-findings.md` — print-to-PDF labelled NET NEW feature, PII logging fix, error sanitisation fix.
- `migration-m03-findings.md` — row-click nav fix, search-scope revert, category-order fix, error sanitisation fix.

## What was deferred (with rationale)

| Finding | Why deferred |
| --- | --- |
| **S3** (tarball integrity hash) | Needs distribution-policy decision (GitHub Packages vs committed tarball vs pinned integrity). Tracked for ops; current dev builds work because `/tmp/kailash-prism-web-0.2.0.tgz` exists locally. CI would block. |
| **S4** (documents listTemplates authz) | Needs arbor backend owner audit; filing as backend ticket rather than frontend fix. If listTemplates is not server-role-scoped, the datasource will need a server-filtered query. |
| **M1** code (Notice Period divergence) | Prism is correct; bespoke has a latent bug. Fixing bespoke is a separate todo. Documented in m01 findings. |
| **M6** code (payslip download NET NEW) | Intentional capability added by prism. Documented as such in m02 findings. Not a bug to revert. |
| **M2, M3, L1-L7 code; M1-M8, L1-L3 security** | Batched to /codify per session scope; none are blocking. |

## Test suite result

- Prism: `npx vitest run` — **219 / 219 pass**, zero `act()` warnings, zero stderr warnings.
- Prism types: `npx tsc --noEmit` — clean.
- Arbor types: `npx tsc --noEmit` — clean.
- Arbor build: `npm run build` — success, zero warnings (Next.js workspace-root warning fixed in next.config.ts).

## Second-pass zero-tolerance scan

| Rule | Scan | Result |
| --- | --- | --- |
| Rule 1 | Test runner + build warnings | Clean (ai-chat `act` warnings resolved; Next.js workspace warning resolved) |
| Rule 2 | `TODO \| FIXME \| HACK \| STUB \| XXX \| mock[A-Z] \| fake[A-Z] \| Math.random` in changed files | Zero hits |
| Rule 3 | `catch (_) \| catch {} \| .catch(() => {})` in arbor/src | Zero hits |
| Rule 6 | Every new helper has a consumer | `ARBOR_FORM_CLASS_NAMES` → calculators-prism; `sanitizeErrorMessage` → all three -prism pages; `debugLog` → payslips datasource. No orphans. |
| Orphan | `rules/orphan-detection.md` Rule 1 — Prism facade (`FormConfig.classNames`) now has a production consumer | Arbor consumes via `ARBOR_FORM_CLASS_NAMES`. |

## New findings surfaced during fixes

**None material.** One minor observation: Prism's `ServerDataSource.fetchData` path (D1 in M-04) is wired per the M-04 CHANGELOG and the server-data-source-wiring regression test, but none of the three arbor wave-2 pages actually use ServerDataSource — they all fetch client-side and pass plain arrays. This is consistent with the red-team notes (M3, M4, M5 security) and not a wave-2 regression; the adapter pathway remains covered by Prism's own regression test. Worth calling out for wave-3 planning: arbor doesn't exercise the server-driven data path yet.

## Open questions for next session

1. **Tarball distribution policy (S3)** — needs a decision before a fresh CI machine can build. Options: (a) GitHub Packages per `memory/project_distribution.md`, (b) commit tarball to repo with SHA integrity in `package-lock.json`, (c) pin to a git SHA via `github:` resolver. Recommend (a) per the existing memory note.

2. **listTemplates server-side role filter (S4)** — backend audit needed; file ticket against arbor backend owner.
