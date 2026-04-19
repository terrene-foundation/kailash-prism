# Prism Distribution Options — GitHub-Only Alternatives to `/tmp/*.tgz`

Date: 2026-04-19
Status: Analysis — no code or config changes
Scope: Reduce re-pack friction while preserving the "GitHub-only, not npm/pub.dev/crates.io" constraint from `memory/project_distribution.md`.

## Current State

- Prism publishes via `npm pack` → `/tmp/kailash-prism-web-X.Y.Z.tgz`.
- Arbor's `apps/web/package.json` line 15: `"@kailash/prism-web": "file:../../../../../../../../tmp/kailash-prism-web-0.3.1.tgz"`.
- Every Prism version bump: `npm pack` → copy tarball → arbor `npm install` → verify.
- Session notes (wave-3) confirm this is the top ongoing friction; the `/tmp` path is fragile (machine-local, lost on reboot, not portable between contributors).

## Constraint

`memory/project_distribution.md` (2026-04-14): GitHub-only distribution is permanent. No npm registry, no pub.dev, no crates.io. Options below are evaluated within that envelope.

---

## Option 1 — GitHub Packages (npm registry scoped to @terrene-foundation)

**How it works.** Prism's release workflow runs `npm publish` targeting `https://npm.pkg.github.com` under the `@terrene-foundation` scope. Consumers add a `.npmrc` pointing `@terrene-foundation:registry` at GitHub Packages and install `@terrene-foundation/prism-web@X.Y.Z` like any other npm dep. The package bits live on GitHub, never on npmjs.com — satisfies the GitHub-only constraint.

- **Setup cost:** 1 session. Rename scope `@kailash/prism-web` → `@terrene-foundation/prism-web` (or keep `@kailash` and host under `terrene-foundation/kailash-prism`), add `publishConfig.registry` to `web/package.json`, add GitHub Actions release workflow with `GITHUB_TOKEN`, document consumer `.npmrc`.
- **Ongoing friction per version bump:** Zero-to-low. `git tag v0.4.0` → CI publishes. Arbor runs `npm install @terrene-foundation/prism-web@0.4.0`. No re-pack, no `/tmp` copy.
- **Auth story:** Every consumer developer AND every CI runner needs a GitHub PAT with `read:packages` scope in their `~/.npmrc` or environment. Private packages require `repo` scope too. This is the main sticking point — PATs rotate, new contributors hit a "401 Unauthorized" on first `npm install` until they configure auth.
- **Coexistence with `.tgz`:** Can coexist. The package name differs (scoped), so arbor could pin either the tarball OR the GitHub Packages version during cutover. Hard cutover is optional, not required.

## Option 2 — Git-URL Dependency

**How it works.** Arbor's `package.json` entry becomes `"@kailash/prism-web": "github:terrene-foundation/kailash-prism#v0.4.0"` (or `#main`). npm/pnpm clone the repo at install time. Because Prism's build output lives in `web/dist/` (not committed), this requires EITHER committing `web/dist/` to a release branch, OR adding a `prepare` script that runs `tsc` at install time on the consumer.

- **Setup cost:** 1 session IF going the `prepare` route (add `"prepare": "cd web && npm ci && npm run build"` to the root `package.json`, verify it works cross-platform). 1-2 sessions IF going the committed-dist route (add a `release/*` branch CI job that force-pushes `dist/` to a dedicated branch per tag).
- **Ongoing friction per version bump:** Low. Tag a release → arbor bumps the ref in `package.json`. BUT: npm's git-URL install is slow (full clone, every `npm install`, no tarball cache) and flaky on private repos without SSH keys configured. The `prepare` route also forces every consumer to have `typescript` + devDeps available at install time.
- **Auth story:** HTTPS git URLs against public repos = no auth. Private repos = SSH key OR PAT embedded in the URL. Terrene-foundation/kailash-prism is currently public (repository field in `package.json`), so `github:` URLs work without PATs — this is the lowest-friction auth story of the lot.
- **Coexistence with `.tgz`:** Can coexist. The manifest spec is just a string; arbor can switch between `file:` and `github:` per-repo. No hard cutover.

## Option 3 — Git Submodule / Path-Linked Workspace

