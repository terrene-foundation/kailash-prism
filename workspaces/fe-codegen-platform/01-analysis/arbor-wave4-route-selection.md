# Arbor Wave-4 Route Selection — Analysis

**Date**: 2026-04-19
**Prism baseline**: 0.3.1 (contracts validated in wave-3)
**Candidates**: `/clients`, `/employees`, `/policies`
**Scope**: Read-only analysis. Recommend ONE wave-4 target.

---

## Executive summary

**Recommendation: `/clients`** as the wave-4 target.

Rationale in one sentence: `/clients` is a near-perfect shape match for the
0.3.1 `DataTable` + `card-grid` + `Form` (Add Client) contracts, exercises
one genuinely new Prism surface (`numeric_aggregation / metric-cards row`
above the table) without requiring any Prism changes first, and shares
almost no invariant with `/documents-prism` / `/my-payslips-prism`, so the
migration will either confirm 0.3.1 is generic or surface a clean gap.

`/employees` is too big a shard (four distinct UI surfaces, three of them
modals) and `/policies` is not list-shaped so it exercises no DataTable
contract at all.

---

## Per-route characterization

### 1. `/clients`  (`(dashboard)/clients/page.tsx`, 582 LOC)

**Data shape**: list. `ClientCompany[]` from `clientsApi.list()`, one-shot
GET, no pagination on the wire.

**Current state machine**:
- `useState` × 11: clients, loading, fetchError, search, sectorFilter,
  viewMode (grid/table), sortField, sortAsc, showAddForm, addingClient,
  newClient (5 nested fields).
- `useMemo` × 2 (sectors list, filtered+sorted derived view).
- `useEffect` × 1 (initial fetch).

**UI surfaces**:
- Header + "Add Client" button
- Inline `AppCard` add-client form (not a modal — renders in-page,
  toggled by `showAddForm`)
- Filter bar: search input + sector `<select>` + view-mode toggle
  (List/Grid icons)
- Metrics row: four `MetricCard`s (Total, Green, Amber, Red — derived
  from `client.risk_tier`)
- Table view: hand-rolled `<table>` with `SortableHeader` helper,
  `RiskTierBadge`, per-row chevron (no actual action)
- Grid view: hand-rolled `<AppCard>` grid, same data, different layout

**Bespoke UI**: none meaningful. Inline add-form is a regular form, not a
modal. No bulk actions, no inline edit, no row-level navigation (chevron
button has no onClick). Everything maps cleanly to 0.3.1 primitives.

**Row-count complexity**: ~single-digit to hundreds of clients per
advisor. Client-side sort + search + filter is fine; no server pagination
needed.

**Numeric PKs**: yes, `ClientCompany.id: number` — triggers G-1
(stringify at adapter boundary).

---

### 2. `/employees`  (`(dashboard)/employees/page.tsx`, 1,234 LOC)

**Data shape**: mixed. The page is really FOUR surfaces stapled
together:
1. Employees list/table (primary, ~250 LOC) — shape match to DataTable
2. Pending Invitations table (secondary, ~215 LOC) — second DataTable
3. Invite Employee modal (~130 LOC) — Form engine candidate
4. Import CSV modal (~230 LOC) — upload + preview + confirm; no Prism
   contract covers the 3-step wizard shape

**Current state machine**: ~15 `useState`s across the parent +
sub-components, two parallel `fetchX` callbacks, a copy-to-clipboard hook,
a work-pass-expiry side-query (N+1 on detail endpoint), `useRef` for
timers and the file input.

**UI surfaces**: see above. Also: three distinct status-badge components
(`StatusBadge`, `ConfirmBadge`, `InvitationStatusBadge`), a
`ProfileBar` completeness widget, two table-skeleton components, row-click
navigation via `router.push(/employees/:id)`.

**Bespoke UI** — the bill:
- **Import CSV wizard** — 3-step (`upload | preview | done`) modal with
  drag/drop, file validation, preview table, confirm action. No 0.3.1
  contract covers this; would need a new Prism wizard/stepper molecule
  OR stays bespoke and the wave-4 writeup has a large "out-of-scope"
  section.
- **Work-pass filter** — toggling the chip triggers an N+1 side-query
  (`employees.map(emp => employeesApi.getEmployee(emp.id))`). This is a
  data-layer bug that's orthogonal to Prism but the migration either
  preserves it or fixes it, neither of which is wave-4's job.
