import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  Form,
  evaluateCondition,
  validateFieldRules,
  type FieldDef,
  type SectionDef,
  type FormConfig,
  type ConditionExpression,
} from './form.js';
import { z } from 'zod';

// --- Helpers ---

function renderForm(overrides: Partial<FormConfig> = {}) {
  const defaultFields: FieldDef[] = [
    { name: 'name', type: 'text', label: 'Name', required: true },
    { name: 'email', type: 'email', label: 'Email' },
  ];
  const onSubmit = vi.fn();
  const props: FormConfig = {
    fields: defaultFields,
    onSubmit,
    ...overrides,
  };
  const result = render(<Form {...props} />);
  return { ...result, onSubmit };
}

/**
 * Helper to find an input by its name attribute — avoids label matching issues
 * when labels contain extra children (required indicator, sr-only text).
 */
function getInput(container: HTMLElement, name: string): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  const el = container.querySelector(`[name="${name}"]`);
  if (!el) throw new Error(`Input with name="${name}" not found`);
  return el as HTMLInputElement;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

// --- Test cases ---

describe('Form Engine', () => {
  describe('rendering from schema', () => {
    it('renders fields from FieldDef array', () => {
      const { container } = renderForm({
        fields: [
          { name: 'username', type: 'text', label: 'Username' },
          { name: 'bio', type: 'textarea', label: 'Bio' },
          { name: 'role', type: 'select', label: 'Role', options: [
            { value: 'admin', label: 'Admin' },
            { value: 'user', label: 'User' },
          ]},
        ],
      });

      expect(getInput(container, 'username')).toBeDefined();
      expect(getInput(container, 'bio')).toBeDefined();
      expect(getInput(container, 'role')).toBeDefined();
      expect(screen.getByText('Username')).toBeDefined();
      expect(screen.getByText('Bio')).toBeDefined();
      expect(screen.getByText('Role')).toBeDefined();
    });

    it('renders required field indicators', () => {
      renderForm({
        fields: [
          { name: 'name', type: 'text', label: 'Full Name', required: true },
        ],
      });

      const label = screen.getByText('Full Name');
      expect(label.closest('label')?.textContent).toContain('*');
    });

    it('renders initial values', () => {
      const { container } = renderForm({
        fields: [
          { name: 'name', type: 'text', label: 'Name' },
        ],
        initialValues: { name: 'Alice' },
      });

      const input = getInput(container, 'name');
      expect(input.value).toBe('Alice');
    });

    it('renders help text', () => {
      renderForm({
        fields: [
          { name: 'email', type: 'email', label: 'Email', helpText: 'We will not share your email' },
        ],
      });

      expect(screen.getByText('We will not share your email')).toBeDefined();
    });
  });

  describe('field types', () => {
    it('renders checkbox field', () => {
      renderForm({
        fields: [
          { name: 'agree', type: 'checkbox', label: 'I agree' },
        ],
      });

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeDefined();
      fireEvent.click(checkbox);
      expect((checkbox as HTMLInputElement).checked).toBe(true);
    });

    it('renders select field with options', () => {
      const { container } = renderForm({
        fields: [
          {
            name: 'country',
            type: 'select',
            label: 'Country',
            options: [
              { value: 'us', label: 'United States' },
              { value: 'uk', label: 'United Kingdom' },
            ],
          },
        ],
      });

      const select = getInput(container, 'country') as HTMLSelectElement;
      expect(select.options.length).toBe(3); // includes placeholder
      fireEvent.change(select, { target: { value: 'uk' } });
      expect(select.value).toBe('uk');
    });

    it('renders toggle field', () => {
      renderForm({
        fields: [
          { name: 'notifications', type: 'toggle', label: 'Notifications' },
        ],
      });

      const toggle = screen.getByRole('switch');
      expect(toggle.getAttribute('aria-checked')).toBe('false');
      fireEvent.click(toggle);
      expect(toggle.getAttribute('aria-checked')).toBe('true');
    });

    it('renders number field with min/max', () => {
      const { container } = renderForm({
        fields: [
          { name: 'age', type: 'number', label: 'Age', min: 0, max: 150 },
        ],
      });

      const input = getInput(container, 'age') as HTMLInputElement;
      expect(input.type).toBe('number');
      expect(input.min).toBe('0');
      expect(input.max).toBe('150');
    });

    it('renders radio field group', () => {
      renderForm({
        fields: [
          {
            name: 'size',
            type: 'radio',
            label: 'Size',
            options: [
              { value: 'sm', label: 'Small' },
              { value: 'md', label: 'Medium' },
              { value: 'lg', label: 'Large' },
            ],
          },
        ],
      });

      const radios = screen.getAllByRole('radio');
      expect(radios.length).toBe(3);
    });

    it('renders file upload field', () => {
      renderForm({
        fields: [
          { name: 'avatar', type: 'file', label: 'Avatar', accept: ['image/*'] },
        ],
      });

      expect(screen.getByText('Drop files here or click to browse')).toBeDefined();
    });
  });

  describe('validation', () => {
    it('shows required field error on blur', async () => {
      const { container } = renderForm({
        fields: [
          { name: 'name', type: 'text', label: 'Name', required: true },
        ],
      });

      const input = getInput(container, 'name');
      fireEvent.blur(input);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeDefined();
        expect(screen.getByText('Name is required')).toBeDefined();
      });
    });

    it('validates with per-field validation rules', async () => {
      const { container } = renderForm({
        fields: [
          {
            name: 'email',
            type: 'email',
            label: 'Email',
            validation: [
              { rule: 'required', message: 'Email is required' },
              { rule: 'email', message: 'Invalid email format' },
            ],
          },
        ],
      });

      const input = getInput(container, 'email');
      fireEvent.change(input, { target: { value: 'not-an-email' } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(screen.getByText('Invalid email format')).toBeDefined();
      });
    });

    it('validates with Zod schema on submit', async () => {
      const schema = z.object({
        name: z.string().min(1, 'Name cannot be empty'),
        email: z.string().email('Must be a valid email'),
      });

      const onSubmit = vi.fn();
      renderForm({
        fields: [
          { name: 'name', type: 'text', label: 'Name' },
          { name: 'email', type: 'email', label: 'Email' },
        ],
        validation: { schema },
        onSubmit,
      });

      fireEvent.click(screen.getByText('Submit'));

      await waitFor(() => {
        expect(screen.getByText('Name cannot be empty')).toBeDefined();
      });
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('clears error when field value changes after error', async () => {
      const { container } = renderForm({
        fields: [
          { name: 'name', type: 'text', label: 'Name', required: true },
        ],
      });

      const input = getInput(container, 'name');

      // Trigger error
      fireEvent.blur(input);
      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeDefined();
      });

      // Type a value, then blur again to re-validate
      fireEvent.change(input, { target: { value: 'Alice' } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(screen.queryByText('Name is required')).toBeNull();
      });
    });
  });

  describe('submission', () => {
    it('calls onSubmit with form values on valid submission', async () => {
      const onSubmit = vi.fn();
      renderForm({
        fields: [
          { name: 'name', type: 'text', label: 'Name' },
        ],
        initialValues: { name: 'Alice' },
        onSubmit,
      });

      fireEvent.click(screen.getByText('Submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({ name: 'Alice' });
      });
    });

    it('shows submit error on rejection', async () => {
      const onSubmit = vi.fn().mockRejectedValue(new Error('Server error'));
      renderForm({
        fields: [
          { name: 'name', type: 'text', label: 'Name' },
        ],
        initialValues: { name: 'Alice' },
        onSubmit,
      });

      fireEvent.click(screen.getByText('Submit'));

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeDefined();
      });
    });

    it('shows success message after successful submission', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      renderForm({
        fields: [
          { name: 'name', type: 'text', label: 'Name' },
        ],
        initialValues: { name: 'Alice' },
        onSubmit,
      });

      fireEvent.click(screen.getByText('Submit'));

      await waitFor(() => {
        expect(screen.getByText('Form submitted successfully')).toBeDefined();
      });
    });

    it('disables submit button during submission', async () => {
      let resolveSubmit!: () => void;
      const submitPromise = new Promise<void>(resolve => { resolveSubmit = resolve; });
      const onSubmit = vi.fn().mockReturnValue(submitPromise);

      renderForm({
        fields: [
          { name: 'name', type: 'text', label: 'Name' },
        ],
        initialValues: { name: 'Alice' },
        onSubmit,
      });

      fireEvent.click(screen.getByText('Submit'));

      await waitFor(() => {
        expect(screen.getByText('Submitting...')).toBeDefined();
        expect((screen.getByText('Submitting...') as HTMLButtonElement).disabled).toBe(true);
      });

      resolveSubmit();

      await waitFor(() => {
        expect(screen.getByText('Form submitted successfully')).toBeDefined();
      });
    });

    it('excludes hidden conditional fields from submission values', async () => {
      const onSubmit = vi.fn();
      renderForm({
        fields: [
          { name: 'type', type: 'text', label: 'Type' },
          {
            name: 'other',
            type: 'text',
            label: 'Other',
            visible: { field: 'type', operator: 'equals', value: 'other' },
          },
        ],
        initialValues: { type: 'standard', other: 'should-be-excluded' },
        onSubmit,
      });

      fireEvent.click(screen.getByText('Submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({ type: 'standard' });
      });
    });
  });

  describe('conditional visibility', () => {
    it('hides field when condition is not met', () => {
      const { container } = renderForm({
        fields: [
          { name: 'hasNotes', type: 'checkbox', label: 'Add notes' },
          {
            name: 'notes',
            type: 'textarea',
            label: 'Notes',
            visible: { field: 'hasNotes', operator: 'equals', value: true },
          },
        ],
      });

      // Notes should be hidden initially (checkbox is unchecked)
      expect(container.querySelector('[name="notes"]')).toBeNull();
    });

    it('shows field when condition becomes met', async () => {
      const { container } = renderForm({
        fields: [
          { name: 'hasNotes', type: 'checkbox', label: 'Add notes' },
          {
            name: 'notes',
            type: 'textarea',
            label: 'Notes',
            visible: { field: 'hasNotes', operator: 'equals', value: true },
          },
        ],
      });

      fireEvent.click(screen.getByRole('checkbox'));

      await waitFor(() => {
        expect(container.querySelector('[name="notes"]')).not.toBeNull();
      });
    });

    it('supports compound and/or conditions', () => {
      const { container } = renderForm({
        fields: [
          { name: 'role', type: 'text', label: 'Role' },
          { name: 'level', type: 'number', label: 'Level' },
          {
            name: 'admin_panel',
            type: 'text',
            label: 'Admin Panel',
            visible: {
              field: 'role',
              operator: 'equals',
              value: 'admin',
              and: [{ field: 'level', operator: 'greaterThan', value: 5 }],
            },
          },
        ],
        initialValues: { role: 'admin', level: 3 },
      });

      // Should be hidden because level is 3, not > 5
      expect(container.querySelector('[name="admin_panel"]')).toBeNull();
    });
  });

  describe('reset', () => {
    it('resets form to initial values', async () => {
      const onReset = vi.fn();
      const { container } = renderForm({
        fields: [
          { name: 'name', type: 'text', label: 'Name' },
        ],
        initialValues: { name: 'Alice' },
        showReset: true,
        onReset,
      });

      const input = getInput(container, 'name');
      fireEvent.change(input, { target: { value: 'Bob' } });
      expect(input.value).toBe('Bob');

      fireEvent.click(screen.getByText('Reset'));

      await waitFor(() => {
        expect(getInput(container, 'name').value).toBe('Alice');
      });
      expect(onReset).toHaveBeenCalled();
    });

    it('clears validation errors on reset', async () => {
      const { container } = renderForm({
        fields: [
          { name: 'name', type: 'text', label: 'Name', required: true },
        ],
        showReset: true,
      });

      // Trigger error
      fireEvent.blur(getInput(container, 'name'));
      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeDefined();
      });

      fireEvent.click(screen.getByText('Reset'));

      await waitFor(() => {
        expect(screen.queryByText('Name is required')).toBeNull();
      });
    });
  });

  describe('sections', () => {
    it('renders fields grouped by section', () => {
      const sections: SectionDef[] = [
        { name: 'personal', title: 'Personal Information' },
        { name: 'contact', title: 'Contact Details' },
      ];

      renderForm({
        fields: [
          { name: 'name', type: 'text', label: 'Name', section: 'personal' },
          { name: 'email', type: 'email', label: 'Email', section: 'contact' },
        ],
        sections,
      });

      expect(screen.getByText('Personal Information')).toBeDefined();
      expect(screen.getByText('Contact Details')).toBeDefined();
    });

    it('supports collapsible sections', async () => {
      const sections: SectionDef[] = [
        { name: 'advanced', title: 'Advanced Settings', collapsible: true, defaultCollapsed: false },
      ];

      const { container } = renderForm({
        fields: [
          { name: 'setting', type: 'text', label: 'Setting', section: 'advanced' },
        ],
        sections,
      });

      // Field is visible initially
      expect(container.querySelector('[name="setting"]')).not.toBeNull();

      // Click section header to collapse
      fireEvent.click(screen.getByText('Advanced Settings'));

      await waitFor(() => {
        expect(container.querySelector('[name="setting"]')).toBeNull();
      });
    });
  });

  describe('accessibility', () => {
    it('renders form landmark with aria-label', () => {
      renderForm({ 'aria-label': 'Registration form' });
      const form = screen.getByRole('form');
      expect(form.getAttribute('aria-label')).toBe('Registration form');
    });

    it('associates error messages via aria-describedby', async () => {
      const { container } = renderForm({
        fields: [
          { name: 'name', type: 'text', label: 'Name', required: true },
        ],
      });

      const input = getInput(container, 'name');
      fireEvent.blur(input);

      await waitFor(() => {
        const describedBy = input.getAttribute('aria-describedby');
        expect(describedBy).toBeTruthy();
        expect(input.getAttribute('aria-invalid')).toBe('true');
      });
    });

    it('marks required fields with aria-required', () => {
      const { container } = renderForm({
        fields: [
          { name: 'name', type: 'text', label: 'Name', required: true },
        ],
      });

      const input = getInput(container, 'name');
      expect(input.getAttribute('aria-required')).toBe('true');
    });
  });

  describe('two-column layout', () => {
    it('renders grid with two columns', () => {
      const { container } = renderForm({
        fields: [
          { name: 'first', type: 'text', label: 'First Name' },
          { name: 'last', type: 'text', label: 'Last Name' },
          { name: 'bio', type: 'textarea', label: 'Bio', span: 2 },
        ],
        layout: 'two-column',
      });

      const grid = container.querySelector('.prism-form-grid') as HTMLElement;
      expect(grid).toBeDefined();
      expect(grid.style.gridTemplateColumns).toBe('repeat(2, 1fr)');
    });
  });
});

