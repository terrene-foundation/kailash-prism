# Migration Verification Report — kailash-prism

**Date**: 2026-04-11
**Repo**: terrene-foundation/kailash-prism
**Local path**: /Users/esperie/repos/kailash-prism/
**GitHub**: Public, Apache-2.0, default branch `main`
**Remote**: git@github.com:terrene-foundation/kailash-prism.git
**Status**: Clean working tree, up to date with origin/main

---

## 1. Repo Structure

### Present and correct

| Directory | Status | Notes |
|-----------|--------|-------|
| `specs/tokens/` | PASS | schema.yaml + 3 themes (enterprise, modern, minimal) |
| `specs/components/` | PASS | .gitkeep placeholder |
| `specs/templates/` | PASS | .gitkeep placeholder |
| `specs/layouts/` | PASS | grammar.yaml |
| `specs/navigation/` | PASS | patterns.yaml |
| `compiler/` | PASS | package.json + src/.gitkeep |
| `web/src/` | PASS | atoms, molecules, organisms, ai, engines, templates, layouts, hooks (all .gitkeep) |
| `web/next/` | PASS | middleware, routing, server subdirs |
| `web/tauri/` | PASS | bridge, components, hooks subdirs |
| `web/package.json` | PASS | @kailash/prism-web, Apache-2.0, Terrene Foundation |
| `web/tsconfig.json` | PASS | strict: true, ES2022, react-jsx |
| `flutter/lib/` | PASS | atoms, molecules, organisms, ai, engines, templates, layouts, theme, providers |
| `flutter/test/` | PASS | .gitkeep |
| `tauri-rs/src/` | PASS | .gitkeep |
| `stitch/` | PASS | .gitkeep |
| `docs/specs/` | PASS | All 10 specs + 6 round findings |
| `.claude/` | PASS | CLAUDE.md, agents/, skills/, rules/, commands/, hooks/ |
| `workspaces/fe-codegen-platform/` | PASS | Full analysis tree with briefs, journal, research, plans, user-flows, validate |

### Missing

| Item | Severity | Notes |
|------|----------|-------|
| `.gitignore` | MEDIUM | No .gitignore file exists. Should have node_modules, dist, .env, build artifacts, .dart_tool, etc. |
| `flutter/pubspec.yaml` | LOW | No Dart package manifest. Expected for a Flutter package but acceptable for scaffolding phase. |
| `tauri-rs/Cargo.toml` | LOW | No Rust package manifest. Acceptable for scaffolding phase. |

---

## 2. COC Artifacts Completeness

### Agents (3/3) -- PASS

| Agent | Present | Lines | Content |
|-------|---------|-------|---------|
| `agents/react-specialist.md` | Yes | Verified | Proper frontmatter, React/Next.js specialist |
| `agents/flutter-specialist.md` | Yes | Verified | Proper frontmatter, Flutter specialist |
| `agents/uiux-designer.md` | Yes | Verified | Proper frontmatter, UI/UX design specialist |

### Skills (7/7 directories) -- PASS

| Skill Directory | Files Expected | Files Found | Status |
|----------------|---------------|-------------|--------|
| `skills/11-frontend-integration/` | 6 | 6 (SKILL.md + 5) | PASS |
| `skills/19-flutter-patterns/` | 4 | 4 (SKILL.md + 3) | PASS |
| `skills/20-interactive-widgets/` | 4 | 4 (SKILL.md + 3) | PASS |
| `skills/21-enterprise-ai-ux/` | 2 | 2 (SKILL.md + 1) | PASS |
| `skills/22-conversation-ux/` | 2 | 2 (SKILL.md + 1) | PASS |
| `skills/23-uiux-design-principles/` | 5 | 5 (SKILL.md + 4) | PASS |
| `skills/25-ai-interaction-patterns/` | 2 | 2 (SKILL.md + 1) | PASS |

### Commands (9/9) -- PASS

All present: analyze.md, todos.md, implement.md, redteam.md, codify.md, design.md, i-audit.md, i-polish.md, i-harden.md

### Rules (6/6) -- PASS

All present: independence.md, security.md, zero-tolerance.md, terrene-naming.md, git.md, communication.md

---

## 3. Spec Documents (16/16) -- PASS

All 10 spec documents (00-prism-manifest.md through 10-quality-gates.md) plus all 6 round finding files present in `docs/specs/`. Identical file set exists in `workspaces/fe-codegen-platform/04-validate/specs/`.

