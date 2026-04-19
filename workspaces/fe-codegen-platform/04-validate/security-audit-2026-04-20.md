# Security Audit — PRs #12 #13 #14 #15 #16 (commit 7b5c686)

**Date:** 2026-04-20
**Auditor:** security-reviewer (Step 2 of /redteam)
**Scope:** New attack surfaces introduced since last merged release
**Result:** **AUDIT PASSED** — 0 CRITICAL, 0 HIGH issues. 2 MEDIUM, 4 LOW.

---

## Executive Summary

| Severity  | Count | Convergence Blocker? |
| --------- | ----- | -------------------- |
| CRITICAL  | 0     | —                    |
| HIGH      | 0     | —                    |
| MEDIUM    | 2     | No                   |
| LOW       | 4     | No                   |

No convergence blockers. All six merged PRs can proceed to the next phase. The two MEDIUM findings are both in `.github/workflows/release-web.yml` (third-party action pinning and a cosmetic workflow hygiene point) and can be addressed in a follow-up hardening pass without gating convergence.

**Top 3 findings:**

1. **MED-1 — Third-party GitHub Action pinned by tag, not SHA** (`.github/workflows/release-web.yml:90`) — `softprops/action-gh-release@v2` is a movable tag; if the upstream repo is ever compromised the tag can be re-pointed at malicious code with `contents: write` scope. Fix: pin by full commit SHA.
2. **MED-2 — Spec corpus drift: 13 component YAMLs missing top-level `version:` field** — pre-existing drift carried forward into the codegen input surface. Not an exploit today, but the `spec-loader.ts` hand-rolled validator treats missing `version:` as a schema violation (`SCHEMA_VIOLATION` exit 1). Any batch codegen run against the 13 files errors out.
3. **LOW-1 — CLI `--out` resolves without containment root** (`compiler/src/codegen/cli.ts:97`) — `resolve(cwd, args.out)` allows `--out ../../../../etc/passwd` from a developer shell. Low severity because the CLI is dev-tooling run by trusted operators, not a server endpoint.

---

## Surface 1: `.github/workflows/release-web.yml` (PR #12)

### PASSED CHECKS

- **Trigger narrow and safe**: workflow fires only on `push: tags: web-v*`. No `pull_request_target`, no PR event trigger. Fork PRs cannot reach `GITHUB_TOKEN`. (`release-web.yml:8-11`)
- **Token scope minimal**: `permissions: contents: write` only. No `id-token`, no `packages`, no `actions`. (`release-web.yml:13-14`)
- **No secret echoing**: zero `echo` of secrets, zero `set -x`, zero `env:` dumps to logs. `$GITHUB_TOKEN` is only referenced implicitly by the release action.
- **Untrusted input not interpolated into shell**: `github.ref_name` is a tag name — GitHub constrains tag names to a safe character set, and `tag_ref="${GITHUB_REF_NAME}"` is assigned via env expansion, not `${{ }}` into a shell string. No `github.head_ref`, `github.event.*.body`, or `github.event.*.title` interpolation anywhere.
- **Step-level `set -euo pipefail`** in every `run:` shell block.
- **Tag-vs-manifest agreement check**: `Verify tag version matches package.json` step blocks accidental tag/version drift before the release is cut.

### Findings

#### MED-1 — Third-party action pinned by tag

- **File:** `.github/workflows/release-web.yml:90`
- **Threat:** `uses: softprops/action-gh-release@v2` pins to a movable Git tag. A compromised upstream account or a maliciously force-pushed `v2` tag would run attacker-controlled code with `contents: write` on tag events.
- **Exploit path:** upstream repo owner rotates `v2` tag → next `web-v*` tag push executes malicious action → release asset replaced or repo contents modified.
- **Fix:** pin by full commit SHA, e.g. `uses: softprops/action-gh-release@01570a1f39cb168c169c692a18765801d4...` with a `# v2.x.y` trailing comment for human readability.
- **Severity:** MEDIUM — industry-standard GitHub Actions hardening; not exploitable today, but is the lowest-cost structural defense against supply-chain drift.

---

