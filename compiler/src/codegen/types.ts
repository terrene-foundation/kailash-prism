/**
 * @kailash/prism-compiler — Codegen pipeline types
 *
 * Shared shape definitions for the engine codegen PoC. The PoC targets the
 * `adapter:` section of `specs/components/*.yaml` and emits typed TypeScript
 * scaffolding that matches the hand-written adapter interface in
 * `web/src/engines/<engine>/types.ts`.
 *
 * Spec: docs/specs/05-engine-specifications.md § 5.1.1 (DataTableAdapter)
 * Design: docs/guides/codegen-architecture.md
 *
 * This module is intentionally types-only — it defines the pipeline's AST
 * shapes and emit-context plumbing. Concrete parsing, validation, and
 * emission live in `spec-loader.ts` and `ts-emitter.ts`.
 */
import type { OutputFile } from '../types.js';

/** Structural description of a component YAML spec, restricted to fields
 *  the codegen pipeline consumes today. The full component-spec schema
 *  (props, states, accessibility, tokens) is out of scope for this PoC —
 *  codegen does not read those fields yet. */
export interface ComponentSpecAst {
  /** Component name (PascalCase). Drives the generated interface prefix. */
  readonly name: string;
  /** Component version from the YAML `version:` field. Emitted verbatim
   *  into the generated file header so generated output is traceable to a
   *  specific spec revision. */
  readonly version: string;
  /** "atom" | "molecule" | "organism" | "engine". Emitted as a comment;
   *  not used for emission logic. */
  readonly category: string;
  /** Free-text description from `description:`. Emitted into the header
   *  comment for the generated file. */
  readonly description: string;
  /** Adapter section. Optional — not every component has an adapter.
   *  Missing adapter is NOT an error; the emitter simply skips it and the
   *  CLI reports "no adapter in this spec". */
  readonly adapter?: AdapterSpec;
}

/** Shape of the `adapter:` block from the YAML spec. All fields are
 *  required except where marked optional — see `spec-loader.ts` for the
 *  validation rules. */
export interface AdapterSpec {
  /** Interface name to emit, e.g. `DataTableAdapter`. */
  readonly name: string;
  /** First version that shipped this adapter. Emitted into the
   *  `@since` tag in the generated JSDoc. */
  readonly version_introduced: string;
  /** Optional legacy interface the adapter replaces. Emitted as a
   *  `@supersedes` tag. */
  readonly supersedes?: string;
  /** Authoritative spec reference. Emitted verbatim into the header. */
  readonly authority: string;
  /** Generic type parameters declared by the adapter, e.g. `T` and
   *  `TId = string`. Emitted as the generated interface's type param
   *  list. */
  readonly type_parameters: ReadonlyArray<TypeParameterSpec>;
  /** Method definitions. Required + optional are distinguished by the
   *  `required: true|false` YAML field; the emitter marks optional
   *  methods with a trailing `?` on the property name. */
  readonly methods: ReadonlyArray<MethodSpec>;
  /** Support types the adapter references. Emitted as a comment list
   *  referencing the hand-written web types file; the emitter does NOT
   *  generate these types (see codegen-architecture.md § "What gets
   *  generated"). */
  readonly support_types: ReadonlyArray<string>;
}

/** One generic type parameter on an adapter interface. */
export interface TypeParameterSpec {
  readonly name: string;
  readonly default?: string;
  readonly description: string;
}

/** One method on an adapter interface. `signature` is the verbatim
 *  TypeScript signature from the YAML — the PoC does NOT parse it; it
 *  treats the string as opaque and interpolates it directly into the
 *  generated property type. See codegen-architecture.md § "Conservative
 *  interpretation" for why. */
export interface MethodSpec {
  readonly name: string;
  readonly signature: string;
  readonly required: boolean;
  readonly purpose: string;
}

/** Per-emit context threaded through the pipeline. The PoC only carries
 *  the source file path (for error messages) and the spec AST, but this
 *  shape is the extension point for future emitters — a Dart emitter
 *  would add `target: "dart"` and per-target options. */
export interface EmitContext {
  /** Absolute path to the source YAML, used in the generated file
   *  header and in error messages. */
  readonly sourcePath: string;
  /** Parsed AST to emit. */
  readonly spec: ComponentSpecAst;
}

/** Result of emitting a single spec. Re-uses `OutputFile` from the token
 *  compiler pipeline so CLI plumbing stays uniform across codegen +
 *  token-compile paths. */
export type CodegenOutputFile = OutputFile;

/** Pipeline-level error — typed so the CLI can distinguish a missing
 *  file / parse failure / schema violation and return a distinct exit
 *  code path. */
export class CodegenError extends Error {
  public readonly code: CodegenErrorCode;
  public readonly sourcePath?: string;

  constructor(code: CodegenErrorCode, message: string, sourcePath?: string) {
    super(message);
    this.name = 'CodegenError';
    this.code = code;
    this.sourcePath = sourcePath;
  }
}

export type CodegenErrorCode =
  | 'SPEC_NOT_FOUND'
  | 'YAML_PARSE_FAILED'
  | 'SCHEMA_VIOLATION'
  | 'NO_ADAPTER_IN_SPEC';
