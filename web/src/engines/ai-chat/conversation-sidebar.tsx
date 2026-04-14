/**
 * ConversationSidebar — Thread list with search, date grouping, and CRUD
 * Spec: docs/specs/05-engine-specifications.md § 5.6 Conversation Management
 *
 * Renders ConversationSummary[] with date grouping (Today / This Week / Earlier),
 * search filter, inline rename, delete confirmation, and active highlight.
 * Accepts a renderMeta slot for domain-specific badges (e.g. risk tier).
 */

import { useState, useCallback, useRef, useEffect, type CSSProperties } from 'react';
import type { ConversationSummary, ConversationSidebarProps } from './types.js';

// --- Date grouping ---

type DateGroup = 'Today' | 'This Week' | 'Earlier';

function getDateGroup(timestamp: number): DateGroup {
  const now = new Date();
  const date = new Date(timestamp);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);

  if (date >= today) return 'Today';
  if (date >= weekAgo) return 'This Week';
  return 'Earlier';
}

function groupConversations(
  conversations: ConversationSummary[],
): Map<DateGroup, ConversationSummary[]> {
  const groups = new Map<DateGroup, ConversationSummary[]>();
  const order: DateGroup[] = ['Today', 'This Week', 'Earlier'];
  for (const group of order) {
    groups.set(group, []);
  }
  // Sort by timestamp descending (newest first)
  const sorted = [...conversations].sort((a, b) => b.timestamp - a.timestamp);
  for (const conv of sorted) {
    const group = getDateGroup(conv.timestamp);
    groups.get(group)!.push(conv);
  }
  return groups;
}

// --- Styles ---

const sidebarStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
  backgroundColor: 'var(--prism-color-surface-card, #FFFFFF)',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 12px 8px',
  gap: 8,
  flexShrink: 0,
};

const searchStyle: CSSProperties = {
  padding: '0 12px 8px',
  flexShrink: 0,
};

const searchInputStyle: CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  border: '1px solid var(--prism-color-border-default, #E2E8F0)',
  borderRadius: 6,
  fontSize: 13,
  backgroundColor: 'var(--prism-color-surface-page, #F8FAFC)',
  outline: 'none',
};

const listStyle: CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '0 8px 8px',
};

const groupLabelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--prism-color-text-secondary, #64748B)',
  padding: '12px 8px 4px',
};

const itemStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  padding: '8px 10px',
  borderRadius: 6,
  cursor: 'pointer',
  gap: 2,
  position: 'relative',
};

const activeItemStyle: CSSProperties = {
  ...itemStyle,
  backgroundColor: 'var(--prism-color-surface-active, #EFF6FF)',
  borderLeft: '3px solid var(--prism-color-primary, #3B82F6)',
  paddingLeft: 7,
};

const titleStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  color: 'var(--prism-color-text-primary, #0F172A)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const previewStyle: CSSProperties = {
  fontSize: 12,
  color: 'var(--prism-color-text-secondary, #64748B)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const metaRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 4,
};

const timestampStyle: CSSProperties = {
  fontSize: 11,
  color: 'var(--prism-color-text-tertiary, #94A3B8)',
  flexShrink: 0,
};

const menuBtnStyle: CSSProperties = {
  position: 'absolute',
  top: 6,
  right: 6,
  width: 24,
  height: 24,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 4,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 14,
  color: 'var(--prism-color-text-secondary, #64748B)',
};

const menuStyle: CSSProperties = {
  position: 'absolute',
  top: 30,
  right: 6,
  zIndex: 10,
  background: 'var(--prism-color-surface-card, #FFFFFF)',
  border: '1px solid var(--prism-color-border-default, #E2E8F0)',
  borderRadius: 6,
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  padding: 4,
  minWidth: 120,
};

const menuItemStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '6px 10px',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 13,
  textAlign: 'left',
  borderRadius: 4,
  color: 'var(--prism-color-text-primary, #0F172A)',
};

const deleteMenuItemStyle: CSSProperties = {
  ...menuItemStyle,
  color: 'var(--prism-color-status-error, #EF4444)',
};

