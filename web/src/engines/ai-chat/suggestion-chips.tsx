/**
 * SuggestionChips — Horizontal scrollable row of prompt suggestions
 * Spec: docs/specs/05-engine-specifications.md § 5.6 "Composition Points"
 */

import type { CSSProperties } from 'react';
import type { SuggestionChip } from './types.js';

const containerStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  overflowX: 'auto',
  padding: '8px 0',
  scrollbarWidth: 'none',
};

const chipStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 12px',
  borderRadius: 9999,
  border: '1px solid var(--prism-color-border-default, #E2E8F0)',
  backgroundColor: 'var(--prism-color-surface-card, #FFFFFF)',
  color: 'var(--prism-color-text-primary, #0F172A)',
  fontSize: 13,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  flexShrink: 0,
  transition: 'background-color 150ms, border-color 150ms',
};

export interface SuggestionChipsProps {
  suggestions: SuggestionChip[];
  onSelect: (suggestion: SuggestionChip) => void;
  className?: string;
}

export function SuggestionChips({ suggestions, onSelect, className }: SuggestionChipsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="Suggested prompts"
      className={className}
      style={containerStyle}
    >
      {suggestions.map((chip) => (
        <button
          key={chip.value}
          onClick={() => onSelect(chip)}
          style={chipStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--prism-color-interactive-primary, #1E3A5F)';
            e.currentTarget.style.backgroundColor = 'var(--prism-color-interactive-primary-subtle, #EFF6FF)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--prism-color-border-default, #E2E8F0)';
            e.currentTarget.style.backgroundColor = 'var(--prism-color-surface-card, #FFFFFF)';
          }}
        >
          {chip.icon && <span aria-hidden="true">{chip.icon}</span>}
          {chip.label}
        </button>
      ))}
    </div>
  );
}
