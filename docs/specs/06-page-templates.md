# 06 Page Templates

Spec version: 0.1.0 | Status: DRAFT | Governs: Template definitions, zone schemas, composition rules, responsive transformations

---

## 6.1 Template Contract Format

Every page template is a pre-wired layout tree that defines named zones. The agent selects a template and populates its zones with engines or organisms, rather than building page layout from scratch.

Each template defines:

1. **Name**: PascalCase identifier.
2. **Purpose**: One sentence describing the use case.
3. **Typical use cases**: Concrete application examples.
4. **Zone map**: ASCII art showing spatial arrangement and zone names.
5. **Zone schemas**: Content type, constraints, and defaults for each zone.
6. **Responsive transformations**: How the layout changes at each of the 4 breakpoints.
7. **Navigation integration**: How the template connects to the Navigation Engine.
8. **Default organisms**: Recommended starting content for each zone.

---

## 6.2 Template Definitions

---

### 6.2.1 Dashboard

**Purpose**: Overview page with metrics, charts, and activity streams for monitoring business state.

**Typical use cases**: Admin home, analytics overview, sales dashboard, project status, system health.

**Zone map** (desktop/wide):
```
+------------------------------------------------------------------+
|                        [page-header]                               |
|  Title + date range picker + actions                              |
+------------------------------------------------------------------+
|  [stats-row]                                                      |
|  MetricCard | MetricCard | MetricCard | MetricCard                |
+------------------------------------------------------------------+
|  [primary-chart]                    |  [secondary-content]        |
|                                     |                             |
|  Large chart/visualization          |  Activity feed / list       |
|                                     |                             |
|                                     |                             |
+------------------------------------------------------------------+
|  [detail-grid]                                                    |
|  Card | Card | Card                                              |
+------------------------------------------------------------------+
```

**Zone schemas**:

| Zone | Content Type | Layout | Min Height | Description |
|------|-------------|--------|------------|-------------|
| `page-header` | `actions` | `Row(justify: "between", align: "center")` | 48px | Page title, date filters, action buttons. |
| `stats-row` | `stats` | `Grid(columns: { mobile: 1, tablet: 2, desktop: 4 })` | -- | 3-6 MetricCards showing KPIs. |
| `primary-chart` | `any` | `VStack` | 300px | Main visualization (line chart, bar chart, area chart). |
| `secondary-content` | `data` | `VStack` | 300px | Activity feed, recent items list, or secondary chart. |
| `detail-grid` | `any` | `Grid(columns: { mobile: 1, tablet: 2, desktop: 3 })` | -- | Additional cards, tables, or widgets. |

**Responsive transformations**:

| Breakpoint | Transformation |
|------------|---------------|
| `wide` (1440px+) | Full layout as shown. `primary-chart` and `secondary-content` in Split(ratio: "2:1"). `detail-grid` 3 columns. |
| `desktop` (1024-1439px) | Same as wide but `detail-grid` 2 columns. |
| `tablet` (768-1023px) | `primary-chart` and `secondary-content` stack vertically (Split collapses). `stats-row` 2 columns. `detail-grid` 2 columns. |
| `mobile` (0-767px) | All zones stack vertically. `stats-row` 1 column (horizontal scroll carousel). `detail-grid` 1 column. |

**Navigation integration**: Renders inside the Navigation Engine's content area. `page-header` sits below the breadcrumb (if breadcrumbs enabled).

**Default organisms**:
- `page-header`: `Toolbar` with title Typography + date range DatePicker + IconButton(refresh).
- `stats-row`: 4x `MetricCard`.
- `primary-chart`: Custom chart component (not a Prism primitive; consumer provides).
- `secondary-content`: `ListView` with recent activity items.
- `detail-grid`: 3x `Card` organisms with custom content.

**Example YAML composition**:
```yaml
page:
  template: Dashboard
  zones:
    page-header:
      organism: Toolbar
      props:
        title: "Sales Dashboard"
        actions:
          - { type: "date-range", field: "period", default: "last-30-days" }
          - { label: "Export", variant: "ghost", icon: "download" }

    stats-row:
      organism: StatsRow
      props:
        metrics:
          - { label: "Revenue", value: "bind:metrics.revenue", format: "currency", trend: "bind:metrics.revenueTrend" }
          - { label: "Orders", value: "bind:metrics.orders", format: "number", trend: "bind:metrics.ordersTrend" }
          - { label: "Customers", value: "bind:metrics.customers", format: "number" }
          - { label: "Conversion", value: "bind:metrics.conversion", format: "percent" }

    primary-chart:
      component: RevenueChart
      props:
        data: "api:/analytics/revenue"
        period: "bind:filters.period"

    secondary-content:
      organism: ListView
      props:
        data: "api:/activity/recent"
        itemRenderer: "ActivityItem"
        maxItems: 10

    detail-grid:
      organism: CardGrid
      props:
        items:
          - { title: "Top Products", content: "TopProductsList" }
          - { title: "Regional Breakdown", content: "RegionChart" }
          - { title: "Team Performance", content: "TeamTable" }
```

---

### 6.2.2 List

**Purpose**: Displays a filterable, sortable collection of records with pagination and bulk actions.

**Typical use cases**: Contacts, orders, products, users, invoices, tickets, any CRUD list.

