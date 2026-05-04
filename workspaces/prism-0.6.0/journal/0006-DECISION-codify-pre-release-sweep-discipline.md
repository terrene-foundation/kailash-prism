---
type: DECISION
date: 2026-05-03
created_at: 2026-05-03T09:00:00Z
author: agent
project: prism-0.6.0
topic: Codify the pre-release lint+type-guard sweep as /release discipline, not a per-cycle decision
phase: codify
tags: [release, codify, lint, type-safety, discipline, pre-release-sweep]
---

# Codify pre-release sweep into /release discipline

## Decision

The pre-release lint + type-guard sweep is a **discipline** of `/release`, not a
per-cycle decision. Lift the lesson from journal 0004 (M01 latent type-guard
sweep + M02 missing-eslint-dep) into `/codify` proposal entries so:

1. The next `/release` cycle runs the sweep deterministically as a pre-flight gate.
2. Future projects inherit the gate on `/sync` from loom.
3. The "frontload OR surface-each-release" question stops being asked.

Open question 3 from session-notes ("frontload sweep at start of each release cycle,
OR continue surfacing-on-each-release as 0.6.0 did?") is dissolved: neither
framing is correct. The sweep IS part of `/release`. It is not optional, and it is
not deferred to a separate "lint shard."

## Alternatives considered

### A. Per-cycle decision (status quo)

Each release cycle decides whether to run a lint sweep up front, based on
how recently the codebase was touched. **Rejected:** This is the exact
"deferred warnings" failure mode `zero-tolerance.md` Rule 1 calls out. The
0.6.0 cycle proves it: the eslint dep gap (Finding 3) had been live in
`web/package.json` for an unknown period AND the latent `row[col.field]`
type-guards (Finding 1) survived multiple PRs because they were only
visible after a specific type-relaxation.

### B. Frontload as a dedicated sweep shard at /todos time

Run a lint+type sweep as the first shard of every release cycle, before
any feature shards land. **Rejected:** This couples sweep cadence to
release cadence. If the release cycle is short (single-feature 0.6.1 patch),
the sweep is overkill. If it's long (multi-feature 0.7.0), one frontloaded
sweep doesn't catch type drift introduced by the feature shards themselves
(which is exactly what M01's latent guards were).

### C. Codify into /release pre-flight (chosen)

Make the sweep a step inside `/release`, not a separate shard. The sweep
runs against the release commit, after all feature shards have landed.
This catches BOTH pre-existing latent issues (Finding 3 class) AND
issues introduced by the in-flight cycle (Finding 1 class). One discipline,
both classes covered.

## Implementation plan

### Step 1 — Update /release skill instructions (working tree only, not committed)

`.claude/skills/10-deployment-git/SKILL.md` already documents the release
flow. Add a "Pre-Release Sweep" pre-flight section that mandates:

```bash
# Pre-flight (before tag push):
cd web
npm run lint -- src/      # MUST pass; Finding 3 lesson
npm run typecheck         # MUST pass; relax-aware type sweep
```

If either fails, `/release` aborts and the agent fixes the failures
in a release-cycle commit BEFORE the tag push. NOT a separate PR;
NOT a follow-up issue. Per `zero-tolerance.md` Rule 1.

### Step 2 — Codify proposal for loom upstreaming (working tree only)

`.claude/.proposals/latest.yaml` (status: pending_review) — add an entry
under `changes:` capturing this discipline as a global rule candidate
for loom's `rules/deployment.md` or sibling. Per `artifact-flow.md` MUST
"Append, Never Overwrite Unprocessed Proposals" — append, do not replace.

### Step 3 — `/release` deterministic checklist

Augment the 10-step deploy checklist (per `deploy-hygiene.md` Rule 8)
with explicit "Pre-flight: lint OK, typecheck OK" boxes BEFORE
"Build" and "Pack tarball." This makes the sweep visible in the
`/release` output, so a missing tick is loud not silent.

## Why this matters beyond 0.6.0

Two compounding lessons from journal 0004:

1. **Latent type guards survive feature shards** when the type system is
   ambient (`field: string & keyof T` was load-bearing for safety AT the
   read site, but the safety was invisible — the render coalesce looked
   like the guard, so reviewers missed that the value-extraction was
   unguarded). Only the type-relaxation step surfaced the bug class.
2. **Pre-existing tooling gaps survive indefinitely** (eslint missing
   from devDependencies for an unknown period; `npm run lint` was a
   no-op the entire time). Without a deterministic sweep gate,
   tooling-script gaps are invisible at the SDK-consumer level —
   nothing fails LOUDLY because the tool is missing, the script just
   exits with `command not found` and CI never catches it.

The sweep gate closes both classes in one structural move.

## Consequences

- `/release` cycle adds ~30s of lint + ~30s of typecheck overhead.
  Negligible relative to build + tarball pack + tag push (~3 min total).
- Releases that fail the sweep gate get fixed BEFORE tag push, not after.
  No more "ship 0.6.0, follow-up 0.6.1 to add eslint" patterns.
- Loom proposal flows the discipline to other USE templates (kailash-py,
  kailash-rs, downstream consumers) on next /sync — same lesson, no
  re-discovery cost per project.

## Follow-up actions

- [ ] Working-tree edit `.claude/skills/10-deployment-git/SKILL.md`
      to add the Pre-Release Sweep pre-flight section.
- [ ] Working-tree append to `.claude/.proposals/latest.yaml` (NOT
      replace — per `artifact-flow.md`) with the global-rule candidate
      entry.
- [ ] User commits both as a `chore(codify): pre-release sweep discipline`
      PR. (Per BUILD-repo rule, agent does NOT commit on user's behalf.)

## For Discussion

1. **Counterfactual on prior-art coverage** — does the existing
   `zero-tolerance.md` Rule 1 ("warnings are errors the framework chose to
   keep running through") implicitly cover this? Specifically: was the
   eslint gap a Rule 1 violation that should have been caught at
   `/redteam` of the 0.5.0 cycle? If so, the discipline gap is in
   `/redteam` enforcement, not `/release` — and the right fix is
   strengthening the `/redteam` mechanical sweeps (per `agents.md`
   "Reviewer Mechanical Sweeps") to grep `package.json` scripts against
   declared `devDependencies`.

2. **Specific data on lint sweep yield** — across 0.5.0 and 0.6.0
   combined, the sweep would have caught: 1 missing devDep (eslint),
   7 latent type errors (M01 row[col.field] sites), 1 noUnusedLocals
   surface (M02 phantom). 9 findings across 2 cycles. Is that high
   enough to justify the gate as a pre-flight, or is it noise relative
   to the volume of clean releases the sweep would gate-keep needlessly?

3. **Sweep scope creep** — once we have a "pre-release sweep" gate,
   the natural pressure is to add more checks (security scan, bundle
   size diff, peer-dep audit, license check). Where do we cap scope?
   Proposal: cap the gate at "tools the project's package.json already
   declares" — lint + typecheck if both are scripts. New tools require
   their own /codify cycle to add. Avoids the "kitchen sink pre-flight"
   anti-pattern that makes /release an hour-long ritual.
