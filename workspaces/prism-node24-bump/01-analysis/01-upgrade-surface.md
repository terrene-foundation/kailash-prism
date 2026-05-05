---
type: analysis
phase: 01-analysis
date: 2026-05-06
---

# Upgrade Surface — Node 20 → 24, setup-node v4 → v5, checkout v4 → v5

What changes, what risks each change carries, and what a minimal validation matrix looks like. This is a discovery doc — final decisions are deferred to `/analyze` and locked at `/todos`.

## Change 1 — Node 20 → 24 (release-web.yml line 26)

**Behavior change**: GitHub Actions stops provisioning Node 20 runners on 2026-06-02 (workflow runs hard-fail on that date if `node-version: '20'` is still pinned). Bump to `'24'`.

**Risks**:

1. **TypeScript 5.8 on Node 24** — TS 5.8 explicitly supports Node 22+; Node 24 is in-bounds. ✓ Low risk.
2. **vitest on Node 24** — vitest 3.x supports Node 22+ per upstream release notes; need to verify the actual version pinned in `web/package-lock.json`. If lockfile resolves vitest <2.x, a vitest bump may piggyback. (Verification deferred to /analyze.)
3. **eslint on Node 24** — eslint 9.x supports Node 18.18.0+ and 20.9.0+; Node 24 is in-bounds. ✓ Low risk.
4. **Native module rebuild** — `npm ci` on a different Node major triggers rebuild of any package with native bindings. Inspection of the dependency graph for native deps is part of /analyze.
5. **Cache invalidation** — `cache: 'npm'` in setup-node@v4 keys on Node version; first run on Node 24 misses the cache and pulls fresh. One-time penalty, not a risk.

## Change 2 — actions/checkout v4 → v5

**Behavior change** (per upstream changelog): v5 drops Node 16 runtime support (Actions runtime, not the project's Node). v5 also tightens `submodules: true` semantics and changes some default fetch behavior. The current usage is bare `uses: actions/checkout@v4` with no flags, so the most likely-affected surface area (submodules, fetch-depth interactions) is unaffected.

**Risk**: Low — no flags in use, the migration is mechanical.

## Change 3 — actions/setup-node v4 → v5

**Behavior change** (per upstream changelog): v5 drops Node 16 runtime, tightens `node-version-file` parsing, and changes some default cache behavior for monorepos. The current usage passes `node-version`, `cache: 'npm'`, `cache-dependency-path: web/package-lock.json` — all of which are stable across v4/v5.

**Risk**: Low — current invocation uses the documented stable surface.

## Change 4 — engines.node declaration

**New behavior**: declare a Node minimum in `web/package.json` and `compiler/package.json` so:

- `npm install` on the consumer side warns (or hard-fails with `engine-strict=true`) when the consumer's Node is below the floor.
- The tarball's `package.json` carries an explicit consumer-floor signal alongside the existing TS / vitest / eslint pins.

**Decision**: floor at `>=22.0.0` (current LTS, supported through April 2027) OR `>=24.0.0` (current — narrows consumer base for ~12 months until Node 26 lands).

**Recommendation (subject to /analyze validation)**: `>=22.0.0`. The release pipeline pins 24 (latest production), but the **consumer minimum** is the LTS line because the tarball's user might not be on the bleeding edge. Signaling `>=24.0.0` excludes valid Node 22 users for no benefit; the tarball doesn't use Node 24-only APIs.

## Change 5 — new PR-time CI workflow

**New behavior**: a new workflow file (provisional name `.github/workflows/ci-web.yml`) triggered on `pull_request: paths: [web/**]` that runs the same install / build / test / lint steps as `release-web.yml`. This closes the validation gap and establishes the pattern for future LTS bumps.

**Open questions for /analyze**:

1. Matrix or single-version? `node-version: [22, 24]` gives broader compat signal at ~2x runtime cost. Single-version (24) gives release-pipeline parity. Recommendation: **matrix [22, 24]** — small CI minute cost, clear signal that the declared `engines.node: >=22` floor actually works.
2. Trigger paths: just `web/**`? Or also `package.json` / `tsconfig.json` / `compiler/**` / `.github/workflows/**`? Recommendation: `web/**`, `.github/workflows/ci-web.yml`, `package-lock.json`. Compiler gets its own future workflow.
3. Same `cache-dependency-path` and `cache: 'npm'` keys as the release workflow? Yes — symmetric reproducibility.
4. `concurrency: { group: 'ci-web-${{ github.ref }}', cancel-in-progress: true }`? Recommended per `git.md` § "Pre-FIRST-Push CI Parity Discipline" guidance on cancellation.

## Validation matrix (for /implement and /redteam)

| Surface                       | How verified                                                                                              |
| ----------------------------- | --------------------------------------------------------------------------------------------------------- |
| Node 24 build                 | New CI workflow runs `npm ci && npm run build` on PR                                                      |
| Node 24 test                  | New CI workflow runs `npm run test:run` on PR                                                             |
| Node 24 lint                  | New CI workflow runs `npm run lint` on PR                                                                 |
| `engines.node: >=22` accurate | Matrix entry for Node 22 also passes all three                                                            |
| `release-web.yml` post-bump   | Optional dry-run via `web-vTEST` synthetic tag, OR wait for natural v0.6.x patch release                  |
| No Node-20 reference left     | `grep -rn 'node.*20\|node-version.*20' .github/ web/package.json compiler/package.json` returns zero hits |

## Failure modes to surface in /redteam

1. **CI green, release red** — the new CI workflow uses the same install / build chain but a subtly different runner image; release fails despite green CI. Mitigation: same `runs-on: ubuntu-latest`, same action versions, same Node version across both workflows.
2. **Cache-key drift** — release-web caches under one key, ci-web under another; consumers depending on both hit the cache differently. Mitigation: both use `cache: 'npm'` + the same `cache-dependency-path`.
3. **Forgotten compiler workflow** — compiler/ ships independently in the future; if its eventual workflow inherits Node 20, the same crisis recurs. Mitigation: leave a TODO in the compiler package's README (or a journal entry) flagging this as the inheritance pattern.
4. **engines.node hard-fails consumers** — declaring `>=22` is fine, but if some consumer pins `engine-strict=true` and is on Node 20, their install breaks. The 2026-06-02 deadline coerces them off Node 20 anyway, so this is a non-issue post-deadline. But pre-deadline (if the bump lands ~3 weeks early) they get a warning. Acceptable trade-off.

## Ready-to-decide items going into /analyze

- [ ] Confirm `vitest` version in `web/package-lock.json` supports Node 24
- [ ] Confirm `eslint` version supports Node 24
- [ ] Confirm no native-binding dependencies in the install graph
- [ ] Pick `engines.node` floor (`>=22` recommended)
- [ ] Pick CI matrix (`[22, 24]` recommended)
- [ ] Pick CI workflow filename (`ci-web.yml` recommended)
