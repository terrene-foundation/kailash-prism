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

    it('still renders form when adapter.initialValues() rejects, with dev-mode console.error', async () => {
      // Rule 3 guard: adapter failure seeds fall back to field defaults —
      // form stays usable, submit path remains available — AND emits a
      // dev-mode console.error so the draft-load failure isn't invisible.
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      const adapter: FormAdapter = {
        initialValues: () => Promise.reject(new Error('boom')),
        submit: vi.fn(),
      };

      const { container } = render(<Form fields={defaultFields} adapter={adapter} />);
      await waitFor(() => {
        expect(container.querySelector('[name="name"]')).toBeDefined();
        expect(error).toHaveBeenCalledWith(
          expect.stringContaining('adapter.initialValues() failed'),
          expect.any(String),
        );
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

    it('invokes adapter.onReset when renderActions.reset() is called programmatically', async () => {
      // This is the critical path for calculators / forms that use
      // renderActions to supply a custom reset button (default showReset
      // is false). Without a test, the programmatic path is unpinned.
      const onReset = vi.fn();
      const adapter: FormAdapter = {
        submit: async () => ({ ok: true }),
        onReset,
      };

      render(
        <Form
          fields={defaultFields}
          adapter={adapter}
          renderActions={state => (
            <>
              <button type="button" onClick={state.reset} data-testid="custom-reset">
                Custom reset
              </button>
              <button type="submit">Submit</button>
            </>
          )}
        />,
      );

      await act(async () => {
        screen.getByTestId('custom-reset').click();
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

  describe('submission lifecycle edge cases', () => {
    it('supports a synchronous adapter.submit', async () => {
      // The interface documents submit(): Promise<TResult> | TResult. Test
      // pins the sync path so a future refactor that assumes submit().then()
      // breaks loudly instead of silently.
      const adapter: FormAdapter = {
        submit: (values: Record<string, unknown>) => ({ echo: values.name as string }),
        renderResult: (_v: Record<string, unknown>, result: unknown) =>
          <div data-testid="sync-result">{(result as { echo: string }).echo}</div>,
      };

      const { container } = render(<Form fields={defaultFields} adapter={adapter} />);
      fireEvent.change(container.querySelector('[name="name"]')!, { target: { value: 'Sync' } });
      fireEvent.submit(container.querySelector('form')!);

      await waitFor(() => {
        expect(screen.getByTestId('sync-result').textContent).toBe('Sync');
      });
    });

    it('surfaces adapter.validate rejection through the submitError banner', async () => {
      // validate() that throws (rather than resolving to Record<string,string>)
      // should fall through to the submit-error catch — pinning this so a
      // future change to split "validate errors" from "validate throws"
      // doesn't silently regress.
      const submit = vi.fn();
      const adapter: FormAdapter = {
        validate: () => Promise.reject(new Error('validate blew up')),
        submit,
      };

      const { container } = render(<Form fields={defaultFields} adapter={adapter} />);
      fireEvent.change(container.querySelector('[name="name"]')!, { target: { value: 'Alice' } });
      fireEvent.submit(container.querySelector('form')!);

      await waitFor(() => {
        expect(screen.getByRole('alert').textContent).toContain('validate blew up');
      });
      expect(submit).not.toHaveBeenCalled();
    });

    it('keeps the previous cached result visible when a later submit fails (DD-F3)', async () => {
      // DD-F3: "when the user submits and the adapter throws, the previous
      // cached result stays visible so the user can see what they had
      // before retrying." Only a NEW successful submit overwrites the
      // cache.
      let shouldFail = false;
      const adapter: FormAdapter = {
        submit: async (values: Record<string, unknown>) => {
          if (shouldFail) throw new Error('down');
          return { echo: values.name as string };
        },
        renderResult: (_v: Record<string, unknown>, result: unknown) =>
          <div data-testid="result">{(result as { echo: string }).echo}</div>,
      };

      const { container } = render(<Form fields={defaultFields} adapter={adapter} />);
      fireEvent.change(container.querySelector('[name="name"]')!, { target: { value: 'Alice' } });
      fireEvent.submit(container.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByTestId('result').textContent).toBe('Alice');
      });

      // Re-submit the same values (no edit so the cache is not cleared by
      // SET_VALUE), with the adapter now failing.
      shouldFail = true;
      fireEvent.submit(container.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByRole('alert').textContent).toContain('down');
      });
      // Previous cached result MUST still be visible.
      expect(screen.getByTestId('result').textContent).toBe('Alice');
    });

    it('clears cached submission on programmatic setValue after success', async () => {
      // DD-F3: any SET_VALUE after status='success' clears submission,
      // regardless of source (user typing, programmatic setValue from a
      // custom renderer, etc.). Pin the broad clearing behavior so
      // consumers don't rely on user-vs-programmatic distinction.
      const adapter: FormAdapter = {
        submit: async (values: Record<string, unknown>) => ({ echo: values.name as string }),
        renderResult: (_v: Record<string, unknown>, result: unknown) =>
          <div data-testid="result">{(result as { echo: string }).echo}</div>,
      };

      const { container } = render(<Form fields={defaultFields} adapter={adapter} />);
      fireEvent.change(container.querySelector('[name="name"]')!, { target: { value: 'Alice' } });
      fireEvent.submit(container.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByTestId('result').textContent).toBe('Alice');
      });

      // A fresh change event mimics any SET_VALUE dispatch (user or
      // programmatic — both route through the same reducer).
      fireEvent.change(container.querySelector('[name="name"]')!, { target: { value: 'Bob' } });
      expect(screen.queryByTestId('result')).toBeNull();
    });

    it('sanitizes control characters in submit-error messages', async () => {
      const adapter: FormAdapter = {
        submit: async () => {
          // Control chars, newlines, and a long tail — all should be
          // stripped/truncated before hitting the banner.
          throw new Error('bad\x00request\nwith control\x1Fchars');
        },
      };

      const { container } = render(<Form fields={defaultFields} adapter={adapter} />);
      fireEvent.change(container.querySelector('[name="name"]')!, { target: { value: 'Alice' } });
      fireEvent.submit(container.querySelector('form')!);

      await waitFor(() => {
        const banner = screen.getByRole('alert').textContent || '';
        expect(banner).not.toMatch(/[\x00\x1F]/);
        expect(banner).toContain('request');
      });
    });

    it('does not dispatch or write to live region after unmount mid-submit', async () => {
      // HIGH-NO-CANCEL-ON-UNMOUNT: unmounted Form during an in-flight
      // submit must NOT dispatch on the stale reducer nor write to the
      // detached liveRegion DOM. React would warn in dev; here we just
      // assert no error is thrown and no state leaks via rendered output.
      let resolveSubmit: ((value: { ok: boolean }) => void) | null = null;
      const adapter: FormAdapter = {
        submit: () => new Promise<{ ok: boolean }>(resolve => {
          resolveSubmit = resolve;
        }),
      };

      const { container, unmount } = render(<Form fields={defaultFields} adapter={adapter} />);
      fireEvent.change(container.querySelector('[name="name"]')!, { target: { value: 'Alice' } });
      fireEvent.submit(container.querySelector('form')!);

      unmount();
      // Complete the submit AFTER unmount. The post-await branch must bail
      // out via isMountedRef — no exception, no act-warnings.
      await act(async () => {
        resolveSubmit?.({ ok: true });
        await Promise.resolve();
      });
      // No assertion on DOM — the guard is tested by absence of errors.
      // If the guard is removed, React emits "Can't perform a React state
      // update on an unmounted component" which vitest surfaces.
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

    it('dev-mode "both paths" warning fires at most once per instance', async () => {
      // HIGH-DEV-MODE-WARN-FIRES-EVERY-RENDER: a parent that re-renders
      // N times must NOT generate N warnings — the warn is guarded by a
      // one-shot ref scoped to the Form instance.
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const adapter: FormAdapter = { submit: vi.fn().mockResolvedValue({ ok: true }) };

      const { rerender } = render(
        <Form fields={defaultFields} onSubmit={vi.fn()} adapter={adapter} />,
      );
      for (let i = 0; i < 5; i++) {
        rerender(<Form fields={defaultFields} onSubmit={vi.fn()} adapter={adapter} />);
      }
      const bothPathsWarnings = warn.mock.calls.filter(call =>
        typeof call[0] === 'string' && call[0].includes('Both `onSubmit` and `adapter`')
      );
      expect(bothPathsWarnings).toHaveLength(1);
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
