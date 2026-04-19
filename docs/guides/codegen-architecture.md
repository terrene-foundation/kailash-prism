# Codegen Architecture (S8 — PoC + roadmap)

Status: DRAFT
Owner: `@kailash/prism-compiler`
Scope: proposal + PoC for generating typed engine scaffolding from component specs. Not a finished system.

---

## 1. Problem

Prism's premise is "one design spec, four platform outputs." The token compiler already does part of that job — it reads `specs/tokens/**/*.yaml` and emits CSS variables, a Tailwind config, Dart constants, and a Flutter `ThemeData`. The unfinished half is **engine codegen**: the component YAML specs at `specs/components/*.yaml` are the authoritative contract for every engine (DataTable, Form, Navigation, AI Chat, Layout, Theme), but today every TypeScript type in `web/src/engines/<engine>/types.ts` and every Dart widget field in `flutter/lib/engines/<engine>/` is hand-written. When the YAML changes, someone has to remember to update both hand-written sides in lockstep, and there is no automated check that the hand-written types still match the spec.

The failure mode is invisible under default conditions and only surfaces when a consumer hits a signature that exists in the YAML but not in the hand-written types (or vice versa). This is the same class of problem as "fake encryption" and "fake transactions" in `rules/zero-tolerance.md` Rule 2 — the artifact exists, it looks real, and only someone who reads both files notices the drift.

The goal of S8 is to close that drift. This document proposes the architecture; the PoC in `compiler/src/codegen/` proves the shape of the generator.

---

## 2. Scope — what codegen generates vs what stays hand-written

The principle: **codegen generates the shapes the spec pins down; humans write the shapes the spec does not pin down.** The boundary is not by file type but by *what the spec authoritatively defines*.

| Category | Source | Destination |
|---|---|---|
| Adapter interfaces (methods, signatures, generic params) | `specs/components/<c>.yaml` § `adapter:` | **Generated** |
| Adapter support types referenced by the interface (e.g. `DataTableCapabilities`, `DataTableQuery`) | The YAML lists them by name only | **Hand-written** in `web/src/engines/<c>/types.ts` |
| Component prop shapes (`DataTableConfig`, `FormConfig`) | `specs/components/<c>.yaml` § `props:` | **Generated** (roadmap — not in PoC) |
| State-machine enums (`"loading" \| "loaded" \| ...`) | § `states:` | **Generated** (roadmap) |
| JSX / widget implementation | nowhere in the spec | **Hand-written** |
| Business logic (click handlers, merge rules, cache invalidation) | nowhere in the spec | **Hand-written** |
| Token consumption (`data-table.header.bg`) | token compiler output | **Generated** by the *token* compiler (already done) |

The heuristic: if the YAML field has a 1:1 machine-readable shape (a name + a typed signature), generate it. If the YAML describes *intent* in prose ("renders a card layout when viewport < tablet"), leave it to the implementer.

The PoC generates only the adapter interface — the simplest slice of the YAML that is 1:1 with a TypeScript shape. Expanding to props, states, and Flutter output is a bounded extension of the same pipeline (§ 8, roadmap).

---

## 3. Input — which YAML fields drive the PoC

The PoC reads the `adapter:` block of `specs/components/*.yaml`. Field-by-field mapping:

| YAML field | TypeScript construct |
|---|---|
| `adapter.name` | `export interface <name>` |
| `adapter.type_parameters[].name` + `.default` | `<T, TId = string>` on the interface |
| `adapter.type_parameters[].description` | `@typeParam` JSDoc line |
| `adapter.version_introduced` | `@since` JSDoc tag |
| `adapter.supersedes` | `@supersedes` JSDoc tag (if present) |
| `adapter.authority` | `@authority` JSDoc tag in the file header |
| `adapter.methods[].name` + `.signature` | `readonly <name><?>: <signature>;` |
| `adapter.methods[].required` | presence/absence of the trailing `?` on the property |
| `adapter.methods[].purpose` | JSDoc above the method |
| `adapter.support_types[]` | header comment listing the types (NOT generated bodies) |

