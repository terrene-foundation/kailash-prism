/**
 * FilterBar — horizontal toolbar molecule.
 *
 * Pairs with {@link useFilterBarState} (M02). The molecule renders a search
 * input, optional filter dimensions (chip-row OR dropdown shape), and an
 * optional view-mode toggle. Three storybook shapes match the three observed
 * arbor consumer patterns (search-only, search+chips, search+dropdown+toggle).
 *
 * Atom-inventory note (release 0.6.0): the web atoms package only ships
 * `Button`, `Badge`, `Avatar`, `Spinner`, `Card` at this milestone. Inputs,
 * selects, and icon-buttons are token-driven inline elements within this
 * file to avoid blocking on missing-atom shards. Future releases may promote
 * these inline elements to dedicated atoms (`Input`, `Select`, `IconButton`)
 * — at which point this file delegates to them without changing its public
 * `FilterBarProps` surface.
 *
 * Spec: workspaces/prism-0.6.0/01-analysis/01-issue-24-filterbar-evidence.md
 *       § "FilterBar API shape"
 * Issue: terrene-foundation/kailash-prism#24
 */

import {
  forwardRef,
  useCallback,
  useId,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";

// --- Public types -----------------------------------------------------------

/**
 * One filter dimension. Each dimension renders as either a dropdown
 * (`shape: "dropdown"`) or a horizontal chip-row (`shape: "chips"`). The
 * dimension's `options` array is exclusive — the molecule does NOT mutate
 * it. Consumers typically pass `state.options[key]` from `useFilterBarState`.
 */
export interface FilterBarDimension {
  /** Stable identifier (used for keyed lists and ARIA attributes). */
  key: string;
  /** Visible label rendered next to the control. */
  label: string;
  /** Allowed values. The first value is rendered as the leftmost option. */
  options: string[];
  /** Currently-selected value. MUST be present in `options` to be active. */
  value: string;
  /** Called with the new value when the user picks one. */
  onChange: (value: string) => void;
  /** Render shape — flat chip row vs collapsed dropdown. */
  shape: "dropdown" | "chips";
}

/**
 * View-mode segmented toggle (e.g. grid vs list). Renders as a row of
 * icon-buttons. The `active` value MUST be present in `options`.
 */
export interface FilterBarViewMode {
  /** Currently-active mode key. */
  active: string;
  /** Allowed mode keys; rendered left-to-right. */
  options: string[];
  /** Called with the new mode key when the user toggles. */
  onChange: (mode: string) => void;
}

/**
 * Public props for {@link FilterBar}.
 *
 * The molecule does NOT own state. Pass paired controlled values (`search`
 * + `onSearchChange`, `dimension.value` + `dimension.onChange`, etc.); the
 * `useFilterBarState` hook is the recommended source.
 */
export interface FilterBarProps {
  /** Current search query (controlled). */
  search: string;
  /** Called on every search-input change. */
  onSearchChange: (value: string) => void;
  /** Visible placeholder for the search input. */
  searchPlaceholder?: string;
  /** Optional list of filter dimensions rendered after the search input. */
  dimensions?: FilterBarDimension[];
  /** Optional view-mode toggle rendered at the right edge. */
  viewMode?: FilterBarViewMode;
  /** Composition class (matches Prism component-class convention). */
  className?: string;
  /** When true, the bar pins to the top of its scroll container. */
  sticky?: boolean;
}

// --- Token-driven style helpers --------------------------------------------

const SEARCH_ICON = (
  <svg
    aria-hidden="true"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M11 11l3 3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

function rootStyle(sticky: boolean): CSSProperties {
  const base: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "var(--prism-spacing-3, 12px)",
    padding: "var(--prism-spacing-2, 8px) 0",
    width: "100%",
    boxSizing: "border-box",
  };
  if (sticky) {
    return {
      ...base,
      position: "sticky",
      top: 0,
      zIndex: 10,
      background:
        "var(--prism-color-surface-default, var(--color-surface-default, #ffffff))",
    };
  }
  return base;
}

const LEFT_GROUP_STYLE: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "var(--prism-spacing-3, 12px)",
  flex: "1 1 auto",
  minWidth: 0,
};

const RIGHT_GROUP_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--prism-spacing-2, 8px)",
  flex: "0 0 auto",
};

