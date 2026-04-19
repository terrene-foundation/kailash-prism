/**
 * @kailash/prism-compiler — Codegen pipeline public API
 *
 * The codegen PoC is opt-in — consumers either run the CLI
 * (`prism-codegen --spec ... --out ...`) or import from this module
 * directly. The token-compile pipeline (`compile()` in ../index.ts) is
 * unaffected.
 */
export { loadComponentSpec, validateComponentSpec } from './spec-loader.js';
export { emitAdapterTypes } from './ts-emitter.js';
export {
  CodegenError,
  type CodegenErrorCode,
  type CodegenOutputFile,
  type ComponentSpecAst,
  type AdapterSpec,
  type MethodSpec,
  type TypeParameterSpec,
  type EmitContext,
} from './types.js';
