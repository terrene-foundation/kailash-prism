/**
 * FilterBar molecule — storybook scenarios.
 *
 * Three shapes match the three observed consumer patterns from the 0.6.0
 * arbor consumer sweep:
 *
 *   1. **search-only** — my-payslips post-migration (one search input,
 *      no dimensions, no view-mode).
 *   2. **search + chip-row category** — documents-prism (one chip-row
 *      dimension that selects a category, no view-mode).
 *   3. **search + dropdown sector + view-mode toggle** — clients-prism
 *      / employees-prism (one dropdown dimension that selects a sector,
 *      a grid/list view-mode toggle on the right edge).
 *
 * Each scenario uses {@link useFilterBarState} so a future migration sees
 * the "molecule + state hook" pairing as the canonical recipe and
 * doesn't have to re-derive the integration.
 *
 * Story format: kept as plain stateful React component exports so the
 * file compiles under TypeScript strict mode and the test runner. When
 * a Storybook runner is wired into the build, the named exports become
 * Story objects without needing to rewrite scenario logic — same pattern
 * as `engines/data-table/__stories__/`.
 *
 * Spec: workspaces/prism-0.6.0/01-analysis/01-issue-24-filterbar-evidence.md
 * Issue: terrene-foundation/kailash-prism#24
 */

import { useState, type ReactNode } from "react";

import { FilterBar } from "../filter-bar.js";
import { useFilterBarState } from "../use-filter-bar-state.js";

// --- Domain types ---

interface Payslip {
  id: string;
  month: string;
  amount: number;
}

interface Document {
  id: string;
  title: string;
  category: string;
}

interface Client {
  id: string;
  name: string;
  sector: string;
}

// --- Sample data ---

function samplePayslips(): Payslip[] {
  return [
    { id: "p1", month: "2026-01", amount: 5000 },
    { id: "p2", month: "2026-02", amount: 5200 },
    { id: "p3", month: "2026-03", amount: 5100 },
  ];
}

function sampleDocuments(): Document[] {
  return [
    { id: "d1", title: "Onboarding Welcome Pack", category: "Onboarding" },
    { id: "d2", title: "Payroll Schedule 2026", category: "Payroll" },
    { id: "d3", title: "Termination Checklist", category: "Termination" },
    { id: "d4", title: "Mid-Year Tax Form", category: "Payroll" },
  ];
}

function sampleClients(): Client[] {
  return [
    { id: "c1", name: "Acme Logistics", sector: "Transport" },
    { id: "c2", name: "Bright Health", sector: "Health" },
    { id: "c3", name: "Cobalt Energy", sector: "Energy" },
    { id: "c4", name: "Delta Finance", sector: "Finance" },
  ];
}

// --- Scenario 1: search-only ---

/**
 * Search-only — matches the my-payslips consumer pattern after its 0.6.0
 * migration. There are no filter dimensions because every payslip
 * belongs to the same employee; the only filtering signal is search by
 * month label.
 */
