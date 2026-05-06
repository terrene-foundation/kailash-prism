/**
 * Zone responsive unmount — `docs/specs/05h-layout-engine.md` § 5.h.4
 * (zones marked `responsive.{breakpoint}: hidden` MUST NOT render content).
 *
 * The contract distinguishes UNMOUNT from `visibility:hidden` /
 * `display:none`. The former discards the React subtree (no DOM cost,
 * no event listeners, no portals); the latter retains it. Per
 * `web/src/engines/layout.tsx:626`, hidden zones short-circuit via
 * `if (!isVisible) return null;` — but until this test, no assertion
 * proved the unmount path. Surfaced by `/sweep` Sweep 5 supplemental,
 * 2026-05-06.
 *
 * Approach: render a Zone with `visible: { mobile: false, desktop: true }`
 * at a mobile viewport, then `queryByText` for the zone's children. The
 * `queryBy*` helpers return null when the node is not in the DOM — the
 * exact assertion the spec mandates. `getBy*` would throw on miss; we
 * use `queryBy*` because absence is the contract.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LayoutProvider, Zone, type ZoneContent } from "../../layout.js";

// matchMedia stub — jsdom doesn't implement it.
function stubMatchMedia(width: number) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => {
      // crude but sufficient: parse `(min-width: Npx)` and compare to width.
      const match = query.match(/min-width:\s*(\d+)px/);
      const minWidth = match ? Number(match[1]) : 0;
      return {
        matches: width >= minWidth,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      };
    },
  });
}

describe("Zone — responsive unmount contract (05h § 5.h.4)", () => {
  let originalInnerWidth: number;

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
  });

  afterEach(() => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  it("UNMOUNTS (not hides) zone children when responsive.{breakpoint}: false at the active breakpoint", () => {
    // Mobile viewport — width below the `tablet` threshold of 768px.
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 320,
    });
    stubMatchMedia(320);

    const sidebarZone: ZoneContent = {
      role: "complementary",
      visible: { mobile: false, tablet: true, desktop: true },
      children: (
        <span data-testid="sidebar-marker">desktop-only sidebar content</span>
      ),
    };

    render(
      <LayoutProvider>
        <Zone name="sidebar" zone={sidebarZone} />
      </LayoutProvider>,
    );

    // CONTRACT: the children are not in the DOM at all (true unmount).
    // queryBy* returns null on miss — `visibility:hidden` / `display:none`
    // would still find the node and this assertion would fail.
    expect(screen.queryByTestId("sidebar-marker")).toBeNull();
    expect(screen.queryByText("desktop-only sidebar content")).toBeNull();

    // Negative control: also no <aside data-zone="sidebar"> wrapper. The
    // entire Zone subtree is gone, not just the children inside the wrapper.
    expect(document.querySelector('[data-zone="sidebar"]')).toBeNull();
  });

  it("MOUNTS zone children when responsive.{breakpoint}: true at the active breakpoint", () => {
    // Desktop viewport — width above the `desktop` threshold of 1280px.
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1440,
    });
    stubMatchMedia(1440);

    const sidebarZone: ZoneContent = {
      role: "complementary",
      visible: { mobile: false, tablet: true, desktop: true },
      children: (
        <span data-testid="sidebar-marker">desktop-only sidebar content</span>
      ),
    };

    render(
      <LayoutProvider>
        <Zone name="sidebar" zone={sidebarZone} />
      </LayoutProvider>,
    );

    // Symmetric control: the same Zone DOES mount when the breakpoint allows it.
    expect(screen.getByTestId("sidebar-marker")).toBeDefined();
    expect(document.querySelector('[data-zone="sidebar"]')).not.toBeNull();
  });

  it("defaults to MOUNTED when zone.visible is undefined (no responsive gate)", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 320,
    });
    stubMatchMedia(320);

    const alwaysVisibleZone: ZoneContent = {
      role: "main",
      // visible: undefined — no responsive constraint
      children: <span data-testid="main-marker">always-visible content</span>,
    };

    render(
      <LayoutProvider>
        <Zone name="main" zone={alwaysVisibleZone} />
      </LayoutProvider>,
    );

    expect(screen.getByTestId("main-marker")).toBeDefined();
  });
});
