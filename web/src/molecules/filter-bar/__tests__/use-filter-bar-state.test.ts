/**
 * Tier 1 unit tests for useFilterBarState.
 *
 * Covers the 8 acceptance cases from
 *   workspaces/prism-0.6.0/todos/active/M02-use-filter-bar-state-hook.md § T09
 *
 * Mocking: none required (pure state hook, no adapters / IO).
 */

import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";

import {
  useFilterBarState,
  type UseFilterBarStateInput,
} from "../use-filter-bar-state.js";

// --- Test fixtures ----------------------------------------------------------

interface Client {
  id: string;
  sector: string;
  status: string;
}

const SEED: Client[] = [
  { id: "c1", sector: "Finance", status: "active" },
  { id: "c2", sector: "Health", status: "active" },
  { id: "c3", sector: "Health", status: "inactive" },
  { id: "c4", sector: "Energy", status: "active" },
];

// --- Tests ------------------------------------------------------------------

describe("useFilterBarState — search state", () => {
  it("setSearch updates result.search", () => {
    const { result } = renderHook(() =>
      useFilterBarState<Client, { sector: string }>({
        data: SEED,
        initial: { sector: "All" },
      }),
    );

    expect(result.current.search).toBe("");

    act(() => {
      result.current.setSearch("foo");
    });

    expect(result.current.search).toBe("foo");
  });

  it("respects searchInitial when provided", () => {
    const { result } = renderHook(() =>
      useFilterBarState<Client, { sector: string }>({
        data: SEED,
        initial: { sector: "All" },
        searchInitial: "preset",
      }),
    );

    expect(result.current.search).toBe("preset");
  });
});

describe("useFilterBarState — initial filter values", () => {
  it("returns initial values when no data and no derive", () => {
    const { result } = renderHook(() =>
      useFilterBarState<Client, { sector: string }>({
        data: [],
        initial: { sector: "All" },
      }),
    );

    expect(result.current.filters.sector).toBe("All");
    expect(result.current.options.sector).toEqual([]);
  });
});

describe("useFilterBarState — derive callback", () => {
  it("produces sorted, deduped options with 'All' prepended", () => {
    const { result } = renderHook(() =>
      useFilterBarState<Client, { sector: string }>({
        data: SEED,
        initial: { sector: "All" },
        derive: { sector: (rows) => rows.map((r) => r.sector) },
      }),
    );

    // Unique sectors from SEED: Finance, Health, Energy
    // After dedupe + sort + "All" prefix: ["All", "Energy", "Finance", "Health"]
    expect(result.current.options.sector).toEqual([
      "All",
      "Energy",
      "Finance",
      "Health",
    ]);
  });

  it("does not double-add 'All' when derive returns it explicitly", () => {
    const { result } = renderHook(() =>
      useFilterBarState<Client, { sector: string }>({
        data: SEED,
        initial: { sector: "All" },
        derive: {
          sector: (rows) => ["All", ...rows.map((r) => r.sector)],
        },
      }),
    );

    const options = result.current.options.sector;
    const allCount = options.filter((v) => v === "All").length;
    expect(allCount).toBe(1);
    expect(options).toEqual(["All", "Energy", "Finance", "Health"]);
  });
});

describe("useFilterBarState — effective fallback", () => {
  it("falls back to initial[key] when raw value is not in derived options", () => {
    const { result } = renderHook(() =>
      useFilterBarState<Client, { sector: string }>({
        data: SEED,
        initial: { sector: "All" },
        derive: { sector: (rows) => rows.map((r) => r.sector) },
      }),
    );

    // Set a raw value that is NOT in the derived options.
    act(() => {
      result.current.setFilter("sector", "stale");
    });

    // Effective value falls back to initial ("All").
    expect(result.current.filters.sector).toBe("All");

    // Sanity: derived options remain unaffected by the bogus write.
    expect(result.current.options.sector).toEqual([
      "All",
      "Energy",
      "Finance",
      "Health",
    ]);
  });

  it("preserves a raw value when it IS in the derived options", () => {
    const { result } = renderHook(() =>
      useFilterBarState<Client, { sector: string }>({
        data: SEED,
        initial: { sector: "All" },
        derive: { sector: (rows) => rows.map((r) => r.sector) },
      }),
    );

    act(() => {
      result.current.setFilter("sector", "Health");
    });

    expect(result.current.filters.sector).toBe("Health");
  });
});

describe("useFilterBarState — multiple dimensions", () => {
  it("tracks independent state per dimension key", () => {
    const { result } = renderHook(() =>
      useFilterBarState<Client, { sector: string; status: string }>({
        data: SEED,
        initial: { sector: "All", status: "All" },
        derive: {
          sector: (rows) => rows.map((r) => r.sector),
          status: (rows) => rows.map((r) => r.status),
        },
      }),
    );

    act(() => {
      result.current.setFilter("sector", "Finance");
    });
    expect(result.current.filters.sector).toBe("Finance");
    expect(result.current.filters.status).toBe("All");

    act(() => {
      result.current.setFilter("status", "active");
    });
    expect(result.current.filters.sector).toBe("Finance");
    expect(result.current.filters.status).toBe("active");

    // Status options derived independently.
    expect(result.current.options.status).toEqual([
      "All",
      "active",
      "inactive",
    ]);
  });
});

describe("useFilterBarState — re-derive on data change", () => {
  it("recomputes options when `data` changes", () => {
    type Input = UseFilterBarStateInput<Client, { sector: string }>;

    const initialInput: Input = {
      data: [
        { id: "c1", sector: "Finance", status: "active" },
        { id: "c2", sector: "Health", status: "active" },
      ],
      initial: { sector: "All" },
      derive: { sector: (rows) => rows.map((r) => r.sector) },
    };

    const { result, rerender } = renderHook(
      (input: Input) => useFilterBarState(input),
      { initialProps: initialInput },
    );

    expect(result.current.options.sector).toEqual(["All", "Finance", "Health"]);

    // Data grows — options should pick up the new sector.
    const expandedInput: Input = {
      ...initialInput,
      data: [
        ...initialInput.data,
        { id: "c3", sector: "Energy", status: "active" },
      ],
    };

    rerender(expandedInput);

    expect(result.current.options.sector).toEqual([
      "All",
      "Energy",
      "Finance",
      "Health",
    ]);
  });
});
