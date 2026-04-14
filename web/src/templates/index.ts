/**
 * Prism Page Templates
 * Spec: docs/specs/06-page-templates.md
 *
 * Pre-wired layout trees with named zones. Select a template,
 * populate zones with engines or organisms.
 */

export { DashboardTemplate, type DashboardTemplateProps } from './dashboard-template.js';
export { ListTemplate, type ListTemplateProps } from './list-template.js';
export { DetailTemplate, type DetailTemplateProps } from './detail-template.js';
export { FormTemplate, type FormTemplateProps } from './form-template.js';
export { SettingsTemplate, type SettingsTemplateProps } from './settings-template.js';
export { AuthTemplate, type AuthTemplateProps } from './auth-template.js';
export {
  ConversationTemplate,
  type ConversationTemplateProps,
  type ConversationTemplateManualProps,
  type ConversationTemplateWiredProps,
  type WiredChatState,
} from './conversation-template.js';
export { SplitTemplate, type SplitTemplateProps } from './split-template.js';
export { WizardTemplate, type WizardTemplateProps } from './wizard-template.js';
export { KanbanTemplate, type KanbanTemplateProps, type KanbanColumn } from './kanban-template.js';
export { CalendarTemplate, type CalendarTemplateProps } from './calendar-template.js';
export { TemplateHeader } from './template-shell.js';
export type { BaseTemplateProps, ZoneSlot } from './types.js';
