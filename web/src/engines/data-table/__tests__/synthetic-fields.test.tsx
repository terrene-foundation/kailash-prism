/**
 * DataTable Engine — Synthetic-field Tier-1 unit tests
 *
 * Spec: docs/specs/05-engine-specifications.md § 5.1 (ColumnDef relaxation)
 * Issue: #25 — relax ColumnDef.field for synthetic computed columns
 *
 * Covers six cases for the 0.6.0 relaxation of `ColumnDef.field` from
 * `string & keyof T` to `string`:
 *
 *   1. Keyed columns (regression — backward compatibility)
 *   2. Synthetic field with sortable: false renders cleanly
 *   3. Synthetic field with sortable: true throws with the actionable
 *      error message (verbatim assertion)
 *   4. Synthetic + sortable: true does NOT throw on empty data
 *      (assertion deferred until first non-empty row)
 *   5. Single-throw discipline — re-renders with same columns ref do
 *      not re-throw
 *   6. defaultSortComparator handles synthetic keys without crashing
 *
 * Tier 1: rendering uses real React + jsdom; no engine internals are
 * mocked. Synthetic-field error path is exercised through the public
 * DataTable surface (the engine is the test boundary).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { DataTable, type ColumnDef } from "../index.js";
import { defaultSortComparator } from "../use-data-table.js";

// --- Fixtures ---

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
}

function sampleEmployees(): Employee[] {
  return [
    {
      id: "EMP-1",
      name: "Alice",
      email: "alice@example.com",
      department: "Eng",
    },
    { id: "EMP-2", name: "Bob", email: "bob@example.com", department: "Sales" },
  ];
}

beforeEach(() => {
  Object.defineProperty(window, "innerWidth", { value: 1280, writable: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DataTable engine — ColumnDef.field relaxation (0.6.0)", () => {
  // --- Case 1: regression — keyed columns continue to work ---

  it("renders keyed columns (regression — keys remain valid)", async () => {
    const columns: ColumnDef<Employee>[] = [
      { field: "id", header: "ID" },
      { field: "name", header: "Name", sortable: true },
      { field: "email", header: "Email" },
    ];

    render(<DataTable columns={columns} data={sampleEmployees()} />);

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeDefined();
      expect(screen.getByText("Bob")).toBeDefined();
    });
  });

  // --- Case 2: synthetic + sortable: false renders cleanly ---

  it("renders synthetic computed column with sortable: false", async () => {
    const columns: ColumnDef<Employee>[] = [
      { field: "name", header: "Name" },
      {
        field: "_profile",
        header: "Profile",
        sortable: false,
        render: (_value, row) => `${row.name}@${row.department}`,
      },
    ];

    render(<DataTable columns={columns} data={sampleEmployees()} />);

    await waitFor(() => {
      expect(screen.getByText("Alice@Eng")).toBeDefined();
      expect(screen.getByText("Bob@Sales")).toBeDefined();
    });
  });

  // --- Case 3: synthetic + sortable: true throws with EXACT message ---

  it("throws on synthetic field with sortable: true (verbatim error message)", async () => {
    const columns: ColumnDef<Employee>[] = [
      { field: "name", header: "Name" },
      {
        field: "_synthetic",
        header: "Synthetic",
        sortable: true,
        render: (_value, row) => row.name,
      },
    ];

    // The assertion fires inside a useEffect. React's error-boundary
    // pathway and jsdom surface the throw via console.error and re-throw.
    // We silence the noisy stderr (vitest reports the original throw to
    // expect.toThrow via the consumer's error boundary). The component
    // crashes synchronously after the first render commit when data is
    // present.
    const errSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const expectedMessage =
      'column "_synthetic" has sortable: true but is a synthetic field ' +
      "(no row[field] lookup). Synthetic columns MUST set sortable: false. " +
      "To sort by a derived value, pre-compute it into the row data before " +
      "passing to DataTable.";

    expect(() => {
      render(<DataTable columns={columns} data={sampleEmployees()} />);
    }).toThrow(expectedMessage);

    errSpy.mockRestore();
  });

  // --- Case 4: synthetic + sortable: true does NOT throw on empty data ---

  it("defers assertion when data is empty (no row to inspect)", async () => {
    const columns: ColumnDef<Employee>[] = [
      { field: "name", header: "Name" },
      {
        field: "_synthetic",
        header: "Synthetic",
        sortable: true, // would throw if data were non-empty
        render: (_value, _row) => "x",
      },
    ];

    // No throw — empty array means the engine cannot inspect a row, so
    // assertion is deferred until data populates.
    expect(() => {
      render(<DataTable columns={columns} data={[]} />);
    }).not.toThrow();
  });

  // --- Case 5: single-throw discipline ---

  it("validates once per columns identity (re-renders with same ref do not re-throw)", async () => {
    // Rationale: the validation ref tracks the columns array reference.
    // A keyed-only column set re-rendered against a stable ref should
    // run the synthetic check at most once. We assert no spurious throw
    // and a normal render, exercising the same-ref path through a
    // re-render.
    const columns: ColumnDef<Employee>[] = [
      { field: "id", header: "ID" },
      {
        field: "_label",
        header: "Label",
        sortable: false,
        render: (_value, row) => row.name,
      },
    ];

    const { rerender } = render(
      <DataTable columns={columns} data={sampleEmployees()} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeDefined();
    });

    // Re-render with the SAME columns reference and same data. The
    // validatedColumnsRef short-circuits — no second assertion run, no
    // throw. The DOM still shows the rows.
    rerender(<DataTable columns={columns} data={sampleEmployees()} />);
    await waitFor(() => {
      expect(screen.getByText("Bob")).toBeDefined();
    });
  });

  // --- Case 6: defaultSortComparator on synthetic keys ---

  it("defaultSortComparator returns 0 when key is absent on both sides", () => {
    // Synthetic keys produce undefined on both sides. Per the
    // 0.6.0-relaxed contract, the comparator's null-on-both-sides branch
    // returns 0 — the no-op fallback for the empty-data window.
    const a = { id: "1", name: "Alice" };
    const b = { id: "2", name: "Bob" };

    expect(defaultSortComparator(a, b, "_synthetic", "asc")).toBe(0);
    expect(defaultSortComparator(a, b, "_synthetic", "desc")).toBe(0);
  });
});
