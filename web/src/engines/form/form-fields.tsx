/**
 * Form Engine — Field renderers and file upload component
 * Spec: docs/specs/05-engine-specifications.md § 5.2
 */

import { useCallback, useReducer, useRef, type ReactNode } from 'react';
import { type FieldDef, type SectionDef } from './form-types.js';

// --- Field renderer ---

export interface FieldRendererProps {
  field: FieldDef;
  value: unknown;
  error: string | undefined;
  touched: boolean;
  disabled: boolean;
  onChange: (value: unknown) => void;
  onBlur: () => void;
  idPrefix: string;
}

export function FieldRenderer({
  field,
  value,
  error,
  touched,
  disabled,
  onChange,
  onBlur,
  idPrefix,
}: FieldRendererProps) {
  const inputId = `${idPrefix}-${field.name}`;
  const errorId = `${inputId}-error`;
  const helpId = `${inputId}-help`;
  const showError = touched && error;
  const describedBy = [
    showError ? errorId : null,
    field.helpText ? helpId : null,
  ].filter(Boolean).join(' ') || undefined;

  const commonProps = {
    id: inputId,
    name: field.name,
    disabled: disabled || field.disabled,
    'aria-describedby': describedBy,
    'aria-invalid': showError ? true as const : undefined,
    'aria-required': field.required || undefined,
    onBlur,
    style: {
      width: '100%',
      padding: 'var(--prism-form-field-padding, 8px 12px)',
      border: `1px solid ${showError ? 'var(--prism-color-status-error, #dc2626)' : 'var(--prism-color-border-default, #d1d5db)'}`,
      borderRadius: 'var(--prism-radius-md, 6px)',
      fontSize: 'var(--prism-font-size-body, 14px)',
      fontFamily: 'inherit',
      backgroundColor: 'var(--prism-color-surface-input, transparent)',
      color: 'var(--prism-color-text-primary, inherit)',
      boxSizing: 'border-box' as const,
    },
  };

  let input: ReactNode;

  switch (field.type) {
    case 'textarea':
      input = (
        <textarea
          {...commonProps}
          value={typeof value === 'string' ? value : ''}
          placeholder={field.placeholder}
          rows={field.rows ?? 3}
          maxLength={field.maxLength}
          onChange={e => onChange(e.target.value)}
          style={{ ...commonProps.style, resize: 'vertical' }}
        />
      );
      break;

    case 'select':
      input = (
        <select
          {...commonProps}
          value={value as string ?? ''}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">{field.placeholder ?? 'Select...'}</option>
          {field.options?.map(opt => (
            <option key={String(opt.value)} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
      );
      break;

    case 'checkbox':
      input = (
        <input
          {...commonProps}
          type="checkbox"
          checked={Boolean(value)}
          onChange={e => onChange(e.target.checked)}
          style={{ width: 'auto', margin: '0 8px 0 0' }}
        />
      );
      break;

    case 'radio':
      input = (
        <fieldset
          style={{ border: 'none', padding: 0, margin: 0 }}
          role="radiogroup"
          aria-labelledby={`${inputId}-label`}
        >
          {field.options?.map(opt => (
            <label
              key={String(opt.value)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}
            >
              <input
                type="radio"
                name={field.name}
                value={String(opt.value)}
                checked={value === opt.value}
                disabled={disabled || field.disabled || opt.disabled}
                onChange={() => onChange(opt.value)}
                onBlur={onBlur}
              />
              {opt.label}
            </label>
          ))}
        </fieldset>
      );
      break;

    case 'toggle':
      input = (
        <button
          {...commonProps}
          type="button"
          role="switch"
          aria-checked={Boolean(value)}
          onClick={() => onChange(!value)}
          style={{
            ...commonProps.style,
            width: '48px',
            height: '24px',
            borderRadius: '12px',
            padding: '2px',
            backgroundColor: value
              ? 'var(--prism-color-interactive-primary, #2563eb)'
              : 'var(--prism-color-border-default, #d1d5db)',
            cursor: disabled || field.disabled ? 'not-allowed' : 'pointer',
            position: 'relative',
            border: 'none',
          }}
        >
          <span
            style={{
              display: 'block',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: 'white',
              transform: value ? 'translateX(24px)' : 'translateX(0)',
              transition: 'transform 150ms',
            }}
          />
        </button>
      );
      break;

    case 'file':
      input = (
        <FileUploadField
          field={field}
          inputId={inputId}
          describedBy={describedBy}
          disabled={disabled || Boolean(field.disabled)}
          onChange={onChange}
          onBlur={onBlur}
          showError={Boolean(showError)}
        />
      );
      break;

    case 'number':
      input = (
        <input
          {...commonProps}
          type="number"
          value={value === undefined || value === null ? '' : String(value)}
          placeholder={field.placeholder}
          min={field.min}
          max={field.max}
          step={field.step}
          onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        />
      );
      break;

    case 'hidden':
      return <input type="hidden" name={field.name} value={value as string ?? ''} />;

    default:
      input = (
        <input
          {...commonProps}
          type={field.type}
          value={typeof value === 'string' ? value : ''}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          onChange={e => onChange(e.target.value)}
        />
      );
  }

  return (
    <div
      role="group"
      aria-labelledby={`${inputId}-label`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--prism-form-field-gap, 4px)',
      }}
    >
      <label
        id={`${inputId}-label`}
        htmlFor={field.type !== 'radio' ? inputId : undefined}
        style={{
          fontSize: 'var(--prism-font-size-label, 14px)',
          fontWeight: 500,
          color: 'var(--prism-color-text-primary, inherit)',
        }}
      >
        {field.label}
        {field.required && (
          <span
            aria-hidden="true"
            style={{ color: 'var(--prism-color-status-error, #dc2626)', marginLeft: '4px' }}
          >
            *
          </span>
        )}
        {field.required && <span className="sr-only"> (required)</span>}
      </label>
      {input}
      {field.helpText && !showError && (
        <span
          id={helpId}
          style={{
            fontSize: 'var(--prism-font-size-caption, 12px)',
            color: 'var(--prism-color-text-secondary, #6b7280)',
          }}
        >
          {field.helpText}
        </span>
      )}
      {showError && (
        <span
          id={errorId}
          role="alert"
          style={{
            fontSize: 'var(--prism-font-size-caption, 12px)',
            color: 'var(--prism-color-status-error, #dc2626)',
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
}

// --- File upload sub-component ---

interface FileUploadFieldProps {
  field: FieldDef;
  inputId: string;
  describedBy: string | undefined;
  disabled: boolean;
  onChange: (value: unknown) => void;
  onBlur: () => void;
  showError: boolean;
}

function FileUploadField({
  field,
  inputId,
  describedBy,
  disabled,
  onChange,
  onBlur,
  showError,
}: FileUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useReducer((_: boolean, v: boolean) => v, false);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const maxFiles = field.maxFiles ?? 1;
    const selected = Array.from(files).slice(0, maxFiles);
    onChange(maxFiles === 1 ? selected[0] : selected);
  }, [field.maxFiles, onChange]);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      style={{
        border: `2px dashed ${dragOver
          ? 'var(--prism-color-interactive-primary, #2563eb)'
          : showError
            ? 'var(--prism-color-status-error, #dc2626)'
            : 'var(--prism-color-border-default, #d1d5db)'}`,
        borderRadius: 'var(--prism-radius-md, 6px)',
        padding: '24px',
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        backgroundColor: dragOver ? 'var(--prism-color-surface-hover, #f3f4f6)' : 'transparent',
        transition: 'border-color 150ms, background-color 150ms',
      }}
      onClick={() => !disabled && fileInputRef.current?.click()}
      onKeyDown={e => {
        if (e.key === 'Enter' && !disabled) fileInputRef.current?.click();
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={`Drop files here or press Enter to browse${field.accept ? `. Accepted: ${field.accept.join(', ')}` : ''}`}
      aria-describedby={describedBy}
    >
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept={field.accept?.join(',')}
        multiple={(field.maxFiles ?? 1) > 1}
        disabled={disabled}
        onChange={e => { handleFiles(e.target.files); onBlur(); }}
        style={{ display: 'none' }}
        data-testid={`${field.name}-file-input`}
      />
      <span style={{ color: 'var(--prism-color-text-secondary, #6b7280)' }}>
        Drop files here or click to browse
      </span>
    </div>
  );
}

// --- Section wrapper ---

export interface FormSectionProps {
  section: SectionDef | null;
  collapsed: boolean;
  onToggle: (() => void) | undefined;
  children: ReactNode;
}

export function FormSection({ section, collapsed, onToggle, children }: FormSectionProps) {
  if (!section) return <>{children}</>;

  return (
    <fieldset
      style={{
        border: 'none',
        padding: 0,
        margin: 0,
      }}
    >
      <legend
        style={{
          fontSize: 'var(--prism-font-size-heading, 16px)',
          fontWeight: 600,
          color: 'var(--prism-color-text-primary, inherit)',
          marginBottom: 'var(--prism-spacing-sm, 8px)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          cursor: section.collapsible ? 'pointer' : undefined,
        }}
        onClick={section.collapsible ? onToggle : undefined}
        onKeyDown={section.collapsible ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle?.(); } } : undefined}
        tabIndex={section.collapsible ? 0 : undefined}
        role={section.collapsible ? 'button' : undefined}
        aria-expanded={section.collapsible ? !collapsed : undefined}
      >
        {section.collapsible && (
          <span aria-hidden="true" style={{ transition: 'transform 150ms', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0)' }}>
            &#9662;
          </span>
        )}
        {section.title}
      </legend>
      {!collapsed && children}
    </fieldset>
  );
}