**Zone map** (desktop/wide):
```
+------------------------------------------------------------------+
|                        [page-header]                               |
|  Title + "Add New" button + bulk actions                          |
+------------------------------------------------------------------+
|  [filter-bar]                                                     |
|  SearchBar | Filter1 | Filter2 | Filter3 | Clear                 |
+------------------------------------------------------------------+
|  [content]                                                        |
|  DataTable (or CardGrid)                                          |
|  ┌────────────────────────────────────────────────────────────┐   |
|  │ □  Name         Email            Status    Created   ···   │   |
|  │ □  John Doe     john@...         Active    Jan 1     ···   │   |
|  │ □  Jane Smith   jane@...         Inactive  Feb 15    ···   │   |
|  │ ...                                                        │   |
|  └────────────────────────────────────────────────────────────┘   |
+------------------------------------------------------------------+
|  [footer]                                                         |
|  "Showing 1-25 of 142"                | < 1 2 3 4 5 6 >          |
+------------------------------------------------------------------+
```

**Zone schemas**:

| Zone | Content Type | Layout | Sticky | Description |
|------|-------------|--------|--------|-------------|
| `page-header` | `actions` | `Row(justify: "between", align: "center")` | no | Title + primary action (Add/Create) + optional bulk actions. |
| `filter-bar` | `any` | `Row(gap: 12, wrap: true)` | no | Search + column filters + clear button. |
| `content` | `data` | `VStack` | no | DataTable engine (primary) or CardGrid organism. |
| `footer` | `any` | `Row(justify: "between", align: "center")` | no | Result count + Pagination. |

**Responsive transformations**:

| Breakpoint | Transformation |
|------------|---------------|
| `wide` (1440px+) | Full layout as shown. All filter controls visible. |
| `desktop` (1024-1439px) | Same as wide. Filter controls wrap if more than 5. |
| `tablet` (768-1023px) | `filter-bar` collapses to SearchBar + "Filters" button (opens FilterPanel in SlideOver). DataTable hides low-priority columns. |
| `mobile` (0-767px) | `filter-bar` becomes SearchBar only + filter icon button. `content` switches from DataTable to card list (per DataTable responsive contract). `footer` pagination becomes "Load more" button. |

**Navigation integration**: Renders inside navigation content area. Breadcrumb shows: Home > {Section} (e.g., "Home > Contacts").

**Default organisms**:
- `page-header`: `Toolbar` with title + primary Button("Add {Entity}").
- `filter-bar`: `SearchBar` + `FilterPanel` (inline or slide-over based on breakpoint).
- `content`: `DataTable` engine.
- `footer`: Text("Showing {start}-{end} of {total}") + `Pagination`.

**Example YAML composition**:
```yaml
page:
  template: List
  zones:
    page-header:
      organism: Toolbar
      props:
        title: "Contacts"
        actions:
          - { label: "Add Contact", variant: "primary", icon: "plus", onClick: "navigate:/contacts/new" }

    filter-bar:
      organism: FilterPanel
      props:
        search: { placeholder: "Search contacts...", fields: ["name", "email"] }
        filters:
          - { field: "status", type: "select", options: ["Active", "Inactive", "Archived"] }
          - { field: "department", type: "select", source: "api:/departments" }
          - { field: "created", type: "dateRange" }

    content:
      engine: DataTable
      props:
        data: "api:/contacts"
        columns:
          - { field: "name", header: "Name", sortable: true, pinned: "left" }
          - { field: "email", header: "Email", sortable: true }
          - { field: "status", header: "Status", filterable: true, renderer: "StatusBadge" }
          - { field: "department", header: "Department" }
          - { field: "created", header: "Created", sortable: true, renderer: "DateCell" }
        selection: { enabled: true, mode: "multi" }
        bulkActions:
          - { label: "Export", icon: "download", variant: "ghost" }
          - { label: "Delete", icon: "trash", variant: "destructive", confirmMessage: "Delete selected contacts?" }

    footer:
      organism: Pagination
      props:
        totalCount: "bind:contacts.totalCount"
        pageSizeOptions: [25, 50, 100]
```

---

### 6.2.3 Detail

**Purpose**: Displays comprehensive information about a single record with tabbed sections.

**Typical use cases**: Contact detail, order detail, product detail, user profile, ticket detail.

**Zone map** (desktop/wide):
```
+------------------------------------------------------------------+
|  [detail-header]                                                  |
|  ← Back | Avatar/Icon + Title + Status badge + Actions            |
+------------------------------------------------------------------+
|  [tab-bar]                                                        |
|  Overview | Activity | Documents | Settings                       |
+------------------------------------------------------------------+
|  [tab-content]                       |  [side-panel]              |
|                                      |                            |
|  Content for active tab              |  Related info, quick       |
|  (forms, lists, custom content)      |  actions, metadata         |
|                                      |                            |
+------------------------------------------------------------------+
```

**Zone schemas**:

| Zone | Content Type | Layout | Description |
|------|-------------|--------|-------------|
| `detail-header` | `any` | `Row(justify: "between", align: "center")` | Entity identity (avatar + name + status) + action buttons (Edit, Delete, etc.). |
| `tab-bar` | `navigation` | `Row` | Tab navigation for content sections. |
| `tab-content` | `any` | `VStack` | Content area that changes based on active tab. |
| `side-panel` | `any` | `VStack(gap: section.gap)` | Complementary information (metadata, related records, quick actions). |

**Responsive transformations**:

| Breakpoint | Transformation |
|------------|---------------|
| `wide` (1440px+) | Full layout. `tab-content` and `side-panel` in Split(ratio: "3:1"). |
| `desktop` (1024-1439px) | Same as wide. Split ratio "2:1". |
| `tablet` (768-1023px) | `side-panel` collapses below `tab-content` (Split collapses to VStack). |
| `mobile` (0-767px) | `detail-header` actions move to overflow menu (IconButton with dropdown). `tab-bar` becomes horizontally scrollable. `side-panel` hidden, accessible via "More Info" button at bottom of `tab-content`. |

