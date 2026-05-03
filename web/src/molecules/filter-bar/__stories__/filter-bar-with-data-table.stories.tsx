/**
 * FilterBar molecule + DataTable engine — composite storybook scenario.
 *
 * Demonstrates the canonical 0.6.0 consumer pattern observed in the arbor
 * `*-prism` route migrations (clients-prism, employees-prism): a FilterBar
 * molecule sitting above a DataTable engine, with the underlying data
 * filtered client-side from the FilterBar state on every keystroke / chip
 * toggle / dropdown change.
 *
 * The story proves three end-to-end integration claims for the M03 release:
 *
 *   1. **`useFilterBarState` derive + effective-fallback flow** drives both
 *      the FilterBar's chip / dropdown options AND the DataTable's row set.
 *   2. **Synthetic DataTable column** (M01 Profile-completeness) coexists
 *      with FilterBar filtering — the synthetic-sortable assertion does
 *      not interact with the filter state's row reduction.
 *   3. **No adapter rebuild boilerplate** — the consumer recipe is
 *      `useFilterBarState` -> filter the array -> pass to `<DataTable>`.
 *      A future shard adding a `DataTableAdapter` for server-side filtering
 *      can replace the array-filter step without touching FilterBar.
 *
 * Story format: kept as a plain stateful React component export, matching
 * the convention in `engines/data-table/__stories__/`.
 *
 * Spec: workspaces/prism-0.6.0/01-analysis/01-issue-24-filterbar-evidence.md
 *       § "Consumer integration recipe"
 * Issue: terrene-foundation/kailash-prism#24
 */

import { type ReactNode } from "react";

import {
  DataTable,
  type ColumnDef,
} from "../../../engines/data-table/index.js";
import { FilterBar } from "../filter-bar.js";
import { useFilterBarState } from "../use-filter-bar-state.js";

// --- Domain types ----------------------------------------------------------

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  employment_type: string;
  start_date: string;
}

const PROFILE_FIELDS: (keyof Employee)[] = [
  "name",
  "email",
  "department",
  "designation",
  "employment_type",
  "start_date",
];

// --- Profile-completeness derivation (M01 synthetic-column) ---------------

function profileCompleteness(e: Employee): number {
  let filled = 0;
  for (const k of PROFILE_FIELDS) {
    if (e[k] != null && e[k] !== "") filled++;
  }
  return Math.round((filled / PROFILE_FIELDS.length) * 100);
}

interface ProfileBarProps {
  pct: number;
}

