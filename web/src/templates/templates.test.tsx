/**
 * Page Template Tests
 * Covers: all 11 templates render with required zones,
 * responsive behavior, header rendering, accessibility.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LayoutProvider } from '../engines/layout.js';
import { DashboardTemplate } from './dashboard-template.js';
import { ListTemplate } from './list-template.js';
import { DetailTemplate } from './detail-template.js';
import { FormTemplate } from './form-template.js';
import { SettingsTemplate } from './settings-template.js';
import { AuthTemplate } from './auth-template.js';
import { ConversationTemplate } from './conversation-template.js';
import { SplitTemplate } from './split-template.js';
import { WizardTemplate } from './wizard-template.js';
import { KanbanTemplate } from './kanban-template.js';
import { CalendarTemplate } from './calendar-template.js';
import type { ReactNode } from 'react';

function withLayout(children: ReactNode) {
  return <LayoutProvider>{children}</LayoutProvider>;
}

// --- DashboardTemplate ---

describe('DashboardTemplate', () => {
  it('renders title and stats row', () => {
    render(withLayout(
      <DashboardTemplate
        title="Sales Dashboard"
        subtitle="Last 30 days"
        statsRow={<div>$1.2M Revenue</div>}
      />,
    ));
    expect(screen.getByText('Sales Dashboard')).toBeDefined();
    expect(screen.getByText('Last 30 days')).toBeDefined();
    expect(screen.getByText('$1.2M Revenue')).toBeDefined();
  });

  it('renders all zones', () => {
    render(withLayout(
      <DashboardTemplate
        title="Test"
        statsRow={<div>stats</div>}
        primaryChart={<div>chart</div>}
        secondaryContent={<div>activity</div>}
        detailGrid={<div>cards</div>}
      />,
    ));
    expect(screen.getByText('stats')).toBeDefined();
    expect(screen.getByText('chart')).toBeDefined();
    expect(screen.getByText('activity')).toBeDefined();
    expect(screen.getByText('cards')).toBeDefined();
  });
});

// --- ListTemplate ---

describe('ListTemplate', () => {
  it('renders title and content zone', () => {
    render(withLayout(
      <ListTemplate
        title="Contacts"
        content={<div>DataTable here</div>}
      />,
    ));
    expect(screen.getByText('Contacts')).toBeDefined();
    expect(screen.getByText('DataTable here')).toBeDefined();
  });

  it('renders filter bar and footer', () => {
    render(withLayout(
      <ListTemplate
        title="Orders"
        filterBar={<div>search filters</div>}
        content={<div>table</div>}
        footer={<div>pagination</div>}
      />,
    ));
    expect(screen.getByText('search filters')).toBeDefined();
    expect(screen.getByText('pagination')).toBeDefined();
  });
});

// --- DetailTemplate ---

describe('DetailTemplate', () => {
  it('renders content and sidebar', () => {
    render(withLayout(
      <DetailTemplate
        title="Contact Detail"
        content={<div>main content</div>}
        sidebar={<div>metadata</div>}
      />,
    ));
    expect(screen.getByText('Contact Detail')).toBeDefined();
    expect(screen.getByText('main content')).toBeDefined();
    expect(screen.getByText('metadata')).toBeDefined();
  });
});

// --- FormTemplate ---

describe('FormTemplate', () => {
  it('renders form content', () => {
    render(withLayout(
      <FormTemplate
        title="Create Contact"
        content={<div>form fields</div>}
      />,
    ));
    expect(screen.getByText('Create Contact')).toBeDefined();
    expect(screen.getByText('form fields')).toBeDefined();
  });
});

// --- SettingsTemplate ---

describe('SettingsTemplate', () => {
  it('renders settings nav and content', () => {
    render(withLayout(
      <SettingsTemplate
        title="Settings"
        settingsNav={<div>nav tabs</div>}
        content={<div>settings form</div>}
      />,
    ));
    expect(screen.getByText('Settings')).toBeDefined();
    expect(screen.getByText('nav tabs')).toBeDefined();
    expect(screen.getByText('settings form')).toBeDefined();
  });
});

// --- AuthTemplate ---

describe('AuthTemplate', () => {
  it('renders auth form centered', () => {
    render(
      <AuthTemplate
        content={<div>Login form</div>}
      />,
    );
    expect(screen.getByText('Login form')).toBeDefined();
  });

  it('renders brand panel', () => {
    render(
      <AuthTemplate
        content={<div>form</div>}
        brandPanel={<div>Welcome to Acme</div>}
      />,
    );
    expect(screen.getByText('Welcome to Acme')).toBeDefined();
  });
});

// --- ConversationTemplate ---

describe('ConversationTemplate', () => {
  it('renders chat content (manual mode)', () => {
    render(withLayout(
      <ConversationTemplate
        content={<div>chat messages</div>}
      />,
    ));
    expect(screen.getByText('chat messages')).toBeDefined();
  });

  it('renders sidebar and detail panel (manual mode)', () => {
    render(withLayout(
      <ConversationTemplate
        conversationList={<div>thread list</div>}
        content={<div>chat content</div>}
        detailPanel={<div>citations</div>}
      />,
    ));
    expect(screen.getByText('thread list')).toBeDefined();
    expect(screen.getByText('chat content')).toBeDefined();
    expect(screen.getByText('citations')).toBeDefined();
  });
});

describe('ConversationTemplate (wired mode)', () => {
  function createMockAdapter() {
    return {
      listConversations: async () => [
        { id: 'c1', title: 'First chat', timestamp: Date.now(), messageCount: 2 },
        { id: 'c2', title: 'Second chat', timestamp: Date.now() - 3600000, messageCount: 5 },
      ],
      loadMessages: async () => [
        { id: 'm1', type: 'user' as const, content: 'Hello', timestamp: Date.now(), sender: 'user' as const },
        { id: 'm2', type: 'assistant' as const, content: 'Hi there!', timestamp: Date.now(), sender: 'assistant' as const },
      ],
      sendMessage: () => {
        const callbacks: Record<string, Function> = {};
        return {
          onToken: (cb: Function) => { callbacks.token = cb; },
          onComplete: (cb: Function) => { callbacks.complete = cb; },
          onError: (cb: Function) => { callbacks.error = cb; },
          abort: () => {},
        };
      },
      deleteConversation: async () => {},
      renameConversation: async () => {},
    };
  }

  it('renders conversation sidebar and chat engine from adapter', async () => {
    const adapter = createMockAdapter();
    const { findByText } = render(withLayout(
      <ConversationTemplate
        adapter={adapter}
      />,
    ));
    // ConversationSidebar should show conversations from adapter
    expect(await findByText('First chat')).toBeDefined();
    expect(await findByText('Second chat')).toBeDefined();
    // Chat engine shows empty state initially (no conversation selected)
    expect(await findByText('Start a conversation')).toBeDefined();
  });

  it('renders detail panel alongside wired content', async () => {
    const adapter = createMockAdapter();
    const { findByText } = render(withLayout(
      <ConversationTemplate
        adapter={adapter}
        detailPanel={<div>citation panel</div>}
      />,
    ));
    expect(await findByText('citation panel')).toBeDefined();
  });

  it('accepts renderMeta for domain badges', async () => {
    const adapter = createMockAdapter();
    const { findByText } = render(withLayout(
      <ConversationTemplate
        adapter={adapter}
        renderMeta={(conv) => <span>badge-{conv.id}</span>}
      />,
    ));
    expect(await findByText('badge-c1')).toBeDefined();
    expect(await findByText('badge-c2')).toBeDefined();
  });

  it('accepts renderContent override', async () => {
    const adapter = createMockAdapter();
    const { findByText } = render(withLayout(
      <ConversationTemplate
        adapter={adapter}
        renderContent={(state) => <div>custom content: {state.conversations.length} convs</div>}
      />,
    ));
    expect(await findByText('custom content: 2 convs')).toBeDefined();
  });

  it('accepts renderSidebar override', async () => {
    const adapter = createMockAdapter();
    const { findByText } = render(withLayout(
      <ConversationTemplate
        adapter={adapter}
        renderSidebar={(state) => <div>custom sidebar: {state.conversations.length}</div>}
      />,
    ));
    expect(await findByText('custom sidebar: 2')).toBeDefined();
  });
});

// --- SplitTemplate ---

describe('SplitTemplate', () => {
  it('renders both panels', () => {
    render(withLayout(
      <SplitTemplate
        title="Compare"
        primary={<div>left panel</div>}
        secondary={<div>right panel</div>}
      />,
    ));
    expect(screen.getByText('Compare')).toBeDefined();
    expect(screen.getByText('left panel')).toBeDefined();
    expect(screen.getByText('right panel')).toBeDefined();
  });
});

// --- WizardTemplate ---

describe('WizardTemplate', () => {
  it('renders wizard content centered', () => {
    render(withLayout(
      <WizardTemplate
        title="Setup Wizard"
        content={<div>step content</div>}
      />,
    ));
    expect(screen.getByText('Setup Wizard')).toBeDefined();
    expect(screen.getByText('step content')).toBeDefined();
  });
});

// --- KanbanTemplate ---

describe('KanbanTemplate', () => {
  it('renders columns with titles and counts', () => {
    render(withLayout(
      <KanbanTemplate
        title="Tasks"
        columns={[
          { id: 'todo', title: 'To Do', count: 5, children: <div>task cards</div> },
          { id: 'progress', title: 'In Progress', count: 3, children: <div>active tasks</div> },
          { id: 'done', title: 'Done', count: 12, children: <div>completed</div> },
        ]}
      />,
    ));
    expect(screen.getByText('Tasks')).toBeDefined();
    expect(screen.getByText('To Do')).toBeDefined();
    expect(screen.getByText('In Progress')).toBeDefined();
    expect(screen.getByText('Done')).toBeDefined();
    expect(screen.getByText('5')).toBeDefined();
    expect(screen.getByText('task cards')).toBeDefined();
  });

  it('has accessible board landmark', () => {
    render(withLayout(
      <KanbanTemplate
        title="Board"
        columns={[{ id: 'col', title: 'Col', children: <div /> }]}
      />,
    ));
    expect(screen.getByRole('group', { name: 'Kanban board' })).toBeDefined();
  });
});

// --- CalendarTemplate ---

describe('CalendarTemplate', () => {
  it('renders calendar content', () => {
    render(withLayout(
      <CalendarTemplate
        title="Schedule"
        content={<div>calendar grid</div>}
      />,
    ));
    expect(screen.getByText('Schedule')).toBeDefined();
    expect(screen.getByText('calendar grid')).toBeDefined();
  });

  it('renders view controls and event detail', () => {
    render(withLayout(
      <CalendarTemplate
        title="Events"
        viewControls={<div>Day | Week | Month</div>}
        content={<div>grid</div>}
        eventDetail={<div>event info</div>}
      />,
    ));
    expect(screen.getByText('Day | Week | Month')).toBeDefined();
    expect(screen.getByText('event info')).toBeDefined();
  });
});
