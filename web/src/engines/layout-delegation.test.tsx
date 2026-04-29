/**
 * Layout delegation parity — Tier 1
 *
 * Verifies that the legacy primitives (`VStack`, `Row`, `Grid`) in
 * `engines/layout.tsx` produce structurally equivalent DOM to the new
 * primitives in `engines/layout/` after the 0.5.0 delegation refactor.
 *
 * The legacy `gap: number` API translates to the new `spacing: SpacingToken`
 * for canonical values (0/4/8/16/24/32/48 → none/xs/sm/md/lg/xl/2xl). For
 * non-canonical numbers, the wrapper passes `spacing="none"` and overrides
 * `gap` via inline style. These tests pin both behaviours so a future
 * refactor of either side raises a loud failure.
 *
 * The new primitives stamp `data-prism-{stack|grid}` attributes — these
 * are the structural fingerprint that the delegate ran through the new
 * engine, not the legacy stand-alone div.
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Grid, Row, VStack } from "./layout.js";

describe("VStack delegates to engines/layout/stack", () => {
  it("emits data-prism-stack=vertical (proves new-engine code path)", () => {
    const { container } = render(<VStack>x</VStack>);
    const root = container.firstChild as HTMLElement;
    expect(root.getAttribute("data-prism-stack")).toBe("vertical");
  });

  it("translates canonical gap=16 to spacing=md (no inline override)", () => {
    const { container } = render(<VStack gap={16}>x</VStack>);
    const root = container.firstChild as HTMLElement;
    // Token resolves to the CSS var; no raw px in inline style.
    expect(root.style.gap).toContain("--prism-spacing-md");
    expect(root.style.gap).not.toMatch(/^16px$/);
  });

  it("translates canonical gap=24 to spacing=lg", () => {
    const { container } = render(<VStack gap={24}>x</VStack>);
    const root = container.firstChild as HTMLElement;
    expect(root.style.gap).toContain("--prism-spacing-lg");
  });

  it("preserves non-canonical gap=20 via inline style override", () => {
    const { container } = render(<VStack gap={20}>x</VStack>);
    const root = container.firstChild as HTMLElement;
    // Wrapper overrides token with raw px → exact-px legacy behaviour preserved.
    expect(root.style.gap).toBe("20px");
  });

  it("forwards padding via inline style", () => {
    const { container } = render(<VStack padding={32}>x</VStack>);
    const root = container.firstChild as HTMLElement;
    expect(root.style.padding).toBe("32px");
  });

  it("forwards align prop to new Stack", () => {
    const { container } = render(<VStack align="center">x</VStack>);
    const root = container.firstChild as HTMLElement;
    expect(root.style.alignItems).toBe("center");
  });
});

describe("Row delegates to engines/layout/row", () => {
  it("emits data-prism-stack=horizontal (proves Row aliases to Stack horizontal)", () => {
    const { container } = render(<Row>x</Row>);
    const root = container.firstChild as HTMLElement;
    expect(root.getAttribute("data-prism-stack")).toBe("horizontal");
  });

  it("preserves legacy default align='center' (not new-engine default 'stretch')", () => {
    const { container } = render(<Row>x</Row>);
    const root = container.firstChild as HTMLElement;
    expect(root.style.alignItems).toBe("center");
  });

  it("translates gap=16 to md token", () => {
    const { container } = render(<Row gap={16}>x</Row>);
    const root = container.firstChild as HTMLElement;
    expect(root.style.gap).toContain("--prism-spacing-md");
  });

  it("forwards justify prop", () => {
    const { container } = render(<Row justify="between">x</Row>);
    const root = container.firstChild as HTMLElement;
    expect(root.style.justifyContent).toBe("space-between");
  });

  it("forwards wrap prop", () => {
    const { container } = render(<Row wrap>x</Row>);
    const root = container.firstChild as HTMLElement;
    expect(root.style.flexWrap).toBe("wrap");
  });
});

describe("Grid delegates to engines/layout/grid", () => {
  it("emits data-prism-grid attribute (proves new-engine code path)", () => {
    const { container } = render(<Grid columns={2}>x</Grid>);
    const root = container.firstChild as HTMLElement;
    // The new Grid stamps `data-prism-grid`; the legacy stand-alone div did not.
    expect(root.hasAttribute("data-prism-grid")).toBe(true);
  });

  it("translates default gap=16 to md token", () => {
    const { container } = render(<Grid columns={3}>x</Grid>);
    const root = container.firstChild as HTMLElement;
    expect(root.style.gap).toContain("--prism-spacing-md");
  });

  it("preserves non-canonical gap via inline style override", () => {
    const { container } = render(
      <Grid columns={2} gap={20}>
        x
      </Grid>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.style.gap).toBe("20px");
  });

  it("applies separate rowGap when different from gap", () => {
    const { container } = render(
      <Grid columns={2} gap={16} rowGap={32}>
        x
      </Grid>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.style.rowGap).toBe("32px");
  });

  it("accepts a ResponsiveValue<number> columns prop", () => {
    // Smoke test: structural acceptance only — new Grid resolves responsive
    // columns via CSS-only media queries, so jsdom can't observe the runtime
    // pick, but the type and render path must not throw.
    const { container } = render(
      <Grid columns={{ mobile: 1, tablet: 2, desktop: 3 }}>x</Grid>,
    );
    expect(container.firstChild).not.toBeNull();
  });
});