## Surface 2: `compiler/src/codegen/cli.ts` + `spec-loader.ts` (PR #13)

### PASSED CHECKS

- **Safe YAML parsing**: `spec-loader.ts:46` uses `parseYaml` from the `yaml` package. `yaml.parse()` is safe by default (does NOT execute custom constructors, no code execution on parse). `yaml.load` (`js-yaml`-style unsafe load) is NOT used.
- **No command injection**: no `child_process.exec`, no `execSync`, no `new Function(...)`, no `eval(...)` anywhere in `compiler/src`. Spec contents never flow into a shell.
- **No prototype pollution via object-spread**: validator uses bracket access (`raw['key']`) and explicit field-by-field assignment into typed return shapes. No `Object.assign(target, parsed)` style merges. No `Object.keys(parsed)` iteration that could hit `__proto__` or `constructor`.
- **Type-checked schema**: hand-rolled `requireString`/`isObject`/array checks. Rejects non-object roots, non-array `type_parameters`/`methods`, non-boolean `required`, non-string fields.
- **Error messages carry path context**: `schemaError(msg, sourcePath)` includes file path, `requireString` includes field path like `adapter.methods[2].signature`.
- **Safe `mkdirSync` + `writeFileSync`**: both use default 0666 umask; node's `writeFileSync` does NOT follow symlinks by default without `{ flag: 'w' }` that explicitly opens them. Default open mode is safe (`O_WRONLY | O_CREAT | O_TRUNC`) — symlink at the target path is written-through but does not escape to a different directory.

### Findings

#### LOW-1 — `--spec` and `--out` have no containment root

- **File:** `compiler/src/codegen/cli.ts:96-97`
- **Threat:** `resolve(process.cwd(), args.spec)` and `resolve(process.cwd(), args.out)` let a caller read any file (`--spec /etc/shadow`) and write to any path the process has permission to reach (`--out /tmp/x`). No allowlist root, no traversal check.
- **Exploit path:** a developer shell script or a CI task that forwards untrusted input into `--spec`/`--out` can read/write arbitrary files.
- **Severity:** LOW — `prism-codegen` is developer-facing tooling, not a server. Callers (humans, local build scripts) are trusted. No network-reachable exposure.
- **Recommended fix (follow-up):** enforce `args.spec` starts with `specs/` and `args.out` starts with `compiler/generated/` (or accept an explicit `--project-root` flag). Document in `docs/guides/codegen-architecture.md` that untrusted input MUST NOT be plumbed into the CLI.

#### LOW-2 — Output file written with default permissions (0644)

- **File:** `compiler/src/codegen/cli.ts:103-104`
- **Threat:** `writeFileSync(outPath, output.content, 'utf-8')` uses default permissions. On a shared CI runner, the emitted file is world-readable. For codegen output this is the desired behavior (committed TypeScript), but if the CLI is ever repurposed to emit secrets/config, permissions would need to tighten.
- **Severity:** LOW — no secret material ever flows through this code path today. Note for future change.

---

## Surface 3: `web/src/engines/data-table/` TId + globalSearch + getTypedRowId (PR #16)

### PASSED CHECKS

- **No NaN/stack leaks from typed id**: the only `Number(...)` coercion in data-table code is `Number(e.target.value)` on the page-size `<select>` (fixed list of numeric options — the browser constrains the value set) and `Number(aStr)/Number(bStr)` in `defaultSortComparator` which is guarded by `!Number.isNaN(aNum) && !Number.isNaN(bNum)`. No `parseInt` on untrusted input. No stack-trace leakage path.
- **`getTypedRowId` is not an id-disclosure regression**: the old `getRowId` returned `String(adapter.getRowId(row))`. The new `getTypedRowId` returns the raw adapter-typed id directly for consumer callbacks (row actions, bulk actions). Since `String(x)` and `x` carry the same bits, nothing was implicitly obfuscated by stringification. No information leak introduced.
- **Controlled-without-setter warning is safe**: uses `console.warn` only (`use-data-table.ts:197`), gated on `process.env.NODE_ENV !== 'production'` read defensively via `globalThis`. Does not log state, does not log row data, does not log the search query.
- **Server error banner bounded**: `setServerError(raw.slice(0, 500))` (`use-data-table.ts:322`, `:586`, `:606`) caps adapter error messages at 500 chars before rendering, preventing multi-page error surfaces from adapter stack traces.
- **Aborted fetch hygiene**: `AbortController` per request, monotonic `fetchSeqRef` discards stale results, `AbortError` suppressed (not surfaced to the UI). Clean on unmount via `controller.abort()` in the effect cleanup.