Fields the PoC does NOT read today (roadmap — § 8):

- `props:` (the consumer-facing `DataTableConfig<T>` shape)
- `states:`, `transitions:` (state-machine enums + transition type)
- `composition_slots:`, `accessibility:`, `responsive:` (cross-references for docs / tests)
- `changelog:` (changelog.md generator)

---

## 4. Output — where generated code lands

The PoC writes to `compiler/generated/` (one file per invocation, committed to the repo so reviewers see the pipeline's actual output).

The roadmap-target layout is `web/src/engines/<engine>/generated/<name>-spec.ts`, side-by-side with the hand-written `types.ts`:

```
web/src/engines/data-table/
├── types.ts               # hand-written: support types + prop types
├── adapter.ts             # hand-written: type guards + resolvers
├── use-data-table.ts      # hand-written: hook (business logic)
├── data-table.tsx         # hand-written: JSX
└── generated/
    └── data-table-adapter-spec.ts   # GENERATED from the YAML
```

Each generated file opens with a `DO NOT EDIT` banner and a traceability line pointing back to its source YAML. The hand-written `types.ts` imports the generated `*-spec.ts` and re-exports the symbol, so consumers never care which half is generated:

```typescript
// web/src/engines/data-table/types.ts (hand-written, after roadmap migration)
export { DataTableAdapter } from './generated/data-table-adapter-spec.js';
export interface DataTableCapabilities { /* hand-written */ }
```

The PoC intentionally does NOT write into `web/src/` — it stays in `compiler/generated/` so the generated output is visible without any risk of clobbering the shipping engine. Migration from PoC to the `web/src/engines/<e>/generated/` layout is a follow-up shard (§ 8 Phase 2).

---

## 5. Regeneration — how drift is detected

Two mechanisms, layered:

### 5.1 `@generated` header + CI check (primary)

Every generated file opens with `DO NOT EDIT BY HAND`. A CI job runs the codegen in `--check` mode (roadmap — PoC only supports `--out`) which regenerates into a temp directory and `diff`s against the committed output. Diff ≠ 0 → CI fails with an actionable message: "spec `data-table.yaml` changed; run `npm --prefix compiler run codegen` and commit the result."

This is the same shape as the existing token-compiler behaviour and is the canonical pattern for "generated output is committed" (aligns with `rules/orphan-detection.md` Rule 3 — removed = deleted, not deprecated; here: regenerated = recommitted, not drifted).

### 5.2 Hash-based drift marker (secondary, optional)

The generator can embed a hash of the source YAML into the generated file's JSDoc:

```typescript
// @spec-hash  sha256:3c9a1f…
```

A pre-commit hook reads the hash and compares to the current YAML's hash. Mismatch → pre-commit refuses the commit with the same actionable message.

This is strictly optional — the CI diff check covers the same ground, and pre-commit hooks are unreliable in multi-repo workflows. The hash marker buys faster feedback (local) at the cost of another place to forget to update. Recommendation: ship CI `--check` first; add the pre-commit hook only if CI drift becomes a recurring complaint.

### 5.3 Not recommended: post-commit magic

Auto-regeneration-on-commit (a git hook that regenerates on every commit that touches a YAML) is explicitly rejected. It invisibly mutates the committed tree, which violates the principle that every file in a commit is the author's intended state. Generated output is a first-class artifact, not a derived side-effect.

---

## 6. Flutter output — same generator, different emitter

The generator's architecture deliberately separates AST from emission:

```
specs/components/data-table.yaml
          │
          ▼  spec-loader.ts
ComponentSpecAst (platform-agnostic)
          │
          ├──▶ ts-emitter.ts       ─▶ data-table-adapter-spec.ts
          └──▶ dart-emitter.ts     ─▶ data_table_adapter_spec.dart
                  (roadmap)
```

For the PoC, only `ts-emitter.ts` exists. A Dart emitter is straightforward but needs one spec-level decision: **how does the YAML carry a Dart-native signature?**

Two options:

**Option A — polyglot signature field (recommended).** Extend the YAML to carry both signatures:

```yaml
methods:
  - name: getRowId
    signature:
      ts: "(row: T) => TId"
      dart: "TId Function(T row)"
    required: true
    purpose: "Stable row identity..."
```

The TS emitter reads `signature.ts`; the Dart emitter reads `signature.dart`. A validation step asserts both are present whenever one is. The cost is editing overhead (every method change is two edits) and training consumers to understand the dual shape.

**Option B — single signature + translator.** Keep the single-string `signature: "(row: T) => TId"` and write a minimal TS-signature-to-Dart-signature translator. The cost is a real parser, which is significant effort for a narrow grammar (arrow functions, generics, promises, readonly arrays) and the translator becomes a single point of failure.

**Recommendation: Option A.** The annual effort is dominated by emitter development, not by the 2x signature-write overhead. Option B looks cleaner on day 1 and rots on day 200 when a method uses a conditional type or a mapped type the translator doesn't handle. Explicit polyglot signatures are also self-documenting: a Dart reader opening the YAML sees the Dart shape directly.

The PoC does NOT implement Option A yet — the current `adapter.methods[].signature` is a single TS string. The path forward is: (1) migrate the YAML schema to accept either form; (2) add a `signature.dart` to each method; (3) write the Dart emitter. Each step is independently reviewable.

---

## 7. Versioning — handling breaking spec changes

When a spec change breaks an existing hand-written consumer, the codegen pipeline offers exactly one affordance: **loud failure**. The generated file's signature changes, the consumer's call site fails to type-check, and the CI diff check surfaces the exact method whose signature changed. The pipeline does NOT:

- Emit deprecation comments
- Keep old signatures behind feature flags
- Generate migration shims

Those are product decisions, made once by the spec author, documented in the YAML's `changelog:` block. The generator's job is to make the spec's current truth visible in the code; it is not a versioning system.

Concretely, the contract is:

1. Spec author changes `adapter.methods[N].signature` + bumps `version:` + adds a `changelog:` entry.
2. Codegen regenerates the `*-spec.ts` file with the new signature.
3. Consumers who use the changed method see a TypeScript error at their call site.
4. The spec author's `changelog:` entry is the migration guide.

The PoC enforces step 2 via the CI `--check` path (§ 5.1). Steps 1, 3, 4 are already the pattern in use today — see `specs/components/data-table.yaml`'s 0.3.0 changelog for an example of `ServerDataSource` removal done this way.

---

## 8. Roadmap — production-ready codegen for all engines

Effort stated in **autonomous execution cycles (sessions)** per `rules/autonomous-execution.md`. Each session is bounded by the shard-discipline budget (≤500 LOC load-bearing, ≤10 invariants, ≤4 call-graph hops).

### Phase 1 — Adapter interfaces for all engines (1 session)
- Extend the PoC to batch-generate: one invocation reads every `specs/components/*.yaml` and emits every adapter.
- Wire the CI `--check` mode and fail-on-drift.
- Migrate the generated files from `compiler/generated/` to `web/src/engines/<e>/generated/`.
- Add the pre-commit `--check` hook if desired.
- Verification: `npx tsc -b` stays green in `web/` after migration; the existing hand-written `DataTableAdapter` interface in `types.ts` is replaced by an import from the generated file.

### Phase 2 — Props and state machines (2 sessions)
- Extend the YAML schema: `props[].type` becomes the source for a generated `<Component>Config<T>` interface.
- Extend the emitter: state-machine `states[]` generates a string-literal union + transition type.
- Verification: `web/src/engines/<e>/types.ts` shrinks by ~60% — the hand-written config interface is replaced by the generated one; the hand-written state enum is replaced by the generated union.

### Phase 3 — Flutter emitter (2 sessions)
- Migrate YAML schema to polyglot signature (§ 6 Option A).
- Populate `signature.dart` for every method in every adapter spec.
- Implement `dart-emitter.ts` following the same AST → emitter split.
- Verification: `flutter/lib/engines/<e>/generated/` contains parallel `*_spec.dart` files; `flutter analyze` stays green.

### Phase 4 — Docs + changelog generators (1 session)
- Emit per-engine Markdown docs from the YAML (props table, state machine diagram, composition slots).
- Emit a CHANGELOG.md from the YAML's `changelog:` block so release notes stop drifting from the spec.
- Verification: `docs/engines/<e>.md` regenerates idempotently; `CHANGELOG.md` matches the union of all spec changelogs.

### Phase 5 — Test scaffold generator (1 session, optional)
- For each generated adapter, emit a `<name>-contract.test.ts` that type-checks a fixture adapter against the interface. This is the type-level analog of the Tier 2 test described in `rules/facade-manager-detection.md` MUST Rule 1.
- Verification: every generated adapter has a corresponding contract test; CI green.

**Total: ~7 sessions** for a production-ready codegen across all adapter interfaces, props, states, Flutter output, docs, and contract tests. Parallelizable to ~3–4 sessions given that Phase 1, 3, 4 are independent once Phase 2's schema extension lands.

Dependencies: none external; every phase is bounded by the existing spec surface, the existing TypeScript/Dart toolchains, and the existing token-compiler harness.

---

## 9. Validation strategy — why hand-rolled, why not zod

The PoC uses hand-rolled predicates in `spec-loader.ts` instead of `zod` / `ajv`. Three reasons:

1. **Surface is narrow.** The adapter block has four top-level fields and four sub-field shapes. A hand-rolled validator is ~100 LOC; a zod schema would be ~70 LOC of schema plus 10 MB of runtime dep. For the PoC's scope the dep cost is not justified.

2. **Error messages are load-bearing.** Every schema violation is a YAML-authoring bug that a human needs to fix. The hand-rolled validator emits messages of the form `adapter.methods[2].signature must be a non-empty string (specs/components/data-table.yaml)` — actionable on sight. Zod's default errors are less actionable and would need `zod-validation-error` or equivalent.

3. **Schema evolution is additive.** Each roadmap phase (§ 8) adds new YAML fields the emitter reads. Adding a validation rule in the hand-rolled validator is a 3-line change; adding it in zod is a 3-line change to the schema plus a fixture update. The incremental cost is the same, so the switching cost from hand-rolled → zod is not recovered until the schema is ~10× its current size.

**When to switch to zod:** when the schema exceeds ~500 LOC (roughly, when it contains prop types + state enums + accessibility contracts). At that point the combinator structure of zod overtakes the line-count of hand-rolled predicates. Not before.

The `types.ts` module is the migration boundary — if codegen ever switches to zod, only `spec-loader.ts` changes; `ts-emitter.ts` keeps consuming `ComponentSpecAst`.

---

## 10. PoC demonstration — spec-to-generated comparison

Running the PoC against `specs/components/data-table.yaml` produces `compiler/generated/data-table-adapter-spec.ts`. Comparing to the hand-written `web/src/engines/data-table/types.ts`:

| Symbol | Hand-written | Generated | Diff |
|---|---|---|---|
| `export interface DataTableAdapter<T extends DataTableRow, TId = string>` | yes | `DataTableAdapter<T, TId = string>` | Generated version drops the `extends DataTableRow` constraint because the YAML notes that constraint is pending the M-04 BLOCKING-3 fix. The YAML is the current truth. |
| `readonly getRowId: (row: T) => TId` | yes (as `getRowId(row: T): TId` method-shorthand) | yes (as arrow-function property) | Equivalent at the type level; style diff only. |
| `readonly capabilities: () => DataTableCapabilities` | yes | yes | Identical. |
| `readonly fetchPage: (query: DataTableQuery) => Promise<DataTablePage<T>>` | yes | yes | Identical. |
| `readonly onRowActivate?: ...` | yes | yes | Identical. |
| `readonly rowActions?: ReadonlyArray<DataTableRowAction<T, TId>>` | yes | yes | Identical. |
| `readonly bulkActions?: ReadonlyArray<DataTableBulkAction<T, TId>>` | yes | yes | Identical. |
| `readonly filterDimensions?: ReadonlyArray<FilterDimension>` | **no** (reserved for 0.4.0) | **yes** | **Divergence.** The YAML keeps `filterDimensions` and `subscribe` listed as optional methods reserved for 0.4.0; the hand-written types.ts omits them per `rules/orphan-detection.md` Rule 1 (no facade without a consumer). |
| `readonly subscribe?: ...` | **no** (reserved for 0.4.0) | **yes** | **Divergence.** Same as above. |
| `readonly invalidate?: () => Promise<void> \| void` | yes | yes | Identical. |

**The divergence is the point of the PoC.** The hand-written types have correctly shipped only the methods with wired consumers (the orphan-detection rule). The generated types include every method the YAML declares, including the two that are reserved for 0.4.0. Two legitimate dispositions exist, both are spec-authoring decisions, and the codegen pipeline surfaces the choice:

- **Option A:** The YAML is wrong — `filterDimensions` and `subscribe` should be removed from `adapter.methods[]` until they ship. The generator is right; update the spec. (Consistent with orphan-detection Rule 3.)
- **Option B:** The YAML is right — `filterDimensions` and `subscribe` are "reserved" methods that consumers should know about. Add a `reserved: true` field to the method spec; the emitter skips reserved methods by default, with an opt-in `--include-reserved` flag. (Consistent with how the YAML reads today — the prose in `5.1.1` explicitly calls these two out as not-yet-wired.)

Neither option is the PoC's decision to make. The PoC's job is to make the divergence visible so the spec author chooses. That is exactly what we want from a codegen pipeline — it converts an implicit drift into an explicit decision point.

---

## 11. Anti-goals

The codegen pipeline is NOT:

- A JSX / widget generator. The visual implementation and interaction behavior are too semantics-laden for a template engine to get right. Generating JSX produces code that looks correct and fails in subtle accessibility / responsive / token-consumption ways that only a human implementer catches.
- A runtime framework. Nothing in `compiler/src/codegen/` runs in the browser or in a Flutter app. The output is static text files that become part of the engine's source tree.
- A schema migration tool. If a spec change breaks consumers, the break is the signal; see § 7.
- A replacement for type-checking. The generated file still has to pass `tsc -b`; a bad signature in the YAML surfaces as a TS error, not a codegen error.

---

## 12. Appendix — file layout

```
compiler/
├── src/
│   ├── codegen/
│   │   ├── index.ts            # Public API re-exports
│   │   ├── types.ts            # ComponentSpecAst, AdapterSpec, EmitContext, CodegenError
│   │   ├── spec-loader.ts      # YAML → ComponentSpecAst (hand-rolled validator)
│   │   ├── ts-emitter.ts       # ComponentSpecAst → TypeScript source
│   │   ├── cli.ts              # prism-codegen CLI
│   │   └── __tests__/
│   │       └── ts-emitter.test.ts
│   ├── types.ts                # (token compiler — unchanged)
│   ├── parse.ts, web.ts, flutter.ts, scaffold.ts  # (unchanged)
│   └── compile.test.ts         # (unchanged)
├── generated/                  # PoC output — committed; normally .gitignored
│   └── data-table-adapter-spec.ts
├── package.json                # + "prism-codegen" bin, + "codegen" script
└── tsconfig.json               # (unchanged — src/**/* already covers codegen/**)
```
