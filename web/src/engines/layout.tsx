/**
 * Layout Engine — Template composition, responsive breakpoints, zone management
 * Spec: docs/specs/05-engine-specifications.md § 5.4
 *
 * Coordinates page layout from template definitions. Monitors viewport width,
 * resolves breakpoints, manages zone visibility and ordering, integrates
 * with the Navigation engine for chrome.
 */

import {
  createContext,
  // useCallback — reserved for future keyboard/gesture handlers
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

// --- Types ---

export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide';

/** Breakpoint boundaries in pixels (min-width) */
const BREAKPOINTS: Record<Breakpoint, number> = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
};

export interface LayoutEngineConfig {
  /** Template name (determines zone structure) */
  template?: string;
  /** Zone content mapping */
  zones?: Record<string, ZoneContent>;
  /** Maximum content width in px. Default: 1440 */
  maxContentWidth?: number;
  /** Page margin override */
  pageMargin?: number | ResponsiveValue<number>;
  /** Callbacks */
  onBreakpointChange?: (event: { from: Breakpoint; to: Breakpoint }) => void;
}

export interface ZoneContent {
  /** Content to render in this zone */
  children: ReactNode;
  /** ARIA landmark role */
  role?: 'navigation' | 'complementary' | 'contentinfo' | 'main';
  /** Responsive visibility per breakpoint */
  visible?: Partial<Record<Breakpoint, boolean>>;
  /** Zone ordering (lower = renders first) */
  order?: Partial<Record<Breakpoint, number>>;
  /** Whether zone should stick to viewport */
  sticky?: boolean;
}

export type ResponsiveValue<T> = Partial<Record<Breakpoint, T>>;

export interface LayoutContextValue {
  /** Current resolved breakpoint */
  breakpoint: Breakpoint;
  /** Whether viewport is mobile */
  isMobile: boolean;
  /** Whether viewport is tablet */
  isTablet: boolean;
  /** Whether viewport is desktop or wider */
  isDesktop: boolean;
  /** Viewport width in pixels */
  viewportWidth: number;
}

// --- Breakpoint Detection ---

function resolveBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS.wide) return 'wide';
  if (width >= BREAKPOINTS.desktop) return 'desktop';
  if (width >= BREAKPOINTS.tablet) return 'tablet';
  return 'mobile';
}

function resolveResponsive<T>(
  value: T | ResponsiveValue<T> | undefined,
  breakpoint: Breakpoint,
  fallback: T,
): T {
  if (value === undefined) return fallback;
  if (typeof value !== 'object' || value === null) return value as T;

  const responsive = value as ResponsiveValue<T>;
  // Cascade: current breakpoint -> previous breakpoints -> fallback
  const order: Breakpoint[] = ['wide', 'desktop', 'tablet', 'mobile'];
  const startIdx = order.indexOf(breakpoint);
  for (let i = startIdx; i < order.length; i++) {
    const key = order[i];
    if (key === undefined) continue;
    const val = responsive[key];
    if (val !== undefined) return val;
  }
  return fallback;
}

// --- Context ---

const LayoutContext = createContext<LayoutContextValue | null>(null);

// --- Provider ---

export function LayoutProvider({
  children,
  maxContentWidth = 1440,
  pageMargin,
  onBreakpointChange,
}: LayoutEngineConfig & { children: ReactNode }) {
  const [viewportWidth, setViewportWidth] = useState(() => {
    if (typeof window === 'undefined') return 1024;
    return window.innerWidth;
  });

  const breakpoint = resolveBreakpoint(viewportWidth);

  // Monitor viewport width via matchMedia
  useEffect(() => {
    const queries = Object.entries(BREAKPOINTS)
      .filter(([, px]) => px > 0)
      .map(([name, px]) => ({
        name: name as Breakpoint,
        mq: window.matchMedia(`(min-width: ${px}px)`),
      }));

    const handler = () => {
      setViewportWidth(window.innerWidth);
    };

    for (const { mq } of queries) {
      mq.addEventListener('change', handler);
    }
    // Also listen for resize for smooth tracking
    window.addEventListener('resize', handler);

    return () => {
      for (const { mq } of queries) {
        mq.removeEventListener('change', handler);
      }
      window.removeEventListener('resize', handler);
    };
  }, []);

  // Fire breakpoint change callback
  const prevBreakpoint = usePrevious(breakpoint);
  useEffect(() => {
    if (prevBreakpoint && prevBreakpoint !== breakpoint) {
      onBreakpointChange?.({ from: prevBreakpoint, to: breakpoint });
    }
  }, [breakpoint, prevBreakpoint, onBreakpointChange]);

  const resolvedMargin = resolveResponsive(pageMargin, breakpoint, breakpoint === 'mobile' ? 16 : 24);

  const value = useMemo<LayoutContextValue>(
    () => ({
      breakpoint,
      isMobile: breakpoint === 'mobile',
      isTablet: breakpoint === 'tablet',
      isDesktop: breakpoint === 'desktop' || breakpoint === 'wide',
      viewportWidth,
    }),
    [breakpoint, viewportWidth],
  );

  const containerStyle: CSSProperties = {
    maxWidth: maxContentWidth,
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingLeft: resolvedMargin,
    paddingRight: resolvedMargin,
  };

  return (
    <LayoutContext.Provider value={value}>
      <div style={containerStyle}>
        {children}
      </div>
    </LayoutContext.Provider>
  );
}

