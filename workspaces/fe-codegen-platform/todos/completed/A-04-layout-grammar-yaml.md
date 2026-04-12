# A-04: Populate Layout Grammar YAML

## Priority: HIGH (blocks Layout engine + composition grammar)
## Source: Plan Workstream A, line 35; docs/specs/04-layout-grammar.md

## Description

Populate `specs/layouts/grammar.yaml` with the full layout grammar: 6 primitives with props, responsive rules, nesting matrix, and zone composition system. Currently a flat list of 6 names.

## Acceptance Criteria

1. All 6 layout primitives defined: VStack, Row, Grid, Split, Layer, Scroll
2. Each primitive has: complete props schema, responsive rules per breakpoint (mobile/tablet/desktop/wide)
3. Custom escape hatch primitive defined (for layouts the grammar cannot express)
4. Nesting rules: which primitives can contain which
5. Zone composition system: how templates define zones and how zones accept content
6. Responsive rule tokens (sidebar-content, stats-grid, action-bar examples from UX architecture)
7. Valid YAML matching docs/specs/04-layout-grammar.md

## Implementation Notes

- Read docs/specs/04-layout-grammar.md for the full specification
- The UX architecture research Section 3 (Layout Grammar) has the most detailed examples
- Layout primitives map to: VStack->flex-column/Column, Row->flex-row/Row, Grid->CSS grid/GridView, Split->resizable panels, Layer->z-index/Overlay, Scroll->overflow/ListView.builder
- Breakpoints: mobile (0-639px), tablet (640-1023px), desktop (1024-1279px), wide (1280px+)
