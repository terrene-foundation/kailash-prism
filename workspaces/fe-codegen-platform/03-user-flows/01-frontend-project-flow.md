# User Flow: Frontend Project with Codegen Capability Layer

## Flow 1: New Project (With Primitives System)

```
USER: "I need a CRM dashboard for my Kailash-powered contact management app"
  │
  ├── STEP 1: Design Spec Generation
  │   Agent reads brief → generates DESIGN.md (model-generated, user-reviewed)
  │   Alternative: User provides existing brand guidelines → agent extracts DESIGN.md
  │   Alternative: Stitch generates mockups → extract_design_context → DESIGN.md
  │   Output: DESIGN.md (persisted — reused in all future sessions)
  │
  ├── STEP 2: Scaffold
  │   /scaffold reads DESIGN.md + data model description
  │   Agent selects templates: DashboardLayout (home), ListLayout (contacts),
  │     DetailLayout (contact detail), FormLayout (create/edit)
  │   Generates: project structure, token files (Tailwind config from DESIGN.md),
  │     navigation definition, route structure
  │   Output: Project skeleton with templates, tokens, and routing
  │
  ├���─ STEP 3: Composition
  │   For each page, agent follows composition grammar:
  │     1. Select template → populate zones with organisms
  │     2. Configure organisms with data model fields
  │     3. Wire state management (React Query hooks from Nexus types)
  │     4. Apply responsive rules from layout grammar
  │   Primitives are composed, NOT generated from scratch
  │   Custom logic (domain-specific UI, novel interactions) is generated
  │   Output: Working pages composed from primitives
  │
  ├── STEP 4: Validation
  │   /i-audit → automated 10-dimension evaluation (target: 35+/50)
  │   /i-polish → address audit findings (dimensions 1-7)
  │   /i-harden → production hardening (6 categories)
  │   Composition validator checks: token adherence, template zone usage,
  │     layout primitive compliance
  │   Output: Production-ready frontend
  │
  └── STEP 5: Extraction (post-project)
      /codify extracts: new component patterns, composition refinements,
        edge cases discovered during development
      Flows back to loom/ via sync for future projects
      Output: Improved primitives + guidance for next project
```

## Flow 2: Design Spec Authoring (Three Paths)

```
PATH A: Brief-to-Spec (most common, non-designers)
  User: "Professional, clean, data-focused dashboard. Our brand is blue and gray."
  Agent: Generates DESIGN.md using brief-to-spec prompt template
  Agent: "I've created a design spec. Here's what it defines:
    - Color palette: navy primary, slate grays, amber accent for alerts
    - Typography: Inter for UI, 16px base, 8-point scale
    - Spacing: 4px base unit, 8-point scale
    - Components: rounded-lg corners, subtle shadows, 1px borders
    Does this match your vision? Anything you'd adjust?"
  User: Reviews, requests changes (e.g., "make it darker, more contrast")
  Agent: Updates DESIGN.md
  Output: Reviewed DESIGN.md (human-in-the-loop on design, not code)

PATH B: Stitch-Accelerated (designers, visual thinkers)
  User: "Generate some mockups for a fintech dashboard"
  Agent: Calls Stitch generate_screen_from_text → visual mockups
  User: Iterates on mockups in Stitch (visual canvas)
  Agent: Calls extract_design_context → DESIGN.md
  Output: DESIGN.md derived from validated visual designs

PATH C: Brand Extraction (existing products)
  User: "Match our existing product at app.example.com"
  Agent: Calls Stitch extract_design_context on URL → DESIGN.md
  Alternative: User provides Figma export → agent extracts tokens
  Output: DESIGN.md that matches existing brand identity
```

## Flow 3: The Composition Engine in Action

```
AGENT receives: "Build the contacts list page"

1. TEMPLATE SELECTION
   Agent reads composition grammar → selects ListLayout template
   ListLayout defines zones: page-header, filter-bar, content, footer

2. ZONE POPULATION
   page-header zone:
     Layout: Row(justify: between)
     Contains: Typography.h1("Contacts") + Toolbar(actions: [create, export, import])

   filter-bar zone:
     Layout: Row(gap: 12, wrap: true)
     Responsive: hidden on mobile (move to modal)
     Contains: SearchBar + SelectField(status) + DatePicker(created)

   content zone:
     Layout: Stack
     Contains: DataTable(
       columns: [name, email, company, status, lastContact, actions],
       sortable: [name, company, lastContact],
       filterable: true,
       pagination: { pageSize: 25, options: [10, 25, 50] },
       bulkActions: [delete, export, assignTag],
       emptyState: EmptyState(icon: "people", message: "No contacts yet", action: "Add contact")
     )

   footer zone:
     Layout: Row(justify: between)
     Contains: BulkActionBar + Pagination

3. RESPONSIVE ADAPTATION
   Agent applies responsive rules from layout grammar:
     mobile: filter-bar hidden, DataTable becomes CardGrid, actions become FAB
     tablet: filter-bar visible, 2-column filter layout
     desktop: full layout as designed

4. STATE MANAGEMENT
   Phase 3 (with Nexus-to-Prism bridge):
     Agent auto-generates React Query hooks from Nexus API types:
       useContacts(filters, pagination) → GET /api/contacts
       useDeleteContacts(ids) → DELETE /api/contacts
       useExportContacts(ids) → POST /api/contacts/export
   Phase 1 fallback (without Nexus bridge):
     Agent hand-writes React Query hooks based on the data model description.
     Types are defined manually. Same patterns, manual wiring.

5. OUTPUT
   Structurally sound page composed from primitives.
   Custom: column renderers, status badge colors, action handlers.
   Primitive: DataTable, SearchBar, Pagination, EmptyState, layout.
```
