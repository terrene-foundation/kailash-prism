---
type: DISCOVERY
date: 2026-04-11
phase: analyze
---

# Four Targets = Two Engines: React Shared by Next.js and Tauri

Critical architectural insight: the four frontend targets (React, Next.js, Flutter, Tauri) reduce to two implementation engines because Tauri's frontend IS a web view.

Web engine (React components) is shared by:
- React SPA (Vite/CRA) — base
- Next.js — extends with SSR, RSC, App Router, metadata, middleware
- Tauri — extends with Rust IPC bridge, native APIs, window management

Flutter engine is separate:
- Mobile (iOS, Android) — base
- Desktop (macOS, Windows, Linux) — extends with window chrome, menu bar, shortcuts
- Web (Flutter Web) — alternative rendering target

This means 2 component implementations, not 4. The maintenance burden is 2x, not 4x. Next.js and Tauri are EXTENSION layers on top of the shared React component library.
