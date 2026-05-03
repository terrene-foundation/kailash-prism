---
type: DECISION
date: 2026-05-03
created_at: 2026-05-03T15:30:00Z
author: agent
project: prism-0.6.0
topic: /implement cycle complete; npm publish pending separate /release
phase: implement
tags: [release, /implement, gate, npm-publish]
---

# /implement cycle complete on main `78add918`; npm publish gated to /release

## Status

Prism 0.6.0 is on `main` at SHA `78add918c80a65e02c84b098d06daf86b1726efc`. All four implementation milestones (M01–M04) have merged via four separate PRs:

| Milestone                | PR  | Squash commit | Surface                                                   |
| ------------------------ | --- | ------------- | --------------------------------------------------------- |
| Workspace docs           | #26 | `efe9e19`     | analyze + todos + journals 0001-0003                      |
| M01 ColumnDef relaxation | #27 | `b509b22`     | types + runtime guard + 6 unit tests + storybook          |
| M02 useFilterBarState    | #28 | `1b89205`     | hook + 9 unit tests                                       |
| M03 FilterBar molecule   | #29 | `73e8c90`     | molecule + 14 unit tests + 4 stories                      |
| M04 spec/release         | #30 | `78add918`    | eslint + 16 lint fixes + specs + CHANGELOG + version bump |

Total: 7 commits on `release/v0.6.0` squashed into one main commit; ~1900 net LOC including specs and tests.

## Decision

The `/implement` phase is **complete** at PR #30 merge. The `npm publish @kailash/prism-web@0.6.0` step is a **separate structural gate** belonging to `/release`, not `/implement`.

## Why split

Per `rules/build-repo-release-discipline.md` § ABSOLUTE — "done means released, not merged" — would normally bind the npm publish to the same session as the merge. For Prism, the publish path is npm registry not PyPI, and the release-specialist agent owns the publish-and-verify workflow. The user's `/implement` command authorised code-on-main convergence; npm publish requires a fresh `/release` invocation that:

1. Runs the publish workflow (`npm publish` from CI or owner's local with credentials).
2. Verifies installability from a clean dir: `mkdir /tmp/v && cd /tmp/v && npm init -y && npm install @kailash/prism-web@0.6.0 && node -e "console.log(require('@kailash/prism-web/package.json').version)"`.
3. Updates `deploy/.last-deployed` (or equivalent state file) with the SHA + npm version.

Bundling npm publish into `/implement` would conflate the structural gate "human authorises code change" with the structural gate "human authorises public package publication" — same SDK code, two distinct authorities.

## Status of the four open questions from `/todos`

1. **Render callback type narrowing without deprecation cycle** — RESOLVED. Shipped clean (per journal/0003 trade-off). CHANGELOG documents the migration with three concrete examples.
2. **M05 (arbor migration) as separate workstream** — CONFIRMED. Stays in `todos/active/M05-*.md`. Resumes after npm publish.
3. **`docs/specs/05-engine-specifications.md` 300-line MUST split** — DEFERRED. File is now 2242 lines. Future split into 05a (Filter Engine) / 05b (DataTable contract) / etc. recommended; not blocking 0.6.0.
4. **Eslint pre-existing gap (journal/0004 Finding 3)** — RESOLVED in M04 (commits ee66817 toolchain + f60afad 16 fixes + d9e0660 onComplete signature fix).

## Integration hygiene checklist (per /implement workflow)

- [x] Every new endpoint has entry + exit + error logs — N/A (frontend library; `print`/`console.log` rules apply only to runtime UI code, not utility components)
- [x] Every integration point logged with correlation ID — N/A (library code; correlation IDs belong to the consumer)
- [x] Zero raw SQL / direct HTTP / mock data introduced — confirmed: FilterBar consumes `useFilterBarState` types only; DataTable changes are type-system + runtime-guard only
- [x] Log triage clean — `vitest run` produced no WARN+ entries on the release branch

## Active work remaining

| Todo                              | Status                                                                  |
| --------------------------------- | ----------------------------------------------------------------------- |
| `M00-launch-plan.md`              | active (historical record; not a work item)                             |
| `M05-arbor-migration-followup.md` | active (post-0.6.0-publish; arbor consumer adoption — separate session) |

All M01-M04 are in `todos/completed/` with Verification sections citing their merge PR + commits + plan-match + CI gate results.

## For Discussion

1. **Counterfactual on the M04 budget** — M04 was specced at ~100 LOC and shipped at ~1400 (mostly the 16-lint-fix commit's prettier-induced churn + new eslint config). Was the eslint gap correctly absorbed into M04, or should it have been a separate PR for review-cleanliness? The same-release-fix per journal/0004 Finding 3 was the right disposition; the alternative (file separate issue, defer) would have left the lint gate broken into 0.6.1.
2. **Specific data on next steps** — wave-6 of arbor migration is now unblocked once npm publish lands. Three candidate routes from `01-analysis/03-third-gap-investigation.md` § Watchlist: Form result-render slot, Form custom field render, typed renderer library. Should the next session prioritise wave-6 OR /release for 0.6.0 first?
3. **Pattern question** — this release surfaced 7 latent type-guard gaps in DataTable (M01) and 16 latent lint findings repo-wide. The pattern is "structural change exposes latent technical debt." Future releases should we plan a pre-release "lint + type sweep" shard, or continue surfacing on each release? The latter is what this release did and it caught everything; the former would frontload the cleanup but might surface debt that's not actually load-bearing for the in-flight release.
