/**
 * @kailash/prism-compiler — Component spec loader + validator
 *
 * Reads a `specs/components/<name>.yaml` file, validates the subset of
 * fields the codegen pipeline consumes, and returns a `ComponentSpecAst`.
 *
 * Validation strategy: hand-rolled, typed predicates. Zod / Ajv would add
 * a runtime dependency for the PoC's narrow needs — the component spec
 * surface the emitter reads is small enough that hand-rolled checks
 * produce more actionable error messages ("adapter.methods[2].signature
 * is missing at specs/components/data-table.yaml") than a generic schema
 * error.
 *
 * If the schema grows beyond the adapter block (e.g. codegen starts
 * reading the props matrix to emit React prop types), swap in zod at
 * that point — see codegen-architecture.md § "Validation strategy".
 *
 * Spec: docs/specs/05-engine-specifications.md § 5.1.1
 */
import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import {
  CodegenError,
  type AdapterSpec,
  type ComponentSpecAst,
  type MethodSpec,
  type TypeParameterSpec,
} from './types.js';

/** Read + validate one component spec. Throws `CodegenError` with a
 *  typed code on any failure. */
export function loadComponentSpec(sourcePath: string): ComponentSpecAst {
  let raw: string;
  try {
    raw = readFileSync(sourcePath, 'utf-8');
  } catch (err) {
    throw new CodegenError(
      'SPEC_NOT_FOUND',
      `Component spec not found at ${sourcePath}: ${describeError(err)}`,
      sourcePath,
    );
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch (err) {
    throw new CodegenError(
      'YAML_PARSE_FAILED',
      `YAML parse failed at ${sourcePath}: ${describeError(err)}`,
      sourcePath,
    );
  }

  return validateComponentSpec(parsed, sourcePath);
}

/** Validate a parsed YAML object against the subset of the component
 *  spec schema the codegen consumes. */
export function validateComponentSpec(raw: unknown, sourcePath: string): ComponentSpecAst {
  if (!isObject(raw)) {
    throw schemaError('root must be an object', sourcePath);
  }

  const name = requireString(raw, 'name', sourcePath);
  const version = requireString(raw, 'version', sourcePath);
  const category = requireString(raw, 'category', sourcePath);
  const description = requireString(raw, 'description', sourcePath);

  const adapterRaw = raw['adapter'];
  const adapter = adapterRaw == null ? undefined : validateAdapter(adapterRaw, sourcePath);

  return { name, version, category, description, adapter };
}

function validateAdapter(raw: unknown, sourcePath: string): AdapterSpec {
  if (!isObject(raw)) {
    throw schemaError('adapter must be an object', sourcePath);
  }

  const name = requireString(raw, 'name', sourcePath, 'adapter.name');
  const version_introduced = requireString(
    raw,
    'version_introduced',
    sourcePath,
    'adapter.version_introduced',
  );
  const authority = requireString(raw, 'authority', sourcePath, 'adapter.authority');
  const supersedes = optionalString(raw, 'supersedes');

  const typeParamsRaw = raw['type_parameters'];
  if (!Array.isArray(typeParamsRaw)) {
    throw schemaError('adapter.type_parameters must be an array', sourcePath);
  }
  const type_parameters: TypeParameterSpec[] = typeParamsRaw.map((entry, idx) =>
    validateTypeParameter(entry, sourcePath, idx),
  );

  const methodsRaw = raw['methods'];
  if (!Array.isArray(methodsRaw) || methodsRaw.length === 0) {
    throw schemaError('adapter.methods must be a non-empty array', sourcePath);
  }
  const methods: MethodSpec[] = methodsRaw.map((entry, idx) =>
    validateMethod(entry, sourcePath, idx),
  );

  const supportTypesRaw = raw['support_types'];
  const support_types: string[] = Array.isArray(supportTypesRaw)
    ? supportTypesRaw.map((entry, idx) => {
        if (typeof entry !== 'string') {
          throw schemaError(
            `adapter.support_types[${idx}] must be a string`,
            sourcePath,
          );
        }
        return entry;
      })
    : [];

  return {
    name,
    version_introduced,
    supersedes,
    authority,
    type_parameters,
    methods,
    support_types,
  };
}

function validateTypeParameter(
  raw: unknown,
  sourcePath: string,
  idx: number,
): TypeParameterSpec {
  if (!isObject(raw)) {
    throw schemaError(`adapter.type_parameters[${idx}] must be an object`, sourcePath);
  }
  const name = requireString(raw, 'name', sourcePath, `adapter.type_parameters[${idx}].name`);
  // YAML parsers emit strings for `default: string` but the literal word
  // `string` is a common TypeScript default — both are valid. We accept
  // whatever string is present.
  const defaultVal = raw['default'];
  const description = requireString(
    raw,
    'description',
    sourcePath,
    `adapter.type_parameters[${idx}].description`,
  );
  return {
    name,
    default: defaultVal == null ? undefined : String(defaultVal),
    description,
  };
}

function validateMethod(raw: unknown, sourcePath: string, idx: number): MethodSpec {
  if (!isObject(raw)) {
    throw schemaError(`adapter.methods[${idx}] must be an object`, sourcePath);
  }
  const name = requireString(raw, 'name', sourcePath, `adapter.methods[${idx}].name`);
  const signature = requireString(
    raw,
    'signature',
    sourcePath,
    `adapter.methods[${idx}].signature`,
  );
  const requiredRaw = raw['required'];
  if (typeof requiredRaw !== 'boolean') {
    throw schemaError(
      `adapter.methods[${idx}].required must be a boolean`,
      sourcePath,
    );
  }
  const purpose = requireString(raw, 'purpose', sourcePath, `adapter.methods[${idx}].purpose`);
  return { name, signature, required: requiredRaw, purpose };
}

// --- Validation helpers ---

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(
  obj: Record<string, unknown>,
  key: string,
  sourcePath: string,
  path?: string,
): string {
  const value = obj[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw schemaError(`${path ?? key} must be a non-empty string`, sourcePath);
  }
  return value;
}

function optionalString(obj: Record<string, unknown>, key: string): string | undefined {
  const value = obj[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function schemaError(msg: string, sourcePath: string): CodegenError {
  return new CodegenError('SCHEMA_VIOLATION', `${msg} (${sourcePath})`, sourcePath);
}

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