const SEARCH_WRAPPER_STYLE: CSSProperties = {
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  flex: "1 1 240px",
  minWidth: "180px",
  maxWidth: "360px",
};

const SEARCH_ICON_STYLE: CSSProperties = {
  position: "absolute",
  left: "var(--prism-spacing-2, 8px)",
  display: "inline-flex",
  alignItems: "center",
  pointerEvents: "none",
  color: "var(--prism-color-text-secondary, #64748b)",
};

const SEARCH_INPUT_STYLE: CSSProperties = {
  width: "100%",
  height: 36,
  paddingLeft: 32,
  paddingRight: "var(--prism-spacing-3, 12px)",
  fontSize: "var(--prism-font-size-body, 14px)",
  fontFamily: "inherit",
  color: "var(--prism-color-text-primary, #0f172a)",
  background:
    "var(--prism-color-surface-elevated, var(--color-surface-elevated, #f8fafc))",
  border:
    "1px solid var(--prism-color-border-default, var(--color-border-default, #e2e8f0))",
  borderRadius: "var(--prism-radius-md, 6px)",
  outline: "none",
  boxSizing: "border-box",
};

const DIMENSION_LABEL_STYLE: CSSProperties = {
  fontSize: "var(--prism-font-size-caption, 12px)",
  fontWeight: 500,
  color: "var(--prism-color-text-secondary, #64748b)",
  marginRight: "var(--prism-spacing-2, 8px)",
};

const DROPDOWN_STYLE: CSSProperties = {
  height: 36,
  padding: "0 var(--prism-spacing-3, 12px)",
  fontSize: "var(--prism-font-size-body, 14px)",
  fontFamily: "inherit",
  color: "var(--prism-color-text-primary, #0f172a)",
  background:
    "var(--prism-color-surface-default, var(--color-surface-default, #ffffff))",
  border:
    "1px solid var(--prism-color-border-default, var(--color-border-default, #e2e8f0))",
  borderRadius: "var(--prism-radius-md, 6px)",
  cursor: "pointer",
  boxSizing: "border-box",
};

const CHIP_ROW_STYLE: CSSProperties = {
  display: "flex",
  flexWrap: "nowrap",
  alignItems: "center",
  gap: "var(--prism-spacing-1, 4px)",
  overflowX: "auto",
  maxWidth: "100%",
};

function chipStyle(active: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    height: 28,
    padding: "0 var(--prism-spacing-3, 12px)",
    fontSize: "var(--prism-font-size-caption, 12px)",
    fontWeight: 500,
    fontFamily: "inherit",
    color: active
      ? "var(--prism-color-text-on-primary, #ffffff)"
      : "var(--prism-color-text-primary, #0f172a)",
    background: active
      ? "var(--prism-color-interactive-primary, #1e3a5f)"
      : "var(--prism-color-surface-elevated, #f1f5f9)",
    border: active
      ? "1px solid var(--prism-color-interactive-primary, #1e3a5f)"
      : "1px solid var(--prism-color-border-default, #e2e8f0)",
    borderRadius: "999px",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "background-color 150ms, color 150ms",
  };
}

function viewModeBtnStyle(active: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 32,
    minWidth: 36,
    padding: "0 var(--prism-spacing-2, 8px)",
    fontSize: "var(--prism-font-size-caption, 12px)",
    fontFamily: "inherit",
    color: active
      ? "var(--prism-color-text-on-primary, #ffffff)"
      : "var(--prism-color-text-primary, #0f172a)",
    background: active
      ? "var(--prism-color-interactive-primary, #1e3a5f)"
      : "transparent",
    border:
      "1px solid var(--prism-color-border-default, var(--color-border-default, #e2e8f0))",
    borderRadius: "var(--prism-radius-md, 6px)",
    cursor: "pointer",
    transition: "background-color 150ms, color 150ms",
  };
}

// --- Subcomponents ---------------------------------------------------------

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder: string | undefined;
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: SearchInputProps): ReactNode {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onChange("");
      }
    },
    [onChange],
  );
  // `??` only falls back on null/undefined; an explicit `searchPlaceholder=""`
  // would defeat the default. Trim + truthiness ensures whitespace and empty
  // strings also fall back to "Search".
  const ariaLabel = placeholder?.trim() || "Search";
  return (
    <div style={SEARCH_WRAPPER_STYLE}>
      <span style={SEARCH_ICON_STYLE}>{SEARCH_ICON}</span>
      <input
        type="search"
        role="searchbox"
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        style={SEARCH_INPUT_STYLE}
      />
    </div>
  );
}