**How it works.** Arbor adds `kailash-prism` as a git submodule under `apps/web/vendor/prism/` (or equivalent), then `package.json` uses `"@kailash/prism-web": "file:./vendor/prism/web"`. Arbor developers run `git submodule update --remote` to pull new Prism code.

- **Setup cost:** 1 session. Add submodule, update `package.json`, update arbor CI to `git submodule update --init --recursive` before `npm install`, document the workflow.
- **Ongoing friction per version bump:** Medium. Submodule pointer bumps are explicit — arbor developer runs `cd vendor/prism && git fetch && git checkout v0.4.0 && cd - && git add vendor/prism && git commit`. No re-pack, but the workflow is alien to npm-native developers and easy to forget (CI fails on half-initialized submodules). Also: arbor must run `npm install` inside the submodule path OR rely on `prepare` to build — both add install-time complexity.
- **Auth story:** Same as Option 2 — public repo = no auth. Submodules use the same git credentials as the parent repo clone.
- **Coexistence with `.tgz`:** Awkward. Submodule-based `file:` deps and `/tmp/*.tgz` `file:` deps can't both point at `@kailash/prism-web` — this is a hard cutover.

## Option 4 — pnpm/yarn Workspace (Requires Monorepo Move)

**How it works.** Move arbor into `~/repos/loom/` as a sibling of `kailash-prism`, create a workspace root (`pnpm-workspace.yaml` or `package.json#workspaces`), and arbor's `package.json` references `@kailash/prism-web` via workspace protocol (`"@kailash/prism-web": "workspace:*"`). Prism's `web/dist/` is built once per session and linked into arbor via symlink.

- **Setup cost:** 3-5 sessions. Physical repo move, CI pipeline reconfiguration (arbor currently lives in `~/repos/terrene/contrib/arbor`, which has its own git history, own CI, own deploy), workspace manager selection (pnpm recommended over npm workspaces for symlink semantics), dev server hot-reload verification across the workspace boundary.
- **Ongoing friction per version bump:** Zero. `tsc --watch` in Prism re-emits; arbor's Next dev server picks it up via symlink. No version bumps needed in development — Prism is always-latest in the workspace. Release-gated pinning returns only when arbor builds for production deploy.
- **Auth story:** Not applicable — everything is local checkout.
- **Coexistence with `.tgz`:** Hard cutover AND a cross-repo restructure. Arbor's existing GitHub remote, CI, and deploy pipeline all shift.

## Option 5 — Release-Branch Tarball Publish (Hybrid)

**How it works.** Prism's CI builds `web/dist/` on every tag and publishes a `.tgz` as a GitHub Release asset at `https://github.com/terrene-foundation/kailash-prism/releases/download/v0.4.0/kailash-prism-web-0.4.0.tgz`. Arbor's `package.json` references the URL directly: `"@kailash/prism-web": "https://github.com/terrene-foundation/kailash-prism/releases/download/v0.4.0/kailash-prism-web-0.4.0.tgz"`.

