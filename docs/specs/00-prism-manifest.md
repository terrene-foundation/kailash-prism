# Prism Specification Manifest

This document is the canonical index of all Prism specifications. Every implementation artifact MUST trace back to a spec section listed here. Any behavior not specified here is undefined and MUST NOT be assumed.

## Spec Documents

| # | Document | Governs | Status |
|---|----------|---------|--------|
| 01 | [Design System Protocol](01-design-system-protocol.md) | DESIGN.md format, design-system.yaml schema, token tiers, constraint system | DRAFT |
| 02 | [Token Architecture](02-token-architecture.md) | Three-tier token system, compilation targets, constraint validation | DRAFT |
| 03 | [Component Contracts](03-component-contracts.md) | Abstract component definitions, state machines, accessibility requirements | DRAFT |
| 04 | [Layout Grammar](04-layout-grammar.md) | Layout primitives, responsive rules, zone composition | DRAFT |
| 05 | [Engine Specifications](05-engine-specifications.md) | DataTable, Form, Navigation, Layout, Theme, AI Chat engine contracts | DRAFT |
| 06 | [Page Templates](06-page-templates.md) | Template definitions, zone schemas, composition rules | DRAFT |
| 07 | [Cross-Platform Strategy](07-cross-platform-strategy.md) | Two-engine model, shared/divergent boundaries, compilation targets | DRAFT |
| 08 | [Repo Architecture](08-repo-architecture.md) | Directory structure, package boundaries, build system, distribution | DRAFT |
| 09 | [COC Integration](09-coc-integration.md) | Loom relationship, sync manifest, variant system, artifact flow | DRAFT |
| 10 | [Quality Gates](10-quality-gates.md) | /i-audit scoring, /i-harden checklist, automated validation, convergence criteria | DRAFT |

## Compliance Rule

Every implementation file in kailash-prism MUST reference its governing spec section in the file header comment. Files without spec traceability are non-compliant.

## Versioning

Specs are versioned alongside the repo. Breaking changes to specs require a MAJOR version bump. Additive changes require MINOR. Clarifications require PATCH.

Current spec version: **0.1.0** (initial draft)
