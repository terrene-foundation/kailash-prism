---
type: GAP
date: 2026-05-08
session: /redteam-to-convergence
release: 0.6.0
input_main_sha: 78add91
finding_class: spec-accuracy / narrative coherence in secondary-artefact layer
severity: 6 MED + 1 LOW (post-R2; all fixed in-shard)
fix_disposition: same-shard fix-immediately per autonomous-execution.md MUST 4
---

# 0010-GAP — /redteam Round 1+2 surfaced systematic spec-accuracy drift in secondary-artefact layer

## What

`/redteam to convergence` against the merged 0.6.0 release (PRs #27-30) ran Round 1 with three parallel adversarial agents (security-reviewer, reviewer, value-auditor). All three returned **CONVERGED** verdicts on the convergence-blocker criteria (0 CRIT, 0 HIGH). However, 6 distinct MEDIUM findings + 7 LOW findings clustered in the **secondary-artefact layer** (specs, CHANGELOG, analyses, plans, stories), NOT in the implementation code itself. Code was clean; the documentation/spec authority surface around the code had drifted.

Round 2 closed all 6 actionable Round 1 MEDIUMs and 4 of 7 LOWs in-shard. It surfaced one additional LOW (R2-L-1: phantom `var(--prism-z-sticky)` token citation in `specs/components/filter-bar.yaml:66`), same bug class as MED-4, also fixed in-shard.

## Findings (deduped, post-fix)

| ID     | Class                                                                         | Source                     | Disposition                                                                                                                                               |
| ------ | ----------------------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MED-1  | type/runtime drift (`__rowType` phantom field)                                | security M-1 + value V-M-2 | Resolved: type widened to `T \| undefined`; runtime materialised                                                                                          |
| MED-2  | UX null-handling (searchPlaceholder=""`)                                      | security M-2               | Resolved: `placeholder?.trim() \|\| "Search"`                                                                                                             |
| MED-3  | type contract drift (stale `as T[keyof T]` cast contradicting 0.6.0 widening) | reviewer M-1               | Resolved: cast removed; mirrors sibling call sites                                                                                                        |
| MED-4  | spec accuracy (14 phantom `filter-bar.*` tokens not in code)                  | value V-M-1                | Resolved: rewritten to 13 actual `--prism-*` tokens with fallback chains                                                                                  |
| MED-5  | label hygiene (BLOCKING-1 collision across analyses + CHANGELOG)              | value V-M-3                | Resolved: fully-qualified `M-01 BLOCKING-X` / `M-02/M-03 BLOCKING-1`                                                                                      |
| MED-6  | narrative coherence (prospective LOC claim in present tense)                  | value V-M-4                | Resolved: forward-tense rewording with realisation gate                                                                                                   |
| R2-L-1 | spec accuracy (phantom `var(--prism-z-sticky)` in sticky description)         | reviewer R2-L-1            | Resolved: literal "z-index: 10" + file:line cross-ref                                                                                                     |
| LOW-1  | narrative accuracy (CHANGELOG misdescribed spec landing site)                 | reviewer L-1               | Resolved: now references companion file `05m-0.6.0-additions.md`                                                                                          |
| LOW-4  | citation accuracy (vapourware claim slightly wrong)                           | value V-L-1                | Resolved: reworded to accurate "mentioned in JSDoc, not declared as property"                                                                             |
| LOW-5  | narrative accuracy (Storybook overclaim)                                      | value V-L-2                | Resolved: "Storybook-compatible scenario exports (runner pending)"                                                                                        |
| LOW-6  | story consistency (3 different token-prefix conventions)                      | value V-L-3                | Resolved: normalised to `--prism-*` with fallback chains                                                                                                  |
| LOW-2  | docs trade-off                                                                | reviewer L-2               | **Deferred** — documented in source as accepted recompute-on-unstable-input                                                                               |
| LOW-3  | strict-mode posture                                                           | reviewer L-3               | **DEFERRED-AS-FALSE-POSITIVE** — `noUncheckedIndexedAccess: true` IS enabled in `tsconfig.json:6` (the agent looked at wrong path); guard IS load-bearing |
| LOW-7  | temporal staleness                                                            | value V-L-4                | **Deferred** — historical record per `spec-accuracy.md` Rule 6 (past-tense change logs are append-only)                                                   |

## Why this matters

Per `rules/spec-accuracy.md` Rule 1: **every cited symbol MUST resolve via grep / ast.parse / find against working code**. The 14 phantom `filter-bar.*` tokens (MED-4) and the phantom `var(--prism-z-sticky)` citation (R2-L-1) are textbook violations of this rule. A platform lead reading `specs/components/filter-bar.yaml` to learn "what tokens do I need to define for FilterBar to look right under my theme?" would have defined 14 tokens that the molecule never reads.

The label collision (MED-5) and prospective-as-present claim (MED-6) are softer narrative issues but compound across migrations: future grep-by-finding-tag silently disambiguates, and consumer expectations get set against unrealised numbers.

## Pattern observation

**The code shipped clean; the secondary artefact layer drifted.** This is consistent with `rules/spec-accuracy.md`'s framing: specs are domain truth and must track code. When two parallel adversarial agents (security + value) independently flag the same finding (`__rowType` phantom = M-1 + V-M-2), severity is reinforced — multi-perspective convergence on a single defect is a reliable signal that the defect is real.

**Three of three adversarial agents converged on `CONVERGED` for code; only the value-auditor + reviewer caught the spec-layer drift.** Suggests value-audit + spec-compliance perspectives are necessary alongside security to catch this class of drift. Worth keeping in the standard /redteam agent panel (already documented in the skill).

## Process notes for next session

1. **Convergence math**: Round 1 + Round 2 are NOT the "2 consecutive clean rounds" — Round 1 surfaced findings, Round 2 surfaced 1 NEW finding. Per the convergence definition, we need Round 3 + Round 4 to each be clean. Running 3 → confirmed.
2. **Round 1 → Round 2 fix-immediately**: `autonomous-execution.md` MUST 4 (same-class same-shard) DID apply. ~50 LOC of fixes across 8 files; well within shard budget. No follow-up issues filed.
3. **Working-tree state**: All fixes are in working tree, NOT committed. Per BUILD-repo Prudence, the user authorises the chore commit + PR as a separate action. Recommended commit shape: `chore(redteam): close 7 MED + 4 LOW findings from prism-0.6.0 redteam pass`.

## Cross-references

- Aggregate reports: `04-validate/01-round-1-aggregate.md`, `04-validate/08-round-2-aggregate.md`, `04-validate/12-round-3-aggregate.md` (when written)
- Round 1 reports: 02-round-1-security.md, 03-round-1-code-review.md, 04-round-1-value-audit.md
- Round 2 reports: 05-round-2-security.md, 06-round-2-code-review.md, 07-round-2-value-audit.md
- Round 3 reports (in flight): 09-round-3-security.md, 10-round-3-code-review.md, 11-round-3-value-audit.md
- Spec-coverage table: `.spec-coverage-v2.md`