- **Setup cost:** 1 session. Add a release workflow that runs `npm pack` and uploads via `gh release create --attach`.
- **Ongoing friction per version bump:** Low. `git tag v0.4.0 && git push --tags` → CI attaches the tarball → arbor bumps URL in package.json. No PAT required for public repo.
- **Auth story:** Public repo = no auth (same as Option 2). Private repo = PAT in URL (worse than Option 1's scoped registry).
- **Coexistence with `.tgz`:** Clean. The only change is replacing a `file:/tmp/...` string with `https://github.com/.../...tgz` — same `.tgz` semantics, different source. Zero-cost cutover.

---

## Comparison

| Option           | Setup | Bump friction    | Auth burden       | `.tgz` coexists |
| ---------------- | ----- | ---------------- | ----------------- | --------------- |
| 1. GH Packages   | 1 ses | None (install)   | PAT for every dev | Yes             |
| 2. Git-URL       | 1 ses | None (ref bump)  | None (public)     | Yes             |
| 3. Submodule     | 1 ses | Medium (manual)  | None (public)     | No              |
| 4. Monorepo      | 3-5   | None (symlinked) | None (local)      | No              |
| 5. Release asset | 1 ses | None (URL bump)  | None (public)     | Yes             |

## Recommendation — Option 5 (Release-Branch Tarball Publish)

**Why.** Option 5 is the smallest possible delta from the current `.tgz` flow while eliminating every one of its pain points:

1. **Preserves the tarball model.** Arbor already consumes a `.tgz`. We keep the exact same semantics; only the source path moves from `/tmp/` (developer-local, fragile) to a GitHub Release asset (durable, URL-addressable, reproducible).
2. **No auth burden.** Terrene-foundation/kailash-prism is public — HTTPS URLs work everywhere (CI, every contributor, fresh machines, Docker builds) without PAT setup. Option 1 has the nicest install UX but imposes a PAT on every developer and every CI system, which is the one friction we explicitly wanted to avoid by going GitHub-only in the first place.
3. **One-session setup.** A single GitHub Actions job runs on tag push: `npm pack` → `gh release create v$VERSION --generate-notes web/kailash-prism-web-$VERSION.tgz`. No scope rename, no `.npmrc` distribution, no submodule training.
4. **Coexists with current `.tgz` flow.** During cutover, arbor can switch one line in `package.json` and validate. Rollback is the same one line. No hard cutover event.
5. **Release-tagged by construction.** Unlike `/tmp/*.tgz` (which has no relationship to git history), a Release asset is pinned to a tag — which makes `git bisect` on Prism-vs-arbor issues tractable.

**Why not Option 1 (GitHub Packages).** The developer UX is better (`npm install @foo/bar@1.2.3`), but every contributor now needs a PAT with `read:packages` in `~/.npmrc`. For a public GitHub-only project with a small contributor pool, that's a regression — Option 5 delivers 90% of the DX benefit with zero auth infrastructure.

**Why not Option 2 (Git-URL).** The `prepare` script approach forces every consumer to have Prism's devDependencies (typescript, @types/react, vitest) at install time, bloating CI images and slowing cold installs. Committing `dist/` to a release branch works but is the same work as Option 5 with uglier git history.

**Why not Option 3 (submodule).** Submodule workflow is alien to npm-native developers. The extra `git submodule update` step gets forgotten constantly, producing the same "works locally, breaks in CI" class of bug that dependencies.md Rule 1 warns against.

**Why not Option 4 (monorepo).** Best developer experience by a mile, but 3-5 sessions of cross-repo restructure for a problem that's solved by a single CI job. Keep this in reserve IF arbor + other downstream projects eventually consolidate into loom/.

## Implementation Sketch (Not Executing)

When the user is ready:

1. Add `.github/workflows/release.yml` to `kailash-prism` that, on tag push matching `v*`, runs `cd web && npm ci && npm run build && npm pack`, then `gh release create $TAG --generate-notes web/kailash-prism-web-*.tgz`.
2. Document in `web/CHANGELOG.md` (or a new `docs/distribution.md`) that consumers pin via `"@kailash/prism-web": "https://github.com/terrene-foundation/kailash-prism/releases/download/v$VERSION/kailash-prism-web-$VERSION.tgz"`.
3. Update arbor `apps/web/package.json` to use the Release-asset URL for 0.3.1 to validate the flow end-to-end. Keep the `/tmp` path available as fallback during the one cutover PR.
4. Update `memory/project_distribution.md` note to mention the Release-asset path as the canonical GitHub-only distribution.

## Cross-Reference Audit

- `memory/project_distribution.md` — constraint satisfied (GitHub only, not npm registry).
- `rules/dependencies.md` § "Declared = Imported" — Release-asset URLs are valid `package.json` specs; no rule violation.
- `rules/deploy-hygiene.md` — Prism is `type: sdk`, releases via `/release` not `/deploy`. Adding a tag-triggered CI job aligns with the existing release model.
- `web/CHANGELOG.md` (not yet read) — will need a distribution section added when implementing.
- Session notes line 50-52 — explicitly flagged this as pending work; this analysis closes the decision.

## Success Criteria

- [ ] Arbor `apps/web/package.json` contains no `file:/tmp/...` paths for Prism.
- [ ] Fresh-clone arbor contributor can `npm install` without any manual tarball copying.
- [ ] Prism version bump flow is: `git tag + push` → arbor `package.json` one-line URL bump → `npm install`.
- [ ] No PAT, no `.npmrc`, no submodule init required on any consumer machine.
- [ ] Prism releases are pinnable to git tags for bisect.