Line counts are substantial (not stubs): 03-component-contracts.md at 3093 lines, 05-engine-specifications.md at 1332 lines, 01-design-system-protocol.md at 1083 lines.

---

## 4. Content Verification

### CLAUDE.md -- PASS with notes

- References "Kailash Prism" as frontend composable engine framework: YES
- Mentions Terrene Foundation (Singapore CLG): YES
- Mentions Apache 2.0: YES
- References four-layer architecture (Specs, Primitives, Engines, Interface): YES
- References two-engine model (Web Engine, Flutter Engine): YES
- References all 10 spec documents: YES
- Development rules for TypeScript and Dart: YES
- Commands table with all 9 commands: YES
- Rules index with all 6 rules: YES
- Kailash Platform Integration table: YES

### README.md -- PASS

- Project description: YES ("One design spec, four platform outputs")
- Package table (@kailash/prism-web, @kailash/prism-compiler, kailash_prism, kailash-prism-tauri): YES
- Architecture description with four layers: YES
- Engine descriptions: YES
- Quick start examples (React + Flutter): YES
- Apache 2.0 license reference: YES
- Terrene Foundation attribution: YES

### LICENSE -- PASS

Apache License, Version 2.0, full text present.

---

## 5. Loom Integration

### sync-manifest.yaml -- PASS

Prism entry present at the expected location:

```yaml
prism:
  build: kailash-prism
  template: kailash-coc-claude-prism
  variant: prism
  description: Kailash Prism -- Frontend composable engines (React, Next.js, Flutter, Tauri)
```

### variants/prism/ -- PASS (scaffolded)

Directory exists at `/Users/esperie/repos/loom/.claude/variants/prism/` with subdirectories: `agents/frontend/`, `commands/`, `rules/`, `skills/`. All empty (no files yet). This is acceptable -- variant files will be created as prism-specific COC artifacts are developed that need to diverge from the global versions.

---

## 6. Gaps Found

### CRITICAL

**C1: Broken internal references in COC artifacts -- commands and rules reference files that do not exist in kailash-prism**

The following files are referenced by commands/rules synced into kailash-prism but were NOT included in the repo:

| Referenced Path | Referenced By | Exists in Loom? |
|-----------------|---------------|-----------------|
| `rules/autonomous-execution.md` | commands/analyze.md, todos.md, implement.md, redteam.md, codify.md | YES |
| `rules/observability.md` | rules/zero-tolerance.md (line 42), commands/implement.md (line 98, 101), commands/redteam.md (line 98) | YES |
| `rules/artifact-flow.md` | commands/codify.md (lines 150, 178) | YES |
| `.claude/agents/_subagent-guide.md` | commands/codify.md (line 81) | NO (not in loom either) |
| `.claude/guides/claude-code/06-the-skill-system.md` | commands/codify.md (line 89) | YES (in loom) |

These are not soft suggestions -- they are MUST references in zero-tolerance and observability rules that agents will attempt to load and fail.

**C2: Python-centric content in rules not adapted for Prism (frontend TypeScript/Dart repo)**

| File | Issue |
|------|-------|
| `rules/independence.md` lines 3, 18, 19 | Says "Kailash Python SDK" three times -- should say "Kailash Prism" or be generic |
| `rules/independence.md` line 32 | References "PyPI" -- should reference npm/pub.dev/crates.io |
| `rules/terrene-naming.md` line 28 | Says "Kailash Python SDK is Foundation-owned" -- should say "Kailash Prism" |
| `rules/zero-tolerance.md` lines 94-97 | Rule 5 references `pyproject.toml` and `__init__.py` and `pip install` -- should reference package.json / pubspec.yaml version locations |
| `rules/security.md` lines 12-19 | Python examples only (`os.environ.get`, `from dotenv import`) -- should have TypeScript/Dart equivalents |
| `rules/security.md` line 58 | References `subprocess.call(cmd, shell=True)` -- Python-specific |

**C3: codify.md BUILD repo detection logic is Python/Rust-only**

`commands/codify.md` lines 103-111 detect BUILD repos by checking for `kailash-py`/`kailash-rs` in git remote or `pyproject.toml`/`Cargo.toml`. kailash-prism IS a BUILD repo but will not match either pattern. The command will incorrectly classify kailash-prism as a "downstream project repo" and skip upstream proposal creation.

### HIGH

