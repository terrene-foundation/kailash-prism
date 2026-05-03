/**
 * Tier 1 unit tests for the FilterBar molecule.
 *
 * Covers the 8 acceptance cases from
 *   workspaces/prism-0.6.0/todos/active/M03-filter-bar-molecule.md § T14
 *
 * Mocking: none required (controlled component, no adapters / IO).
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import {
  FilterBar,
  type FilterBarDimension,
  type FilterBarViewMode,
} from "../filter-bar.js";

// --- Test helpers ----------------------------------------------------------

function makeChipDimension(
  overrides: Partial<FilterBarDimension> = {},
): FilterBarDimension {
  return {
    key: "category",
    label: "Category",
    options: ["All", "Onboarding", "Payroll", "Termination"],
    value: "All",
    onChange: vi.fn(),
    shape: "chips",
    ...overrides,
  };
}

function makeDropdownDimension(
  overrides: Partial<FilterBarDimension> = {},
): FilterBarDimension {
  return {
    key: "sector",
    label: "Sector",
    options: ["All", "Energy", "Finance", "Health"],
    value: "All",
    onChange: vi.fn(),
    shape: "dropdown",
    ...overrides,
  };
}

function makeViewMode(
  overrides: Partial<FilterBarViewMode> = {},
): FilterBarViewMode {
  return {
    active: "grid",
    options: ["grid", "list"],
    onChange: vi.fn(),
    ...overrides,
  };
}

// --- Tests -----------------------------------------------------------------

describe("FilterBar — search-only shape", () => {
  it("renders with search-only (no dimensions, no viewMode)", () => {
    render(
      <FilterBar
        search=""
        onSearchChange={vi.fn()}
        searchPlaceholder="Search clients…"
      />,
    );

    const input = screen.getByRole("searchbox");
    expect(input).toBeDefined();
    expect((input as HTMLInputElement).placeholder).toBe("Search clients…");
    // No radiogroups when no dimensions / viewMode.
    expect(screen.queryAllByRole("radiogroup")).toHaveLength(0);
  });
});

describe("FilterBar — dropdown dimension", () => {
  it("clicking option calls onChange with selected value", () => {
    const dim = makeDropdownDimension({ value: "All" });

    render(<FilterBar search="" onSearchChange={vi.fn()} dimensions={[dim]} />);

    const select = screen.getByLabelText("Sector") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "Finance" } });

    expect(dim.onChange).toHaveBeenCalledTimes(1);
    expect(dim.onChange).toHaveBeenCalledWith("Finance");
  });
});

describe("FilterBar — chip-row dimension", () => {
  it("clicking chip calls onChange with chip value", () => {
    const dim = makeChipDimension({ value: "All" });

    render(<FilterBar search="" onSearchChange={vi.fn()} dimensions={[dim]} />);

    const group = screen.getByRole("radiogroup", { name: "Category" });
    const payrollChip = within(group).getByRole("radio", { name: "Payroll" });
    fireEvent.click(payrollChip);

    expect(dim.onChange).toHaveBeenCalledTimes(1);
    expect(dim.onChange).toHaveBeenCalledWith("Payroll");
  });

  it("active chip is aria-checked", () => {
    const dim = makeChipDimension({ value: "Payroll" });

    render(<FilterBar search="" onSearchChange={vi.fn()} dimensions={[dim]} />);

    const group = screen.getByRole("radiogroup", { name: "Category" });
    const payrollChip = within(group).getByRole("radio", { name: "Payroll" });
    const allChip = within(group).getByRole("radio", { name: "All" });
    expect(payrollChip.getAttribute("aria-checked")).toBe("true");
    expect(allChip.getAttribute("aria-checked")).toBe("false");
  });

  it("ArrowRight on a chip cycles to the next chip and calls onChange", () => {
    const dim = makeChipDimension({ value: "All" });

    render(<FilterBar search="" onSearchChange={vi.fn()} dimensions={[dim]} />);

    const group = screen.getByRole("radiogroup", { name: "Category" });
    const allChip = within(group).getByRole("radio", { name: "All" });
    fireEvent.keyDown(allChip, { key: "ArrowRight" });

    expect(dim.onChange).toHaveBeenCalledTimes(1);
    expect(dim.onChange).toHaveBeenCalledWith("Onboarding");
  });
});

describe("FilterBar — view-mode toggle", () => {
  it("clicking toggle option calls onChange", () => {
    const viewMode = makeViewMode({ active: "grid" });

    render(
      <FilterBar search="" onSearchChange={vi.fn()} viewMode={viewMode} />,
    );

    const group = screen.getByRole("radiogroup", { name: "View mode" });
    const listBtn = within(group).getByRole("radio", { name: "list" });
    fireEvent.click(listBtn);

    expect(viewMode.onChange).toHaveBeenCalledTimes(1);
    expect(viewMode.onChange).toHaveBeenCalledWith("list");
  });
});

describe("FilterBar — search input", () => {
  it("typing fires onSearchChange with new value", () => {
    const onSearchChange = vi.fn();
    render(
      <FilterBar
        search=""
        onSearchChange={onSearchChange}
        searchPlaceholder="Search clients…"
      />,
    );

    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "acme" } });

    expect(onSearchChange).toHaveBeenCalledTimes(1);
    expect(onSearchChange).toHaveBeenCalledWith("acme");
  });

  it("Escape clears the search to empty string", () => {
    const onSearchChange = vi.fn();
    render(
      <FilterBar
        search="acme"
        onSearchChange={onSearchChange}
        searchPlaceholder="Search clients…"
      />,
    );

    const input = screen.getByRole("searchbox");
    fireEvent.keyDown(input, { key: "Escape" });

    expect(onSearchChange).toHaveBeenCalledTimes(1);
    expect(onSearchChange).toHaveBeenCalledWith("");
  });

  it("falls back to 'Search' aria-label when no placeholder is provided", () => {
    render(<FilterBar search="" onSearchChange={vi.fn()} />);

    const input = screen.getByRole("searchbox", { name: "Search" });
    expect(input).toBeDefined();
  });
});

describe("FilterBar — sticky", () => {
  it("sticky=true applies position:sticky on the root", () => {
    const { container } = render(
      <FilterBar search="" onSearchChange={vi.fn()} sticky={true} />,
    );

    const root = container.firstChild as HTMLElement;
    expect(root.style.position).toBe("sticky");
    expect(root.style.top).toBe("0px");
  });

  it("sticky default (false) does NOT apply position:sticky", () => {
    const { container } = render(
      <FilterBar search="" onSearchChange={vi.fn()} />,
    );

    const root = container.firstChild as HTMLElement;
    expect(root.style.position).not.toBe("sticky");
  });
});

describe("FilterBar — composition (all three shapes)", () => {
  it("renders search-only without crashing", () => {
    render(<FilterBar search="" onSearchChange={vi.fn()} />);
    expect(screen.getByRole("searchbox")).toBeDefined();
  });

  it("renders search + chips without crashing", () => {
    const dim = makeChipDimension();
    render(<FilterBar search="" onSearchChange={vi.fn()} dimensions={[dim]} />);
    expect(screen.getByRole("searchbox")).toBeDefined();
    expect(screen.getByRole("radiogroup", { name: "Category" })).toBeDefined();
  });

  it("renders search + dropdown + view-mode without crashing", () => {
    const dim = makeDropdownDimension();
    const viewMode = makeViewMode();
    render(
      <FilterBar
        search=""
        onSearchChange={vi.fn()}
        dimensions={[dim]}
        viewMode={viewMode}
      />,
    );
    expect(screen.getByRole("searchbox")).toBeDefined();
    expect(screen.getByLabelText("Sector")).toBeDefined();
    expect(screen.getByRole("radiogroup", { name: "View mode" })).toBeDefined();
  });
});
