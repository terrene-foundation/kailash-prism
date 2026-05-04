---
type: DECISION
date: 2026-05-04
created_at: 2026-05-04T00:00:00Z
author: agent
project: prism-0.6.0
topic: /codify pass complete — five lessons routed via proposal upstream, no local globals edited
phase: codify
tags: [codify, knowledge-capture, proposal, upstream, variant-parity]
---

# /codify pass complete

## Decision

The prism-0.6.0 `/codify` pass routes ALL cross-project lessons through
`.claude/.proposals/latest.yaml` (appended, status remains `pending_review`)
and writes ZERO edits to local global artifacts under `.claude/rules/`,
`.claude/skills/`, or `.claude/agents/`.

This is a deliberate departure from the literal `/codify` Step 3-4 workflow
("Update existing agents and skills in their canonical locations").

## Why local globals are NOT edited

`.claude/rules/`, `.claude/skills/`, and `.claude/agents/` are loom-curated
artifacts that flow into this repo via `/sync`. Editing them locally would:

1. **Violate `cross-cli-parity.md` MUST 1** — the neutral-body slot must be
   byte-identical across CC / Codex / Gemini emissions. A local edit creates
   silent CLI-emission drift the next time loom syncs.

2. **Violate `variant-authoring.md` MUST 1** — variants are slot replacements,
   not whole-file replacements. A local rule edit IS a whole-file replacement
   relative to the global.

3. **Be silently overwritten on next `/sync`** — loom's `coc-sync` agent
   distributes the canonical (loom-classified) version, blowing away local
   edits. The "immediate local use" benefit lasts until the next sync; the
   institutional knowledge benefit lives entirely in the proposal.

4. **Bypass loom's Gate-1 classifier** — every cross-project lesson SHOULD be
   classified as global / variant / skip by a human reviewer at loom. Local
   edits make that classification a no-op.

## What WAS written

| Artifact                                    | Type            | Cross-project lift? |
| ------------------------------------------- | --------------- | ------------------- |
| journal 0001-0005 (already existed)         | Project journal | N/A                 |
| journal 0006 — pre-release sweep discipline | Project journal | YES (via proposal)  |
| journal 0007 — this entry                   | Codify closure  | N/A                 |
| `.claude/.proposals/latest.yaml` (appended) | Upstream lift   | YES                 |
| `.claude/learning/learning-codified.json`   | Codify ledger   | N/A                 |

## What's in the proposal append

Per `artifact-flow.md` MUST "Append, Never Overwrite Unprocessed Proposals":
the existing 2026-04-14 wave-1 + 2026-04-14 wave-2 entries are preserved.
Status remains `pending_review` (correct — none of the new entries have been
classified by loom yet).

**Source-file entries** (matching existing format):

- `web/package.json` (0.5.0 → 0.6.0 + eslint devDep)
- `web/src/engines/data-table/types.ts` (ColumnDef.field relaxation)
- `web/src/engines/data-table/data-table-body.tsx` (latent guard fix)
- `web/src/engines/data-table/data-table-mobile.tsx` (latent guard fix)
- `web/src/molecules/filter-bar/use-filter-bar-state.ts` (new hook)
- `web/src/molecules/filter-bar/filter-bar.tsx` (new molecule)
- `docs/specs/05-engine-specifications.md` (§ Filter Engine added)
- `web/CHANGELOG.md` (0.6.0 entry)
- All six prism-0.6.0 journal entries

**Cross-project rule_candidate entries** (new section):

1. `type-relaxation-surface-sweep` — when relaxing a type constraint that
   was load-bearing for runtime safety, sweep value-extraction sites
   SEPARATELY from rendering sites. (Origin: journal 0004 Finding 1)
2. `phantom-field-noUnusedLocals` — phantom-field convention for TS
   type-parameter symmetry under strict mode + JSDoc `@phantom` tag
   to prevent dead-code cleanup. (Origin: journal 0004 Finding 2)
3. `script-tool-manifest-sanity` — every package.json scripts /
   pyproject.toml [project.scripts] / Cargo task referencing a named
   tool MUST appear in declared dev-dependencies. Mechanical sweep at
   /redteam. (Origin: journal 0004 Finding 3)
4. `pre-release-sweep-discipline` — /release MUST run lint+typecheck
   pre-flight using the project's declared commands. Failures abort
   /release; fix in same release cycle, not follow-up PR. (Origin:
   journal 0006)

Each candidate carries: target file suggestion, origin grounding,
do/do-not examples, BLOCKED-rationalizations enumeration, generalization
claim with cross-language evidence.

## Red team

`cc-architect` validated the four `rule_candidate` entries against
`rule-authoring.md` (Loud / Linguistic / Layered), `cc-artifacts.md`
(length budgets), `cross-cli-parity.md` (neutral-body invariance), and
origin grounding. **Findings:**

