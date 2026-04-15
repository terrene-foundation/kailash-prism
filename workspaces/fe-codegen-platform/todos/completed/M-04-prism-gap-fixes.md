# M-04: Fix Prism gaps surfaced by M-01 / M-02 / M-03

## Priority: HIGH (blocks convergence)
## Scope: `@kailash/prism-web` — Prism repo `web/src/`

## Description

Collect all blocking gaps from the three parallel migrations (M-01 Form, M-02 DataTable simple, M-03 DataTable grid/list) and fix them in Prism. "Blocking" = the migration can't land cleanly without the fix. "Non-blocking" becomes a codify task for M-05.

## Expected gap categories (actual list comes from findings)

1. **Type surface gaps** — missing props, too-strict types, missing `| undefined` for `exactOptionalPropertyTypes`
2. **Extension points** — missing slots (`renderX`, `onX` callbacks) for things consumers need
3. **Config shape gaps** — FormConfig or DataTableConfig fields the consumer wanted but didn't exist
4. **New atom/molecule needs** — e.g., if M-03 needs a Card atom
5. **Adapter interface gaps** — missing adapters for Form / DataTable (will be sketched in findings, not necessarily built in this todo)

## Acceptance criteria

1. Every "HIGH blocking" finding from M-01/M-02/M-03 findings docs is resolved in `web/src/`
2. `npx tsc --noEmit` passes in `web/`
3. `npm run build` passes in `web/`
4. A new tarball is produced: `cd web && npm pack` → `/tmp/kailash-prism-web-<version>.tgz`
5. Tarball is copied into arbor: `cp /tmp/kailash-prism-web-*.tgz ~/repos/terrene/contrib/arbor/`
6. Arbor `package.json` points to the updated tarball
7. `docs/specs/05-engine-specifications.md` is updated for any new props/slots
8. Non-blocking gaps are written to `workspaces/fe-codegen-platform/04-validate/migration-non-blocking.md` for /codify

## Dependencies

- Blocks: M-06 (integration test)
- Depends on: M-01, M-02, M-03 findings docs

## Agent

- `react-specialist` for implementation
- `reviewer` for PR-level gate review of the Prism changes (background)

## Done when

- Prism rebuilds, tarball re-packed, arbor reinstalls
- All three migration routes still compile after the Prism bump
- Specs updated to match any new API surface
