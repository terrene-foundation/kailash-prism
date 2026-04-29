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
} from "./atoms/index.js";

// Organisms
export {
  CardGrid,
  type CardGridProps,
  type ResponsiveColumns,
} from "./organisms/index.js";

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
} from "./engines/theme.js";

export {
  LayoutProvider,
  useLayout,
  useLayoutMaybe,
  VStack,
  Row,
  Grid,
  Split,
  Layer,
  Scroll,
  Zone,
  type Breakpoint,
  type LayoutEngineConfig,
  type ZoneContent,
  type ResponsiveValue,
  type LayerTier,
  type LayerProps,
  type ScrollDirection,
  type ScrollProps,
} from "./engines/layout.js";

// Layout engine (new, composable primitives) lives at
// `@kailash/prism-web/engines/layout` and is reachable via sub-path
// import for tokenized callers. The top-level barrel above continues to
// export the legacy primitive names (`VStack`, `Row`, `Grid`, `Split`,
// `Layer`, `Scroll`, `Zone`) — but as of 0.5.0 the first three are thin
// delegates over `engines/layout/{stack,row,grid}.js`, giving the new
// engine real production call sites without changing the public
// top-level surface. `Split`, `Layer`, and `Scroll` retain legacy
// implementations because their semantics (static ratio + mobile
// collapse / backdrop + focus trap / scrollbar toggle) have no direct
// equivalent in the primitives engine yet. See journal 0025 for the
// migration map.

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
} from "./engines/navigation.js";

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
} from "./engines/data-table/index.js";

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
} from "./engines/ai-chat/index.js";

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
} from "./engines/form/index.js";

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
} from "./templates/index.js";
