/**
 * @kailash/prism-web
 * Kailash Prism web engine — React composable engines, atoms, molecules, organisms.
 *
 * Spec: docs/specs/00-prism-manifest.md
 */

// Engines
export {
  ThemeProvider,
  useTheme,
  type ThemeEngineConfig,
  type ThemeTokenData,
  type ThemeDefinition,
  type ThemeContextValue,
  type ColorMode,
  type ColorModePreference,
} from './engines/theme.js';

export {
  LayoutProvider,
  useLayout,
  useResponsive,
  VStack,
  Row,
  Grid,
  Split,
  Zone,
  resolveBreakpoint,
  BREAKPOINTS,
  type LayoutEngineConfig,
  type LayoutContextValue,
  type Breakpoint,
  type ZoneContent,
  type ResponsiveValue,
} from './engines/layout.js';

export {
  NavigationProvider,
  AppShell,
  Sidebar,
  Breadcrumbs,
  useNavigation,
  type NavigationConfig,
  type RouteNode,
  type SidebarConfig,
  type BreadcrumbConfig,
} from './engines/navigation.js';
