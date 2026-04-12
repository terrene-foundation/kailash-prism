# Engine Spec Gaps — Must Resolve During Implementation

**Source**: Red team pre-implementation round 1, implementability audit
**Status**: Document for implementation agents. These gaps MUST be resolved (spec updated) when building the corresponding engine in Sprint B1/B3a.

---

## Navigation Engine (Sprint B1) — top-nav/bottom-nav responsive behavior

**Gap**: `top-nav` and `bottom-nav` layout styles are listed in the Navigation engine spec (docs/specs/05-engine-specifications.md) but only the sidebar style has defined responsive behavior (full→rail→drawer transitions).

**Decision needed**: What happens to top-nav at mobile? Options:
1. Collapses to hamburger menu (most common)
2. Moves to bottom-nav (iOS pattern)
3. Remains fixed with overflow scroll

**Action**: Implementing agent decides based on the target platform conventions, updates spec 05 § Navigation Engine, and documents the decision.

---

## Layout Engine (Sprint B1) — template resolution algorithm

**Gap**: `ZoneContent.engine` is a string in the spec. No defined mechanism for resolving this string to a component at runtime (registry pattern, import map, dynamic import, etc.).

**Decisions needed**:
1. How is a zone content string like `"DataTable"` resolved to the actual DataTable component?
2. What happens if a zone references an engine that isn't installed (tree-shaking)?
3. Should `TemplateName` be a union type enum or an open string?

**Action**: Implementing agent designs the registry pattern, updates spec 05 § Layout Engine with the resolution algorithm. Recommended: component registry with lazy imports for tree-shaking.

---

## AI Chat Engine (Sprint B3a) — branching, reconnection, missing interfaces

**Gap 1: Branching UX** — When user edits message N, what happens to messages N+1..end?
- Options: hide (show "branch diverges" indicator), delete, show with strikethrough
- This is a product decision, not an implementation detail

**Gap 2: `ActionPlanStep` interface** — Referenced in AI Chat engine state machine but never defined. Needs: step number, description, status (pending/approved/rejected/running/complete), actions (approve/modify/reject).

**Gap 3: Reconnection semantics** — After SSE/WebSocket drops mid-stream:
- Retry entire request? Resume from last token? Show partial with "reconnecting..." indicator?
- Max backoff and max retries not defined

**Gap 4: `onConflict` callback** — Referenced in offline section but never defined in Events/Callbacks.

**Action**: Implementing agent resolves gaps 1-4 during Sprint B3a, updates spec 05 § AI Chat Engine. For branching (gap 1), recommend: hide branch with "view previous response" toggle, matching Claude.ai's conversation UX pattern.

---

## DataTable Engine (Sprint B1) — minor gaps

**Gap**: `Row` type is referenced everywhere but never defined. Is it `Record<string, unknown>` or a generic `T`?

**Action**: Define as generic `T extends Record<string, unknown>` for type safety. Also define server-side `DataSource` response shape (items array, total count, page info).

---

## Component Contracts — systemic note

The `responsive` section in component contracts (docs/specs/03-component-contracts.md) uses prose descriptions ("Touch target 44px minimum") rather than structured data. This is acceptable for implementation but may cause inconsistency at scale. Consider adding a structured `responsive` YAML schema during Phase 2 iteration.
