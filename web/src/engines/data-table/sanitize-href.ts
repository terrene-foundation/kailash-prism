/**
 * Safe href schemes for row-action anchors.
 *
 * `action.href` is consumer code — the return value can incorporate user-
 * controlled data (backend fields flowing through a `row.externalUrl` hook,
 * for example). React's auto-escaping prevents HTML injection in text
 * children but does NOT validate URL schemes. An attacker-controlled
 * `javascript:alert(1)` href becomes click-to-XSS.
 *
 * Engine-side defense: rewrite any non-allowlisted scheme to `#`. Consumers
 * with legitimate internal protocol handlers can switch to `onExecute` +
 * `window.location.assign`.
 *
 * Shared between table-mode and card-grid-mode row action renderers so the
 * allowlist lives in exactly one place.
 */

const SAFE_HREF_SCHEME = /^(?:https?:|mailto:|tel:|[/?#])/i;

export function sanitizeHref(href: string): string {
  // Strip surrounding whitespace — `"  javascript:..."` also triggers the
  // browser's URL parser to execute JS.
  const trimmed = href.trim();
  if (trimmed === '') return '#';
  if (SAFE_HREF_SCHEME.test(trimmed)) return trimmed;
  return '#';
}