### Findings

None.

---

## Surface 4: `web/src/engines/layout/split.tsx` (PR #14)

### PASSED CHECKS

- **Pointer capture scoped to element, not document/window**: `setPointerCapture(e.pointerId)` on the divider element only (`split.tsx:72`). No `addEventListener` on `document` or `window` with `{ capture: true }`. Cannot hijack pointer events across an iframe boundary.
- **Event handler cleanup**: `releasePointerCapture` fires on `pointerup` (`split.tsx:79`). React handles handler lifecycle — onPointerDown/Move/Up are component-scoped props, auto-detached on unmount. No dangling document-level listeners.
- **Arithmetic clamping**: `clampRatio(v, min)` = `Math.max(min, Math.min(1 - min, v))`. Handles negative values, `Infinity`, `NaN`-propagation (NaN short-circuits both `Math.max`/`Math.min` — result stays in [min, 1-min] range after the clamp). `computeMinRatio` caps at 0.5 and divides only after checking `total > 0`.
- **ARIA conforming**: `role="separator"`, `aria-orientation`, `aria-valuenow/min/max`, `aria-label`, `tabIndex={resizable ? 0 : -1}` — all present and reflect current state.
- **No XSS surface**: renders only `children` through React's default escaping; no `dangerouslySetInnerHTML`.

### Findings

None.

---

## Surface 5: `web/src/engines/layout/layer.tsx` (PR #14)

### PASSED CHECKS

- **No `dangerouslySetInnerHTML`** anywhere in the Layer component or in any `web/src/` component. (Confirmed via grep.)
- **Escape handler registers only when both `open` and `onDismiss` are set** (`layer.tsx:62-71`) — does not steal Escape from unrelated consumers.
- **Escape handler detaches on unmount**: `useEffect` returns `() => document.removeEventListener('keydown', handler)`. Also re-registers on `[open, onDismiss]` change, ensuring a stale handler is never left behind.
- **Children are untrusted-safe**: `<div ...>{children}</div>` — React's default JSX escaping applies.

### Findings

#### LOW-3 — Escape handler does not check `e.defaultPrevented`

- **File:** `web/src/engines/layout/layer.tsx:64-66`
- **Threat:** If another component calls `e.preventDefault()` on the same keydown event (e.g. a nested Modal or a focused input handling its own Escape), the Layer still fires `onDismiss`, potentially dismissing a stack when only the innermost should dismiss.
- **Exploit:** not a security issue per se — a UX double-dismissal, not a credential leak or privilege escalation. Listed for completeness per the audit prompt.
- **Severity:** LOW — usability, not security.
- **Recommended fix (follow-up):** `if (e.key === 'Escape' && !e.defaultPrevented) onDismiss();`

#### LOW-4 — Tier z-index overridable via CSS custom property

- **File:** `web/src/engines/layout/layer.tsx:75-77`
- **Threat:** `z-index: var(--prism-layer-z-${tier}, <fallback>)` lets a consuming app redefine `--prism-layer-z-alert` (or any tier) to a maximal `z-index: 2147483647`, overlaying the entire document including browser-chrome-adjacent dialogs. Same pattern applies to `zIndexToken` prop which accepts an arbitrary token name.
- **Exploit:** clickjacking vector in a consumer embed; not exploitable in isolation within Prism. Prism does not document a z-index ceiling contract.
- **Severity:** LOW — per the audit prompt's explicit guidance ("not a Prism bug per se but worth flagging if documented"). Recommend adding a note in `docs/specs/04-layout-grammar.md § 4.1.5` that consumer apps should treat `--prism-layer-z-*` as reserved and not override with system-level values.

