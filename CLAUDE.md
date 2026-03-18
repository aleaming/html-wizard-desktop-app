# HTML Wizard Desktop App

## Quick Reference

```bash
# Install dependencies
npm install

# Development (starts both Vite + Tauri)
npx tauri dev

# Frontend only (no Rust backend)
npm run dev

# Production build
npx tauri build

# Rust checks
cd src-tauri && cargo check && cd ..
cd src-tauri && cargo test && cd ..

# TypeScript check
npx tsc --noEmit
```

## Architecture

**Tauri 2.0** desktop app: Rust backend + React/TypeScript frontend + system WebView.

```
src-tauri/src/          ← Rust backend (privileged operations)
  commands/             ← Tauri IPC command handlers (#[tauri::command])
  models/               ← Shared data types (Serialize/Deserialize)
  security/             ← Path validation, HTML sanitization
  plugins/              ← Plugin registry and manifest parsing
  main.rs               ← App entry: plugins, state, command registration

src/                    ← React frontend (WebView)
  components/layout/    ← Four-panel layout (Left/Center/Right/Bottom)
  store/slices/         ← Zustand state slices (project, editor, ai, ui)
  hooks/                ← Tauri IPC wrappers (useProject)
  types/                ← TypeScript types mirroring Rust models
  utils/                ← Logger, future utilities
  App.tsx               ← Root: CSS Grid four-panel layout with resize handles
```

## Key Conventions

### IPC Communication
- Frontend calls Rust via `invoke<T>('command_name', { args })` from `@tauri-apps/api/core`
- ALL file I/O goes through Rust commands — frontend never reads/writes files directly
- Rust types use `snake_case`, TypeScript uses `camelCase` — Tauri handles conversion via serde

### Non-Destructive Editing (Critical)
- Visual changes go into a `ChangeBuffer`, NOT directly to disk
- User must explicitly save to persist changes
- Original files remain unmodified until commit
- This enables undo/redo across all edit types

### Security Constraints (Non-Negotiable)
- API keys: system keychain ONLY (`keyring` crate) — never plaintext, never localStorage
- File paths: ALL validated via `PathValidator` against project scope before any I/O
- Preview: iframe with `postMessage` — NOT Shadow DOM (must isolate JS execution)
- AI output: sanitized via `security/sanitizer.rs` before DOM injection
- CSP: configured in `tauri.conf.json` — no dynamic code evaluation, no inline scripts

### State Management
- Single Zustand store with 4 slices: project, editor, ai, ui
- Store defined in `src/store/index.ts`, slices in `src/store/slices/`
- Undo/redo stack lives in `editorSlice`
- Change buffer lives in `projectSlice`

## Gotchas

- **Tauri 2.0 (not 1.x)**: Plugin API changed significantly. Use `tauri-plugin-fs = "2"`, NOT `tauri-plugin-fs-extra`. Config uses `app.security.csp`, not `tauri.security.csp`.
- **CSP blocks**: If adding new external API endpoints, update BOTH `connect-src` in `tauri.conf.json` CSP AND the `plugins.http.scope.allow` array.
- **Cargo.toml location**: The Rust project is in `src-tauri/`, not the root. Run `cargo` commands from there.
- **Vite port**: Dev server runs on port 1420 (configured in `vite.config.ts` and referenced in `tauri.conf.json`).
- **Dual AI system**: Inline element agents (popover on selected element) and project-wide chat (left sidebar) are SEPARATE interfaces — never collapse them into one.
- **Build order**: `npx tauri dev` runs `npm run dev` automatically via `beforeDevCommand` in tauri.conf.json.
- **tracing filter**: Rust logging uses `RUST_LOG=html_wizard=debug` env filter. Set `RUST_LOG=html_wizard=trace` for verbose output.

## Implementation Levels

The app is built in layers. Current status: **Level 1 (Foundation) complete**.

| Level | Status | Scope |
|-------|--------|-------|
| L1 Foundation | Done | Project scaffold, Rust backend, layout shell, state store |
| L2 Visual Editor | Next | iframe preview, element overlay, color picker, Monaco, undo/redo |
| L3 AI Integration | Pending | Provider API calls, context extraction, streaming chat |
| L4 Polish | Pending | Onboarding, keyboard shortcuts, export, Git integration, a11y |

See `ultimate-meta-prompt.md` section 4.2 for the full roadmap.

## FORGE Protocol

This project uses the FORGE build protocol with Agent Teams. See `agent-teams/FORGE-STATUS.md` for current phase and `agent-teams/execution-plan.md` for task specifications.

## Testing

```bash
# Rust unit tests
cd src-tauri && cargo test

# TypeScript type checking
npx tsc --noEmit

# Full build verification (checks all files exist + compiles)
./agent-teams/scripts/verify-build.sh
```