**Navigation integration**: Breadcrumb shows: Home > {Section} > {Record Name} (e.g., "Home > Contacts > John Doe"). Back button navigates to parent list.

**Default organisms**:
- `detail-header`: `Row` with back IconButton + Avatar + Typography(title) + Badge(status) + action Buttons.
- `tab-bar`: `Tab` molecule.
- `tab-content`: Varies per tab (Form for "Overview", ListView for "Activity", CardGrid for "Documents").
- `side-panel`: `VStack` of `SettingsSection`-like blocks (metadata key-value pairs, related record links, quick action buttons).

**Example YAML composition**:
```yaml
page:
  template: Detail
  zones:
    detail-header:
      organism: Toolbar
      props:
        back: { path: "/contacts" }
        avatar: { src: "bind:contact.avatar", fallback: "bind:contact.initials" }
        title: "bind:contact.name"
        badge: { label: "bind:contact.status", variant: "bind:contact.statusVariant" }
        actions:
          - { label: "Edit", variant: "secondary", onClick: "navigate:/contacts/{id}/edit" }
          - { label: "Delete", variant: "destructive", confirmMessage: "Delete this contact?" }

    tab-bar:
      organism: Tab
      props:
        tabs:
          - { id: "overview", label: "Overview" }
          - { id: "activity", label: "Activity", badge: { type: "count", value: "bind:contact.activityCount" } }
          - { id: "documents", label: "Documents" }
          - { id: "settings", label: "Settings" }

    tab-content:
      engine: conditional
      props:
        activeTab: "bind:activeTab"
        panels:
          overview:
            engine: Form
            props: { fields: "bind:contact.fields", readOnly: true }
          activity:
            organism: ListView
            props: { data: "api:/contacts/{id}/activity", itemRenderer: "ActivityItem" }
          documents:
            organism: CardGrid
            props: { data: "api:/contacts/{id}/documents", itemRenderer: "DocumentCard" }
          settings:
            engine: Form
            props: { fields: "bind:contact.settingsFields" }

    side-panel:
      organism: VStack
      props:
        sections:
          - { title: "Details", content: "MetadataList", data: "bind:contact.metadata" }
          - { title: "Related", content: "RelatedRecords", data: "api:/contacts/{id}/related" }
          - { title: "Quick Actions", content: "ActionButtons", actions: ["Send Email", "Schedule Call"] }
```

---

### 6.2.4 Form

**Purpose**: Dedicated page for creating or editing a record with structured form sections.

**Typical use cases**: Create contact, edit order, new product, profile settings, registration.

**Zone map** (desktop/wide):
```
+------------------------------------------------------------------+
|  [form-header]                                                    |
|  ← Back | "Create Contact" | Cancel + Save buttons                |
+------------------------------------------------------------------+
|  [form-content]                                                   |
|  ┌──────────────────────────────────────────────────────────────┐ |
|  │  Section: Basic Information                                   │ |
|  │  [field] [field]                                              │ |
|  │  [field] [field]                                              │ |
|  │                                                               │ |
|  │  Section: Contact Details                                     │ |
|  │  [field] [field]                                              │ |
|  │  [field]                                                      │ |
|  └──────────────────────────────────────────────────────────────┘ |
+------------------------------------------------------------------+
|  [form-actions]                                                   |
|  [Cancel]                              [Save Draft] [Save]        |
+------------------------------------------------------------------+
```

**Zone schemas**:

| Zone | Content Type | Layout | Sticky | Description |
|------|-------------|--------|--------|-------------|
| `form-header` | `actions` | `Row(justify: "between", align: "center")` | yes (top) | Back navigation + form title + inline action buttons. |
| `form-content` | `form` | `VStack(gap: section.gap)` | no | Form Engine content with sections. |
| `form-actions` | `actions` | `Row(justify: "between", align: "center")` | yes (bottom) | Cancel + secondary actions (left) + primary submit (right). |

**Responsive transformations**:

| Breakpoint | Transformation |
|------------|---------------|
| `wide` (1440px+) | `form-content` centered with `maxWidth: 720px`. Two-column field layout within form. |
| `desktop` (1024-1439px) | Same as wide. `maxWidth: 640px`. |
| `tablet` (768-1023px) | Single-column field layout. Form fills available width with padding. |
| `mobile` (0-767px) | Single-column. `form-header` shows only title (actions in `form-actions`). `form-actions` fixed to bottom of viewport. |

**Navigation integration**: Breadcrumb shows: Home > {Section} > Create/Edit {Entity}. Back button returns to list (with unsaved changes warning if dirty).

**Default organisms**:
- `form-header`: Back IconButton + Typography(title) + Button("Cancel") + Button("Save", primary).
- `form-content`: `Form` engine.
- `form-actions`: Button("Cancel", ghost) + Button("Save Draft", secondary) + Button("Save", primary).

**Example YAML composition**:
```yaml
page:
  template: Form
  zones:
    form-header:
      organism: Toolbar
      props:
        back: { path: "/contacts" }
        title: "Create Contact"

    form-content:
      engine: Form
      props:
        layout: "two-column"
        fields:
          - { name: "firstName", type: "text", label: "First Name", required: true, span: 1 }
          - { name: "lastName", type: "text", label: "Last Name", required: true, span: 1 }
          - { name: "email", type: "email", label: "Email", required: true, span: 2 }
          - { name: "phone", type: "phone", label: "Phone", span: 1 }
          - { name: "department", type: "select", label: "Department", options: "api:/departments", span: 1 }
          - { name: "notes", type: "textarea", label: "Notes", span: 2, rows: 4 }
        onSubmit: "api:POST /contacts"

    form-actions:
      organism: DialogActions
      props:
        cancel: { label: "Cancel", onClick: "navigate:/contacts" }
        secondary: { label: "Save Draft", onClick: "saveDraft" }
        primary: { label: "Create Contact", type: "submit" }
```