export function SearchOnly(): ReactNode {
  const data = samplePayslips();
  const state = useFilterBarState<Payslip, Record<string, never>>({
    data,
    initial: {} as Record<string, never>,
  });

  const filtered = data.filter((p) =>
    p.month.toLowerCase().includes(state.search.toLowerCase()),
  );

  return (
    <div style={{ padding: "16px", maxWidth: "720px" }}>
      <FilterBar
        search={state.search}
        onSearchChange={state.setSearch}
        searchPlaceholder="Search payslips by month…"
      />
      <ul
        style={{
          marginTop: "16px",
          listStyle: "none",
          padding: 0,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {filtered.map((p) => (
          <li
            key={p.id}
            style={{ padding: "8px 0", borderBottom: "1px solid #e2e8f0" }}
          >
            <strong>{p.month}</strong> — ${String(p.amount)}
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- Scenario 2: search + chip-row category ---

/**
 * Search + chip-row category — matches the documents-prism consumer
 * pattern. Categories are derived from the data; the molecule's chip
 * row exposes them. Selecting a chip narrows the visible rows; "All"
 * resets.
 */
export function SearchPlusChipRow(): ReactNode {
  const data = sampleDocuments();
  const state = useFilterBarState<Document, { category: string }>({
    data,
    initial: { category: "All" },
    derive: { category: (rows) => rows.map((r) => r.category) },
  });

  const filtered = data.filter((d) => {
    const matchesSearch = d.title
      .toLowerCase()
      .includes(state.search.toLowerCase());
    const matchesCategory =
      state.filters.category === "All" || d.category === state.filters.category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ padding: "16px", maxWidth: "720px" }}>
      <FilterBar
        search={state.search}
        onSearchChange={state.setSearch}
        searchPlaceholder="Search documents…"
        dimensions={[
          {
            key: "category",
            label: "Category",
            options: state.options.category,
            value: state.filters.category,
            onChange: (v) => {
              state.setFilter("category", v);
            },
            shape: "chips",
          },
        ]}
      />
      <ul
        style={{
          marginTop: "16px",
          listStyle: "none",
          padding: 0,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {filtered.map((d) => (
          <li
            key={d.id}
            style={{ padding: "8px 0", borderBottom: "1px solid #e2e8f0" }}
          >
            <strong>{d.title}</strong>
            <div style={{ fontSize: "12px", color: "#64748b" }}>
              {d.category}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- Scenario 3: search + dropdown sector + view-mode toggle ---

/**
 * Search + dropdown sector + view-mode toggle — matches the
 * clients-prism / employees-prism consumer pattern. Sector dimension is
 * derived from the data and rendered as a dropdown (long option list).
 * View-mode toggle on the right switches between grid and list layouts.
 */
export function SearchPlusDropdownPlusViewMode(): ReactNode {
  const data = sampleClients();
  const state = useFilterBarState<Client, { sector: string }>({
    data,
    initial: { sector: "All" },
    derive: { sector: (rows) => rows.map((r) => r.sector) },
  });
  const [view, setView] = useState<string>("grid");

  const filtered = data.filter((c) => {
    const matchesSearch = c.name
      .toLowerCase()
      .includes(state.search.toLowerCase());
    const matchesSector =
      state.filters.sector === "All" || c.sector === state.filters.sector;
    return matchesSearch && matchesSector;
  });

  const itemStyle =
    view === "grid"
      ? {
          display: "inline-block",
          width: "180px",
          margin: "8px",
          padding: "12px",
          border: "1px solid #e2e8f0",
          borderRadius: "6px",
        }
      : {
          display: "block",
          padding: "8px 0",
          borderBottom: "1px solid #e2e8f0",
        };

  return (
    <div style={{ padding: "16px", maxWidth: "720px" }}>
      <FilterBar
        search={state.search}
        onSearchChange={state.setSearch}
        searchPlaceholder="Search clients…"
        dimensions={[
          {
            key: "sector",
            label: "Sector",
            options: state.options.sector,
            value: state.filters.sector,
            onChange: (v) => {
              state.setFilter("sector", v);
            },
            shape: "dropdown",
          },
        ]}
        viewMode={{
          active: view,
          options: ["grid", "list"],
          onChange: setView,
        }}
      />
      <div
        style={{
          marginTop: "16px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {filtered.map((c) => (
          <div key={c.id} style={itemStyle}>
            <strong>{c.name}</strong>
            <div style={{ fontSize: "12px", color: "#64748b" }}>{c.sector}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Story metadata (Storybook-runner-compatible default export) ---

const meta = {
  title: "Molecules/FilterBar",
  component: FilterBar,
  parameters: {
    docs: {
      description: {
        component:
          "FilterBar molecule — horizontal toolbar pairing a search " +
          "input with optional filter dimensions (chip-row OR dropdown) " +
          "and an optional view-mode toggle. Three shapes cover the " +
          "three observed arbor consumer patterns: search-only, " +
          "search + chip-row category, and search + dropdown sector + " +
          "view-mode toggle. Each scenario uses useFilterBarState so " +
          "the molecule + state hook pairing is the copy-paste recipe.",
      },
    },
  },
};

export default meta;