interface DimensionDropdownProps {
  dimension: FilterBarDimension;
}

function DimensionDropdown({ dimension }: DimensionDropdownProps): ReactNode {
  const id = useId();
  return (
    <div style={{ display: "inline-flex", alignItems: "center" }}>
      <label htmlFor={id} style={DIMENSION_LABEL_STYLE}>
        {dimension.label}
      </label>
      <select
        id={id}
        value={dimension.value}
        onChange={(e) => {
          dimension.onChange(e.target.value);
        }}
        aria-label={dimension.label}
        style={DROPDOWN_STYLE}
      >
        {dimension.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

interface DimensionChipsProps {
  dimension: FilterBarDimension;
}

function DimensionChips({ dimension }: DimensionChipsProps): ReactNode {
  const groupRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") {
        return;
      }
      e.preventDefault();
      const len = dimension.options.length;
      const nextIdx =
        e.key === "ArrowRight" ? (idx + 1) % len : (idx - 1 + len) % len;
      const next = dimension.options[nextIdx];
      if (next === undefined) {
        return;
      }
      dimension.onChange(next);
      // Move focus to the new chip so the screen-reader follows the
      // selection (radiogroup contract).
      const buttons = groupRef.current?.querySelectorAll<HTMLButtonElement>(
        'button[role="radio"]',
      );
      buttons?.[nextIdx]?.focus();
    },
    [dimension],
  );

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={dimension.label}
      style={CHIP_ROW_STYLE}
    >
      <span style={DIMENSION_LABEL_STYLE}>{dimension.label}</span>
      {dimension.options.map((opt, idx) => {
        const active = opt === dimension.value;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => {
              dimension.onChange(opt);
            }}
            onKeyDown={(e) => {
              handleKeyDown(e, idx);
            }}
            style={chipStyle(active)}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

interface ViewModeToggleProps {
  viewMode: FilterBarViewMode;
}

function ViewModeToggle({ viewMode }: ViewModeToggleProps): ReactNode {
  const groupRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") {
        return;
      }
      e.preventDefault();
      const len = viewMode.options.length;
      const nextIdx =
        e.key === "ArrowRight" ? (idx + 1) % len : (idx - 1 + len) % len;
      const next = viewMode.options[nextIdx];
      if (next === undefined) {
        return;
      }
      viewMode.onChange(next);
      const buttons = groupRef.current?.querySelectorAll<HTMLButtonElement>(
        'button[role="radio"]',
      );
      buttons?.[nextIdx]?.focus();
    },
    [viewMode],
  );

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label="View mode"
      style={{ display: "inline-flex", gap: 0 }}
    >
      {viewMode.options.map((opt, idx) => {
        const active = opt === viewMode.active;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt}
            tabIndex={active ? 0 : -1}
            onClick={() => {
              viewMode.onChange(opt);
            }}
            onKeyDown={(e) => {
              handleKeyDown(e, idx);
            }}
            style={viewModeBtnStyle(active)}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// --- Main component --------------------------------------------------------

/**
 * FilterBar molecule. See module docstring for the three rendered shapes
 * and the `useFilterBarState` pairing.
 */
export const FilterBar = forwardRef<HTMLDivElement, FilterBarProps>(
  function FilterBar(
    {
      search,
      onSearchChange,
      searchPlaceholder,
      dimensions,
      viewMode,
      className,
      sticky = false,
    },
    ref,
  ) {
    return (
      <div ref={ref} className={className} style={rootStyle(sticky)}>
        <div style={LEFT_GROUP_STYLE}>
          <SearchInput
            value={search}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
          />
          {dimensions?.map((dim) =>
            dim.shape === "dropdown" ? (
              <DimensionDropdown key={dim.key} dimension={dim} />
            ) : (
              <DimensionChips key={dim.key} dimension={dim} />
            ),
          )}
        </div>
        {viewMode ? (
          <div style={RIGHT_GROUP_STYLE}>
            <ViewModeToggle viewMode={viewMode} />
          </div>
        ) : null}
      </div>
    );
  },
);
