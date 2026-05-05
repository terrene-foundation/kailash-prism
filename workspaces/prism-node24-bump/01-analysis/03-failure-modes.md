---
type: analysis
phase: 01-analysis
date: 2026-05-06
---

# Failure Modes

Per `analyst` discipline: enumerate what could go wrong, score it, decide mitigation. Six failure modes identified; four mitigated by Decisions 1-7, two accepted as bounded risks.

## FM-1 — CI green, release red

**Mode**: New `ci-web.yml` passes on PR but `release-web.yml` fails when the next `web-v*` tag is cut. Possible cause: drift between the two workflow specs (different runner image, different action versions, different Node minor).

**Severity**: HIGH — the deadline is 2026-06-02; a late-breaking release failure has no retry budget.

**Mitigation (in Decisions 2 + 3)**: both workflows pin `runs-on: ubuntu-latest`, `actions/checkout@v5`, `actions/setup-node@v5`, `node-version: '24'`, identical `cache` config. The matrix in `ci-web.yml` includes `'24'` as one entry — the exact same surface as release-web.yml.

**Residual risk**: GitHub may roll new `ubuntu-latest` images mid-window; both workflows pick up the new image at the same time. Bounded.

## FM-2 — Cache-key drift

**Mode**: `ci-web.yml` and `release-web.yml` cache npm under different keys; consumers depending on cache warm-up hit cold cache on the release path despite warm cache on PR path.

**Severity**: LOW — cache miss adds ~20s to a ~3min release, no functional impact.

**Mitigation**: both workflows use `cache: 'npm'` + `cache-dependency-path: web/package-lock.json`. setup-node@v5 derives a deterministic key from the lockfile content; identical inputs produce identical keys.

## FM-3 — `engines.node: ">=22.0.0"` hard-fails Node 20 consumers pre-deadline

**Mode**: A consumer with `engine-strict=true` in `.npmrc` cannot install `@kailash/prism-web` on Node 20 between PR merge and 2026-06-02.

**Severity**: LOW — accepted.

**Rationale**: Per `feedback_prism_distribution.md`, distribution is GitHub-only (tarball install, not npm registry). Tarball consumers are explicitly opted into a bleeding-edge SDK; the deadline-coerced upgrade off Node 20 is going to happen 27 days from now regardless. Pre-deadline warnings are a feature, not a regression.

## FM-4 — Future compiler release workflow inherits Node 20 default

**Mode**: When a release workflow eventually ships for `@kailash/prism-compiler`, whoever writes it copies the existing `release-web.yml` shape WITHOUT realizing it should default to Node 24. The crisis recurs.

**Severity**: MEDIUM — recurrence is months out, but the same pressure applies (deadline-driven scramble).

**Mitigation (in Decision 6)**: codify proposal explicitly captures "Any future Prism release workflow MUST default to Node 24 + setup-node@v5 + checkout@v5 + matrix [22, 24] in CI." This becomes the institutional pattern for subsequent bumps.

**Cross-link**: when `release-compiler.yml` lands, add a comment block at top citing this workspace + decisions doc.

## FM-5 — esbuild / fsevents native prebuild missing for Node 24

**Mode**: One of the two install-script packages (esbuild, fsevents) doesn't have a prebuild for Node 24 yet; `npm ci` falls back to source compilation via node-gyp; CI fails on missing build tools.

**Severity**: LOW — bounded by upstream's prebuild publishing cadence.

**Mitigation**: esbuild and fsevents both publish prebuilds for every Node major within days of release; Node 24 GA was months ago. Verified by checking upstream npm tarballs (manual spot check at `/implement` time per Open Items in 02-decisions-locked.md).

**Fallback**: if a prebuild is missing, the failure is loud (`npm ci` exits non-zero) and locally reproducible. Fix is to bump the affected package one version. Does NOT block the workspace.

## FM-6 — `vitest` + Vite Node 24 ESM regression

**Mode**: Vite's experimental Node 24 ESM module loader hooks (Node 22+ feature, expanded in 24) trigger an obscure regression in vitest's test runner against the prism test suite.

**Severity**: LOW — speculative.

**Mitigation**: the new `ci-web.yml` matrix runs `[22, 24]` — if Node 24 fails but Node 22 passes, the bug is isolated to the Node 24 surface and the upgrade pauses while we file an upstream issue. The matrix is the structural defense.

**Fallback if observed**: pin Node version to 22 in release pipeline (deferring the 24 cut by ~6 weeks), file upstream bug, retry.

## Severity summary

| Mode | Severity | Mitigated by |
|------|----------|--------------|
| FM-1 CI/release drift | HIGH | Decisions 2 + 3 (workflow parity) |
| FM-2 Cache-key drift | LOW | Decisions 2 + 3 (identical cache config) |
| FM-3 engines.node early hard-fail | LOW | Accepted (deadline coerces upgrade anyway) |
| FM-4 Future compiler workflow inheritance | MEDIUM | Decision 6 + codify proposal |
| FM-5 Missing native prebuild | LOW | Upstream cadence; loud failure mode |
| FM-6 vitest/Vite Node 24 regression | LOW | Decision 2 matrix [22, 24] |

No HIGH severity items remain unmitigated post-decisions.

## What /redteam will sweep

1. `grep -rn 'node.version.*20'` across `.github/`, `web/package.json`, `compiler/package.json` — expected zero matches.
2. CI workflow exists with matrix `[22, 24]`.
3. `engines.node: ">=22.0.0"` in both packages.
4. `@types/node: ^24.0.0` in compiler.
5. CI green on the bump PR itself.
6. Optional dry-run: synthetic local tag (NOT pushed) verifying release-web.yml YAML syntax is well-formed via `act` or equivalent.