describe('evaluateCondition', () => {
  it('evaluates equals', () => {
    expect(evaluateCondition(
      { field: 'role', operator: 'equals', value: 'admin' },
      { role: 'admin' },
    )).toBe(true);
    expect(evaluateCondition(
      { field: 'role', operator: 'equals', value: 'admin' },
      { role: 'user' },
    )).toBe(false);
  });

  it('evaluates isEmpty and isNotEmpty', () => {
    expect(evaluateCondition(
      { field: 'name', operator: 'isEmpty' },
      { name: '' },
    )).toBe(true);
    expect(evaluateCondition(
      { field: 'name', operator: 'isNotEmpty' },
      { name: 'Alice' },
    )).toBe(true);
  });

  it('evaluates compound and conditions', () => {
    const condition: ConditionExpression = {
      field: 'role',
      operator: 'equals',
      value: 'admin',
      and: [{ field: 'level', operator: 'greaterThan', value: 5 }],
    };
    expect(evaluateCondition(condition, { role: 'admin', level: 10 })).toBe(true);
    expect(evaluateCondition(condition, { role: 'admin', level: 3 })).toBe(false);
  });

  it('evaluates compound or conditions', () => {
    const condition: ConditionExpression = {
      field: 'status',
      operator: 'equals',
      value: 'active',
      or: [{ field: 'status', operator: 'equals', value: 'pending' }],
    };
    expect(evaluateCondition(condition, { status: 'pending' })).toBe(true);
    expect(evaluateCondition(condition, { status: 'inactive' })).toBe(false);
  });

  it('evaluates in and notIn', () => {
    expect(evaluateCondition(
      { field: 'role', operator: 'in', value: ['admin', 'superadmin'] },
      { role: 'admin' },
    )).toBe(true);
    expect(evaluateCondition(
      { field: 'role', operator: 'notIn', value: ['admin', 'superadmin'] },
      { role: 'user' },
    )).toBe(true);
  });

  it('caps nesting depth at 3', () => {
    const deepCondition: ConditionExpression = {
      field: 'a', operator: 'equals', value: 'x',
      and: [{
        field: 'b', operator: 'equals', value: 'y',
        and: [{
          field: 'c', operator: 'equals', value: 'z',
          and: [{
            field: 'd', operator: 'equals', value: 'w',
            and: [{
              field: 'e', operator: 'equals', value: 'v', // depth 4 — should short circuit to true
            }],
          }],
        }],
      }],
    };
    // d=w matches at depth 3 (still evaluated), but e=v at depth 4 is capped (returns true)
    // Even though e !== v, depth cap returns true at depth > 3
    expect(evaluateCondition(deepCondition, { a: 'x', b: 'y', c: 'z', d: 'w', e: 'WRONG' })).toBe(true);
    // Without the cap, e would need to equal 'v' — but it doesn't, so without cap this would be false
  });
});