const newBtnStyle: CSSProperties = {
  padding: '6px 12px',
  borderRadius: 6,
  border: '1px solid var(--prism-color-border-default, #E2E8F0)',
  background: 'var(--prism-color-surface-page, #F8FAFC)',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--prism-color-text-primary, #0F172A)',
  whiteSpace: 'nowrap',
};

const collapsedStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '12px 4px',
  gap: 8,
  width: 44,
  flexShrink: 0,
};

const collapsedBtnStyle: CSSProperties = {
  width: 36,
  height: 36,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 8,
  border: '1px solid var(--prism-color-border-default, #E2E8F0)',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 16,
};

const renameInputStyle: CSSProperties = {
  width: '100%',
  padding: '4px 8px',
  border: '1px solid var(--prism-color-primary, #3B82F6)',
  borderRadius: 4,
  fontSize: 14,
  outline: 'none',
};

// --- Skeleton ---

function skeletonBarStyle(width: number, height = 14): CSSProperties {
  return {
    width,
    height,
    borderRadius: 4,
    backgroundColor: 'var(--prism-color-border-default, #E2E8F0)',
    animation: 'prism-skeleton-pulse 1.5s ease-in-out infinite',
  };
}

// --- Helpers ---

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (date >= today) {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function truncatePreview(text: string, maxLength = 80): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// --- Component ---

export function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onRename,
  isLoading = false,
  deleteLoading = false,
  renameLoading = false,
  collapsed = false,
  onToggleCollapse,
  renderMeta,
  className,
}: ConversationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpenId) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpenId]);

  // Auto-focus rename input
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  // --- Filter conversations ---
  const filtered = searchQuery.trim()
    ? conversations.filter((c) => {
        const q = searchQuery.toLowerCase();
        return (
          c.title.toLowerCase().includes(q) ||
          (c.lastMessage && c.lastMessage.toLowerCase().includes(q))
        );
      })
    : conversations;

  const groups = groupConversations(filtered);

  // --- Handlers ---

  const handleStartRename = useCallback(
    (conv: ConversationSummary) => {
      setMenuOpenId(null);
      setRenamingId(conv.id);
      setRenameValue(conv.title);
    },
    [],
  );

  const handleConfirmRename = useCallback(() => {
    if (renamingId && renameValue.trim() && onRename) {
      onRename(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue('');
  }, [renamingId, renameValue, onRename]);

  const handleCancelRename = useCallback(() => {
    setRenamingId(null);
    setRenameValue('');
  }, []);

  const handleStartDelete = useCallback((id: string) => {
    setMenuOpenId(null);
    setConfirmDeleteId(id);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (confirmDeleteId && onDelete) {
      onDelete(confirmDeleteId);
    }
    setConfirmDeleteId(null);
  }, [confirmDeleteId, onDelete]);

  const handleCancelDelete = useCallback(() => {
    setConfirmDeleteId(null);
  }, []);

  // --- Collapsed mode ---

  if (collapsed) {
    return (
      <div style={collapsedStyle} className={className}>
        <button
          onClick={onToggleCollapse}
          style={collapsedBtnStyle}
          aria-label="Expand conversation list"
          title="Expand"
        >
          ☰
        </button>
        <button
          onClick={onNew}
          style={collapsedBtnStyle}
          aria-label="New conversation"
          title="New conversation"
        >
          +
        </button>
      </div>
    );
  }

  // --- Full mode ---

  return (
    <nav
      style={sidebarStyle}
      className={className}
      aria-label="Conversation list"
      role="navigation"
    >
      {/* Header */}
      <div style={headerStyle}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--prism-color-text-primary, #0F172A)' }}>
          Conversations
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={onNew} style={newBtnStyle} aria-label="New conversation">
            + New
          </button>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              style={{ ...newBtnStyle, padding: '6px 8px' }}
              aria-label="Collapse conversation list"
            >
              ◀
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div style={searchStyle}>
        <input
          type="search"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={searchInputStyle}
          aria-label="Search conversations"
        />
      </div>

      {/* List */}
      <div style={listStyle} role="list">
        {isLoading && conversations.length === 0 && (
          <div aria-label="Loading conversations" role="status">
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ ...itemStyle, gap: 6, cursor: 'default' }}>
                <div style={skeletonBarStyle(140 - i * 20)} />
                <div style={skeletonBarStyle(180 - i * 10, 10)} />
                <div style={skeletonBarStyle(60, 10)} />
              </div>
            ))}
            <style>{`
              @keyframes prism-skeleton-pulse {
                0%, 100% { opacity: 0.4; }
                50% { opacity: 0.8; }
              }
            `}</style>
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--prism-color-text-secondary, #64748B)', fontSize: 13 }}>
            {searchQuery ? 'No matching conversations' : 'No conversations yet'}
          </div>
        )}

        {(['Today', 'This Week', 'Earlier'] as DateGroup[]).map((group) => {
          const items = groups.get(group)!;
          if (items.length === 0) return null;

          return (
            <div key={group}>
              <div style={groupLabelStyle}>{group}</div>
              {items.map((conv) => {
                const isActive = conv.id === activeId;
                const isRenaming = conv.id === renamingId;
                const isConfirmingDelete = conv.id === confirmDeleteId;

                return (
                  <div
                    key={conv.id}
                    role="listitem"
                    style={isActive ? activeItemStyle : itemStyle}
                    onClick={() => !isRenaming && onSelect(conv.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isRenaming) onSelect(conv.id);
                    }}
                    tabIndex={0}
                    aria-current={isActive ? 'true' : undefined}
                    aria-label={conv.title}
                  >
                    {/* Title row */}
                    {isRenaming ? (
                      <input
                        ref={renameInputRef}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleConfirmRename();
                          if (e.key === 'Escape') handleCancelRename();
                          e.stopPropagation();
                        }}
                        onBlur={handleConfirmRename}
                        onClick={(e) => e.stopPropagation()}
                        style={renameInputStyle}
                        aria-label="Rename conversation"
                        disabled={renameLoading}
                      />
                    ) : (
                      <span style={titleStyle}>{conv.title}</span>
                    )}

                    {/* Preview */}
                    {!isRenaming && conv.lastMessage && (
                      <span style={previewStyle}>
                        {truncatePreview(conv.lastMessage)}
                      </span>
                    )}

                    {/* Meta row: timestamp + custom badge */}
                    {!isRenaming && (
                      <div style={metaRowStyle}>
                        <span style={timestampStyle}>
                          {formatTimestamp(conv.timestamp)}
                        </span>
                        {renderMeta && renderMeta(conv)}
                      </div>
                    )}

                    {/* Delete confirmation overlay */}
                    {isConfirmingDelete && (
                      <div
                        style={{
                          display: 'flex',
                          gap: 4,
                          padding: '4px 0',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span style={{ fontSize: 12, color: 'var(--prism-color-status-error, #EF4444)' }}>
                          Delete?
                        </span>
                        <button
                          onClick={handleConfirmDelete}
                          disabled={deleteLoading}
                          style={{ ...menuItemStyle, padding: '2px 8px', fontSize: 12, color: 'var(--prism-color-status-error, #EF4444)' }}
                        >
                          {deleteLoading ? '...' : 'Yes'}
                        </button>
                        <button
                          onClick={handleCancelDelete}
                          style={{ ...menuItemStyle, padding: '2px 8px', fontSize: 12 }}
                        >
                          No
                        </button>
                      </div>
                    )}

                    {/* Context menu trigger */}
                    {!isRenaming && !isConfirmingDelete && (onDelete || onRename) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === conv.id ? null : conv.id);
                        }}
                        style={menuBtnStyle}
                        aria-label={`Actions for ${conv.title}`}
                        aria-haspopup="true"
                        aria-expanded={menuOpenId === conv.id}
                      >
                        ⋮
                      </button>
                    )}

                    {/* Context menu dropdown */}
                    {menuOpenId === conv.id && (
                      <div ref={menuRef} style={menuStyle} role="menu">
                        {onRename && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartRename(conv);
                            }}
                            style={menuItemStyle}
                            role="menuitem"
                          >
                            Rename
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartDelete(conv.id);
                            }}
                            style={deleteMenuItemStyle}
                            role="menuitem"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
