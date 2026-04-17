# M-06: Integration test — arbor dev server loads all new Prism routes

## Priority: HIGH (convergence gate)
## Scope: arbor repo — dev server + manual browser verification

## Description

Start the arbor dev server and manually verify every new Prism route loads and renders correctly against live APIs. This is the final convergence check before red team.

## Acceptance criteria

1. `cd ~/repos/terrene/contrib/arbor/apps/web && npm run dev` starts cleanly with ZERO build errors
2. ZERO TypeScript errors in the full arbor workspace
3. ZERO terminal warnings from Next.js / Turbopack that were not already present pre-migration
4. Browser loads each new route with a real logged-in session:
   - `/calculators-prism` — list renders, click into each type
   - `/calculators-prism/[type]` for each of 7 types — form renders, submits, shows result
   - `/my-payslips-prism` — table renders, sort works, row-click downloads
   - `/documents-prism` — list mode renders, grid mode renders, filter works, search works
5. Existing bespoke routes still work (`/calculators`, `/my-payslips`, `/documents`) — migration MUST NOT break comparison baseline
6. Browser console has no errors or warnings beyond what the bespoke routes already emit

## Verification evidence

Write to `workspaces/fe-codegen-platform/04-validate/migration-integration-evidence.md`:
- Dev server startup output (success line)
- TS build result
- For each new route: screenshot path or paste of console state
- For each bespoke baseline: confirmation it still works
- Any warnings observed with analysis (fixed or consciously deferred)

## Dependencies

- Requires: M-01, M-02, M-03, M-04 all done
- Blocks: M-07 (red team)

## Agent

- Main thread (not a subagent — this is browser verification)

## Done when

- All routes load, no blocking errors, evidence file filled in
