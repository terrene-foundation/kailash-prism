/**
 * Form Engine — Tier 2 wiring test
 *
 * Spec: docs/specs/05-engine-specifications.md § 5.2
 * Rule: .claude/rules/orphan-detection.md MUST Rule 2 + 2a (wired engine
 * paired-operation round-trip), .claude/rules/facade-manager-detection.md
 * MUST Rule 2 (naming convention, frontend-adapted).
 *
 * Imports Form + FormAdapter types ONLY through the barrel at `../index.ts`.
 * The adapter is a REAL in-memory implementation — `submit`, `initialValues`,
 * `validate`, `renderResult`, and `onReset` all have concrete bodies that
 * mutate shared local state. Spies on the concrete instance observe behavior
 * without replacing it (no `vi.fn()` impersonates a method).
 *
 * Paired-operation round-trip: initialValues → user edits → validate → submit
 * → renderResult → reset → onReset. If any half drifts (e.g. submit stops
 * calling adapter, or reset stops clearing the result), the test fails.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  Form,
  FormWizard,
  useFormContext,
  evaluateCondition,
  validateFieldRules,
  type FieldDef,
  type FormAdapter,
  type WizardStep,
} from '../index.js';

// --- Real in-memory adapter (no vi.fn() standins) ---

interface ContactValues extends Record<string, unknown> {
  name: string;
  email: string;
  notes: string;
}
interface ContactResult {
  id: string;
  confirmation: string;
}

/**
 * Concrete adapter backed by a map + a validator + a seed. The Form engine
 * calls real methods and observes real state changes.
 */
function createContactAdapter(seed: Partial<ContactValues> = {}): FormAdapter<ContactValues, ContactResult> & {
  readonly store: Map<string, ContactValues>;
  readonly resetCount: { n: number };
} {
  const store = new Map<string, ContactValues>();
  const resetCount = { n: 0 };

  const adapter: FormAdapter<ContactValues, ContactResult> = {
    initialValues: () => ({
      name: seed.name ?? '',
      email: seed.email ?? '',
      notes: seed.notes ?? '',
    }),
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (values.email && !values.email.includes('@')) {
        errors['email'] = 'Email must contain @';
      }
      return errors;
    },
    submit: async (values) => {
      const id = `contact-${store.size + 1}`;
      store.set(id, values);
      return { id, confirmation: `Saved ${values.name} as ${id}` };
    },
    renderResult: (_values, result) => (
      <div role="status" data-testid="submission-result">{result.confirmation}</div>
    ),
    onReset: () => {
      resetCount.n += 1;
    },
  };

  return Object.assign(adapter, { store, resetCount });
}

// --- Fixtures ---

const fields: FieldDef[] = [
  { name: 'name', type: 'text', label: 'Name', required: true },
  { name: 'email', type: 'email', label: 'Email', required: true },
  { name: 'notes', type: 'textarea', label: 'Notes' },
];

beforeEach(() => {
  vi.restoreAllMocks();
});

// --- Tests ---

