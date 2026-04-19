/**
 * @kailash/prism-web
 * Kailash Prism web engine — React composable engines, atoms, molecules, organisms.
 *
 * Spec: docs/specs/00-prism-manifest.md
 */

// Atoms
export {
  Button,
  Badge,
  Avatar,
  Spinner,
  Card,
  type ButtonProps,
  type ButtonVariant,
  type ButtonSize,
  type BadgeProps,
  type BadgeVariant,
  type BadgeSize,
  type AvatarProps,
  type AvatarSize,
  type SpinnerProps,
  type SpinnerSize,
  type CardProps,
  type CardVariant,
} from './atoms/index.js';

// Organisms
export {
  CardGrid,
  type CardGridProps,
  type ResponsiveColumns,
} from './organisms/index.js';

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
  Layer,
  Scroll,
  Zone,
  resolveBreakpoint,
  BREAKPOINTS,
  type LayoutEngineConfig,
  type LayoutContextValue,
  type Breakpoint,
  type ZoneContent,
  type ResponsiveValue,
  type LayerTier,
  type LayerProps,
  type ScrollDirection,
  type ScrollProps,
} from './engines/layout.js';

// Layout engine — composable primitives (S5).
// Exported under `Layout*`-prefixed aliases at the top level so they can
// coexist with the legacy single-file layout primitives above without
// name collisions. Consumers who want the full six-primitive surface
// unaliased should import from `@kailash/prism-web/engines/layout`.
export {
  Stack as LayoutStack,
  Row as LayoutRow,
  Grid as LayoutGrid,
  Split as LayoutSplit,
  Layer as LayoutLayer,
  Scroll as LayoutScroll,
  spacingVar as layoutSpacingVar,
  SPACING_TOKEN_FALLBACK as LAYOUT_SPACING_TOKEN_FALLBACK,
  LAYER_Z_INDEX_FALLBACK as LAYOUT_LAYER_Z_INDEX_FALLBACK,
  type SpacingToken as LayoutSpacingToken,
  type LayoutProps,
  type ResponsiveColumns as LayoutResponsiveColumns,
  type StackProps as LayoutStackProps,
  type StackDirection as LayoutStackDirection,
  type StackAlign as LayoutStackAlign,
  type StackJustify as LayoutStackJustify,
  type RowProps as LayoutRowProps,
  type GridProps as LayoutGridProps,
  type SplitProps as LayoutSplitProps,
  type SplitDirection as LayoutSplitDirection,
  type LayerProps as LayoutLayerProps,
  type LayerTier as LayoutLayerTier,
  type LayerPosition as LayoutLayerPosition,
  type ScrollProps as LayoutScrollProps,
  type ScrollDirection as LayoutScrollDirection,
} from './engines/layout/index.js';

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

export {
  DataTable,
  useDataTable,
  defaultSortComparator,
  isDataTableAdapter,
  resolveDataSource,
  type DataTableConfig,
  type DataTableRow,
  type ColumnDef,
  type SortingConfig,
  type FilteringConfig,
  type PaginationConfig,
  type SelectionConfig,
  type BulkAction,
  type DataSource,
  type SortState,
  type DataTableAdapter,
  type DataTableCapabilities,
  type DataTableQuery,
  type DataTablePage,
  type DataTableSort,
  type DataTableRowAction,
  type DataTableBulkAction,
} from './engines/data-table/index.js';

export {
  ChatEngine,
  ChatMessageBubble,
  ChatInput,
  StreamOfThought,
  ActionPlan,
  SuggestionChips,
  ConversationSidebar,
  useChatState,
  type ChatEngineConfig,
  type ChatMessage,
  type MessageType,
  type MessageSender,
  type Citation,
  type ToolCallData,
  type ToolCallStatus,
  type ToolResultData,
  type ToolCallStep,
  type ActionPlanStep,
  type ActionPlanAction,
  type SuggestionChip,
  type SourceOption,
  type ConversationSummary,
  type ChatAdapter,
  type ChatStreamHandle,
  type ConversationSidebarProps,
  type ChatStateOptions,
  type ChatStateValue,
} from './engines/ai-chat/index.js';

export {
  Form,
  FormWizard,
  useFormContext,
  evaluateCondition,
  validateFieldRules,
  type FieldType,
  type Option,
  type ConditionOperator,
  type ConditionExpression,
  type FieldValidationRule,
  type FieldDef,
  type SectionDef,
  type FormStatus,
  type FormConfig,
  type WizardStep,
  type FormWizardConfig,
} from './engines/form/index.js';

// Templates
export {
  DashboardTemplate,
  ListTemplate,
  DetailTemplate,
  FormTemplate,
  SettingsTemplate,
  AuthTemplate,
  ConversationTemplate,
  SplitTemplate,
  WizardTemplate,
  KanbanTemplate,
  CalendarTemplate,
  TemplateHeader,
  type DashboardTemplateProps,
  type ListTemplateProps,
  type DetailTemplateProps,
  type FormTemplateProps,
  type SettingsTemplateProps,
  type AuthTemplateProps,
  type ConversationTemplateProps,
  type ConversationTemplateManualProps,
  type ConversationTemplateWiredProps,
  type WiredChatState,
  type SplitTemplateProps,
  type WizardTemplateProps,
  type KanbanTemplateProps,
  type KanbanColumn,
  type CalendarTemplateProps,
  type BaseTemplateProps,
  type ZoneSlot,
} from './templates/index.js';