---

### 6.2.5 Settings

**Purpose**: Application or entity settings with categorized sections and a settings navigation sidebar.

**Typical use cases**: App settings, account settings, organization settings, integration configuration.

**Zone map** (desktop/wide):
```
+------------------------------------------------------------------+
|  [settings-header]                                                |
|  "Settings"                                                       |
+-------------------+----------------------------------------------+
|  [settings-nav]   |  [settings-content]                           |
|                   |                                               |
|  General          |  Section: General                             |
|  Notifications    |  ┌─────────────────────────────────────────┐  |
|  Security         |  │ Theme        [Light ▼]                  │  |
|  Integrations     |  │ Language     [English ▼]                 │  |
|  Billing          |  │ Timezone     [UTC+8 ▼]                   │  |
|                   |  └─────────────────────────────────────────┘  |
|                   |                                               |
|                   |  Section: Display                             |
|                   |  ┌─────────────────────────────────────────┐  |
|                   |  │ Compact mode  [toggle]                   │  |
|                   |  │ Show avatars  [toggle]                   │  |
|                   |  └─────────────────────────────────────────┘  |
+-------------------+----------------------------------------------+
```

**Zone schemas**:

| Zone | Content Type | Layout | Description |
|------|-------------|--------|-------------|
| `settings-header` | `actions` | `Row(align: "center")` | Page title. Optionally includes save indicator. |
| `settings-nav` | `navigation` | `VStack(gap: 4)` | Settings category navigation. |
| `settings-content` | `form` | `VStack(gap: section.gap)` | Settings sections with form fields and toggles. |

**Responsive transformations**:

| Breakpoint | Transformation |
|------------|---------------|
| `wide` (1440px+) | Split layout: `settings-nav` (220px fixed) + `settings-content`. |
| `desktop` (1024-1439px) | Same as wide: `settings-nav` (200px) + `settings-content`. |
| `tablet` (768-1023px) | `settings-nav` collapses to horizontal tab bar above `settings-content`. Scrollable tabs if many categories. |
| `mobile` (0-767px) | `settings-nav` becomes a Select dropdown at the top. Selected category shows its content below. |

**Navigation integration**: Breadcrumb: Home > Settings > {Category}. Settings nav is internal to the template (not the global navigation sidebar).

**Default organisms**:
- `settings-header`: Typography("Settings").
- `settings-nav`: `VStack` of NavItem molecules (one per category).
- `settings-content`: Multiple `SettingsSection` organisms, each containing FormFields or Toggles.

**Example YAML composition**:
```yaml
page:
  template: Settings
  zones:
    settings-header:
      organism: Toolbar
      props:
        title: "Settings"

    settings-nav:
      organism: SettingsNav
      props:
        categories:
          - { id: "general", label: "General", icon: "settings" }
          - { id: "notifications", label: "Notifications", icon: "bell" }
          - { id: "security", label: "Security", icon: "shield" }
          - { id: "integrations", label: "Integrations", icon: "plug" }

    settings-content:
      organism: SettingsSections
      props:
        sections:
          - title: "General"
            fields:
              - { name: "theme", type: "select", label: "Theme", options: ["Light", "Dark", "System"] }
              - { name: "language", type: "select", label: "Language", options: "api:/locales" }
              - { name: "timezone", type: "select", label: "Timezone", options: "api:/timezones" }
          - title: "Display"
            fields:
              - { name: "compactMode", type: "toggle", label: "Compact mode", helpText: "Reduce spacing between elements" }
              - { name: "showAvatars", type: "toggle", label: "Show avatars", helpText: "Display user avatars in lists" }
```

---

### 6.2.6 Auth

**Purpose**: Authentication pages (login, register, forgot password) with centered card and branding.

**Typical use cases**: Login, sign up, forgot password, reset password, verify email, two-factor authentication.

**Zone map** (all breakpoints):
```
+------------------------------------------------------------------+
|                                                                    |
|                         [branding]                                 |
|                      Logo + App name                               |
|                                                                    |
|                   +---------------------+                          |
|                   |   [auth-card]       |                          |
|                   |                     |                          |
|                   |   Title             |                          |
|                   |   Subtitle          |                          |
|                   |                     |                          |
|                   |   [email field]     |                          |
|                   |   [password field]  |                          |
|                   |                     |                          |
|                   |   [Sign In]         |                          |
|                   |                     |                          |
|                   |   Forgot password?  |                          |
|                   +---------------------+                          |
|                                                                    |
|                         [auth-footer]                              |
|                   Don't have an account? Sign up                   |
|                                                                    |
+------------------------------------------------------------------+
```

**Zone schemas**:

| Zone | Content Type | Layout | Max Width | Description |
|------|-------------|--------|-----------|-------------|
| `branding` | `media` | `VStack(align: "center")` | -- | Logo image + app name. Centered above card. |
| `auth-card` | `form` | `VStack(gap: component.gap, padding: component.padding)` | 400px | The form card: title, fields, submit, links. |
| `auth-footer` | `any` | `VStack(align: "center")` | -- | Alternative action link (switch between login/register). |

**Responsive transformations**:

| Breakpoint | Transformation |
|------------|---------------|
| `wide` (1440px+) | Card centered on page. Optional: split layout with branding illustration on left (50%) and card on right (50%). |
| `desktop` (1024-1439px) | Card centered. Max width 400px. |
| `tablet` (768-1023px) | Card centered. Max width 400px. |
| `mobile` (0-767px) | Card fills viewport width (minus page margins). No max-width constraint. `branding` may hide logo (show only app name) to save vertical space. |