// --- Layout Primitives ---

export interface VStackProps {
  children: ReactNode;
  gap?: number;
  align?: 'start' | 'center' | 'end' | 'stretch';
  padding?: number;
  className?: string | undefined;
}

export function VStack({ children, gap = 0, align = 'stretch', padding = 0, className }: VStackProps) {
  const style: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap,
    alignItems: align === 'stretch' ? 'stretch' : `flex-${align}`,
    padding: padding || undefined,
  };
  return <div style={style} className={className}>{children}</div>;
}

export interface RowProps {
  children: ReactNode;
  gap?: number;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  wrap?: boolean;
  className?: string;
}

export function Row({ children, gap = 0, align = 'center', justify = 'start', wrap = false, className }: RowProps) {
  const justifyMap: Record<string, string> = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    between: 'space-between',
    around: 'space-around',
  };
  const style: CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    gap,
    alignItems: align === 'stretch' ? 'stretch' : `flex-${align}`,
    justifyContent: justifyMap[justify],
    flexWrap: wrap ? 'wrap' : 'nowrap',
  };
  return <div style={style} className={className}>{children}</div>;
}

export interface GridProps {
  children: ReactNode;
  columns?: number | ResponsiveValue<number>;
  gap?: number;
  rowGap?: number;
  className?: string;
}

