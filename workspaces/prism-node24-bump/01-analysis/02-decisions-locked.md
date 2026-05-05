---
type: analysis
phase: 01-analysis
date: 2026-05-06
---

# Decisions Locked

The deferred decisions in `briefs/0001-node24-bump.md` and the open questions in `01-upgrade-surface.md` are now resolved against verified package-lock data. `/todos` consumes this doc as authoritative.

## Verified versions (resolved from package-lock.json on 2026-05-06)

| Package | Declared | Resolved | Node 24 support |
|---------|----------|----------|-----------------|
| `vitest` (web + compiler) | `^3.1.0` | `3.2.4` | ✓ (vitest 3.x: Node 22+) |
| `eslint` (web) | `^9.0.0` | `9.39.4` | ✓ (eslint 9.x: Node 18.18+) |
| `typescript` (web + compiler) | `^5.8.0` | `5.9.3` | ✓ (TS 5.9: Node 22+) |
| `react` (web) | `^19.1.0` | `19.2.5` | ✓ (Node-version-agnostic) |
| `@types/node` (compiler only) | `^22.15.0` | `22.19.17` | ⚠ types pin Node 22; runtime unaffected; **bump to `^24.0.0`** |
| `yaml` (compiler) | `^2.7.0` | `2.8.3` | ✓ |

## Native modules (resolved from `hasInstallScript` in lock)

Both `web/` and `compiler/` install graphs contain exactly two packages with install scripts:

- `esbuild` — vitest peer dep, prebuilt binaries per `(node-major, platform, arch)`. esbuild publishes Node 24 prebuilts; verified by upstream release notes.
- `fsevents` — macOS-only file watcher, prebuilt per Node major. Optional dep (not loaded on Linux/Windows CI runners). Node 24 prebuilt verified.

No source compilation via `node-gyp` or `prebuild-install` against Node 24 ABI is required.

## Decision 1 — `engines.node` floor

**Locked: `>=22.0.0` for both `web/package.json` and `compiler/package.json`.**

Rationale:
- Node 22 is the current LTS (active LTS through Oct 2026, maintenance LTS through April 2027).
- Node 24 is current (will become LTS Oct 2026).
- The release pipeline pins Node 24, but the **consumer** floor is the LTS line because tarball consumers may not be on the bleeding edge.
- Declaring `>=24` excludes valid Node 22 LTS users for no functional benefit; the build does not use any Node 24-only API.
- Pre-deadline (now through 2026-06-02), Node 20 users see a warning on `npm install`. Post-deadline, they are forced off Node 20 anyway by GHA's deprecation. Acceptable behavior.

## Decision 2 — CI workflow filename + structure

**Locked: `.github/workflows/ci-web.yml`**, parallel structure to `release-web.yml`.

```yaml
name: CI — @kailash/prism-web

on:
  pull_request:
    paths:
      - 'web/**'
      - '.github/workflows/ci-web.yml'
  push:
    branches: [main]
    paths:
      - 'web/**'

concurrency:
  group: ci-web-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        node-version: ['22', '24']
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
          cache-dependency-path: web/package-lock.json
      - run: npm ci
        working-directory: web
      - run: npm run lint
        working-directory: web
      - run: npm run build
        working-directory: web
      - run: npm run test:run
        working-directory: web
```

Rationale:
- `pull_request` paths-filter = exactly the consumer change surface.
- `push: branches: [main]` provides a green-on-main signal (catches drift from merged PRs that bypassed paths-filter).
- `concurrency.cancel-in-progress: true` matches `git.md` § "Pre-FIRST-Push CI Parity Discipline" guidance.
- Matrix `[22, 24]` validates the declared `engines.node: >=22` floor AND the release pipeline's Node 24 pin in one workflow.
- Step order: lint before build before test — fastest signals first.

## Decision 3 — release-web.yml bumps

**Locked: three line edits**:

| Line | Before | After |
|------|--------|-------|
| 21 | `uses: actions/checkout@v4` | `uses: actions/checkout@v5` |
| 24 | `uses: actions/setup-node@v4` | `uses: actions/setup-node@v5` |
| 26 | `node-version: '20'` | `node-version: '24'` |

No other change to release-web.yml. The `softprops/action-gh-release` SHA pin (line 99) stays — already at v2.6.2.

## Decision 4 — `@types/node` in compiler

**Locked: bump `compiler/package.json` `@types/node: ^22.15.0` → `^24.0.0`.**

The compiler package types its codegen CLI against Node API. Pinning types to Node 22 while running on Node 24 leaves Node 24-only types (e.g. expanded `node:test` API) invisible to TS. The bump is type-only; runtime is unaffected.

`web/` does not declare `@types/node` directly (transitive via vitest); no action there.

## Decision 5 — `packageManager` field

**Locked: skip.**

Adding `"packageManager": "npm@10.x"` would pin the npm version for Corepack reproducibility. The setup-node@v5 action ships npm 10.x by default with Node 22+ and npm 11.x with Node 24. Either is fine for `npm ci`. Adding the pin introduces complexity (Corepack enable, version drift maintenance) for marginal benefit on a tarball-distributed package. Skip.

## Decision 6 — compiler/ scope

**Locked: out of scope for this workspace.**

The compiler has no release workflow yet. When one ships, it will be a separate workspace with its own bump. The `engines.node` declaration in `compiler/package.json` is in scope (consumer-facing); no compiler-side workflow change.

A note will be left in `compiler/README.md` (if it exists) or in this workspace's codify proposal that **any future compiler release workflow MUST default to Node 24 + setup-node@v5 + checkout@v5** as the inherited convention.

## Decision 7 — atomicity

**Locked: one PR landing all of:**
1. `release-web.yml` three-line edit (Decision 3)
2. New `ci-web.yml` (Decision 2)
3. `engines.node: ">=22.0.0"` in `web/package.json` and `compiler/package.json` (Decision 1)
4. `@types/node: ^24.0.0` in `compiler/package.json` (Decision 4)
5. `package-lock.json` regen for compiler (after #4)

Rationale:
- The bump and the CI workflow are coupled: neither has anything to validate it without the other.
- All changes are workflow + manifest only (no source code). One atomic PR.
- The new CI workflow will run on its own opening PR (since the PR touches `.github/workflows/ci-web.yml` matching the trigger path), providing immediate validation of the bump itself.

## Validation criteria for /redteam

```bash
# 1. No Node-20 reference remains anywhere
grep -rn "node.version.*20\|node-version: '20'\|engines.*node.*20" \
  .github/ web/package.json compiler/package.json
# Expected: zero matches

# 2. New CI workflow exists with both Node versions in matrix
grep -E "node-version:.*\[.*22.*24.*\]|node-version:.*'22'|node-version:.*'24'" \
  .github/workflows/ci-web.yml
# Expected: matches showing matrix [22, 24]

# 3. engines.node declared in both packages
node -e 'console.log(JSON.stringify(require("./web/package.json").engines))'
node -e 'console.log(JSON.stringify(require("./compiler/package.json").engines))'
# Expected: {"node":">=22.0.0"} for both

# 4. @types/node bumped in compiler
grep '"@types/node"' compiler/package.json
# Expected: "^24.0.0"
```

## Open items for /implement

- [ ] Confirm GitHub's official Node 20 deprecation announcement URL (search `runner-images` repo issues OR `actions/setup-node` README) — link in PR body for traceability.
- [ ] Run `npm ci && npm run build && npm run test:run && npm run lint` locally on Node 24 in `web/` BEFORE opening the PR (per `git.md` § "Pre-FIRST-Push CI Parity Discipline"). Same for `compiler/`.
- [ ] Run the same on Node 22 in `web/` to verify the declared floor.
- [ ] Regen `compiler/package-lock.json` after `@types/node` bump.