---

## Surface 6: Wiring-test adapters (PR #15)

### PASSED CHECKS

- **No real-person PII**: The in-memory Invoice adapter (`web/src/engines/data-table/__tests__/data-table-engine.wiring.test.tsx:111-119`) uses generic placeholder company names ("Alpha Ltd", "Beta Inc", "Gamma Co", "Delta LLC"). No real person names, no real email addresses, no real phone numbers, no SSN-pattern data, no credit-card-pattern data.
- **No hardcoded secrets in fixtures**: grep for `sk-|api_key|password|secret|token` across `web/`, `compiler/`, `.github/` returned zero credential matches (two noise matches in layout/types.ts: `SpacingToken` enum and a test case `zIndexToken="prism-layer-z-alert"`).

### Findings

None.

---

## Surface 7: Spec-corpus drift (from PR #13 agent report)

### Findings

#### MED-2 — 13 of 70 spec YAMLs lack top-level `version:` field

- **Files:** `specs/components/button.yaml`, `icon-button.yaml`, `text-input.yaml`, `text-area.yaml`, `select.yaml`, `checkbox.yaml`, `radio.yaml`, `toggle.yaml`, `label.yaml`, `badge.yaml`, `avatar.yaml`, `tag.yaml`, `icon.yaml`.
- **Drift check result:** all 13 files DO have `name:` and `category:` at top level — no compounding schema drift. The drift is isolated to the `version:` field only.
- **Threat:** `spec-loader.ts::validateComponentSpec` (`spec-loader.ts:66`) treats `version` as required: `requireString(raw, 'version', sourcePath)`. Running `prism-codegen --spec specs/components/button.yaml --out ...` errors out with `[SCHEMA_VIOLATION] version must be a non-empty string`. Any batch codegen sweep of all `specs/components/*.yaml` fails on these 13.
- **Severity:** MEDIUM — not a security exploit, but a spec↔loader contract mismatch that will block the first batch-mode codegen run (flagged as a follow-up in the CLI itself). Fixing means either (a) adding `version: 0.1.0` to the 13 files, or (b) loosening `spec-loader.ts` to treat `version` as optional.
- **Recommended fix (follow-up):** add `version: 0.1.0` to each of the 13 files in a single commit. This is a zero-risk text-only change.

---

## Additional sweeps performed

All sweeps clean:

- `rg 'sk-|api_key|password|secret|token' web/ compiler/ .github/` — zero credential hits (2 noise matches in type enums).
- `rg 'eval\(|new Function\(|exec\(|execSync|child_process' web/src compiler/src` — zero matches.
- `rg 'dangerouslySetInnerHTML' web/src` — zero matches.
- `rg 'process\.env' web/src` — 2 matches, both are `process.env.NODE_ENV` reads defensively gated through `globalThis` in dev-mode warning code paths. No environment leak into client bundles.
- `rg '__proto__|constructor\s*:|prototype\s*:' compiler/src` — zero matches. Spec-loader uses typed bracket access with field-by-field copies; prototype-pollution vector is closed.
- `rg 'addEventListener.*capture' web/src/engines/layout` — zero matches. No capture-phase hijacking.

---

## Convergence blockers

**None.** All six PRs (#12, #13, #14, #15, #16) are cleared to proceed.

Post-merge follow-up work (non-blocking, recommend a single hardening PR):

1. Pin `softprops/action-gh-release` by SHA in `.github/workflows/release-web.yml`.
2. Add `version: 0.1.0` to the 13 spec YAMLs missing the field.
3. Add Escape-handler `defaultPrevented` guard in `layer.tsx`.
4. Document z-index ceiling convention in `docs/specs/04-layout-grammar.md`.
5. Add path-containment check on `--spec` / `--out` arguments in `prism-codegen` (or explicit `--project-root`).

## Audit statement

**This audit found 0 CRITICAL and 0 HIGH issues. Audit passed.**

Per `.claude/rules/zero-tolerance.md`, findings are reported here only — no fixes have been applied in this audit agent. All five follow-up items above are tracked for a separate hardening agent / PR.
