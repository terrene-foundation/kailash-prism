# B-01: Web DataTable Engine

## Priority: HIGH (highest time-savings engine)
## Source: Plan Sprint B1; docs/specs/05-engine-specifications.md § 5.1

## Description

Build the DataTable engine — the most complex and highest-value engine. Sort, filter, paginate, select, bulk actions, virtual scroll via @tanstack/virtual, loading/empty/error states, column configuration, responsive card-grid fallback on mobile.

## Acceptance Criteria

1. DataTable component accepts typed config (columns, data source, pagination, bulk actions)
2. Sorting: click column header to sort, multi-column sort with shift-click
3. Filtering: per-column filters, global search
4. Pagination: page size selector, page navigation, total count
5. Selection: row checkboxes, select all, bulk action bar
6. Virtual scroll: @tanstack/virtual for 10K+ rows at 60fps
7. States: loading skeleton, empty state, error state with retry
8. Responsive: full table on desktop, CardGrid on mobile
9. Accessibility: ARIA grid role, keyboard navigation (arrow keys between cells)
10. Performance: <5ms per row render, <100ms sort on 10K rows
11. Column config: show/hide, reorder, resize, pin
12. Tests: unit + integration tests

## Key Spec References

- docs/specs/05-engine-specifications.md § 5.1 (DataTable engine)
- docs/specs/03-component-contracts.md § 3.4.3 (DataTable organism)
- specs/components/data-table.yaml (component contract)
- 04-validate/engine-spec-gaps.md (Row type gap — use generic T extends Record<string, unknown>)
