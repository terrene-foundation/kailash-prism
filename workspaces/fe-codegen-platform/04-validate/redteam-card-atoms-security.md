# Shard 4 Security Review — Card atom + CardGrid + DataTable card-grid mode

Branch: `feat/card-atoms` vs `main`
Files in scope: `web/src/atoms/card.tsx`, `web/src/organisms/card-grid.tsx`, `web/src/engines/data-table/data-table-root.tsx` (CardItem + defaultCardBody)

## HIGH

None.

## MEDIUM

### MEDIUM-CARDGRID-ACTIONS-HREF-SILENTLY-DROPPED

`data-table-root.tsx:393-429` — `CardItem` footer renders `rowActions` exclusively as `<button>` and always calls `executeRowAction` on click. `DataTableRowAction` (`types.ts:214-235`) declares `href` and `onExecute` as mutually exclusive variants; table mode honours this at `data-table-body.tsx:465-488` with a `sanitizeHref` scheme allowlist. In card-grid mode, an `action` defined with `href` (and no `onExecute`) renders a button that calls `executeRowAction(action, …)` — which in `use-data-table.ts:512+` routes to `action.onExecute?.(...)`. With `onExecute` undefined the click becomes a silent no-op.

Not an injection vector (no `action.href` string reaches the DOM, so `javascript:` URLs cannot execute), but it is a **security-relevant behaviour drift**: a consumer migrating from table to card-grid silently loses navigation for every href-only action, with no runtime warning and no type error. If a navigation action is "Open secure audit log" and it degrades to no-op, users think the action was attempted when it was not.

Fix options: (a) render anchors with `sanitizeHref` in `CardItem` (parity with table mode), or (b) throw/warn when `CardItem` is asked to render an href-only action.

## LOW

### LOW-CARDGRID-CONFIGKEY-TRUST

`card-grid.tsx:65` interpolates `configKey` into an inline `<style>` tag. `configKey` is derived from four `number`-typed fields on `ResponsiveColumns`. Each is wrapped in `String(...)` before interpolation. TypeScript consumers get compile-time safety; JS consumers or `any`-cast consumers could pass a non-number (e.g. `"1}; body { display:none"`). `String(...)` preserves the string verbatim and produces `.prism-card-grid-1-2-3-1}; body { …` inside the style tag — a CSS-injection primitive (can hide elements, exfiltrate via `background-image: url(...)` attribute selectors, etc.).

Recommendation: coerce with `Number(cols.mobile) | 0` or validate with a `1 ≤ n ≤ 24` integer check at the boundary. Defence in depth; low severity because the typed contract is the intended enforcement point and no runtime path currently supplies attacker-controlled columns.

## PASSED CHECKS

- No hardcoded secrets, DB queries, `eval`, `innerHTML`, `dangerouslySetInnerHTML` across the diff (grep clean).
- `Card` title/subtitle/children/media/footer are ReactNodes — React-escaped. `styleProp` spread is scoped to CSSProperties (typed); arbitrary keys in JS still produce React-escaped string values, no injection.
- `defaultCardBody` renders values via `col.render` or `String(value ?? '')` — same posture as table-mode cell renderer.
- `aria-label` on `CardGrid` is a React-escaped attribute string.
- `CardItem` rowAction buttons use typed React props; `action.label` and `action.icon` are ReactNodes; `action.id` appears only as `key`.
- No anchor branch in `CardItem` means no `javascript:` URL surface in this mode (but see MEDIUM above for the drift risk).