export function Grid({ children, columns = 1, gap = 16, rowGap, className }: GridProps) {
  const { breakpoint } = useLayout();
  const resolvedCols = resolveResponsive(columns, breakpoint, 1);

  const style: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${resolvedCols}, minmax(0, 1fr))`,
    gap,
    rowGap: rowGap ?? gap,
  };
  return <div style={style} className={className}>{children}</div>;
}

export interface SplitProps {
  children: [ReactNode, ReactNode];
  ratio?: string | ResponsiveValue<string>;
  gap?: number;
  className?: string | undefined;
}

export function Split({ children, ratio = '1:2', gap = 0, className }: SplitProps) {
  const { breakpoint, isMobile } = useLayout();
  const resolvedRatio = resolveResponsive(ratio, breakpoint, '1:2');

  // On mobile, stack vertically
  if (isMobile || resolvedRatio === '0:1') {
    return <VStack gap={gap} className={className}>{children[1]}</VStack>;
  }

  const parts = resolvedRatio.split(':').map(Number);
  const left = parts[0] ?? 1;
  const right = parts[1] ?? 2;
  const total = left + right;

  const style: CSSProperties = {
    display: 'flex',
    gap,
  };

  return (
    <div style={style} className={className}>
      <div style={{ flex: `${left} 0 ${(left / total) * 100}%`, minWidth: 0 }}>{children[0]}</div>
      <div style={{ flex: `${right} 0 ${(right / total) * 100}%`, minWidth: 0 }}>{children[1]}</div>
    </div>
  );
}

// --- Layer (z-axis stacking for overlays, modals, popovers) ---

export type LayerTier = 'page' | 'popover' | 'modal' | 'toast' | 'tooltip';
type LayerPosition = 'center' | 'top' | 'bottom' | 'start' | 'end';

const LAYER_Z_INDEX: Record<LayerTier, number> = {
  page: 0,
  popover: 100,
  modal: 200,
  toast: 300,
  tooltip: 400,
};

export interface LayerProps {
  children: ReactNode;
  /** Z-index tier. Default: "page" */
  tier?: LayerTier;
  /** Positioning: fixed to viewport or absolute to parent. Default: "viewport" */
  anchor?: 'viewport' | 'parent';
  /** Where content appears relative to anchor. Default: "center" */
  position?: LayerPosition;
  /** Show semi-transparent backdrop. Default: false */
  backdrop?: boolean;
  /** Clicking backdrop calls onDismiss. Default: true */
  backdropDismiss?: boolean;
  /** Trap keyboard focus within layer. Default: false (true for modals) */
  trapFocus?: boolean;
  /** Visible state. Default: true */
  open?: boolean;
  /** Called when backdrop clicked or Escape pressed */
  onDismiss?: () => void;
  className?: string;
}

export function Layer({
  children,
  tier = 'page',
  anchor = 'viewport',
  position = 'center',
  backdrop = false,
  backdropDismiss = true,
  trapFocus = false,
  open = true,
  onDismiss,
  className,
}: LayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const zIndex = LAYER_Z_INDEX[tier];

  // Handle Escape key
  useEffect(() => {
    if (!open || !onDismiss) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onDismiss]);

  // Focus trap
  useEffect(() => {
    if (!open || !trapFocus || !containerRef.current) return;
    const container = containerRef.current;
    const focusable = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length > 0) focusable[0]!.focus();

    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    container.addEventListener('keydown', handler);
    return () => container.removeEventListener('keydown', handler);
  }, [open, trapFocus]);

  if (!open) return null;

  const positionStyle = anchor === 'viewport'
    ? { position: 'fixed' as const, inset: 0 }
    : { position: 'absolute' as const, inset: 0 };

  const alignmentStyle: CSSProperties = {
    display: 'flex',
    alignItems: position === 'top' ? 'flex-start'
              : position === 'bottom' ? 'flex-end'
              : 'center',
    justifyContent: position === 'start' ? 'flex-start'
                  : position === 'end' ? 'flex-end'
                  : 'center',
  };

  return (
    <div
      ref={containerRef}
      role={tier === 'modal' ? 'dialog' : undefined}
      aria-modal={tier === 'modal' ? true : undefined}
      style={{ ...positionStyle, zIndex, ...alignmentStyle }}
      className={className}
    >
      {backdrop && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex,
          }}
          onClick={backdropDismiss ? onDismiss : undefined}
          aria-hidden="true"
        />
      )}
      <div style={{ position: 'relative', zIndex: zIndex + 1 }}>
        {children}
      </div>
    </div>
  );
}

// --- Scroll (constrained scroll region) ---

export type ScrollDirection = 'vertical' | 'horizontal' | 'both';

export interface ScrollProps {
  children: ReactNode;
  /** Scroll axis. Default: "vertical" */
  direction?: ScrollDirection;
  /** Max height in px (vertical/both). Required for vertical scroll to work. */
  maxHeight?: number | string;
  /** Max width in px (horizontal/both). */
  maxWidth?: number | string;
  /** Inner padding. Default: 0 */
  padding?: number;
  /** Show scrollbar indicator. Default: true */
  indicator?: boolean;
  /** Accessible label for the scroll region */
  'aria-label'?: string;
  className?: string;
}

export function Scroll({
  children,
  direction = 'vertical',
  maxHeight,
  maxWidth,
  padding = 0,
  indicator = true,
  'aria-label': ariaLabel,
  className,
}: ScrollProps) {
  const overflowX = direction === 'horizontal' || direction === 'both' ? 'auto' : 'hidden';
  const overflowY = direction === 'vertical' || direction === 'both' ? 'auto' : 'hidden';

  const style: CSSProperties = {
    overflowX,
    overflowY,
    maxHeight: maxHeight ?? undefined,
    maxWidth: maxWidth ?? undefined,
    padding: padding || undefined,
    // Hide scrollbar when indicator=false but keep scrolling functional
    ...(indicator ? {} : { scrollbarWidth: 'none' as const }),
  };

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
      style={style}
      className={className}
    >
      {children}
      {!indicator && (
        <style>{`
          .prism-scroll-hide::-webkit-scrollbar { display: none; }
        `}</style>
      )}
    </div>
  );
}

// --- Zone Renderer ---

export interface ZoneProps {
  name: string;
  zone: ZoneContent;
  className?: string;
}

export function Zone({ name, zone, className }: ZoneProps) {
  const { breakpoint } = useLayout();
  const isVisible = zone.visible
    ? resolveResponsive(zone.visible as ResponsiveValue<boolean>, breakpoint, true)
    : true;

  if (!isVisible) return null;

  const Tag = zone.role === 'main' ? 'main' :
              zone.role === 'navigation' ? 'nav' :
              zone.role === 'complementary' ? 'aside' :
              zone.role === 'contentinfo' ? 'footer' : 'section';

  const style: CSSProperties = zone.sticky
    ? { position: 'sticky', top: 0, zIndex: 10 }
    : {};

  return (
    <Tag
      data-zone={name}
      aria-label={name.replace(/-/g, ' ')}
      style={style}
      className={className}
    >
      {zone.children}
    </Tag>
  );
}

// --- Hook ---

export function useLayout(): LayoutContextValue {
  const ctx = useContext(LayoutContext);
  if (!ctx) {
    throw new Error(
      'useLayout() must be used within a <LayoutProvider>. ' +
      'Wrap your page with <LayoutProvider>.',
    );
  }
  return ctx;
}

/** Returns the layout context or null if no LayoutProvider wraps this tree. */
export function useLayoutMaybe(): LayoutContextValue | null {
  return useContext(LayoutContext);
}

/** Resolve a responsive value for the current breakpoint */
export function useResponsive<T>(value: T | ResponsiveValue<T>, fallback: T): T {
  const { breakpoint } = useLayout();
  return resolveResponsive(value, breakpoint, fallback);
}

// --- Utilities ---

function usePrevious<T>(value: T): T | undefined {
  const [prev, setPrev] = useState<T | undefined>(undefined);
  const [current, setCurrent] = useState(value);

  if (value !== current) {
    setPrev(current);
    setCurrent(value);
  }

  return prev;
}

export { resolveBreakpoint, resolveResponsive, BREAKPOINTS };