describe('validateFieldRules', () => {
  it('validates required fields', () => {
    const field: FieldDef = { name: 'name', type: 'text', label: 'Name', required: true };
    expect(validateFieldRules(field, '')).toBe('Name is required');
    expect(validateFieldRules(field, 'Alice')).toBeNull();
  });

  it('validates email format', () => {
    const field: FieldDef = {
      name: 'email', type: 'email', label: 'Email',
      validation: [{ rule: 'email', message: 'Bad email' }],
    };
    expect(validateFieldRules(field, 'bad')).toBe('Bad email');
    expect(validateFieldRules(field, 'a@b.c')).toBeNull();
  });

  it('validates min/max length', () => {
    const field: FieldDef = {
      name: 'pw', type: 'password', label: 'Password',
      validation: [
        { rule: 'minLength', value: 8, message: 'Too short' },
        { rule: 'maxLength', value: 20, message: 'Too long' },
      ],
    };
    expect(validateFieldRules(field, 'short')).toBe('Too short');
    expect(validateFieldRules(field, 'a'.repeat(21))).toBe('Too long');
    expect(validateFieldRules(field, 'validpass')).toBeNull();
  });

  it('validates number min/max', () => {
    const field: FieldDef = {
      name: 'age', type: 'number', label: 'Age',
      validation: [
        { rule: 'min', value: 0, message: 'Too low' },
        { rule: 'max', value: 150, message: 'Too high' },
      ],
    };
    expect(validateFieldRules(field, -1)).toBe('Too low');
    expect(validateFieldRules(field, 200)).toBe('Too high');
    expect(validateFieldRules(field, 25)).toBeNull();
  });
});
