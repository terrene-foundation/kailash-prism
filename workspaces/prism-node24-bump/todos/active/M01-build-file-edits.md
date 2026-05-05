---
shard: 1
release: node24-bump
estimated_loc: 50
specialist: none (workflow + manifest only)
worktree: none (TypeScript build — no cargo lock contention)
branch: chore/node24-bump-implementation
parallel_with: none
blocks: M02
---

# M01 — Build: stage all file edits

## Goal

Stage all five changes locked in `01-analysis/02-decisions-locked.md` Decisions 1–4, plus the regenerated `compiler/package-lock.json`. NO commits in this milestone — staging only. Validation in M02 before commits.

## Tasks

### File edits

- [ ] **T01** — `.github/workflows/release-web.yml`:
  - Line 21: `uses: actions/checkout@v4` → `uses: actions/checkout@v5`
  - Line 24: `uses: actions/setup-node@v4` → `uses: actions/setup-node@v5`
  - Line 26: `node-version: '20'` → `node-version: '24'`
  - Verify line 99 (`softprops/action-gh-release@3bb12739c298aeb8a4eeaf626c5b8d85266b0e65`) UNCHANGED.

- [ ] **T02** — `.github/workflows/ci-web.yml` (new file). Body per `02-plans/01-implementation-plan.md` § "Pseudocode for the new ci-web.yml". Key invariants:
  - Trigger paths: `web/**`, `.github/workflows/ci-web.yml`
  - `push: branches: [main]` arm for green-on-main signal
  - `concurrency.cancel-in-progress: true`
  - Matrix: `node-version: ['22', '24']`, `fail-fast: false`
  - Steps in order: `npm ci`, `npm run lint`, `npm run build`, `npm run test:run`
  - All steps `working-directory: web`
  - Same cache config as release-web.yml (`cache: 'npm'`, `cache-dependency-path: web/package-lock.json`)

- [ ] **T03** — `web/package.json`: add (or update if empty) `"engines": { "node": ">=22.0.0" }` field. Maintain alphabetical key ordering relative to existing top-level keys.

- [ ] **T04** — `compiler/package.json`: same as T03. AND bump `"@types/node": "^22.15.0"` → `"@types/node": "^24.0.0"` in `devDependencies`.

- [ ] **T05** — `cd compiler && npm install` (NOT `npm ci` — we need the lockfile to update). This regenerates `compiler/package-lock.json` against the new `@types/node@^24.0.0` constraint. Verify the regenerated lock resolves `@types/node` to a `24.x.x` version.

### Verification (no commits yet)

- [ ] **T06** — `git status --short` should show:
  - `M .github/workflows/release-web.yml`
  - `?? .github/workflows/ci-web.yml`
  - `M web/package.json`
  - `M compiler/package.json`
  - `M compiler/package-lock.json`
  - **NO other modifications**. If anything else appears, STOP and investigate before proceeding.

- [ ] **T07** — `git diff --stat web/src/ compiler/src/ web/dist/ compiler/dist/` MUST be empty (zero source/dist edits).

- [ ] **T08** — `grep -rn "node.version.*20\\|node-version: '20'\\|engines.*node.*20\\|@types/node.*22" .github/ web/package.json compiler/package.json` returns zero matches. (The grep at this point validates T01–T04 individually before M02's local validation runs.)

### Coordination

- [ ] **T09** — DO NOT commit anything in this milestone. Staging only.
- [ ] **T10** — DO NOT touch `web/CHANGELOG.md`. The bump is infrastructure, not a release; CHANGELOG is for `web-v*` semver bumps.
- [ ] **T11** — DO NOT touch `compiler/package-lock.json` manually — only `npm install` regen.
- [ ] **T12** — DO NOT bump any package other than `@types/node`. The brief and decisions doc explicitly scope dep changes to `@types/node` alone; any other lockfile drift in `compiler/` after T05 is a leak.

## Acceptance criteria

- [ ] T06 grep returns exactly the 5 expected files
- [ ] T07 returns empty (no source code touched)
- [ ] T08 grep returns zero matches
- [ ] `compiler/package-lock.json` resolves `@types/node` to `24.x.x`
- [ ] `release-web.yml` line 99 still pins `softprops/action-gh-release` by SHA

## Risks

- **Lockfile drift on compiler T05**: `npm install` may bump transitive deps unrelated to `@types/node` if their semver ranges allow. Mitigation: `git diff compiler/package-lock.json` after T05 should show ONLY `@types/node` and its sub-dependencies changing. If broader drift, consider `npm install --no-save @types/node@^24.0.0` then commit only the relevant lockfile lines (rare; default behavior is acceptable for `^` ranges).
- **`engines.node` placement breaks JSON**: malformed JSON in package.json silently breaks `npm ci` later. Mitigation: `node -e "require('./web/package.json')" && node -e "require('./compiler/package.json')"` after T03+T04 validates both parse.

## References

- Brief: `briefs/0001-node24-bump.md`
- Decisions: `01-analysis/02-decisions-locked.md`
- Plan: `02-plans/01-implementation-plan.md`
