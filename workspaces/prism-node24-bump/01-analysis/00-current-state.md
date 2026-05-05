---
type: analysis
phase: 01-analysis
date: 2026-05-06
---

# Current State — Node Toolchain in kailash-prism

Verified observations as of 2026-05-06. Every claim below is grep-resolvable against `main` per `spec-accuracy.md` MUST 1.

## Workflow files

```
.github/workflows/
└── release-web.yml          (only file)
```

`ls .github/workflows/` returns exactly one file. **There is no PR-time CI workflow** — no `ci.yml`, no `test.yml`, no `pr-check.yml`. The release workflow only fires on `web-v*` tag push. This is the central validation gap for the bump: a Node 24 change cannot be exercised by CI before the merge to `main`.

## release-web.yml — relevant pins

| Step           | Action / Version                                             | Line |
| -------------- | ------------------------------------------------------------ | ---- |
| Checkout       | `actions/checkout@v4`                                        | 21   |
| Setup Node     | `actions/setup-node@v4`                                      | 24   |
| node-version   | `'20'`                                                       | 26   |
| GitHub Release | `softprops/action-gh-release@3bb127...` (v2.6.2, SHA-pinned) | 99   |

Trigger: `on: push: tags: ['web-v*']`. No `pull_request` or `workflow_dispatch` trigger.

## Build / test / lint scripts

From `web/package.json`:

| Script          | Command                               |
| --------------- | ------------------------------------- |
| `build`         | `tsc`                                 |
| `dev`           | `tsc --watch`                         |
| `test`          | `vitest`                              |
| `test:run`      | `vitest run`                          |
| `lint`          | `eslint src/`                         |
| `release:check` | `npm run build && npm pack --dry-run` |

Build is the TypeScript compiler — not Vite. Vite is a transitive dependency through `vitest` and only fires during test execution.

## Engine declarations

```json
// web/package.json + compiler/package.json
"engines": {}
"packageManager": (none)
```

Both packages declare an empty `engines` object — equivalent to no minimum. Neither declares `packageManager`. Consumers installing the tarball get no Node-floor signal from npm; nothing forces them onto a specific Node major.

## Toolchain versions (declared in package.json)

| Package  | Field                        | Value    |
| -------- | ---------------------------- | -------- |
| web      | `devDependencies.typescript` | `^5.8.0` |
| compiler | `devDependencies.typescript` | `^5.8.0` |

`vitest` and `eslint` versions were not in the snapshot read (only the script entries surfaced); the actual installed versions live in `web/package-lock.json` and need verification against the lockfile during `/analyze`.

## Distribution mode

Per `feedback_prism_distribution.md`: GitHub-release tarball, not npm registry. Consumers run `npm install https://github.com/.../web-v0.6.0.tgz` — no registry-side `engines` enforcement, but npm's local install does honor the `engines.node` field with a warning (or hard fail with `engine-strict=true`).

## Deadline arithmetic

- Today: 2026-05-06.
- Force-cut: 2026-06-02.
- Suggested workspace open per prior `.session-notes`: 2026-05-25.
- Buffer: 27 days from today, 3-day buffer before deadline if bump merges by 2026-05-30.

## Implications for /analyze

1. **Validation gap is the load-bearing constraint.** Without a PR-time CI workflow, the Node 24 bump cannot be tested except by (a) cutting a real release tag (irreversible), (b) running locally on Node 24 (no record), or (c) introducing the CI workflow as part of the same PR (preferred).
2. **The bump and the CI workflow are coupled.** Splitting them into two PRs means the bump PR has nothing to validate it; the CI workflow PR has nothing to validate. They MUST land together.
3. **`engines.node` is a separate decision** from the workflow bump. Both can land in one PR or in sequence; preference is one PR for atomicity, but `/todos` will arbitrate.
4. **No code is expected to change.** If `vitest` / `eslint` / `tsc` build or test successfully on Node 24, the workspace can close in a single shard. If anything fails, the failure becomes its own scoped fix (potentially expanding the workspace by one shard).