describe('Form engine — barrel wiring', () => {
  it('re-exports public surface through the barrel', () => {
    expect(typeof Form).toBe('function');
    expect(typeof FormWizard).toBe('function');
    expect(typeof useFormContext).toBe('function');
    expect(typeof evaluateCondition).toBe('function');
    expect(typeof validateFieldRules).toBe('function');
  });

  it('seeds initial values from adapter.initialValues', async () => {
    const adapter = createContactAdapter({ name: 'Seeded Alice', email: 'alice@example.com' });

    const { container } = render(<Form fields={fields} adapter={adapter as FormAdapter} />);

    // User sees the seeded values in the inputs.
    await waitFor(() => {
      const nameInput = container.querySelector('[name="name"]') as HTMLInputElement;
      expect(nameInput.value).toBe('Seeded Alice');
      const emailInput = container.querySelector('[name="email"]') as HTMLInputElement;
      expect(emailInput.value).toBe('alice@example.com');
    });
  });

  it('round-trips: user edits → submit → adapter.store + renderResult', async () => {
    // Seed with a sentinel so the test can wait for RESET to land before
    // the user "types". `seedApplied` only fires once, so after we observe
    // the sentinel we can safely dispatch SET_VALUE without clobber races.
    const adapter = createContactAdapter({ name: 'seed-name' });
    const submitSpy = vi.spyOn(adapter, 'submit');

    const { container } = render(<Form fields={fields} adapter={adapter as FormAdapter} />);

    // Wait for adapter seed to be applied — RESET has fired.
    await waitFor(() => {
      expect((container.querySelector('[name="name"]') as HTMLInputElement).value).toBe('seed-name');
    });

    // User edits all fields (overwriting the seed).
    await act(async () => {
      fireEvent.change(container.querySelector('[name="name"]')!, { target: { value: 'Bob' } });
      fireEvent.change(container.querySelector('[name="email"]')!, { target: { value: 'bob@example.com' } });
      fireEvent.change(container.querySelector('[name="notes"]')!, { target: { value: 'VIP customer' } });
    });

    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });

    // Adapter.submit was called exactly once with the typed values.
    await waitFor(() => expect(submitSpy).toHaveBeenCalledTimes(1));
    expect(submitSpy).toHaveBeenCalledWith({ name: 'Bob', email: 'bob@example.com', notes: 'VIP customer' });

    // Read-back: the adapter's store has the record.
    expect(adapter.store.size).toBe(1);
    const entries = Array.from(adapter.store.entries());
    const [id, stored] = entries[0]!;
    expect(stored.name).toBe('Bob');
    expect(id).toMatch(/^contact-/);

    // renderResult rendered below the form (user-observable effect).
    const result = await screen.findByTestId('submission-result');
    expect(result.textContent).toContain('Saved Bob as contact-1');
  });

  it('async validate errors block submit and surface inline', async () => {
    // Seed the adapter with non-empty values so we can wait on the
    // RESET-after-initialValues-resolves without races against empty defaults.
    const adapter = createContactAdapter({ name: 'Carol', email: 'seeded@example.com' });
    const submitSpy = vi.spyOn(adapter, 'submit');

    const { container } = render(<Form fields={fields} adapter={adapter as FormAdapter} />);

    // Wait for the adapter seed to land — only then is RESET done and the
    // reducer accepts subsequent SET_VALUE without being clobbered.
    await waitFor(() => {
      expect((container.querySelector('[name="name"]') as HTMLInputElement).value).toBe('Carol');
    });

    await act(async () => {
      fireEvent.change(container.querySelector('[name="email"]')!, { target: { value: 'not-an-email' } });
    });
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });

    // adapter.validate rejected → submit NOT called → user sees validator error.
    await waitFor(() => {
      expect(screen.getByText('Email must contain @')).toBeDefined();
    });
    expect(submitSpy).not.toHaveBeenCalled();
    expect(adapter.store.size).toBe(0);
  });

  it('round-trips: submit → reset → adapter.onReset + cleared form', async () => {
    // Seed with non-empty so the waitFor after render proves RESET landed.
    const adapter = createContactAdapter({ name: 'Dana', email: 'dana@example.com' });
    const resetSpy = vi.spyOn(adapter, 'onReset');

    const { container } = render(
      <Form fields={fields} adapter={adapter as FormAdapter} showReset />,
    );

    await waitFor(() => {
      expect((container.querySelector('[name="name"]') as HTMLInputElement).value).toBe('Dana');
    });

    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });

    // Wait for the result slot to appear.
    await screen.findByTestId('submission-result');
    expect(adapter.store.size).toBe(1);

    // User clicks reset.
    const resetBtn = screen.getByRole('button', { name: /reset/i });
    await act(async () => {
      fireEvent.click(resetBtn);
    });

    // adapter.onReset invoked; counter incremented.
    expect(resetSpy).toHaveBeenCalledTimes(1);
    expect(adapter.resetCount.n).toBe(1);

    // Form returns to seeded defaults (the seed, NOT empty), result slot gone.
    await waitFor(() => {
      const nameInput = container.querySelector('[name="name"]') as HTMLInputElement;
      expect(nameInput.value).toBe('Dana');
      expect(screen.queryByTestId('submission-result')).toBeNull();
    });
  });

  it('surfaces adapter.submit rejection via the submit-error banner', async () => {
    const adapter = createContactAdapter({ name: 'Eve', email: 'eve@example.com' });
    // Replace submit with a concrete rejecting body — not a vi.fn mock.
    adapter.submit = async () => {
      throw new Error('Backend unreachable');
    };

    const { container } = render(<Form fields={fields} adapter={adapter as FormAdapter} />);
    await waitFor(() => {
      expect((container.querySelector('[name="name"]') as HTMLInputElement).value).toBe('Eve');
    });

    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });

    // Error banner announced via role="alert" (multiple alerts may exist —
    // per-field errors plus the form-level banner — so we search for the
    // banner that contains the adapter-propagated message).
    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      const banner = alerts.find((el) => el.textContent?.includes('Backend unreachable'));
      expect(banner).toBeDefined();
    });
    expect(adapter.store.size).toBe(0);
  });

  it('FormWizard composes multiple steps and calls onSubmit with the merged payload', async () => {
    // FormWizard uses `onSubmit` (not `adapter`) — the merged-payload shape is
    // the externally-observable effect we verify.
    const collected: Array<Record<string, unknown>> = [];

    const steps: WizardStep[] = [
      { name: 'identity', title: 'Identity', fields: [fields[0]!, fields[1]!] },
      { name: 'details', title: 'Details', fields: [fields[2]!] },
    ];

    const { container } = render(
      <FormWizard
        steps={steps}
        onSubmit={(values) => {
          collected.push(values);
        }}
      />,
    );

    // Step 1: fill and Next.
    await waitFor(() => {
      expect(container.querySelector('[name="name"]')).toBeDefined();
    });
    await act(async () => {
      fireEvent.change(container.querySelector('[name="name"]')!, { target: { value: 'Frank' } });
      fireEvent.change(container.querySelector('[name="email"]')!, { target: { value: 'frank@example.com' } });
    });
    const nextBtn = await screen.findByRole('button', { name: /next/i });
    await act(async () => {
      fireEvent.click(nextBtn);
    });

    // Step 2: fill notes and Submit.
    await waitFor(() => {
      expect(container.querySelector('[name="notes"]')).toBeDefined();
    });
    await act(async () => {
      fireEvent.change(container.querySelector('[name="notes"]')!, { target: { value: 'Wizard path' } });
    });
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });

    // onSubmit received the cumulative payload merged across both steps.
    await waitFor(() => expect(collected.length).toBe(1));
    expect(collected[0]).toEqual({ name: 'Frank', email: 'frank@example.com', notes: 'Wizard path' });
  });
});
