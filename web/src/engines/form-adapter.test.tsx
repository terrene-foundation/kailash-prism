/**
 * FormAdapter tests — covers the adapter lifecycle: initialValues seed,
 * async validate, submit + result caching, renderResult slot, onReset.
 *
 * Spec: docs/specs/05-engine-specifications.md § 5.2.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import {
  Form,
  type FieldDef,
  type FormAdapter,
} from './form.js';

const defaultFields: FieldDef[] = [
  { name: 'name', type: 'text', label: 'Name', required: true },
];

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('FormAdapter', () => {
  describe('adapter.submit', () => {
    it('calls adapter.submit on form submit', async () => {
      const submit = vi.fn().mockResolvedValue({ ok: true });
      const adapter: FormAdapter = { submit };

      const { container } = render(<Form fields={defaultFields} adapter={adapter} />);
      fireEvent.change(container.querySelector('[name="name"]')!, { target: { value: 'Alice' } });
      fireEvent.submit(container.querySelector('form')!);

      await waitFor(() => {
        expect(submit).toHaveBeenCalledTimes(1);
      });
      expect(submit).toHaveBeenCalledWith({ name: 'Alice' });
    });

    it('surfaces adapter.submit rejection through the submitError banner', async () => {
      const submit = vi.fn().mockRejectedValue(new Error('Backend down'));
      const adapter: FormAdapter = { submit };

      const { container } = render(<Form fields={defaultFields} adapter={adapter} />);
      fireEvent.change(container.querySelector('[name="name"]')!, { target: { value: 'Alice' } });
      fireEvent.submit(container.querySelector('form')!);

      await waitFor(() => {
        expect(screen.getByRole('alert').textContent).toContain('Backend down');
      });
    });
  });

  describe('adapter.renderResult', () => {
    it('renders result below the form after successful submit', async () => {
      interface Values extends Record<string, unknown> { name: string }
      type Result = { greeting: string };
      const adapter: FormAdapter<Values, Result> = {
        submit: async (values: Values) => ({ greeting: `Hello, ${values.name}` }),
        renderResult: (_values: Values, result: Result) => <div data-testid="result">{result.greeting}</div>,
      };

      const { container } = render(<Form fields={defaultFields} adapter={adapter as FormAdapter} />);
      fireEvent.change(container.querySelector('[name="name"]')!, { target: { value: 'Alice' } });
      fireEvent.submit(container.querySelector('form')!);

      await waitFor(() => {
        expect(screen.getByTestId('result').textContent).toBe('Hello, Alice');
      });
    });

    it('does not render result before submit', () => {
      const adapter: FormAdapter = {
        submit: vi.fn(),
        renderResult: () => <div data-testid="result">never</div>,
      };

      render(<Form fields={defaultFields} adapter={adapter} />);
      expect(screen.queryByTestId('result')).toBeNull();
    });

    it('clears cached result when user edits after submit', async () => {
      const adapter: FormAdapter = {
        submit: async (values: Record<string, unknown>) => ({ echo: values.name }),
        renderResult: (_v: Record<string, unknown>, result: unknown) =>
          <div data-testid="result">{(result as { echo: string }).echo}</div>,
      };

      const { container } = render(<Form fields={defaultFields} adapter={adapter} />);
      fireEvent.change(container.querySelector('[name="name"]')!, { target: { value: 'Alice' } });
      fireEvent.submit(container.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByTestId('result').textContent).toBe('Alice');
      });

      fireEvent.change(container.querySelector('[name="name"]')!, { target: { value: 'Bob' } });
      expect(screen.queryByTestId('result')).toBeNull();
    });

    it('wraps result in a region with aria-label', async () => {
      const adapter: FormAdapter = {
        submit: async () => ({ ok: true }),
        renderResult: () => <span>result-body</span>,
      };

      const { container } = render(<Form fields={defaultFields} adapter={adapter} />);
      fireEvent.change(container.querySelector('[name="name"]')!, { target: { value: 'Alice' } });
      fireEvent.submit(container.querySelector('form')!);

      await waitFor(() => {
        const region = screen.getByTestId('prism-form-result');
        expect(region.getAttribute('role')).toBe('region');
        expect(region.getAttribute('aria-label')).toBe('Form result');
      });
    });
  });

  describe('adapter.initialValues', () => {
    it('seeds values from a sync adapter.initialValues()', async () => {
      const adapter: FormAdapter = {
        initialValues: () => ({ name: 'Seeded' }),
        submit: vi.fn(),
      };

      const { container } = render(<Form fields={defaultFields} adapter={adapter} />);
      await waitFor(() => {
        expect((container.querySelector('[name="name"]') as HTMLInputElement).value).toBe('Seeded');
      });
    });

    it('seeds values from an async adapter.initialValues()', async () => {
      const adapter: FormAdapter = {
        initialValues: () => Promise.resolve({ name: 'AsyncSeeded' }),
        submit: vi.fn(),
      };

      const { container } = render(<Form fields={defaultFields} adapter={adapter} />);
      await waitFor(() => {
        expect((container.querySelector('[name="name"]') as HTMLInputElement).value).toBe('AsyncSeeded');
      });
    });

    it('still renders form when adapter.initialValues() rejects', async () => {
      // Rule 3 guard: adapter failure seeds fall back to field defaults —
      // form stays usable, submit path remains available.
      const adapter: FormAdapter = {
        initialValues: () => Promise.reject(new Error('boom')),
        submit: vi.fn(),
      };

      const { container } = render(<Form fields={defaultFields} adapter={adapter} />);
      await waitFor(() => {
        expect(container.querySelector('[name="name"]')).toBeDefined();
      });
      expect((container.querySelector('[name="name"]') as HTMLInputElement).value).toBe('');
    });

    it('explicit initialValues prop wins over adapter seed', async () => {
      const adapter: FormAdapter = {
        initialValues: () => ({ name: 'FromAdapter' }),
        submit: vi.fn(),
      };

      const { container } = render(
        <Form fields={defaultFields} adapter={adapter} initialValues={{ name: 'FromProp' }} />,
      );
      await waitFor(() => {
        expect((container.querySelector('[name="name"]') as HTMLInputElement).value).toBe('FromProp');
      });
    });
  });

  describe('adapter.validate', () => {
    it('cancels submit when adapter.validate returns errors', async () => {
      const submit = vi.fn();
      const adapter: FormAdapter = {
        validate: () => ({ name: 'Name is taken' }),
        submit,
      };

      const { container } = render(<Form fields={defaultFields} adapter={adapter} />);
      fireEvent.change(container.querySelector('[name="name"]')!, { target: { value: 'Alice' } });
      fireEvent.submit(container.querySelector('form')!);

      await waitFor(() => {
        expect(screen.getByText('Name is taken')).toBeDefined();
      });
      expect(submit).not.toHaveBeenCalled();
    });

    it('proceeds to submit when adapter.validate returns empty object', async () => {
      const submit = vi.fn().mockResolvedValue({ ok: true });
      const adapter: FormAdapter = {
        validate: async () => ({}),
        submit,
      };

      const { container } = render(<Form fields={defaultFields} adapter={adapter} />);
      fireEvent.change(container.querySelector('[name="name"]')!, { target: { value: 'Alice' } });
      fireEvent.submit(container.querySelector('form')!);

      await waitFor(() => {
        expect(submit).toHaveBeenCalledWith({ name: 'Alice' });
      });
    });

    it('supports async adapter.validate', async () => {
      const adapter: FormAdapter = {
        validate: () => Promise.resolve({ name: 'Async rejection' }),
        submit: vi.fn(),
      };

      const { container } = render(<Form fields={defaultFields} adapter={adapter} />);
      fireEvent.change(container.querySelector('[name="name"]')!, { target: { value: 'Alice' } });
      fireEvent.submit(container.querySelector('form')!);

      await waitFor(() => {
        expect(screen.getByText('Async rejection')).toBeDefined();
      });
    });
  });

  describe('adapter.onReset', () => {
    it('invokes adapter.onReset when form is reset', async () => {
      const onReset = vi.fn();
      const adapter: FormAdapter = {
        submit: async () => ({ ok: true }),
        onReset,
      };

      const { container } = render(
        <Form fields={defaultFields} adapter={adapter} showReset />,
      );
      const form = container.querySelector('form')!;

      await act(async () => {
        fireEvent.reset(form);
      });
      expect(onReset).toHaveBeenCalledTimes(1);
    });

    it('clears cached submission on reset', async () => {
      const adapter: FormAdapter = {
        submit: async (values: Record<string, unknown>) => ({ echo: values.name }),
        renderResult: (_v: Record<string, unknown>, result: unknown) =>
          <div data-testid="result">{(result as { echo: string }).echo}</div>,
      };

      const { container } = render(
        <Form fields={defaultFields} adapter={adapter} showReset />,
      );
      fireEvent.change(container.querySelector('[name="name"]')!, { target: { value: 'Alice' } });
      fireEvent.submit(container.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByTestId('result').textContent).toBe('Alice');
      });

      await act(async () => {
        fireEvent.reset(container.querySelector('form')!);
      });
      expect(screen.queryByTestId('result')).toBeNull();
    });
  });

  describe('validation precedence', () => {
    it('per-field required validation fires before adapter.submit', async () => {
      const submit = vi.fn();
      const adapter: FormAdapter = { submit };

      const { container } = render(
        <Form fields={defaultFields} adapter={adapter} />,
      );
      // Submit empty form — `name` is required.
      fireEvent.submit(container.querySelector('form')!);

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeDefined();
      });
      expect(submit).not.toHaveBeenCalled();
    });
  });

  describe('onSubmit back-compat', () => {
    it('still works with onSubmit only (no adapter)', async () => {
      const onSubmit = vi.fn();

      const { container } = render(
        <Form fields={defaultFields} onSubmit={onSubmit} />,
      );
      fireEvent.change(container.querySelector('[name="name"]')!, { target: { value: 'Alice' } });
      fireEvent.submit(container.querySelector('form')!);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({ name: 'Alice' });
      });
    });

    it('adapter wins when both onSubmit and adapter are provided', async () => {
      const onSubmit = vi.fn();
      const adapterSubmit = vi.fn().mockResolvedValue({ ok: true });
      const adapter: FormAdapter = { submit: adapterSubmit };

      // Silence the expected dev-mode warning for this test.
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { container } = render(
        <Form fields={defaultFields} onSubmit={onSubmit} adapter={adapter} />,
      );
      fireEvent.change(container.querySelector('[name="name"]')!, { target: { value: 'Alice' } });
      fireEvent.submit(container.querySelector('form')!);

      await waitFor(() => {
        expect(adapterSubmit).toHaveBeenCalledTimes(1);
      });
      expect(onSubmit).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalled();
    });

    it('throws a clear error when neither onSubmit nor adapter is provided', () => {
      const originalError = console.error;
      console.error = () => {};
      try {
        expect(() => render(
          <Form fields={defaultFields} {...({} as Record<string, never>)} />,
        )).toThrow(/requires either .onSubmit. or .adapter./);
      } finally {
        console.error = originalError;
      }
    });
  });
});
