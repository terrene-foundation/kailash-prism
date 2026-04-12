/**
 * Speed Checkpoint: CRM Contacts Page
 *
 * Composes ALL 5 Prism engines into a single production-like page:
 * - Theme: enterprise tokens, dark mode toggle
 * - Layout: responsive breakpoints, VStack/Row/Grid
 * - Navigation: sidebar, breadcrumbs, routing
 * - DataTable: sort, filter, paginate, select, bulk actions
 * - Form: create-contact modal (validation, conditional fields, sections)
 */

import { createRoot } from 'react-dom/client';
import { useState, useCallback } from 'react';
import {
  ThemeProvider,
  useTheme,
  LayoutProvider,
  VStack,
  Row,
  Grid,
  AppShell,
  DataTable,
  Form,
  type ColumnDef,
  type FieldDef,
  type SectionDef,
  type RouteNode,
  type NavigationConfig,
  type ThemeTokenData,
  type BulkAction,
} from '@kailash/prism-web';

// ---------------------------------------------------------------------------
// Theme data (normally from compiler output; inline for checkpoint)
// ---------------------------------------------------------------------------

const enterpriseTheme: ThemeTokenData = {
  themes: {
    enterprise: {
      name: 'Enterprise Professional',
      light: {
        '--prism-color-interactive-primary': '#1E3A5F',
        '--prism-color-interactive-primary-hover': '#152C49',
        '--prism-color-interactive-primary-subtle': '#EFF6FF',
        '--prism-color-surface-page': '#FFFFFF',
        '--prism-color-surface-card': '#FFFFFF',
        '--prism-color-surface-elevated': '#F1F5F9',
        '--prism-color-surface-error': '#FEF2F2',
        '--prism-color-surface-success': '#F0FDF4',
        '--prism-color-text-primary': '#0F172A',
        '--prism-color-text-secondary': '#64748B',
        '--prism-color-text-disabled': '#94A3B8',
        '--prism-color-text-on-primary': '#FFFFFF',
        '--prism-color-border-default': '#E2E8F0',
        '--prism-color-border-subtle': '#F1F5F9',
        '--prism-color-status-error': '#DC2626',
        '--prism-color-status-success': '#16A34A',
        '--prism-color-status-warning': '#D97706',
        '--prism-color-status-info': '#2563EB',
      },
      dark: {
        '--prism-color-interactive-primary': '#60A5FA',
        '--prism-color-interactive-primary-hover': '#93C5FD',
        '--prism-color-interactive-primary-subtle': '#1E293B',
        '--prism-color-surface-page': '#0F172A',
        '--prism-color-surface-card': '#1E293B',
        '--prism-color-surface-elevated': '#334155',
        '--prism-color-surface-error': '#450A0A',
        '--prism-color-surface-success': '#052E16',
        '--prism-color-text-primary': '#F8FAFC',
        '--prism-color-text-secondary': '#94A3B8',
        '--prism-color-text-disabled': '#475569',
        '--prism-color-text-on-primary': '#0F172A',
        '--prism-color-border-default': '#334155',
        '--prism-color-border-subtle': '#1E293B',
        '--prism-color-status-error': '#EF4444',
        '--prism-color-status-success': '#22C55E',
        '--prism-color-status-warning': '#F59E0B',
        '--prism-color-status-info': '#3B82F6',
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Navigation config
// ---------------------------------------------------------------------------

const routes: RouteNode[] = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/contacts', label: 'Contacts', icon: '👥', badge: { type: 'count', value: 247 } },
  { path: '/companies', label: 'Companies', icon: '🏢' },
  { path: '/deals', label: 'Deals', icon: '💰', badge: { type: 'count', value: 12 } },
  { path: '/tasks', label: 'Tasks', icon: '✓', badge: { type: 'dot' } },
  { path: '/reports', label: 'Reports', icon: '📈', dividerBefore: true },
  { path: '/settings', label: 'Settings', icon: '⚙', position: 'bottom' },
];

const navConfig: NavigationConfig = {
  routes,
  style: 'sidebar',
  sidebar: {
    width: { collapsed: 56, expanded: 220 },
    showCollapseToggle: true,
  },
  breadcrumbs: { enabled: true, separator: '/' },
  activeMatch: 'prefix',
};

// ---------------------------------------------------------------------------
// Contact data
// ---------------------------------------------------------------------------

interface Contact {
  id: number;
  name: string;
  email: string;
  company: string;
  role: string;
  status: 'active' | 'inactive' | 'lead';
  lastContact: string;
  dealValue: number;
  [key: string]: unknown;
}

const contacts: Contact[] = Array.from({ length: 87 }, (_, i) => {
  const firstNames = ['Alice', 'Bob', 'Carol', 'David', 'Elena', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack'];
  const lastNames = ['Johnson', 'Smith', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Taylor'];
  const companies = ['Acme Corp', 'TechFlow Inc', 'DataVault', 'CloudPeak', 'NovaStar', 'Pinnacle Systems', 'Quantum Labs', 'Zenith AI'];
  const roles = ['CEO', 'CTO', 'VP Engineering', 'Director', 'Manager', 'Lead', 'Senior Engineer', 'Analyst'];
  const statuses: Contact['status'][] = ['active', 'inactive', 'lead'];

  return {
    id: i + 1,
    name: `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`,
    email: `${firstNames[i % firstNames.length]!.toLowerCase()}@${companies[i % companies.length]!.toLowerCase().replace(/\s+/g, '')}.com`,
    company: companies[i % companies.length]!,
    role: roles[i % roles.length]!,
    status: statuses[i % 3]!,
    lastContact: new Date(2026, 3, 12 - (i % 30)).toISOString().split('T')[0]!,
    dealValue: Math.floor(Math.random() * 500000) + 10000,
  };
});

// ---------------------------------------------------------------------------
// DataTable columns
// ---------------------------------------------------------------------------

const columns: ColumnDef<Contact>[] = [
  { field: 'name', header: 'Name', sortable: true, filterable: true },
  { field: 'email', header: 'Email', sortable: true, filterable: true },
  { field: 'company', header: 'Company', sortable: true, filterable: true, filterType: 'select',
    filterOptions: [...new Set(contacts.map(c => c.company))],
  },
  { field: 'role', header: 'Role', sortable: true },
  {
    field: 'status',
    header: 'Status',
    sortable: true,
    filterType: 'select',
    filterOptions: ['active', 'inactive', 'lead'],
    render: (value) => {
      const colors: Record<string, { bg: string; text: string }> = {
        active: { bg: 'var(--prism-color-surface-success, #F0FDF4)', text: 'var(--prism-color-status-success, #16A34A)' },
        inactive: { bg: 'var(--prism-color-surface-elevated, #F1F5F9)', text: 'var(--prism-color-text-disabled, #94A3B8)' },
        lead: { bg: '#EFF6FF', text: 'var(--prism-color-status-info, #2563EB)' },
      };
      const c = colors[value as string] ?? colors.active!;
      return (
        <span style={{
          padding: '2px 8px',
          borderRadius: 9999,
          fontSize: 12,
          fontWeight: 500,
          backgroundColor: c.bg,
          color: c.text,
        }}>
          {String(value)}
        </span>
      );
    },
  },
  {
    field: 'dealValue',
    header: 'Deal Value',
    sortable: true,
    align: 'right',
    render: (value) => `$${(value as number).toLocaleString()}`,
  },
];

const bulkActions: BulkAction<Contact>[] = [
  { label: 'Export', variant: 'primary', onExecute: (rows) => alert(`Exporting ${rows.length} contacts`) },
  { label: 'Delete', variant: 'destructive', onExecute: (rows) => alert(`Deleting ${rows.length} contacts`) },
];

// ---------------------------------------------------------------------------
// Create Contact Form
// ---------------------------------------------------------------------------

const formSections: SectionDef[] = [
  { name: 'basic', title: 'Basic Information' },
  { name: 'details', title: 'Details', collapsible: true },
];

const formFields: FieldDef[] = [
  { name: 'firstName', type: 'text', label: 'First Name', required: true, section: 'basic', span: 1 },
  { name: 'lastName', type: 'text', label: 'Last Name', required: true, section: 'basic', span: 1 },
  { name: 'email', type: 'email', label: 'Email', required: true, section: 'basic', span: 2,
    validation: [{ rule: 'email', message: 'Please enter a valid email address' }],
  },
  { name: 'company', type: 'text', label: 'Company', section: 'basic' },
  { name: 'role', type: 'select', label: 'Role', section: 'basic',
    options: [
      { value: 'ceo', label: 'CEO' },
      { value: 'cto', label: 'CTO' },
      { value: 'vp', label: 'VP Engineering' },
      { value: 'director', label: 'Director' },
      { value: 'manager', label: 'Manager' },
      { value: 'engineer', label: 'Engineer' },
      { value: 'other', label: 'Other' },
    ],
  },
  { name: 'status', type: 'radio', label: 'Status', section: 'details',
    options: [
      { value: 'lead', label: 'Lead' },
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ],
  },
  { name: 'dealValue', type: 'number', label: 'Estimated Deal Value ($)', section: 'details',
    min: 0, step: 1000,
  },
  { name: 'notes', type: 'textarea', label: 'Notes', section: 'details', rows: 3 },
  { name: 'hasReferral', type: 'toggle', label: 'Has Referral', section: 'details' },
  { name: 'referralSource', type: 'text', label: 'Referral Source', section: 'details',
    visible: { field: 'hasReferral', operator: 'equals', value: true },
  },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

function ContactsPage() {
  const { mode, toggleMode } = useTheme();
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = useCallback(async (values: Record<string, unknown>) => {
    // Simulate API call
    await new Promise(r => setTimeout(r, 800));
    alert(`Contact created: ${values.firstName} ${values.lastName}`);
    setShowForm(false);
  }, []);

  return (
    <VStack gap={24} padding={24}>
      {/* Page header */}
      <Row justify="between" align="center">
        <VStack gap={4}>
          <h1 style={{
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--prism-color-text-primary, #0F172A)',
            margin: 0,
          }}>
            Contacts
          </h1>
          <p style={{
            fontSize: 14,
            color: 'var(--prism-color-text-secondary, #64748B)',
            margin: 0,
          }}>
            87 contacts across 8 companies
          </p>
        </VStack>
        <Row gap={8}>
          <button
            onClick={toggleMode}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid var(--prism-color-border-default, #E2E8F0)',
              background: 'var(--prism-color-surface-card, #fff)',
              color: 'var(--prism-color-text-primary, #0F172A)',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            {mode === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: 'var(--prism-color-interactive-primary, #1E3A5F)',
              color: 'var(--prism-color-text-on-primary, #fff)',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: 14,
            }}
          >
            + Add Contact
          </button>
        </Row>
      </Row>

      {/* Stats row */}
      <Grid columns={{ mobile: 2, tablet: 4, desktop: 4 }} gap={16}>
        {[
          { label: 'Total Contacts', value: '87', color: 'var(--prism-color-interactive-primary)' },
          { label: 'Active', value: '29', color: 'var(--prism-color-status-success)' },
          { label: 'Leads', value: '29', color: 'var(--prism-color-status-info)' },
          { label: 'Pipeline Value', value: '$2.4M', color: 'var(--prism-color-status-warning)' },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: 16,
              borderRadius: 8,
              border: '1px solid var(--prism-color-border-default, #E2E8F0)',
              backgroundColor: 'var(--prism-color-surface-card, #fff)',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--prism-color-text-secondary)', marginBottom: 4 }}>
              {stat.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: stat.color }}>
              {stat.value}
            </div>
          </div>
        ))}
      </Grid>

      {/* Create contact form (toggle) */}
      {showForm && (
        <div style={{
          padding: 24,
          borderRadius: 8,
          border: '1px solid var(--prism-color-border-default, #E2E8F0)',
          backgroundColor: 'var(--prism-color-surface-card, #fff)',
        }}>
          <h2 style={{
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--prism-color-text-primary)',
            marginBottom: 16,
          }}>
            Create Contact
          </h2>
          <Form
            fields={formFields}
            sections={formSections}
            layout="two-column"
            onSubmit={handleSubmit}
            submitLabel="Create Contact"
            showReset
            initialValues={{ status: 'lead', hasReferral: false }}
          />
        </div>
      )}

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={contacts}
        sorting={{ enabled: true, mode: 'multi' }}
        filtering={{ enabled: true, globalSearch: true }}
        pagination={{ enabled: true, pageSizeOptions: [10, 25, 50], defaultPageSize: 25 }}
        selection={{ enabled: true, mode: 'multi' }}
        bulkActions={bulkActions}
        aria-label="Contacts table"
      />
    </VStack>
  );
}

// ---------------------------------------------------------------------------
// App Root
// ---------------------------------------------------------------------------

function App() {
  return (
    <ThemeProvider tokens={enterpriseTheme} defaultMode="light">
      <LayoutProvider>
        <AppShell config={navConfig} currentPath="/contacts">
          <ContactsPage />
        </AppShell>
      </LayoutProvider>
    </ThemeProvider>
  );
}

// ---------------------------------------------------------------------------
// Mount
// ---------------------------------------------------------------------------

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<App />);
}
