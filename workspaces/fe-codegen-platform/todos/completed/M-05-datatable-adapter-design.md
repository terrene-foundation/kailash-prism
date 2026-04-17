# M-05: Design DataTableAdapter interface from M-02 + M-03 friction

## Priority: MEDIUM (input to /codify, not blocking this wave)
## Scope: Prism repo — design doc only, no implementation

## Description

After M-02 and M-03 both ship, we have two real DataTable consumers in production. Their findings docs each sketch what a `DataTableAdapter` interface should look like. This todo compares the two sketches, finds the common shape, and writes a proposed interface to `docs/specs/05-engine-specifications.md` AND to `specs/components/data-table.yaml`.

Implementation of the adapter is deferred to a future wave — this todo produces the design, not the code.

## Acceptance criteria

1. `docs/specs/05-engine-specifications.md` § DataTable adapter section updated with proposed interface
2. Interface methods defined, with types:
   - At minimum: `fetchRows(params) → Promise<RowsResult>`
   - Likely: `getRowKey(row) → string`, `downloadRow?(row)`, per-row action handlers
3. The interface covers BOTH M-02 (simple read-only) and M-03 (grid/list with filters) use cases without forcing either to work around it
4. The interface's rationale is written down: why these methods, what each solves, what it intentionally leaves out
5. Prior art comparison: how does this compare to `ChatAdapter`? Similar pattern, or intentionally different?

## Files to touch (Prism)

- `docs/specs/05-engine-specifications.md` — append proposed DataTableAdapter section
- `specs/components/data-table.yaml` — update with adapter contract (if applicable)

## Dependencies

- Requires: M-02 + M-03 findings docs

## Agent

- `analyst` for the comparison and design
- `react-specialist` for review (background)

## Done when

- Interface written and committed
- Old and new session notes and PRs point to this as the agreed shape for the next wave's implementation