**Navigation integration**: Auth pages do NOT render inside the Navigation Engine. They are standalone — no sidebar, no header, no breadcrumbs.

**Default organisms**:
- `branding`: Image(logo) + Typography(app name).
- `auth-card`: Typography(title) + Typography(subtitle) + Form engine (email + password fields) + Button(submit) + Link(forgot password).
- `auth-footer`: Typography + Link (switch auth mode).

**Example YAML composition**:
```yaml
page:
  template: Auth
  variant: "login"
  zones:
    branding:
      organism: Branding
      props:
        logo: "/assets/logo.svg"
        appName: "Acme Platform"

    auth-card:
      engine: Form
      props:
        title: "Sign in"
        subtitle: "Enter your credentials to continue"
        fields:
          - { name: "email", type: "email", label: "Email", required: true, placeholder: "you@company.com" }
          - { name: "password", type: "password", label: "Password", required: true }
          - { name: "remember", type: "checkbox", label: "Remember me" }
        onSubmit: "api:POST /auth/login"
        submitLabel: "Sign In"
        links:
          - { label: "Forgot password?", path: "/auth/forgot-password", position: "below-submit" }

    auth-footer:
      organism: AuthFooter
      props:
        text: "Don't have an account?"
        link: { label: "Sign up", path: "/auth/register" }
```

---

### 6.2.7 Conversation

**Purpose**: AI chat interface with conversation history, message stream, and auxiliary panels.

**Typical use cases**: AI assistant, support chat, customer service, knowledge base Q&A, code generation assistant.

**Zone map** (desktop/wide):
```
+------------------+----------------------------------+--------------+
|  [conv-sidebar]  |  [chat-header]                   | [info-panel] |
|                  +----------------------------------+              |
|  Conversations   |  [message-area]                  |  Citations   |
|  ┌────────────┐  |                                  |  or context  |
|  │ Today      │  |  [assistant message]             |  or tools    |
|  │  Chat 1    │  |  [user message]                  |              |
|  │  Chat 2    │  |  [assistant message]             |              |
|  │ Yesterday  │  |  [streaming...]                  |              |
|  │  Chat 3    │  |                                  |              |
|  └────────────┘  +----------------------------------+              |
|                  |  [chat-input]                     |              |
|                  |  [input area + send]              |              |
+------------------+----------------------------------+--------------+
```

**Zone schemas**:

| Zone | Content Type | Layout | Width | Description |
|------|-------------|--------|-------|-------------|
| `conv-sidebar` | `navigation` | `VStack` | 320px (wide), 260px (desktop) | Conversation list + search + new conversation button. |
| `chat-header` | `actions` | `Row(justify: "between")` | fill | Conversation title + action buttons (search, settings). |
| `message-area` | `chat` | `Scroll(direction: "vertical")` | fill | Message list with virtual scrolling. |
| `chat-input` | `chat` | `VStack` | fill | Input area + suggestion chips. |
| `info-panel` | `any` | `VStack` | 380px (wide), 280px (desktop) | Citation panel, tool results, or contextual info. |

**Responsive transformations**:

| Breakpoint | Transformation |
|------------|---------------|
| `wide` (1440px+) | Three-column: sidebar (320px) + chat + info-panel (380px). |
| `desktop` (1024-1439px) | Three-column: sidebar (260px) + chat + info-panel (280px). Info-panel togglable (hidden by default, shown on citation click). |
| `tablet` (768-1023px) | Two-column: sidebar as icon rail (60px) + chat. Info-panel as slide-over from right. |
| `mobile` (0-767px) | Single column: chat only. Sidebar as drawer (hamburger). Info-panel as bottom sheet. `chat-input` fixed to bottom. |

**Navigation integration**: Conversation template typically IS the main page. If used within a larger app, it renders inside navigation content area. The `conv-sidebar` replaces (does not duplicate) the main navigation sidebar for conversation management.

**Default organisms**:
- `conv-sidebar`: AI Chat Engine's `ConversationSidebar`.
- `chat-header`: Typography(title) + IconButton(search) + IconButton(settings).
- `message-area`: AI Chat Engine's message list.
- `chat-input`: AI Chat Engine's input area + suggestion chips.
- `info-panel`: AI Chat Engine's `CitationPanel`.

**Example YAML composition**:
```yaml
page:
  template: Conversation
  zones:
    conv-sidebar:
      engine: Chat
      section: conversationList
      props:
        source: "api:/conversations"
        groupBy: "date"

    chat-header:
      engine: Chat
      section: header
      props:
        title: "bind:conversation.title"
        actions: ["search", "settings"]

    message-area:
      engine: Chat
      section: messages
      props:
        endpoint: "wss://api.example.com/chat"
        protocol: "websocket"
        features:
          citations: true
          toolCalls: true
          actionPlans: true
          suggestions: true

    chat-input:
      engine: Chat
      section: input
      props:
        placeholder: "Ask anything..."
        attachments: true
        sources:
          - { id: "all", label: "All Sources" }
          - { id: "docs", label: "Documentation" }
          - { id: "code", label: "Codebase" }

    info-panel:
      engine: Chat
      section: citations
```

---

### 6.2.8 Split

**Purpose**: Master-detail layout where selecting an item in one panel shows its detail in the adjacent panel.

**Typical use cases**: Email client, CRM contact view, file manager, chat with detail, ticket management.