- **Invitation actions column** — copy/resend/revoke icons with per-row
  busy state (`actionLoading: string | null`). Maps to 0.3.1 `rowActions`
  with `onExecute: async`, but each action has distinct visibility rules
  (`isPending` vs `canResend` vs always).
- **Invite-link success modal** — chained modal that opens after invite
  modal closes; no Prism contract covers modal chaining.

**Row-count complexity**: similar to clients. Two tables means two
adapters.

**Numeric PKs**: yes, `Employee.id: number` and `Invitation.id: string`
(UUID) — mixed; the two adapters would need different TId handling, which
is itself a decent G-1 stress test but adds to the shard size.

---

### 3. `/policies`  (`(dashboard)/policies/page.tsx`, 246 LOC)

**Data shape**: **not list-shaped**. It's a small static/semi-static
list of 4 expandable policy sections (`PolicySection[]`, typically 4
entries from `STANDARD_POLICIES` fallback). Each entry is a title +
summary + icon + a `content: string[]` array of paragraphs, rendered as
an accordion card.

**Current state machine**: `useState` × 3 (policies, isLoading,
isStandardFallback), one `useEffect` for fetch with an `isStandardFallback`
degradation path on error.

**UI surfaces**: a single skeleton → card list. Each card has its own
`isExpanded` state (local to `PolicyCard`).

**Bespoke UI**: the expandable-card-with-chevron shape is not something
0.3.1 ships. No sort, no filter, no search, no row actions — just a list
of collapsibles with markdown-like content paragraphs.

**Row-count**: always ~4. Sorting, filtering, pagination are all
inapplicable.

---

## Scoring

### Axis A: coverage value (what NEW Prism contract does this exercise?)

Compared to waves 1–3 which covered: `DataTableAdapter` with 10K rows
and adapter-level sort/filter (payslips), `display="card-grid"` with
`renderCard` (documents), `rowActions` with `onExecute: async` and
`href:` variants (both), memoized adapter + `useRouter` navigation
(documents H3).

| Route | Genuinely new contract exercised | Score |
|---|---|---|
| `/clients` | (a) header-row metric cards ABOVE the DataTable (not a documented pattern; first test of an organism that composes DataTable + summary tiles); (b) inline `<AppCard>` create-form used together with the table — first test of Prism's Form engine and DataTable coexisting on one page in arbor; (c) second round of `card-grid` mode against a different domain (client companies vs documents) — proves the contract generalises beyond the document-library use case | **High** |
| `/employees` | (a) two DataTable instances on one page (employees + invitations) — first stress test of multi-table state isolation; (b) CSV-import wizard — needs a new Prism molecule (stepper/wizard) OR stays bespoke (neither cleanly advances 0.3.1); (c) per-row visibility-conditional `rowActions` (copy only if pending + has URL, resend if pending-or-expired, revoke only if pending) — first test of action-visibility predicates | **High if scoped, Low if full** |
| `/policies` | (a) expandable accordion-card pattern — shape is not covered by 0.3.1 at all; migrating would either be a no-op (`Card` atom already handles it) or need new Prism primitives (accordion/disclosure). Either way no `DataTable` / `DataTableAdapter` exercise. | **Low** |

### Axis B: risk (likelihood of surfacing yet another Prism gap)

| Route | Risk sources | Score |
|---|---|---|
| `/clients` | Numeric PK (G-1 known); external search input + sector select (G-2 known workaround); metric-card row above DataTable is undocumented but composes trivially via the page shell (no engine change needed). Add-client form exercises Form engine for the first time in wave-4 context but the Form contracts were already proven in wave-2 payslips/calculators. | **Low-Medium** |
| `/employees` | CSV wizard = almost certain to need a new Prism primitive; per-row predicate-gated actions may not fit current `rowActions` shape (which has no `visible: (row) => boolean` callback documented); work-pass N+1 is orthogonal but the migration can't ignore it. | **High** |
| `/policies` | Either no-op (accordion is just `Card` state toggle) or requires a new accordion primitive in Prism. If no-op, wave-4 validates nothing; if new-primitive, wave-4 is a Prism-first shard. | **Medium but low-value either way** |

### Axis C: ergonomics (is the page shape clean enough to migrate without Prism changes first?)

