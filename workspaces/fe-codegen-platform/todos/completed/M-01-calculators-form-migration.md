# M-01: Migrate arbor /calculators to Prism Form engine

## Priority: HIGH (Form engine first real consumer)
## Scope: arbor repo — `~/repos/terrene/contrib/arbor/apps/web/`
## Engine under test: `@kailash/prism-web` Form engine

## Description

Arbor has an HR calculator suite at `/calculators` (list) and `/calculators/[type]` (detail, 7 calculator types: leave, cpf, payroll, overtime, retrenchment, cost-to-company, quota levy). Each calculator is a form that takes inputs, computes a result, and displays it.

This is the **first real consumer of the Prism Form engine**. Goal: validate that `FormConfig` + `FieldDef[]` + `onSubmit` covers real calculator patterns, and surface anything missing.

## Migration pattern (same as advisory pilot)

1. Build side-by-side `-prism` routes, do NOT replace existing bespoke routes
   - `/calculators-prism` — list page using Prism Layout primitives
   - `/calculators-prism/[type]` — detail page using Prism Form engine
2. Keep existing `/calculators` untouched for comparison
3. Arbor imports `@kailash/prism-web` from the existing tarball dependency

## Acceptance criteria

1. `/calculators-prism` route compiles under Turbopack with zero TS errors
2. `/calculators-prism/[type]` route compiles for ALL 7 calculator types
3. Each calculator type uses `Form` (or `FormWizard` if multi-step) from `@kailash/prism-web`
4. `FieldDef[]` configuration drives every field — no bespoke `<input>` in the page body
5. Form validation works (required fields, numeric ranges, format)
6. Submit handler calls the same arbor calculator API the bespoke route uses
7. Result renders in a read-only panel after successful submission
8. Visual parity with bespoke route (same fields, labels, layout)
9. At least one calculator exercises conditional fields (`ConditionExpression`) — e.g., leave calculator where joined-date drives annual-leave eligibility
10. No mock data — live API calls end-to-end (if backend is running, route works)

## Gaps-surfacing deliverables

Write down in `workspaces/fe-codegen-platform/04-validate/migration-m01-findings.md`:
- Every time you wanted a Form feature that didn't exist
- Every time FieldDef forced a workaround
- Every "I had to use a `render: () => ...` custom cell because..."
- What a `FormAdapter` interface (analogous to `ChatAdapter`) would look like, if we built one
- Whether the calculator API should live in a `CalculatorAdapter.compute(type, inputs)` or is `onSubmit` enough

## Files to touch (arbor)

- `apps/web/src/app/(dashboard)/calculators-prism/page.tsx` — NEW
- `apps/web/src/app/(dashboard)/calculators-prism/[type]/page.tsx` — NEW
- `apps/web/src/lib/prism-calculator-configs.ts` — NEW (FormConfig per calculator type)
- Do NOT touch the existing `/calculators` route

## Files to read (arbor, bespoke reference)

- `apps/web/src/app/(dashboard)/calculators/page.tsx` (76 LOC list)
- `apps/web/src/app/(dashboard)/calculators/[type]/page.tsx` (98 LOC detail)
- `apps/web/src/app/(dashboard)/calculators/elements/*` — existing calculator form components

## Files to read (prism)

- `web/src/engines/form/form-types.ts` — FieldDef, FormConfig, ConditionExpression
- `web/src/engines/form/form-root.tsx` — Form component API
- `web/src/engines/form/form-wizard.tsx` — multi-step form if needed
- `docs/specs/05-engine-specifications.md` § Form engine

## Dependencies

- None — independent of M-02 and M-03

## Agent

- `react-specialist` for the implementation
- Work in isolated worktree: `isolation: "worktree"` for safety

## Done when

- All 7 calculator types render and submit via Prism Form
- Dev server runs arbor, both bespoke and prism routes load
- TS build passes
- Findings doc filled in