function ProfileBar({ pct }: ProfileBarProps): ReactNode {
  const trackStyle = {
    width: "100%",
    height: "8px",
    background: "var(--color-surface-muted, #e2e8f0)",
    borderRadius: "4px",
    overflow: "hidden" as const,
  };
  const fillStyle = {
    width: `${String(pct)}%`,
    height: "100%",
    background:
      pct >= 80
        ? "var(--color-feedback-success, #16a34a)"
        : pct >= 50
          ? "var(--color-feedback-warning, #f59e0b)"
          : "var(--color-feedback-error, #dc2626)",
    transition: "width 250ms ease",
  };
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Profile ${String(pct)}% complete`}
      style={{ display: "flex", alignItems: "center", gap: "8px" }}
    >
      <div style={trackStyle}>
        <div style={fillStyle} />
      </div>
      <span style={{ fontSize: "12px", minWidth: "32px", textAlign: "right" }}>
        {String(pct)}%
      </span>
    </div>
  );
}

// --- Sample data -----------------------------------------------------------

function sampleEmployees(): Employee[] {
  return [
    {
      id: "EMP-001",
      name: "Alice Anderson",
      email: "alice@example.com",
      department: "Engineering",
      designation: "Senior Engineer",
      employment_type: "full_time",
      start_date: "2024-01-15",
    },
    {
      id: "EMP-002",
      name: "Bob Brown",
      email: "bob@example.com",
      department: "Sales",
      designation: "Account Executive",
      employment_type: "full_time",
      start_date: "2023-08-22",
    },
    {
      id: "EMP-003",
      name: "Carol Chen",
      email: "carol@example.com",
      department: "Engineering",
      designation: "Staff Engineer",
      employment_type: "full_time",
      start_date: "2022-03-10",
    },
    {
      id: "EMP-004",
      name: "David Davis",
      email: "david@example.com",
      department: "Marketing",
      designation: "Marketing Lead",
      employment_type: "contractor",
      start_date: "2023-06-01",
    },
    {
      id: "EMP-005",
      name: "Eva Estrada",
      email: "eva@example.com",
      department: "Sales",
      designation: "Sales Manager",
      employment_type: "full_time",
      start_date: "2021-11-05",
    },
    {
      id: "EMP-006",
      name: "Frank Fischer",
      email: "frank@example.com",
      department: "Engineering",
      designation: "Junior Engineer",
      employment_type: "full_time",
      start_date: "2024-09-15",
    },
    {
      id: "EMP-007",
      name: "Grace Garcia",
      email: "grace@example.com",
      department: "Marketing",
      designation: "Content Strategist",
      employment_type: "full_time",
      start_date: "2023-02-20",
    },
    {
      id: "EMP-008",
      name: "Henry Hayes",
      email: "henry@example.com",
      department: "Sales",
      designation: "",
      employment_type: "contractor",
      start_date: "",
    },
  ];
}

// --- Columns: Profile is the synthetic column from M01 --------------------

const employeeColumns: ColumnDef<Employee>[] = [
  { field: "id", header: "ID", sortable: true },
  { field: "name", header: "Name", sortable: true },
  { field: "department", header: "Department", sortable: true },
  { field: "designation", header: "Designation" },
  { field: "employment_type", header: "Type" },
  {
    // SYNTHETIC FIELD — see M01 / data-table-synthetic-column.stories.tsx
    field: "_profile",
    header: "Profile",
    sortable: false,
    render: (_value, row) => <ProfileBar pct={profileCompleteness(row)} />,
  },
];

// --- Composite scenario ----------------------------------------------------

/**
 * FilterBar above DataTable with adapter rebuild on filter delta.
 *
 * The FilterBar exposes:
 *   - search (matches across name + email + designation)
 *   - department dropdown (derived from data; "All" fallback)
 *   - employment_type chip-row (derived from data; "All" fallback)
 *
 * On every keystroke or filter change, `state.search` + `state.filters`
 * recompute, the array is filtered client-side, and the DataTable
 * renders the reduced row set. The synthetic Profile column re-renders
 * for each visible row, demonstrating end-to-end 0.6.0 use.
 */
export function FilterBarAboveDataTable(): ReactNode {
  const data = sampleEmployees();
  const state = useFilterBarState<
    Employee,
    { department: string; employment_type: string }
  >({
    data,
    initial: { department: "All", employment_type: "All" },
    derive: {
      department: (rows) => rows.map((r) => r.department),
      employment_type: (rows) => rows.map((r) => r.employment_type),
    },
  });

  const filtered = data.filter((e) => {
    const q = state.search.toLowerCase();
    const matchesSearch =
      q === "" ||
      e.name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.designation.toLowerCase().includes(q);
    const matchesDept =
      state.filters.department === "All" ||
      e.department === state.filters.department;
    const matchesType =
      state.filters.employment_type === "All" ||
      e.employment_type === state.filters.employment_type;
    return matchesSearch && matchesDept && matchesType;
  });

  return (
    <div
      style={{
        padding: "16px",
        maxWidth: "1024px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <FilterBar
        search={state.search}
        onSearchChange={state.setSearch}
        searchPlaceholder="Search employees by name, email, or designation…"
        dimensions={[
          {
            key: "department",
            label: "Department",
            options: state.options.department,
            value: state.filters.department,
            onChange: (v) => {
              state.setFilter("department", v);
            },
            shape: "dropdown",
          },
          {
            key: "employment_type",
            label: "Type",
            options: state.options.employment_type,
            value: state.filters.employment_type,
            onChange: (v) => {
              state.setFilter("employment_type", v);
            },
            shape: "chips",
          },
        ]}
      />
      <div
        style={{
          marginTop: "16px",
          fontSize: "12px",
          color: "var(--prism-color-text-secondary, #64748b)",
        }}
      >
        Showing {String(filtered.length)} of {String(data.length)} employees
      </div>
      <div style={{ marginTop: "8px" }}>
        <DataTable columns={employeeColumns} data={filtered} />
      </div>
    </div>
  );
}

// --- Story metadata (Storybook-runner-compatible default export) ----------

const meta = {
  title: "Molecules/FilterBar/With DataTable",
  component: FilterBar,
  parameters: {
    docs: {
      description: {
        component:
          "FilterBar molecule composed above a DataTable engine. The " +
          "search query + derived dimensions filter the row set client-" +
          "side; the DataTable re-renders the reduced data. Demonstrates " +
          "the canonical 0.6.0 consumer recipe (useFilterBarState pairs " +
          "with the molecule, the molecule pairs with DataTable, no " +
          "adapter rebuild boilerplate). Also exercises the M01 synthetic " +
          "Profile-completeness column on the filtered rows.",
      },
    },
  },
};

export default meta;