**Zone map** (desktop/wide):
```
+------------------------------------------------------------------+
|  [split-header]                                                   |
|  Title + actions                                                  |
+--------------------------+---------------------------------------+
|  [master-panel]          |  [detail-panel]                        |
|                          |                                        |
|  List of items           |  Selected item detail                  |
|  ┌────────────────────┐  |  ┌─────────────────────────────────┐   |
|  │ ● Item 1 (active)  │  |  │  Item 1 Header                  │   |
|  │   Item 2           │  |  │                                  │   |
|  │   Item 3           │  |  │  Content...                      │   |
|  │   Item 4           │  |  │                                  │   |
|  └────────────────────┘  |  └─────────────────────────────────┘   |
+--------------------------+---------------------------------------+
```

**Zone schemas**:

| Zone | Content Type | Layout | Width | Description |
|------|-------------|--------|-------|-------------|
| `split-header` | `actions` | `Row(justify: "between")` | full | Page title + global actions. |
| `master-panel` | `data` | `VStack` | 320px (fixed) | Selectable list of items. |
| `detail-panel` | `any` | `VStack` | fill (remaining) | Detail view of selected item. |

**Responsive transformations**:

| Breakpoint | Transformation |
|------------|---------------|
| `wide` (1440px+) | Split: master (360px) + detail (fill). Resizable divider. |
| `desktop` (1024-1439px) | Split: master (320px) + detail (fill). Resizable divider. |
| `tablet` (768-1023px) | Split: master (280px) + detail (fill). Non-resizable. |
| `mobile` (0-767px) | **Stacked navigation**: Shows master list full-width. Selecting an item navigates to detail view full-width with back button. No simultaneous view. |

**Navigation integration**: Renders inside navigation content area. On mobile, the detail panel acts as a sub-route (pushes onto navigation stack).

**Default organisms**:
- `split-header`: `Toolbar` with title.
- `master-panel`: `ListView` with selectable items.
- `detail-panel`: `Detail` template content (header + tabs/content) or custom organism.

**Example YAML composition**:
```yaml
page:
  template: Split
  zones:
    split-header:
      organism: Toolbar
      props:
        title: "Inbox"
        actions:
          - { label: "Compose", variant: "primary", icon: "edit" }
          - { label: "Refresh", variant: "ghost", icon: "refresh" }

    master-panel:
      organism: ListView
      props:
        data: "api:/emails"
        itemRenderer: "EmailListItem"
        selectable: true
        selectedId: "bind:selectedEmail.id"
        onSelect: "setSelectedEmail"

    detail-panel:
      organism: EmailDetail
      props:
        email: "bind:selectedEmail"
        emptyState: { icon: "mail", message: "Select an email to view" }
```

---

### 6.2.9 Wizard

**Purpose**: Multi-step guided process with progress indicator and step validation.

**Typical use cases**: Onboarding, multi-step form, checkout, setup guide, import process.

**Zone map** (desktop/wide):
```
+------------------------------------------------------------------+
|  [wizard-header]                                                  |
|  Title + "Step 2 of 4" + close/cancel                            |
+------------------------------------------------------------------+
|  [step-indicator]                                                 |
|  ○ Account ─── ● Details ─── ○ Preferences ─── ○ Review          |
+------------------------------------------------------------------+
|  [step-content]                                                   |
|  ┌──────────────────────────────────────────────────────────────┐ |
|  │                                                               │ |
|  │  Current step form/content                                    │ |
|  │                                                               │ |
|  │                                                               │ |
|  └──────────────────────────────────────────────────────────────┘ |
+------------------------------------------------------------------+
|  [wizard-nav]                                                     |
|  [← Previous]                                         [Next →]    |
+------------------------------------------------------------------+
```

**Zone schemas**:

| Zone | Content Type | Layout | Description |
|------|-------------|--------|-------------|
| `wizard-header` | `actions` | `Row(justify: "between", align: "center")` | Title + step counter + cancel/close button. |
| `step-indicator` | `steps` | `Row(justify: "center")` | Visual progress indicator (horizontal steps with connectors). |
| `step-content` | `form` | `VStack` | Content for the current step (usually a form section). |
| `wizard-nav` | `actions` | `Row(justify: "between")` | Previous/Next/Finish buttons. |

**Responsive transformations**:

| Breakpoint | Transformation |
|------------|---------------|
| `wide` (1440px+) | Full layout. `step-content` max-width 720px, centered. Horizontal step indicator with labels. |
| `desktop` (1024-1439px) | Same as wide. Max-width 640px. |
| `tablet` (768-1023px) | Horizontal step indicator with icons only (no labels). Full-width step content. |
| `mobile` (0-767px) | Step indicator collapses to "Step {n} of {total}" text + progress bar. `wizard-nav` buttons fixed to bottom. Swipe gesture to navigate between steps (in addition to buttons). |

**Navigation integration**: Wizards MAY render as full page (inside navigation) or as modal overlay (no navigation). When full page, breadcrumb shows: Home > {Process Name}. Cancel button navigates back.

**Default organisms**:
- `wizard-header`: Typography(title) + Typography("Step {n} of {total}") + IconButton(close).
- `step-indicator`: `StepIndicator` molecule (horizontal).
- `step-content`: `Form` engine (configured per step).
- `wizard-nav`: Button("Previous", ghost) + Button("Next", primary) or Button("Finish", primary) on last step.