**H1: git.md branch protection table does not include kailash-prism**

`rules/git.md` lines 30-35 list only kailash-py, kailash-coc-claude-py, kailash-coc-claude-rs, and kailash-rs. kailash-prism (and its future template repo kailash-coc-claude-prism) are missing.

**H2: Skill files contain Python-only code examples**

- `skills/20-interactive-widgets/technical-spec.md` lines 336-343: `@pytest.mark.asyncio` decorators
- `skills/20-interactive-widgets/implementation-guide.md` lines 359-384: Multiple `@pytest.mark.asyncio` and `pytest.raises` examples
- `commands/implement.md` line 65: References `pytest tests/ -x --tb=short -q`
- `commands/redteam.md` lines 78-142: Multiple `pytest` references

These are fine for the Python SDK target but misdirecting for a TypeScript/Dart frontend repo. The test runner should be `vitest` (web) and `flutter test` (flutter).

**H3: commands/codify.md references co-reference skill and docs/00-authority/ that don't exist**

Line 17: `docs/00-authority/` -- this directory does not exist in kailash-prism
Line 69: References `docs/` generically (exists but only contains `specs/`)
Line 160: References `co-reference` skill -- not included in kailash-prism

**H4: No kailash-coc-claude-prism template repo exists yet**

The sync-manifest declares `template: kailash-coc-claude-prism` but this repository has not been created on GitHub. `/sync prism` will fail until it exists.

### MEDIUM

**M1: No .gitignore file**

A frontend monorepo with npm, Flutter, and Rust should have a .gitignore covering: `node_modules/`, `dist/`, `.next/`, `.dart_tool/`, `build/`, `target/`, `.env`, `.env.local`, `*.tgz`, `.pubspec.lock` (for packages), etc.

**M2: Token theme files are stubs**

The three theme files (enterprise.yaml, modern.yaml, minimal.yaml) contain only a name and description. No actual token values (colors, typography, spacing, etc.) are defined. The schema.yaml is also empty categories. While acceptable for scaffolding phase, these are not usable for any implementation.

**M3: Duplicate spec documents**

The full spec set exists in both `docs/specs/` and `workspaces/fe-codegen-platform/04-validate/specs/`. This creates a maintenance burden -- edits to one location will not propagate to the other. Should clarify which is authoritative and whether the workspace copy should be a symlink or removed.

**M4: GitHub repo has no topics**

The GitHub repo has `topics: []`. Should add relevant topics: `kailash`, `prism`, `design-system`, `react`, `flutter`, `tauri`, `nextjs`, `terrene-foundation`.

### LOW

**L1: No flutter/pubspec.yaml or tauri-rs/Cargo.toml**

Package manifests for Flutter and Rust crates are missing. Acceptable during scaffolding but will be needed before any implementation.

**L2: No CI/CD configuration**

No `.github/workflows/` directory. Needed before any code is merged.

**L3: compiler/package.json has no devDependencies**

The compiler package.json references `tsc` and `vitest` in scripts but declares no devDependencies.

---

## Summary

| Category | Count |
|----------|-------|
| CRITICAL | 3 |
| HIGH | 4 |
| MEDIUM | 4 |
| LOW | 3 |

**Overall Status: Issues Found**

The repo structure, spec documents, and basic scaffolding are complete and well-organized. The CLAUDE.md and README.md are high quality. The loom integration (sync-manifest entry, variant directory) is correctly wired.

The critical issues are all in the same category: **COC artifacts were copied from the Python SDK source of truth without adaptation for a frontend TypeScript/Dart repo**. Rules reference `pyproject.toml`, `pip install`, `pytest`, and "Kailash Python SDK" where they should reference `package.json`/`pubspec.yaml`, `npm`/`flutter`, `vitest`/`flutter test`, and "Kailash Prism". Commands reference files (`autonomous-execution.md`, `observability.md`, `artifact-flow.md`) that were not synced into the repo. The codify command's BUILD repo detection will fail to recognize kailash-prism as a BUILD repo.

**Recommended fix path**: Create prism-specific variants in `loom/.claude/variants/prism/` for independence.md, zero-tolerance.md, security.md, terrene-naming.md, git.md, and codify.md. Include the missing referenced rule files (autonomous-execution.md, observability.md, artifact-flow.md) in the kailash-prism .claude/rules/. Add .gitignore. Update codify.md BUILD repo detection to include kailash-prism.
