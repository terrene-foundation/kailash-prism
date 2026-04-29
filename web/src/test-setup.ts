/**
 * Test setup — polyfills for jsdom environment
 */

// jsdom doesn't implement matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: query === "(prefers-color-scheme: dark)" ? false : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  }),
});

// jsdom emits "Not implemented: navigation (except hash changes)" whenever an
// anchor with `href` is clicked. The navigation is queued via setTimeout, so
// the warning fires asynchronously and can land in an unrelated next test's
// stderr as cross-test contamination. Production behavior is unchanged — this
// listener only runs under the jsdom test environment. preventDefault on the
// anchor click stops jsdom's queued navigation without affecting React
// synthetic-event handlers, which have already run by the time this
// capture-phase listener fires.
window.addEventListener(
  "click",
  (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    const anchor = target?.closest("a");
    if (anchor instanceof HTMLAnchorElement && anchor.hasAttribute("href")) {
      e.preventDefault();
    }
  },
  true,
);
