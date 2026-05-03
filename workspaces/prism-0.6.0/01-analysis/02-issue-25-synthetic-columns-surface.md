---
phase: analyze
date: 2026-05-03
related_issue: terrene-foundation/kailash-prism#25
---

# Issue #25 — `ColumnDef.field` Synthetic Computed Columns: Surface Analysis

## Current type narrowing

```typescript
// web/src/engines/data-table/types.ts:23-25
export interface ColumnDef<T extends DataTableRow> {
  /** Data field key */
  field: string & keyof T;
  // ...
  render?: (value: T[keyof T] | undefined, row: T) => ReactNode; // line 52
}
```

The `string & keyof T` intersection rejects synthetic field-keys at TypeScript narrow time. The `render` callback's `value: T[keyof T] | undefined` advertises a typed value lookup the engine cannot fulfil for synthetic fields.

## All `row[col.field]` reads (already-safe inventory)

(Source: agent-B sweep.)

| Site                                | Pattern                                                                | Already-safe?                                               |
| ----------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------- |
| `data-table-body.tsx:341`           | `const value = row[col.field]; … String(value ?? '')`                  | YES — coalesce                                              |
| `data-table-mobile.tsx:173-194`     | `String(row[titleCol.field] ?? '')`, `col.render(row[col.field], row)` | YES — coalesce                                              |
| `data-table-root.tsx:419, 422, 514` | `(row as Record<string, unknown>)[titleColumn.field] ?? ''`            | YES — explicit cast + coalesce                              |
| `use-data-table.ts:347`             | `const val = (row as Record<string, unknown>)[col.field]`              | YES — explicit cast                                         |
| `data-table-header.tsx:111-222`     | `filters[col.field]`, `column.field` passed to sort handlers           | YES — `field: string` already accepted by sort/filter state |

**Conclusion:** every read site is _already_ synthetic-safe. Relaxing `field: string & keyof T` to `field: string` is a runtime no-op. The change is type-system-only.

## Sort comparator: signature mismatch

```typescript
// use-data-table.ts:673-700
export function defaultSortComparator<T>(
  a: T,
  b: T,
  key: keyof T,
  direction: "asc" | "desc",
): number {
  const aVal = (a as Record<string, unknown>)[key as string];
  // ...
}
```

The body already casts `key as string` — the `keyof T` narrowing is decorative. But the call site at `use-data-table.ts:375` does `sort.field as keyof T` — a force-cast that is currently safe because `sort.field: string` and the comparator body re-casts to string. Change required:

- **`defaultSortComparator<T>(a, b, key: string, direction): number`** — drop `keyof T` from key.
- Drop the `as keyof T` force-cast at the call site.

This is a non-breaking signature widening (`keyof T` is a subtype of `string`).

## Render callback: type widening

```typescript
// types.ts:52
render?: (value: T[keyof T] | undefined, row: T) => ReactNode;
```

For synthetic fields, the engine passes `undefined` (because `row[synthetic] === undefined`). The current type advertises `T[keyof T] | undefined` which is technically accurate (`undefined` is in the union) but misleading — it suggests the value will be a typed field of `T`. Widen to:

```typescript
render?: (value: unknown, row: T) => ReactNode;
```

This is a **breaking type change** for consumers who relied on the narrower `T[keyof T]` to skip null-check ergonomics. Mitigation: every shipped consumer (per agent-A sweep + DataTable changelog) already uses `value ?? defaultValue` or ignores `value` and reads from `row` directly. No production breakage expected; type-checker breakage on consumer recompile is the risk.

## Runtime safety: synthetic field + sortable

A synthetic field with `sortable: true` produces semantically wrong sort:

- `row[synthetic_key]` → `undefined` for every row
- Comparator: `String(undefined)` → `"undefined"` (lexical) on every row → stable but meaningless order
- No crash, no NaN, no exception — silent semantic bug

**Required runtime check:** at DataTable construction time (in `useDataTable` setup), iterate `columns`; for each column where `sortable === true && !(field in firstRow)`, throw:

```
Error: column "${field}" has sortable: true but is a synthetic field (no row[field] lookup).
Synthetic columns MUST set sortable: false. To sort by a derived value, pre-compute it
into the row data before passing to DataTable.
```

Throw at first-render time (cheap — runs once per DataTable mount). Detection uses `firstRow` because the column.field ∉ keyof T narrowing was just removed; the only run-time check is "does this row actually have this key?". If `data: T[]` is empty, defer the check until first non-empty render.

**Why throw, not warn:** silent wrong-sort is a worse bug than a loud refusal. A consumer who hits this got the API wrong; the throw tells them exactly why and how to fix. (Different from globalSearch one-sided control which warns rather than throws — there the silent fallback is "uncontrolled mode", a sensible default; here there is no sensible default.)

## Spec edit shape

```yaml
# specs/components/data-table.yaml — relevant ColumnDef section
field:
  type: string
  description: |
    Data field key. May be a key of T (engine reads row[field], passes as value to render)
    or a synthetic id (no value lookup; sortable MUST be false; render receives undefined
    as value).
  contract:
    if_keyof_T: "engine reads row[field]; render value type is T[field]"
    if_synthetic: "render receives undefined; sortable MUST be false (runtime-checked)"
```

Plus a new entry in `docs/specs/05-engine-specifications.md § DataTable § ColumnDef contract relaxation (0.5.0 → 0.6.0)`.

## Decisions for `/todos`

1. **Type widening lands in 0.6.0**: `field: string` + `render: (value: unknown, ...)` + `defaultSortComparator(key: string, ...)`.
2. **Runtime check throws** at first-render (cheap, one-shot per DataTable mount).
3. **Migration note in CHANGELOG**: existing consumers see no runtime change; type-checker may require minor `value as Foo` widening in render callbacks that destructured the typed value. Net additive.
4. **Spec authority**: `specs/components/data-table.yaml` and `docs/specs/05-engine-specifications.md` updated AFTER code lands per `spec-accuracy.md` Rule 5 (no spec ahead of code).