**Example YAML composition**:
```yaml
page:
  template: Wizard
  zones:
    wizard-header:
      organism: Toolbar
      props:
        title: "Create Account"
        cancel: { label: "Cancel", onClick: "navigate:/" }

    step-indicator:
      organism: StepIndicator
      props:
        steps:
          - { id: "account", label: "Account" }
          - { id: "profile", label: "Profile" }
          - { id: "preferences", label: "Preferences" }
          - { id: "review", label: "Review" }
        currentStep: "bind:wizard.currentStep"

    step-content:
      engine: Form
      props:
        steps:
          - id: "account"
            title: "Account Details"
            fields:
              - { name: "email", type: "email", label: "Email", required: true }
              - { name: "password", type: "password", label: "Password", required: true }
          - id: "profile"
            title: "Your Profile"
            fields:
              - { name: "name", type: "text", label: "Full Name", required: true }
              - { name: "avatar", type: "file", label: "Profile Photo", accept: ["image/*"] }
          - id: "preferences"
            title: "Preferences"
            fields:
              - { name: "theme", type: "radio", label: "Theme", options: ["Light", "Dark", "System"] }
              - { name: "notifications", type: "checkbox-group", label: "Notifications", options: ["Email", "Push", "SMS"] }
          - id: "review"
            title: "Review"
            readOnly: true

    wizard-nav:
      organism: WizardNav
      props:
        onPrevious: "wizard.previousStep"
        onNext: "wizard.nextStep"
        onFinish: "api:POST /accounts"
        finishLabel: "Create Account"
```

---

### 6.2.10 Kanban

**Purpose**: Column-based board for managing items through stages with drag-and-drop.

**Typical use cases**: Project boards, sales pipelines, recruitment stages, content workflows, task management.

**Zone map** (desktop/wide):
```
+------------------------------------------------------------------+
|  [board-header]                                                   |
|  Title + filter + "Add Column" + view toggle                      |
+------------------------------------------------------------------+
|  [board-columns]                                                  |
|  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐             |
|  │ To Do   │  │ In Prog │  │ Review  │  │ Done    │             |
|  │ (5)     │  │ (3)     │  │ (2)     │  │ (8)     │             |
|  ├─────────┤  ├─────────┤  ├─────────┤  ├─────────┤             |
|  │ ┌─────┐ │  │ ┌─────┐ │  │ ┌─────┐ │  │ ┌─────┐ │             |
|  │ │Card │ │  │ │Card │ │  │ │Card │ │  │ │Card │ │             |
|  │ └─────┘ │  │ └─────┘ │  │ └─────┘ │  │ └─────┘ │             |
|  │ ┌─────┐ │  │ ┌─────┐ │  │ ┌─────┐ │  │ ┌─────┐ │             |
|  │ │Card │ │  │ │Card │ │  │ │Card │ │  │ │Card │ │             |
|  │ └─────┘ │  │ └─────┘ │  │ └─────┘ │  │ └─────┘ │             |
|  │ + Add   │  │ + Add   │  │         │  │         │             |
|  └─────────┘  └─────────┘  └─────────┘  └─────────┘             |
+------------------------------------------------------------------+
```

**Zone schemas**:

| Zone | Content Type | Layout | Description |
|------|-------------|--------|-------------|
| `board-header` | `actions` | `Row(justify: "between", align: "center")` | Title + filters + column management + view toggle (board/list). |
| `board-columns` | `data` | `Scroll(direction: "horizontal")` containing `Row(gap: 16, align: "start")` | Horizontally scrollable row of columns, each containing a scrollable list of cards. |

**Column schema** (within `board-columns`):
```typescript
interface KanbanColumn {
  id: string;
  title: string;
  color?: string;         // Accent color for column header (token reference).
  maxItems?: number;      // WIP limit. Shows warning when exceeded.
  items: KanbanCard[];
  addEnabled?: boolean;   // Show "Add item" button at bottom. Default: true.
}

interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  labels?: { text: string; color: string }[];
  assignee?: { name: string; avatar: string };
  dueDate?: string;
  priority?: "low" | "medium" | "high" | "critical";
  attachmentCount?: number;
  commentCount?: number;
}
```

**Responsive transformations**:

| Breakpoint | Transformation |
|------------|---------------|
| `wide` (1440px+) | All columns visible (horizontal scroll if > 5 columns). Column width: 280px. |
| `desktop` (1024-1439px) | All columns visible. Column width: 260px. Horizontal scroll if needed. |
| `tablet` (768-1023px) | Columns horizontally scrollable. Column width: 280px. Snap scroll to column edges. |
| `mobile` (0-767px) | **Single column view**: Horizontal swipe between columns with column title + count as header. Or toggle to list view (all items sorted by column with column headers as dividers). |

**Navigation integration**: Renders inside navigation content area. Breadcrumb: Home > {Board Name}.

**Default organisms**:
- `board-header`: `Toolbar` with title + filter controls + Button("Add Column") + ToggleGroup(["Board", "List"]).
- `board-columns`: Custom kanban column components with drag-and-drop cards.

**Example YAML composition**:
```yaml
page:
  template: Kanban
  zones:
    board-header:
      organism: Toolbar
      props:
        title: "Project Board"
        actions:
          - { type: "filter", field: "assignee", source: "api:/team" }
          - { type: "filter", field: "priority", options: ["Low", "Medium", "High", "Critical"] }
          - { label: "Add Column", variant: "ghost", icon: "plus" }
        viewToggle: { options: ["board", "list"], default: "board" }

    board-columns:
      organism: KanbanBoard
      props:
        data: "api:/boards/{id}/columns"
        onCardMove: "api:PATCH /cards/{cardId}"
        onCardClick: "openSlideOver:CardDetail"
        cardRenderer: "TaskCard"
        columnProps:
          addEnabled: true
          onAdd: "openModal:CreateTask"
```

---

### 6.2.11 Calendar

**Purpose**: Time-based view for events and scheduling with day/week/month views and event detail.

**Typical use cases**: Scheduling, event management, booking, resource allocation, content calendar.