| Candidate                       | Verdict          | Disposition                                                                                                                                                                                   |
| ------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type-relaxation-surface-sweep` | NEEDS-REVISION   | Revised in proposal: added MUST/MUST NOT, BLOCKED list, paths frontmatter, slot-marker partition. Dart claim DROPPED (sound null-safety has no analogue).                                     |
| `phantom-field-noUnusedLocals`  | REJECT (re-tier) | Reclassified as **skill-embedded** (TS-only), not global rule. Cross-language framing was unsupported.                                                                                        |
| `script-tool-manifest-sanity`   | NEEDS-REVISION   | Revised in proposal: added paths frontmatter (`**/package.json`, `**/pyproject.toml`, `**/Cargo.toml`), MUST NOT clauses, BLOCKED list, audit protocol.                                       |
| `pre-release-sweep-discipline`  | REJECT (fold-in) | **Withdrawn as standalone**; restructured as a clause-append to existing `agents.md § Reviewer Mechanical Sweeps`. Avoids duplicating zero-tolerance Rule 1 + existing mechanical-sweep gate. |

**Cross-cutting fix:** All four originally lacked the verbatim
`BLOCKED rationalizations:` enumeration that `rule-authoring.md` MUST 2
mandates. Every revision adds this block.

**Per autonomous-execution Rule 4** (same-bug-class gaps surfaced during
review fit one shard → fix now, do not file follow-ups), all four
revisions landed in the SAME `/codify` shard rather than as a separate
"revise-proposal" task in a future session.

## Steps not executed and why

| Step | Reason for skip                                                          |
| ---- | ------------------------------------------------------------------------ |
| 3    | Local-globals edits violate variant/parity — see "Why" above             |
| 4    | Same                                                                     |
| 5    | No user-facing docs added; specs were updated during /implement (PR #29) |

## Consequences

**Immediate:** No new local globals to discover-and-trip-over in the next
session. Lessons are accessible via journal 0006 (active in this repo) and
proposal (active until loom classifies and syncs back).

**At next loom `/sync`:** Loom's sync-reviewer reads the proposal, classifies
each rule_candidate as global / variant-prism / skip. Approved candidates
land in `.claude/rules/<name>.md` (or sibling) on next sync to this repo,
overwriting nothing because no local global was created.

**At next prism cycle:** The four cross-project lessons are either now
loom-canonical (if approved) or still pending in the proposal (if loom
hasn't classified yet). Either way the institutional knowledge is preserved.

## Follow-up actions

- [ ] **User commits the working-tree changes** to a `chore(codify): prism-0.6.0
  lessons` branch + PR. (Per BUILD-repo rule, agent does NOT commit.)
      Files staged for commit:
  - `workspaces/prism-0.6.0/journal/0006-DECISION-codify-pre-release-sweep-discipline.md` (created)
  - `workspaces/prism-0.6.0/journal/0007-DECISION-codify-pass-complete.md` (created — this file)
  - `.claude/.proposals/latest.yaml` (appended)
  - `.claude/learning/learning-codified.json` (created)

- [ ] **Loom-side `/sync` Gate 1** reviewer classifies the four
      rule_candidate entries as global / variant-prism / skip.

- [ ] **cc-architect findings** (background) — surface to user when
      complete; route any NEEDS-REVISION findings to the proposal as
      revisions before loom Gate-1 review.

## For Discussion

1. **Counterfactual on the local-globals skip** — is the deliberate
   no-edit-of-local-globals stance the RIGHT autonomous interpretation
   of the `/codify` workflow, or did I over-rotate on variant/parity
   concerns? The literal Step 3-4 says "update existing agents and
   skills in their canonical locations." If the protocol's intent is
   "write to canonical regardless of overwrite risk because that's how
   /sync flow knows to converge," then I'm wrong. If the protocol's
   intent is "write what makes sense given the architecture," I'm right.
   Loom's `/codify` skill description (and `cc-architect`'s reading of
   it) decides which framing wins. Worth asking the user explicitly
   when they next codify in a different USE-template repo to validate
   the pattern.

2. **Specific data on proposal yield** — Wave-1 (Phase 2) added 14 entries;
   Wave-2 added 17 entries; this prism-0.6.0 codify added 16 entries
   (12 source-file + 4 rule_candidate) — total 47 entries pending Gate-1
   classification at loom. At the current rate of unprocessed accumulation,
   when does the proposal cross the threshold where Gate-1 review becomes
   prohibitively expensive (suggesting more frequent /sync runs, or a
   per-cycle proposal-archive policy)?

3. **rule_candidate format vs file-change format** — the existing wave-1/
   wave-2 entries use `file: <path> + action: created/modified`. The four
   new rule_candidate entries use a different shape (`rule_candidate:
<slug> + target: <path-suggestion>`). Loom's sync-reviewer needs to
   handle both shapes. Is the dual format an asset (signals "rule proposal,
   not file change") or a liability (Gate-1 reviewer has to context-switch
   shape per entry)? Worth codifying the rule_candidate shape into
   `guides/co-setup/09-proposal-protocol.md` if it becomes a recurring
   pattern.
