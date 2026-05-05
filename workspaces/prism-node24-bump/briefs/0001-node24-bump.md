---
type: brief
date: 2026-05-06
project: kailash-prism
deadline: 2026-06-02
related_issues: []
---

# Prism Node 24 Bump

## Goal

Land the Node 20 → Node 24 upgrade for `kailash-prism`'s release pipeline before GitHub Actions force-cuts Node 20 on 2026-06-02 (~27 days from this brief). Pair with the recommended `actions/setup-node@v5` and `actions/checkout@v5` major bumps and close the PR-time validation gap (no current CI workflow validates the build before tag-push).

## Why now

The session note for `prism-0.6.0` flagged this trap:

> **Node 20 deprecation** in `.github/workflows/release-web.yml` — NOT a 5-min YAML edit. Forced upgrade to Node 24 begins 2026-06-02. Need setup-node@v5 / checkout@v5 verification + Vite/TS Node-24 compat sweep. Spin up `workspaces/prism-node24-bump/` as a proper micro-workspace ~2026-05-25.

Opening 19 days earlier than the suggested ~2026-05-25 window. Rationale: the working tree is clean (PRs #34 + #35 just landed), no in-flight prism workstream is competing for budget, and the bump's failure mode is "tag push silently fails on 2026-06-02" — every day it lands earlier is one fewer day of release-blocked exposure.

## Scope (in)

1. `.github/workflows/release-web.yml` — bump `actions/checkout` v4 → v5, `actions/setup-node` v4 → v5, `node-version` 20 → 24.
2. New PR-time CI workflow (`.github/workflows/ci-web.yml` or similar) that exercises `npm ci && npm run build && npm run test:run && npm run lint` on Node 24 against every PR touching `web/`. Currently NO PR-time CI exists; the bump cannot be validated pre-merge without it.
3. Declare a `engines.node` minimum in `web/package.json` and `compiler/package.json` so consumers see the floor explicitly. Pin choice (>=22 LTS vs >=24) is a `/analyze` decision.
4. Verify Node-24 compatibility of the runtime dependency graph: `typescript@^5.8.0`, `vitest@*`, `eslint@*`, transitive `vite` (vitest dep), `@types/node`. Surface any version that needs bumping.

## Scope (out)

- Compiler package release workflow (no `release-compiler.yml` exists yet; out of scope for this bump). When that workflow ships, it MUST default to Node 24 by inheriting the conventions established here.
- Flutter / pub.dev side (`flutter/`, `kailash_prism`) — Dart toolchain is unaffected by Node deprecation.
- Tauri Rust side (`tauri-rs/`) — Rust toolchain is unaffected.
- Any code change inside `web/src/`, `compiler/src/`, etc. The bump is workflow + manifest only unless a Node-24 incompatibility forces a code-side fix (in which case it gets surfaced in `/analyze` and re-scoped).

## Inputs

### Current-state observations (2026-05-06, verified)

- Single workflow file at `.github/workflows/release-web.yml`, triggered only on `web-v*` tag push. No PR-time CI workflow exists. (Verified: `ls .github/workflows/`.)
- Action pins in that workflow: `actions/checkout@v4`, `actions/setup-node@v4`, `softprops/action-gh-release@3bb12739c298aeb8a4eeaf626c5b8d85266b0e65` (already SHA-pinned, v2.6.2 — no action needed).
- Node version pinned to `'20'` (line 26 of release-web.yml).
- Build chain: `tsc` (TypeScript compiler) — Vite is **not** in the build path despite being a vitest peer dep. Test chain: `vitest`. Lint: `eslint`.
- Both `web/package.json` and `compiler/package.json` declare `engines: {}` (empty object) and have no `packageManager` field. Both pin TypeScript at `^5.8.0`.

### Decisions deferred to /analyze

1. `engines.node` minimum: `>=22.0.0` (current LTS, supported through April 2027) vs `>=24.0.0` (current — narrower consumer base). The release pipeline will pin 24; the **declared** consumer minimum is the open question.
2. Whether to add `packageManager` field (`npm@<version>`) for reproducibility, or rely on default GHA-installed npm.
3. Whether the new PR-time CI workflow runs the matrix `node-version: [22, 24]` (broader compat signal) or just `24` (release-pipeline parity).
4. Whether tarball-distribution consumers (per `web/package.json`'s GitHub-release tarball model) need an `engines.node` warning when they install on older Node. Distribution is GitHub-only per `feedback_prism_distribution.md`.

## Out of scope (explicit)

- Any change to `compiler/`, `flutter/`, `tauri-rs/` source code beyond the manifest `engines` field.
- Any test added to `tests/regression/` covering Node-24 specific behavior — the existing test suite IS the regression. If anything fails on 24, that's a real bug, not a regression-test gap.

## Success criteria

- `release-web.yml` runs cleanly on Node 24 against the v0.6.0 tag (or a synthetic test tag) with all four steps passing: `npm ci`, `npm run build`, `npm pack`, version match.
- New CI workflow gates every PR touching `web/` on Node 24 (and matrix decision per /analyze).
- `engines.node` declared in both `web/` and `compiler/` package.json.
- Bump merges to `main` no later than 2026-05-30 (3-day buffer before the 2026-06-02 force-cut).

## Phases

| Phase        | Output                                                                                                     | Gate                     |
| ------------ | ---------------------------------------------------------------------------------------------------------- | ------------------------ |
| `/analyze`   | Failure-point list, dependency-version sweep, two `engines.node` options with recommendation               | Brief decisions resolved |
| `/todos`     | M01 workflow bump, M02 PR-CI workflow, M03 engines field, M04 verify (one tag push or synthetic)           | Plan approved            |
| `/implement` | Bump landed; CI workflow live; PR shows green CI on Node 24                                                | All todos closed         |
| `/redteam`   | One round; verify NO Node-20 reference remains in any workflow OR package.json `engines`                   | Round green              |
| `/codify`    | Lessons → `.claude/.proposals/latest.yaml` for loom; institutional knowledge captured for future LTS bumps | Proposal appended        |

## References

- Prior release pattern: PR #30 (web v0.6.0 release) — the most recent execution of `release-web.yml`.
- GitHub Actions Node 20 deprecation announcement — to be linked once /analyze pulls the canonical URL.
- `feedback_prism_distribution.md`: GitHub-only distribution; tarball consumers don't go through npm registry.