**Zone map** (desktop/wide):
```
+------------------------------------------------------------------+
|  [calendar-header]                                                |
|  ← → Today | "March 2026" | Day Week Month | + New Event         |
+------------------------------------------------------------------+
|  [calendar-grid]                     |  [event-detail]            |
|  ┌─────────────────────────────────┐ |                            |
|  │  Mon  Tue  Wed  Thu  Fri  S  S  │ |  Selected event detail    |
|  │ ┌───┐┌───┐┌───┐┌───┐┌───┐...   │ |  or day's event list      |
|  │ │   ││   ││ ● ││   ││   │      │ |                            |
|  │ │   ││   ││ ● ││   ││ ● │      │ |  ┌──────────────────────┐ |
|  │ │   ││ ● ││   ││   ││   │      │ |  │ Meeting title        │ |
|  │ └───┘└───┘└───┘└───┘└───┘      │ |  │ 2:00 PM - 3:00 PM   │ |
|  │ ...                             │ |  │ Attendees: ...       │ |
|  └─────────────────────────────────┘ |  └──────────────────────┘ |
+------------------------------------------------------------------+
```

**Zone schemas**:

| Zone | Content Type | Layout | Description |
|------|-------------|--------|-------------|
| `calendar-header` | `actions` | `Row(justify: "between", align: "center")` | Navigation (prev/next/today) + current period label + view switcher + create button. |
| `calendar-grid` | `data` | `Grid` (varies by view) | The calendar visualization (month grid, week timeline, day timeline). |
| `event-detail` | `any` | `VStack` | Detail panel for selected event or selected day's events list. |

**Calendar views**:
- **Month**: 7-column grid showing days with event indicators (dots or truncated event bars).
- **Week**: 7-column timeline with hourly rows (7am-9pm). Events as positioned blocks.
- **Day**: Single-column timeline with hourly rows. Events as full-width blocks.

**Responsive transformations**:

| Breakpoint | Transformation |
|------------|---------------|
| `wide` (1440px+) | Split: calendar-grid (fill) + event-detail (320px). Full month/week/day grid. |
| `desktop` (1024-1439px) | Split: calendar-grid (fill) + event-detail (280px). Event-detail togglable. |
| `tablet` (768-1023px) | Calendar-grid full width. Event-detail as slide-over from right. Week view shows 5 days (Mon-Fri). |
| `mobile` (0-767px) | Month view: compact grid with dots only (no event text). Tapping a day shows day's events as list below the grid. Week view: 3-day rolling view with horizontal swipe. Event-detail as bottom sheet. |

**Navigation integration**: Renders inside navigation content area. Breadcrumb: Home > Calendar. Deep links to specific dates via URL params (e.g., `/calendar?view=week&date=2026-04-11`).

**Default organisms**:
- `calendar-header`: Button(prev) + Button(next) + Button("Today") + Typography(period) + ToggleGroup(["Day", "Week", "Month"]) + Button("New Event", primary).
- `calendar-grid`: Custom calendar grid component (month/week/day views).
- `event-detail`: Card with event title, time, description, attendees, actions (Edit, Delete).

**Example YAML composition**:
```yaml
page:
  template: Calendar
  zones:
    calendar-header:
      organism: CalendarToolbar
      props:
        views: ["day", "week", "month"]
        defaultView: "month"
        onNavigate: "calendar.navigate"
        actions:
          - { label: "New Event", variant: "primary", icon: "plus", onClick: "openModal:CreateEvent" }

    calendar-grid:
      organism: CalendarGrid
      props:
        events: "api:/events"
        view: "bind:calendar.view"
        date: "bind:calendar.date"
        onEventClick: "selectEvent"
        onDateClick: "selectDate"
        onEventDrag: "api:PATCH /events/{id}"
        eventRenderer: "EventBlock"

    event-detail:
      organism: EventDetail
      props:
        event: "bind:selectedEvent"
        emptyState: { icon: "calendar", message: "Select an event to view details" }
        actions:
          - { label: "Edit", variant: "secondary", onClick: "openModal:EditEvent" }
          - { label: "Delete", variant: "destructive", confirmMessage: "Delete this event?" }
```

---

## 6.3 Template Composition Rules

### 6.3.1 Template Selection

The agent selects a template based on the page's primary purpose:

| If the page is for... | Use template |
|-----------------------|-------------|
| Monitoring KPIs and trends | Dashboard |
| Browsing/searching a collection | List |
| Viewing a single record | Detail |
| Creating/editing data | Form |
| Managing preferences | Settings |
| Authentication flow | Auth |
| AI/chat interaction | Conversation |
| Master-detail navigation | Split |
| Multi-step guided process | Wizard |
| Stage-based workflow | Kanban |
| Time-based events | Calendar |

### 6.3.2 Zone Population Rules

1. Every zone defined in the template MUST be populated.
2. Content placed in a zone MUST match the zone's `content` type.
3. A zone MAY contain exactly one engine OR one organism OR one custom component. Multiple organisms within a single zone MUST be wrapped in a layout primitive (VStack/Row/Grid).
4. Zone content inherits the template's theme and spacing tokens.
5. Zone content MUST NOT break out of its zone boundaries (no absolute positioning that overlaps other zones).

### 6.3.3 Template Customization

Templates provide the structure; they are NOT rigid. Customization points:

- **Zone content**: Any organism/engine that matches the content type.
- **Zone visibility**: Override responsive visibility rules per instance.
- **Spacing overrides**: Override section-level spacing tokens per page.
- **Additional zones**: A template MAY be extended with additional zones by nesting layout primitives within an existing zone.
- **Template variants**: Auth template has "login", "register", "forgot-password" variants that pre-configure zone content differently.

### 6.3.4 Template Composition (Nested Templates)

Templates MUST NOT be nested within other templates. A page uses exactly one template. If a page needs multiple layout patterns (e.g., a dashboard with a detail slide-over), the detail is rendered in a `Layer` (modal/slide-over), not as a nested template.
