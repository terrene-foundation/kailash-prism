/**
 * DataTable Engine — Synthetic computed column storybook scenario
 *
 * Spec: docs/specs/05-engine-specifications.md § 5.1 (ColumnDef relaxation)
 * Issue: #25 — relax ColumnDef.field for synthetic computed columns
 *
 * Concrete consumer scenario for the 0.6.0 synthetic-field surface.
 * Mirrors the wave-5 employees-prism use case where the Profile
 * column was dropped during migration because the typed-field
 * constraint blocked it. Now a synthetic field with `sortable: false`
 * and a `render` callback that computes a derived value from the row
 * is the canonical pattern.
 *
 * Story format: kept as a plain stateful React component export so the
 * file compiles under TypeScript strict mode and the test runner. When
 * a Storybook runner is wired into the build (planned post-0.6.0 per
 * the engine roadmap), the named exports become Story objects without
 * needing to rewrite the scenario logic.
 */

import { useState, type ReactNode } from "react";
import { DataTable, type ColumnDef } from "../index.js";

// --- Domain types ---

type Employee = {
  id: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  employment_type: string;
  start_date: string;
};

const PROFILE_FIELDS: (keyof Employee)[] = [
  "name",
  "email",
  "department",
  "designation",
  "employment_type",
  "start_date",
];

// --- Profile-completeness derivation ---

function profileCompleteness(e: Employee): number {
  let filled = 0;
  for (const k of PROFILE_FIELDS) {
    if (e[k] != null && e[k] !== "") filled++;
  }
  return Math.round((filled / PROFILE_FIELDS.length) * 100);
}

// --- ProfileBar: visual representation of completeness ---

interface ProfileBarProps {
  pct: number;
}

function ProfileBar({ pct }: ProfileBarProps): ReactNode {
  // Token-driven colors are wired via CSS variables exposed by the
  // theme provider. The story scenario uses semantic role names so it
  // composes correctly under any active theme.
  const trackStyle = {
    width: "100%",
    height: "8px",
    background: "var(--color-surface-muted)",
    borderRadius: "4px",
    overflow: "hidden" as const,
  };
  const fillStyle = {
    width: `${String(pct)}%`,
    height: "100%",
    background:
      pct >= 80
        ? "var(--color-feedback-success)"
        : pct >= 50
          ? "var(--color-feedback-warning)"
          : "var(--color-feedback-error)",
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

// --- Sample data ---

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
      designation: "",
      employment_type: "full_time",
      start_date: "",
    },
    {
      id: "EMP-003",
      name: "Carol Chen",
      email: "",
      department: "",
      designation: "",
      employment_type: "",
      start_date: "",
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
  ];
}

// --- Columns: Profile is the synthetic column ---

const employeeColumns: ColumnDef<Employee>[] = [
  { field: "id", header: "ID", sortable: true },
  { field: "name", header: "Name", sortable: true },
  { field: "department", header: "Department", sortable: true },
  { field: "designation", header: "Designation" },
  {
    // SYNTHETIC FIELD — field name does NOT exist on Employee. The
    // engine passes `undefined` as the first arg of `render`; the
    // callback derives the value from `row`. `sortable: false` is
    // mandatory — `assertNoSyntheticSortable` throws otherwise.
    field: "_profile",
    header: "Profile",
    sortable: false,
    render: (_value, row) => <ProfileBar pct={profileCompleteness(row)} />,
  },
];

// --- Scenarios ---

/**
 * Default scenario: array data, all four employees with varying
 * profile completeness. The Profile column shows a bar that visually
 * communicates how filled-in each row's profile is.
 */
export function ProfileCompletenessDefault(): ReactNode {
  return <DataTable columns={employeeColumns} data={sampleEmployees()} />;
}

/**
 * Empty data scenario: the synthetic-sortable assertion is deferred
 * until the first non-empty render. The story confirms the engine
 * does not throw on initial mount when there are no rows to inspect.
 */
export function ProfileCompletenessEmptyData(): ReactNode {
  return <DataTable columns={employeeColumns} data={[]} />;
}

/**
 * Late-arriving data scenario: data starts empty (deferred
 * assertion) then populates after a user interaction. The synthetic
 * column renders correctly once data arrives.
 */
export function ProfileCompletenessLateData(): ReactNode {
  const [data, setData] = useState<Employee[]>([]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <button
        type="button"
        onClick={() => {
          setData(sampleEmployees());
        }}
      >
        Load employees
      </button>
      <DataTable columns={employeeColumns} data={data} />
    </div>
  );
}

// --- Story metadata (Storybook-runner-compatible default export) ---

const meta = {
  title: "Engines/DataTable/Synthetic Computed Column",
  component: DataTable,
  parameters: {
    docs: {
      description: {
        component:
          "Demonstrates the 0.6.0 ColumnDef.field relaxation: a synthetic " +
          'field ("_profile") with sortable: false and a render callback ' +
          "that derives Profile completeness from row data. This pattern " +
          "supports aggregate badges, derived totals, action menus, and " +
          "any column that does not correspond to a single field on the row.",
      },
    },
  },
};

export default meta;