| Route | Page-shape fit to 0.3.1 | Score |
|---|---|---|
| `/clients` | Clean. Table + grid dual-view maps to `display="card-grid" \| "table"` exactly. Search + sector = external-filter pattern (G-2 workaround applies but is small and documented). Add-client form = Form engine + `toast.success`. Metric cards above table = plain JSX, no engine change. | **High** |
| `/employees` | Poor for full migration; clean only if scoped to **just the employees table** (dropping invitations section + CSV modal + invite modal + work-pass filter from scope). Scoping down effectively makes it a duplicate of wave-3 payslips (one table with `router.push` on rowClick) — low coverage value. | **Low (full) / Low (scoped)** |
| `/policies` | N/A — nothing to migrate to DataTable. Would be a Card + new accordion-disclosure primitive exercise, which is a different workstream entirely. | **N/A** |

### Combined score

| Route | Coverage | Risk | Ergonomics | Verdict |
|---|---|---|---|---|
| `/clients` | High | Low-Medium | High | **Best fit** |
| `/employees` | High if scoped, Low if full | High | Low | Too big a shard / too much out-of-scope noise |
| `/policies` | Low | Medium | N/A | Wrong shape entirely |

---

## Recommendation

**Wave-4 target: `/clients`.**

Why:
1. **Shape-clean migration** — maps to 0.3.1 primitives with no Prism
   changes required first. Dual-view (table + grid) goes through
   `DataTable display=...`; add-client goes through Form engine;
   metric cards stay as plain JSX above the `<DataTable>`.
2. **Genuinely new coverage** — first arbor page that composes Prism's
   Form engine (inline add-form) AND DataTable AND card-grid on a single
   page. Waves 1–3 each exercised one engine in isolation. Wave-4
   validates that they coexist without state leakage.
3. **Second domain for card-grid** — wave-3 proved card-grid for
   documents (file-like entities). `/clients` is a different domain
   (organizations with risk tiers and compliance scores); if the
   `renderCard` / Card atom contract is too document-specific, wave-4
   catches it.
4. **Known G-1 / G-2 stress test** — numeric `ClientCompany.id` triggers
   G-1 (stringify at `getRowId`); external `search + sectorFilter` uses
   the G-2 workaround pattern. Both are already documented; wave-4
   confirms the workaround survives a third independent migration, or
   escalates G-1/G-2 to 0.4.0 blocker status.
5. **No new Prism primitives needed** — the wave fits entirely inside
   the 0.3.1 surface area, keeping shard size small (one page, one
   adapter, one Form invocation).

**Why not `/employees`**: four distinct UI surfaces (employees table,
invitations table, invite modal, CSV wizard) each with their own state
machine. The CSV wizard alone needs a Prism primitive that doesn't
exist yet. Full migration overflows the invariant budget
(rules/autonomous-execution.md § "Shard When Any Threshold Is
Exceeded"). Scoped migration (employees table only) is too close to
wave-3 payslips to add coverage.

**Why not `/policies`**: not list-shaped. No `DataTable` exercise
available. Would either be a no-op against the Card atom (zero
coverage) or a new-accordion-primitive workstream (Prism-first, not
arbor-driven). Neither matches the "migrate real projects to surface
Prism gaps" wave philosophy.

---

## Out-of-scope / follow-up candidates (not wave-4)

- **`/employees` (split)** — if `/clients` goes smoothly, a wave-5
  candidate is just the employees **table** (drop invitations +
  modals from scope) to exercise row-click navigation with a numeric
  PK at larger row counts. Invitations table + CSV wizard + modals
  become a separate wave once Prism has a wizard/stepper primitive.
- **`/policies` → Prism accordion** — unrelated to DataTable work.
  Should be its own Prism feature request against the Card family, not
  a migration wave.
- **Work-pass N+1 (`/employees`)** — a data-layer bug independent of
  Prism. File as an arbor-side issue, not a Prism gap.

---

## Expected wave-4 signals

If `/clients` migrates cleanly on 0.3.1, the session output will answer:
- Can Form engine + DataTable coexist on one page without adapter
  recreation on form state changes?
- Does `renderCard` generalize beyond file-like entities (wave-3
  documents) to organization-like entities (wave-4 clients)?
- Does the G-1 stringify-at-adapter workaround still feel acceptable on
  a third independent consumer, or does it now justify a 0.4.0 TId
  propagation refactor?
- Does the G-2 external-search workaround still feel acceptable, or do
  three consumers justify a FilterBar molecule in 0.4.0?

If any of those produce "no, Prism needs a change first," wave-4
promotes to a Prism-first 0.4.0 shard and `/clients` re-queues behind
it.
