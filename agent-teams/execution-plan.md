# EXECUTION PLAN: HTML Wizard Desktop App — Level 1 Foundation
## Generated: 2026-03-18 | Design Version: ultimate-meta-prompt.md v1 | Status: PENDING BUILD

### Execution Overview

Level 1 (Foundation) decomposes into **5 parallel Agent Groups** (A–E) plus **1 sequential Integration Group** (F). Groups A–E have zero file overlap and can execute simultaneously in separate TMUX panes. Group F runs after all parallel groups complete to wire everything together.

**Total tasks:** 27 (5 groups × ~5 tasks + 2 integration tasks)
**Estimated effort:** Medium-Large per group
**Parallelization:** Groups A–E fully parallel, Group F sequential

### Dependency Graph

```
    ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
    │ Group A │  │ Group B │  │ Group C │  │ Group D │  │ Group E │
    │ Project │  │ Rust    │  │ Rust    │  │Frontend │  │Frontend │
    │ Scaffold│  │ File Ops│  │ Creds & │  │ Layout  │  │ State & │
    │ & Config│  │& Security│  │ AI Infra│  │ Shell   │  │ Hooks   │
    └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘
         │            │            │            │            │
         └────────────┴────────────┴─────┬──────┴────────────┘
                                         │
                                    ┌────┴────┐
                                    │ Group F │
                                    │Integrate│
                                    │ & Verify│
                                    └─────────┘
```

---

### Agent Group A: Project Scaffolding & Configuration
- **Files owned:** `Cargo.toml`, `package.json`, `tsconfig.json`, `src-tauri/tauri.conf.json`, `tailwind.config.js`, `postcss.config.js`, `vite.config.ts`, `index.html`, `.gitignore`
- **Tasks:** A-1 through A-5

#### Task A-1: Initialize Tauri 2.0 Project Structure
- **Estimated Effort:** M
- **Dependencies:** None
- **Files Touched:** Create `Cargo.toml`, `src-tauri/Cargo.toml`
- **Context:** Meta-prompt §2.1 Technology Stack, §2.2 Application Architecture. Tauri 2.0 with Rust backend. Key crates: `tauri 2.x`, `serde`, `serde_json`, `tokio` (full features), `reqwest`, `keyring`, `tracing`, `tracing-subscriber`, `notify` (file watcher), `html5ever`.
- **Implementation Specification:**
  - Workspace Cargo.toml at project root referencing `src-tauri/`
  - src-tauri/Cargo.toml with all Rust dependencies listed in §2.1
  - Use `tauri 2.0` with plugins: `tauri-plugin-fs`, `tauri-plugin-http`, `tauri-plugin-shell`
  - Enable `async` runtime with tokio
- **Test Cases:**
  - TC-A-1-01: Cargo check — `cargo check` in src-tauri/ completes without errors
- **Acceptance Criteria:**
  - [ ] Cargo.toml has all required dependencies from §2.1
  - [ ] `cargo check` passes
  - [ ] Tauri 2.0 (not 1.x) is specified

#### Task A-2: Create Frontend Package Configuration
- **Estimated Effort:** M
- **Dependencies:** None
- **Files Touched:** Create `package.json`, `tsconfig.json`
- **Context:** Meta-prompt §2.1. React 18+, TypeScript strict mode, Tailwind CSS, Monaco Editor, Zustand.
- **Implementation Specification:**
  - package.json with: react, react-dom, @types/react, typescript, zustand, @monaco-editor/react, tailwindcss, postcss, autoprefixer, vite, @vitejs/plugin-react, @tauri-apps/api, @tauri-apps/plugin-fs, @tauri-apps/plugin-http
  - tsconfig.json with strict: true, jsx: react-jsx, module: esnext, target: es2020
- **Test Cases:**
  - TC-A-2-01: npm install — `npm install` completes without errors
- **Acceptance Criteria:**
  - [ ] All frontend dependencies from §2.1 are present
  - [ ] TypeScript strict mode enabled
  - [ ] No version conflicts

#### Task A-3: Configure Tauri Window and Security
- **Estimated Effort:** M
- **Dependencies:** None
- **Files Touched:** Create `src-tauri/tauri.conf.json`
- **Context:** Meta-prompt §1.2 Security-First Design, §3.7 Tauri Security Guidelines. CSP must be restrictive. Minimal permissions — no wildcard scopes. Window config for four-panel layout (1400×900 min).
- **Implementation Specification:**
  - Window: title "HTML Wizard", width 1600, height 1000, minWidth 1200, minHeight 800, resizable true
  - CSP: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' asset: https:; connect-src 'self' https://api.anthropic.com https://generativelanguage.googleapis.com https://api.openai.com`
  - Permissions: fs (scoped to project dir), http (scoped to API endpoints), shell (none)
  - No navigation to arbitrary URLs
- **Test Cases:**
  - TC-A-3-01: Config validation — tauri.conf.json parses as valid JSON with all required fields
- **Acceptance Criteria:**
  - [ ] CSP configured per §1.2 and §3.7
  - [ ] No wildcard scopes
  - [ ] Window dimensions set for four-panel layout
  - [ ] WebView navigation restricted

#### Task A-4: Configure Tailwind CSS and Vite
- **Estimated Effort:** S
- **Dependencies:** None
- **Files Touched:** Create `tailwind.config.js`, `postcss.config.js`, `vite.config.ts`
- **Context:** Meta-prompt §2.1. Tailwind CSS for utility-first styling. Vite as the build tool (standard for Tauri 2.0 + React).
- **Implementation Specification:**
  - tailwind.config.js scanning `./src/**/*.{ts,tsx}` with a custom theme extending default colors for the editor UI (dark theme)
  - postcss.config.js with tailwindcss and autoprefixer plugins
  - vite.config.ts with `@vitejs/plugin-react`, server host for Tauri dev, clearScreen false
- **Test Cases:**
  - TC-A-4-01: Vite dev server — `npx vite --version` returns a valid version
- **Acceptance Criteria:**
  - [ ] Tailwind scans correct source paths
  - [ ] Vite configured for Tauri integration
  - [ ] PostCSS pipeline includes Tailwind

#### Task A-5: Create Entry HTML and Gitignore
- **Estimated Effort:** S
- **Dependencies:** None
- **Files Touched:** Create `index.html`, `.gitignore`, `src/main.tsx`, `src/index.css`
- **Context:** Standard Vite+React+Tauri entry point. The index.html loads the React app. index.css imports Tailwind layers.
- **Implementation Specification:**
  - index.html: `<!DOCTYPE html>`, charset utf-8, viewport meta, div#root, script src="/src/main.tsx"
  - main.tsx: `createRoot(document.getElementById('root')!).render(<App />)`
  - index.css: `@tailwind base; @tailwind components; @tailwind utilities;` plus base dark theme styles
  - .gitignore: node_modules, dist, target, .DS_Store, *.bak, .env
- **Test Cases:**
  - TC-A-5-01: Entry file validity — index.html references correct script path, main.tsx imports React and App
- **Acceptance Criteria:**
  - [ ] index.html has valid HTML5 structure
  - [ ] main.tsx renders App component
  - [ ] .gitignore covers all build artifacts

---

### Agent Group B: Rust Backend — File Operations & Security
- **Files owned:** `src-tauri/src/main.rs`, `src-tauri/src/lib.rs`, `src-tauri/src/commands/mod.rs`, `src-tauri/src/commands/file_ops.rs`, `src-tauri/src/commands/project.rs`, `src-tauri/src/models/mod.rs`, `src-tauri/src/models/project.rs`, `src-tauri/src/security/mod.rs`, `src-tauri/src/security/path_validator.rs`, `src-tauri/src/security/sanitizer.rs`
- **Tasks:** B-1 through B-5

#### Task B-1: Create Tauri Entry Point and Module Structure
- **Estimated Effort:** M
- **Dependencies:** None
- **Files Touched:** Create `src-tauri/src/main.rs`, `src-tauri/src/lib.rs`
- **Context:** Meta-prompt §2.2. main.rs is the Tauri entry point — window creation, plugin registration, command handler registration. lib.rs declares module tree.
- **Implementation Specification:**
  - main.rs: `fn main() { tauri::Builder::default().plugin(tauri_plugin_fs::init()).plugin(tauri_plugin_http::init()).invoke_handler(tauri::generate_handler![...]).run(tauri::generate_context!()).expect("error running app"); }`
  - lib.rs: `pub mod commands; pub mod models; pub mod security; pub mod plugins;`
  - Create mod.rs files for each submodule directory
  - Set up tracing subscriber initialization in main.rs
- **Test Cases:**
  - TC-B-1-01: Compilation — `cargo check` passes with module structure
- **Acceptance Criteria:**
  - [ ] main.rs compiles with Tauri 2.0 builder pattern
  - [ ] All command handlers registered
  - [ ] Tracing subscriber initialized
  - [ ] Module tree resolves correctly

#### Task B-2: Implement Path Validator
- **Estimated Effort:** M
- **Dependencies:** None
- **Files Touched:** Create `src-tauri/src/security/path_validator.rs`, `src-tauri/src/security/mod.rs`
- **Context:** Meta-prompt §1.2, §2.6.1, §4.4 Anti-Pattern #7. ALL file paths MUST be validated against the user-granted project scope. Path traversal prevention is critical. This is the security foundation — every file operation depends on it.
- **Implementation Specification:**
  ```rust
  use std::path::{Path, PathBuf};

  pub struct PathValidator {
      allowed_root: PathBuf,
  }

  impl PathValidator {
      pub fn new(root: PathBuf) -> Self { Self { allowed_root: root.canonicalize().unwrap_or(root) } }
      pub fn validate(&self, path: &Path) -> Result<PathBuf, PathValidationError> {
          let canonical = path.canonicalize().map_err(|_| PathValidationError::InvalidPath)?;
          if canonical.starts_with(&self.allowed_root) {
              Ok(canonical)
          } else {
              Err(PathValidationError::OutsideScope)
          }
      }
  }

  #[derive(Debug, thiserror::Error)]
  pub enum PathValidationError {
      #[error("Path is outside the permitted project scope")]
      OutsideScope,
      #[error("Path is invalid or does not exist")]
      InvalidPath,
  }
  ```
- **Test Cases:**
  - TC-B-2-01: Valid path — path within project root returns Ok(canonical_path)
  - TC-B-2-02: Traversal attack — `../../etc/passwd` returns Err(OutsideScope)
  - TC-B-2-03: Symlink escape — symlink pointing outside root returns Err(OutsideScope)
- **Acceptance Criteria:**
  - [ ] Validates paths against allowed root directory
  - [ ] Prevents path traversal attacks (../)
  - [ ] Resolves symlinks before validation
  - [ ] Returns typed errors (not panics)

#### Task B-3: Implement File Operations Commands
- **Estimated Effort:** L
- **Dependencies:** B-2 (uses PathValidator)
- **Files Touched:** Create `src-tauri/src/commands/file_ops.rs`, `src-tauri/src/commands/mod.rs`
- **Context:** Meta-prompt §2.6.2 Safe File Operations. Atomic writes (write to temp, rename). Backup creation before modification. All operations async via tokio. All paths validated via PathValidator before I/O.
- **Implementation Specification:**
  - `read_file(path: String, state: State<AppState>) -> Result<String, String>` — validate path, read with tokio::fs
  - `write_file(path: String, content: String, state: State<AppState>) -> Result<(), String>` — validate, backup original, write to .tmp, rename
  - `create_file(path: String, content: String, state: State<AppState>) -> Result<(), String>` — validate, ensure parent dir exists, write
  - `delete_file(path: String, state: State<AppState>) -> Result<(), String>` — validate, backup, remove
  - `list_directory(path: String, state: State<AppState>) -> Result<Vec<FileEntry>, String>` — validate, read dir entries
  - All operations log via tracing (path, operation, outcome)
  - Mark all commands with `#[tauri::command]`
- **Test Cases:**
  - TC-B-3-01: Read file — reads existing file content correctly
  - TC-B-3-02: Write file — writes content, creates .bak backup of original
  - TC-B-3-03: Atomic write — if rename fails, temp file is cleaned up
  - TC-B-3-04: Path rejection — write_file with path outside scope returns error
- **Acceptance Criteria:**
  - [ ] All file ops use PathValidator before I/O
  - [ ] Atomic writes with temp file + rename pattern
  - [ ] Backup creation before modification
  - [ ] Async operations (no blocking main thread)
  - [ ] All operations logged with tracing

#### Task B-4: Implement Project Scanner
- **Estimated Effort:** M
- **Dependencies:** B-2 (uses PathValidator)
- **Files Touched:** Create `src-tauri/src/commands/project.rs`
- **Context:** Meta-prompt §2.6.1, §2.8 (large projects). Project opening: user selects a directory, app scans and builds file tree. Lazy-load for 1000+ files. Detect Git repo. Permission consent flow.
- **Implementation Specification:**
  - `open_project(path: String) -> Result<ProjectInfo, String>` — validate root, scan directory tree (max depth 10), detect .git, return ProjectInfo struct
  - `scan_directory(path: String, state: State<AppState>) -> Result<Vec<FileNode>, String>` — recursive scan with depth limit, skip node_modules/.git/dist/target, classify files (html/css/js/image/other)
  - ProjectInfo: { root: String, name: String, is_git: bool, file_count: usize }
  - FileNode: { name: String, path: String, is_dir: bool, file_type: FileType, children: Option<Vec<FileNode>> }
  - For large projects (>500 files at a level), return only first level and load children on demand
- **Test Cases:**
  - TC-B-4-01: Scan project — returns correct file tree for a test directory
  - TC-B-4-02: Git detection — detects .git directory and sets is_git=true
  - TC-B-4-03: Skip patterns — node_modules and .git directories are excluded from tree
- **Acceptance Criteria:**
  - [ ] Recursive directory scanning with depth limit
  - [ ] File type classification (html, css, js, image, other)
  - [ ] Git repository detection
  - [ ] Large directory handling (lazy load strategy)
  - [ ] Excluded directories (node_modules, .git, dist, target)

#### Task B-5: Define Project and File Models
- **Estimated Effort:** S
- **Dependencies:** None
- **Files Touched:** Create `src-tauri/src/models/project.rs`, `src-tauri/src/models/mod.rs`
- **Context:** Meta-prompt §2.2 models/project.rs. Types for project state, file nodes, change buffer.
- **Implementation Specification:**
  ```rust
  use serde::{Serialize, Deserialize};

  #[derive(Debug, Clone, Serialize, Deserialize)]
  pub struct ProjectInfo { pub root: String, pub name: String, pub is_git: bool, pub file_count: usize }

  #[derive(Debug, Clone, Serialize, Deserialize)]
  pub enum FileType { Html, Css, Js, Image, Other }

  #[derive(Debug, Clone, Serialize, Deserialize)]
  pub struct FileNode { pub name: String, pub path: String, pub is_dir: bool, pub file_type: FileType, pub children: Option<Vec<FileNode>> }

  #[derive(Debug, Clone, Serialize, Deserialize)]
  pub struct ChangeEntry { pub file_path: String, pub original: Option<String>, pub modified: String, pub timestamp: u64 }

  #[derive(Debug, Clone, Default, Serialize, Deserialize)]
  pub struct ChangeBuffer { pub entries: Vec<ChangeEntry> }
  ```
- **Test Cases:**
  - TC-B-5-01: Serialization — ProjectInfo serializes to JSON and deserializes back correctly
- **Acceptance Criteria:**
  - [ ] All types derive Serialize, Deserialize, Debug, Clone
  - [ ] ChangeBuffer supports atomic commit/discard operations
  - [ ] FileType enum covers html, css, js, image, other

---

### Agent Group C: Rust Backend — Credentials, AI Infrastructure & Plugins
- **Files owned:** `src-tauri/src/commands/credentials.rs`, `src-tauri/src/commands/ai_provider.rs`, `src-tauri/src/commands/image.rs`, `src-tauri/src/models/ai.rs`, `src-tauri/src/plugins/mod.rs`, `src-tauri/src/plugins/plugin_manifest.rs`
- **Tasks:** C-1 through C-5

#### Task C-1: Implement System Keychain Credential Storage
- **Estimated Effort:** M
- **Dependencies:** None
- **Files Touched:** Create `src-tauri/src/commands/credentials.rs`
- **Context:** Meta-prompt §1.2, §4.4 Anti-Pattern #1. API keys NEVER stored in plaintext. Use `keyring` crate for platform keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service). Service name: "html-wizard".
- **Implementation Specification:**
  ```rust
  use keyring::Entry;

  const SERVICE_NAME: &str = "html-wizard";

  #[tauri::command]
  pub async fn store_api_key(provider: String, key: String) -> Result<(), String> {
      let entry = Entry::new(SERVICE_NAME, &provider).map_err(|e| e.to_string())?;
      entry.set_password(&key).map_err(|e| e.to_string())?;
      tracing::info!(provider = %provider, "API key stored in system keychain");
      Ok(())
  }

  #[tauri::command]
  pub async fn get_api_key(provider: String) -> Result<Option<String>, String> {
      let entry = Entry::new(SERVICE_NAME, &provider).map_err(|e| e.to_string())?;
      match entry.get_password() {
          Ok(key) => Ok(Some(key)),
          Err(keyring::Error::NoEntry) => Ok(None),
          Err(e) => Err(e.to_string()),
      }
  }

  #[tauri::command]
  pub async fn delete_api_key(provider: String) -> Result<(), String> {
      let entry = Entry::new(SERVICE_NAME, &provider).map_err(|e| e.to_string())?;
      entry.delete_credential().map_err(|e| e.to_string())?;
      Ok(())
  }

  #[tauri::command]
  pub async fn test_api_key(provider: String, key: String) -> Result<bool, String> {
      // Send a minimal request to the provider's API to verify the key works
      // Returns true if the key is valid, false otherwise
      // Implementation varies per provider
      Ok(true) // Placeholder — real impl in AI provider module
  }
  ```
- **Test Cases:**
  - TC-C-1-01: Store and retrieve — store a key, retrieve it, values match
  - TC-C-1-02: Missing key — get_api_key for non-existent provider returns Ok(None)
  - TC-C-1-03: Delete key — store, delete, retrieve returns Ok(None)
- **Acceptance Criteria:**
  - [ ] Uses system keychain (never plaintext)
  - [ ] Handles all three platforms (macOS/Windows/Linux)
  - [ ] Logs security events (store/delete) without logging the key value
  - [ ] Returns typed errors

#### Task C-2: Define AI Model Types
- **Estimated Effort:** S
- **Dependencies:** None
- **Files Touched:** Create `src-tauri/src/models/ai.rs`
- **Context:** Meta-prompt §2.5.1, §2.2 models/ai.rs. Types for AI requests, responses, provider configuration, streaming.
- **Implementation Specification:**
  ```rust
  use serde::{Serialize, Deserialize};

  #[derive(Debug, Clone, Serialize, Deserialize)]
  pub enum AIProviderType { Claude, Gemini, OpenAI, Plugin(String) }

  #[derive(Debug, Clone, Serialize, Deserialize)]
  pub struct AIRequest {
      pub provider: AIProviderType,
      pub prompt: String,
      pub context: Option<ElementContext>,
      pub conversation_id: Option<String>,
      pub max_tokens: Option<u32>,
      pub temperature: Option<f32>,
  }

  #[derive(Debug, Clone, Serialize, Deserialize)]
  pub struct AIResponse {
      pub content: String,
      pub provider: AIProviderType,
      pub token_usage: TokenUsage,
      pub finish_reason: String,
  }

  #[derive(Debug, Clone, Serialize, Deserialize)]
  pub struct ElementContext {
      pub html: String,
      pub css: Vec<String>,
      pub parent_html: Option<String>,
      pub css_variables: Vec<CssVariable>,
      pub file_path: String,
  }

  #[derive(Debug, Clone, Serialize, Deserialize)]
  pub struct CssVariable { pub name: String, pub value: String, pub scope: String }

  #[derive(Debug, Clone, Serialize, Deserialize)]
  pub struct TokenUsage { pub prompt_tokens: u32, pub completion_tokens: u32, pub total_tokens: u32 }

  #[derive(Debug, Clone, Serialize, Deserialize)]
  pub struct ProviderConfig { pub provider_type: AIProviderType, pub model: String, pub base_url: Option<String> }
  ```
- **Test Cases:**
  - TC-C-2-01: Serialization — AIRequest round-trips through JSON
- **Acceptance Criteria:**
  - [ ] All types support Serialize/Deserialize
  - [ ] ElementContext captures html, css, parent, variables per §2.5.2
  - [ ] ProviderConfig supports custom base URLs for plugin providers

#### Task C-3: Create AI Provider Trait and Stub Adapters
- **Estimated Effort:** M
- **Dependencies:** C-2 (uses AI types)
- **Files Touched:** Create `src-tauri/src/commands/ai_provider.rs`
- **Context:** Meta-prompt §2.5.1. Define the AIProvider trait. Create stub adapters for Claude, Gemini, OpenAI that compile and return placeholder responses. Full implementation is Level 3 — Level 1 just establishes the trait and command surface.
- **Implementation Specification:**
  - Define `AIProvider` async trait (see §2.5.1)
  - Create `ClaudeProvider`, `GeminiProvider`, `OpenAIProvider` structs implementing the trait with stub methods
  - Create `#[tauri::command] async fn send_ai_request(request: AIRequest, state: State<AppState>) -> Result<AIResponse, String>` that dispatches to the correct provider
  - Create `#[tauri::command] async fn list_providers() -> Result<Vec<ProviderConfig>, String>`
- **Test Cases:**
  - TC-C-3-01: Provider dispatch — send_ai_request with Claude provider type routes to ClaudeProvider
  - TC-C-3-02: List providers — returns the three built-in providers
- **Acceptance Criteria:**
  - [ ] AIProvider trait defined per §2.5.1
  - [ ] Three stub adapters compile
  - [ ] Tauri commands registered and callable from frontend
  - [ ] Trait supports streaming (stream_response method)

#### Task C-4: Create Image Command Stubs
- **Estimated Effort:** S
- **Dependencies:** None
- **Files Touched:** Create `src-tauri/src/commands/image.rs`
- **Context:** Meta-prompt §2.4.3 Image Handling Pipeline. Level 1 just creates the command surface. Three methods: local upload, URL link, AI-generated.
- **Implementation Specification:**
  - `#[tauri::command] async fn upload_image(source_path: String, project_path: String, state: State<AppState>) -> Result<String, String>` — validate both paths, copy to project assets dir, return relative path
  - `#[tauri::command] async fn link_image_url(url: String) -> Result<String, String>` — validate URL format, return the URL (full implementation in Level 2)
  - `#[tauri::command] async fn generate_image(prompt: String) -> Result<String, String>` — stub, returns error "AI image generation not yet available"
- **Test Cases:**
  - TC-C-4-01: Upload image — copies file to assets/ and returns relative path
- **Acceptance Criteria:**
  - [ ] Upload validates source path is an image file
  - [ ] Upload copies to project assets directory
  - [ ] Commands compile and are registered

#### Task C-5: Create Plugin System Foundation
- **Estimated Effort:** M
- **Dependencies:** C-3 (uses AIProvider trait)
- **Files Touched:** Create `src-tauri/src/plugins/mod.rs`, `src-tauri/src/plugins/plugin_manifest.rs`
- **Context:** Meta-prompt §2.11. Plugin system loads from src-tauri/plugins/ directory. Manifest parsing. Plugin capability enum. Level 1 creates the registry and loader skeleton.
- **Implementation Specification:**
  ```rust
  // plugins/mod.rs
  pub mod plugin_manifest;

  use std::path::PathBuf;

  pub struct PluginRegistry {
      plugins: Vec<LoadedPlugin>,
  }

  pub struct LoadedPlugin {
      pub manifest: plugin_manifest::PluginManifest,
      pub enabled: bool,
  }

  impl PluginRegistry {
      pub fn new() -> Self { Self { plugins: Vec::new() } }
      pub fn scan_plugins_dir(dir: &PathBuf) -> Vec<plugin_manifest::PluginManifest> {
          // Scan for plugin.json files, parse manifests, return valid ones
          // Log warnings for invalid manifests but don't crash
          Vec::new() // Stub
      }
      pub fn list_plugins(&self) -> &[LoadedPlugin] { &self.plugins }
  }

  // plugins/plugin_manifest.rs
  use serde::{Serialize, Deserialize};

  #[derive(Debug, Clone, Serialize, Deserialize)]
  pub struct PluginManifest {
      pub name: String,
      pub version: String,
      pub capabilities: Vec<PluginCapability>,
      pub entry_point: String,
  }

  #[derive(Debug, Clone, Serialize, Deserialize)]
  pub enum PluginCapability { AIProvider, EditingTool, ExportFormat }
  ```
- **Test Cases:**
  - TC-C-5-01: Empty scan — scan_plugins_dir on empty directory returns empty vec
  - TC-C-5-02: Manifest parse — valid plugin.json deserializes to PluginManifest
- **Acceptance Criteria:**
  - [ ] PluginRegistry scans directory for manifests
  - [ ] Invalid manifests produce warnings, not crashes
  - [ ] PluginCapability enum matches §2.11.1
  - [ ] PluginManifest supports name, version, capabilities, entry_point

---

### Agent Group D: Frontend — Layout Shell & Components
- **Files owned:** `src/App.tsx`, `src/components/layout/LeftSidebar.tsx`, `src/components/layout/CenterPanel.tsx`, `src/components/layout/RightSidebar.tsx`, `src/components/layout/BottomPanel.tsx`
- **Tasks:** D-1 through D-5

#### Task D-1: Create Root App Component with Four-Panel Layout
- **Estimated Effort:** L
- **Dependencies:** None
- **Files Touched:** Create `src/App.tsx`
- **Context:** Meta-prompt §2.3 Four-Panel UI Layout. Resizable splits. Left sidebar (AI chat), Center (visual preview), Right sidebar (property inspector), Bottom (file explorer). Dark theme.
- **Implementation Specification:**
  - Use CSS Grid for the four-panel layout
  - Resizable panels using drag handles (implement a simple ResizeHandle component inline)
  - Panel visibility toggling (Cmd+J for left sidebar, Cmd+` for bottom panel per §2.10)
  - State for panel widths: leftSidebar (300px default), rightSidebar (280px default), bottomPanel (200px default)
  - Dark theme: bg-gray-900 base, border-gray-700 dividers
  - Import and render all four layout components
  ```tsx
  const App: React.FC = () => {
    const [leftWidth, setLeftWidth] = useState(300);
    const [rightWidth, setRightWidth] = useState(280);
    const [bottomHeight, setBottomHeight] = useState(200);
    const [showLeft, setShowLeft] = useState(true);
    const [showBottom, setShowBottom] = useState(true);
    // Grid layout with resizable panels
  };
  ```
- **Test Cases:**
  - TC-D-1-01: Renders — App component renders without crashing, all four panels visible
  - TC-D-1-02: Resize — dragging left sidebar handle changes its width
- **Acceptance Criteria:**
  - [ ] Four-panel layout matches §2.3 diagram
  - [ ] Panels are resizable via drag handles
  - [ ] Dark theme applied
  - [ ] Panel toggle functionality works

#### Task D-2: Create Left Sidebar Component
- **Estimated Effort:** M
- **Dependencies:** None
- **Files Touched:** Create `src/components/layout/LeftSidebar.tsx`
- **Context:** Meta-prompt §2.3, §2.5.4. Left sidebar contains: AI chat interface, conversation history, project context display, LLM provider selector. Level 1 creates the shell with placeholder content.
- **Implementation Specification:**
  - Header: "AI Assistant" title + provider selector dropdown (placeholder)
  - Chat message list area (scrollable, empty state: "Open a project to start chatting")
  - Text input at bottom with send button
  - Conversation history toggle
  - Styled with Tailwind: bg-gray-850, text-gray-100, border-gray-700
  ```tsx
  interface LeftSidebarProps { width: number; }
  const LeftSidebar: React.FC<LeftSidebarProps> = ({ width }) => {
    return (
      <div style={{ width }} className="flex flex-col h-full bg-gray-800 border-r border-gray-700">
        {/* Header with provider selector */}
        {/* Chat messages area */}
        {/* Input area */}
      </div>
    );
  };
  ```
- **Test Cases:**
  - TC-D-2-01: Renders — LeftSidebar renders with provider selector and input area
- **Acceptance Criteria:**
  - [ ] Shows provider selector placeholder
  - [ ] Has scrollable chat message area
  - [ ] Has text input with send button
  - [ ] Accepts width prop for resizing

#### Task D-3: Create Center Panel Component
- **Estimated Effort:** M
- **Dependencies:** None
- **Files Touched:** Create `src/components/layout/CenterPanel.tsx`
- **Context:** Meta-prompt §2.3, §2.4.5. Center panel: visual preview area (iframe placeholder), responsive viewport toolbar at top, element overlay placeholder. Level 1 creates the shell.
- **Implementation Specification:**
  - Viewport toolbar: device preset buttons (Mobile 375px, Tablet 768px, Desktop 1440px), custom dimensions input, orientation toggle
  - Preview area: placeholder div styled to look like an iframe container with "Open a project to see preview" message
  - Bottom toolbar: zoom percentage indicator
  - The iframe itself will be implemented in Level 2 — Level 1 just creates the container
  ```tsx
  const CenterPanel: React.FC = () => {
    const [viewport, setViewport] = useState({ width: 1440, height: 900 });
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
    // Viewport toolbar + preview container
  };
  ```
- **Test Cases:**
  - TC-D-3-01: Renders — CenterPanel renders with viewport toolbar and preview area
  - TC-D-3-02: Viewport switch — clicking Mobile button updates viewport width to 375
- **Acceptance Criteria:**
  - [ ] Viewport toolbar with 3 presets per §2.4.5
  - [ ] Custom dimension inputs
  - [ ] Orientation toggle for mobile/tablet
  - [ ] Preview container placeholder

#### Task D-4: Create Right Sidebar Component
- **Estimated Effort:** M
- **Dependencies:** None
- **Files Touched:** Create `src/components/layout/RightSidebar.tsx`
- **Context:** Meta-prompt §2.3. Property inspector: CSS styles, HTML attributes, computed values, AI suggestions, CSS variable browser, DOM breadcrumb trail. Level 1 creates the shell.
- **Implementation Specification:**
  - Tabs: "Styles" | "Attributes" | "Computed" | "AI"
  - Each tab shows placeholder content with "Select an element to inspect" message
  - DOM breadcrumb trail at top (e.g., `body > main > section > div.card`)
  - CSS variable browser section (collapsed by default)
  ```tsx
  interface RightSidebarProps { width: number; }
  const RightSidebar: React.FC<RightSidebarProps> = ({ width }) => {
    const [activeTab, setActiveTab] = useState<'styles' | 'attributes' | 'computed' | 'ai'>('styles');
    // Tab navigation + content panels
  };
  ```
- **Test Cases:**
  - TC-D-4-01: Renders — RightSidebar renders with all four tabs
  - TC-D-4-02: Tab switch — clicking "Attributes" tab shows attributes panel
- **Acceptance Criteria:**
  - [ ] Four tabs: Styles, Attributes, Computed, AI
  - [ ] DOM breadcrumb trail placeholder
  - [ ] CSS variable browser section
  - [ ] Accepts width prop for resizing

#### Task D-5: Create Bottom Panel Component
- **Estimated Effort:** M
- **Dependencies:** None
- **Files Touched:** Create `src/components/layout/BottomPanel.tsx`
- **Context:** Meta-prompt §2.3. Bottom panel: file tree navigator, console output, build status. Level 1 creates the shell with file tree placeholder.
- **Implementation Specification:**
  - Tabs: "Files" | "Console" | "Output"
  - Files tab: placeholder file tree with "Open a project to see files" message
  - Console tab: scrollable log output area
  - Output tab: build/sync status messages
  - Toggle visibility via parent (controlled by App.tsx)
  ```tsx
  interface BottomPanelProps { height: number; }
  const BottomPanel: React.FC<BottomPanelProps> = ({ height }) => {
    const [activeTab, setActiveTab] = useState<'files' | 'console' | 'output'>('files');
    // Tab navigation + content panels
  };
  ```
- **Test Cases:**
  - TC-D-5-01: Renders — BottomPanel renders with all three tabs
- **Acceptance Criteria:**
  - [ ] Three tabs: Files, Console, Output
  - [ ] Scrollable content areas
  - [ ] Accepts height prop for resizing
  - [ ] Shows empty state messages

---

### Agent Group E: Frontend — State Management, Hooks, Types & Utils
- **Files owned:** `src/store/index.ts`, `src/store/slices/projectSlice.ts`, `src/store/slices/editorSlice.ts`, `src/store/slices/aiSlice.ts`, `src/store/slices/uiSlice.ts`, `src/hooks/useProject.ts`, `src/types/index.ts`, `src/utils/logger.ts`
- **Tasks:** E-1 through E-5

#### Task E-1: Define Shared TypeScript Types
- **Estimated Effort:** M
- **Dependencies:** None
- **Files Touched:** Create `src/types/index.ts`
- **Context:** Meta-prompt §2.2 types/index.ts. Shared type definitions matching Rust models. These types must be the frontend mirror of the Rust serde types.
- **Implementation Specification:**
  ```typescript
  // Project types
  export interface ProjectInfo { root: string; name: string; isGit: boolean; fileCount: number; }
  export type FileType = 'html' | 'css' | 'js' | 'image' | 'other';
  export interface FileNode { name: string; path: string; isDir: boolean; fileType: FileType; children?: FileNode[]; }
  export interface ChangeEntry { filePath: string; original: string | null; modified: string; timestamp: number; }
  export interface ChangeBuffer { entries: ChangeEntry[]; }

  // AI types
  export type AIProviderType = 'claude' | 'gemini' | 'openai' | { plugin: string };
  export interface AIRequest { provider: AIProviderType; prompt: string; context?: ElementContext; conversationId?: string; maxTokens?: number; temperature?: number; }
  export interface AIResponse { content: string; provider: AIProviderType; tokenUsage: TokenUsage; finishReason: string; }
  export interface ElementContext { html: string; css: string[]; parentHtml?: string; cssVariables: CssVariable[]; filePath: string; }
  export interface CssVariable { name: string; value: string; scope: string; }
  export interface TokenUsage { promptTokens: number; completionTokens: number; totalTokens: number; }
  export interface ProviderConfig { providerType: AIProviderType; model: string; baseUrl?: string; }

  // UI types
  export interface PanelState { leftSidebar: boolean; rightSidebar: boolean; bottomPanel: boolean; }
  export interface ViewportSize { width: number; height: number; label?: string; }

  // Chat types
  export interface ChatMessage { id: string; role: 'user' | 'assistant'; content: string; timestamp: number; }
  export interface Conversation { id: string; messages: ChatMessage[]; projectRoot: string; }
  ```
- **Test Cases:**
  - TC-E-1-01: Type check — TypeScript compiler accepts all type definitions without errors
- **Acceptance Criteria:**
  - [ ] Types mirror Rust models (camelCase for TS, snake_case in Rust — Tauri handles conversion)
  - [ ] All fields from §2.5.2 ElementContext covered
  - [ ] AI provider types support plugin extensibility

#### Task E-2: Create Centralized Zustand Store
- **Estimated Effort:** M
- **Dependencies:** E-1 (uses types)
- **Files Touched:** Create `src/store/index.ts`
- **Context:** Meta-prompt §2.1, §4.3. Zustand for state management — single source of truth for project files, AI responses, UI state, undo/redo. Simpler than Redux.
- **Implementation Specification:**
  ```typescript
  import { create } from 'zustand';
  import { ProjectSlice, createProjectSlice } from './slices/projectSlice';
  import { EditorSlice, createEditorSlice } from './slices/editorSlice';
  import { AISlice, createAISlice } from './slices/aiSlice';
  import { UISlice, createUISlice } from './slices/uiSlice';

  export type AppStore = ProjectSlice & EditorSlice & AISlice & UISlice;

  export const useAppStore = create<AppStore>()((...a) => ({
    ...createProjectSlice(...a),
    ...createEditorSlice(...a),
    ...createAISlice(...a),
    ...createUISlice(...a),
  }));
  ```
- **Test Cases:**
  - TC-E-2-01: Store creation — useAppStore() returns object with all slice properties
- **Acceptance Criteria:**
  - [ ] Single store combining all four slices
  - [ ] Zustand (not Redux) per §4.3 architectural decision
  - [ ] Store is importable from any component

#### Task E-3: Create Store Slices
- **Estimated Effort:** L
- **Dependencies:** E-1 (uses types)
- **Files Touched:** Create `src/store/slices/projectSlice.ts`, `src/store/slices/editorSlice.ts`, `src/store/slices/aiSlice.ts`, `src/store/slices/uiSlice.ts`
- **Context:** Meta-prompt §2.2 store/slices/. Each slice manages a domain of state.
- **Implementation Specification:**
  - **projectSlice:** `projectInfo: ProjectInfo | null`, `fileTree: FileNode[]`, `activeFile: string | null`, `changeBuffer: ChangeBuffer`, actions: `setProject`, `setActiveFile`, `addChange`, `commitChanges`, `discardChanges`
  - **editorSlice:** `selectedElement: string | null`, `undoStack: Operation[]`, `redoStack: Operation[]`, actions: `selectElement`, `pushUndo`, `undo`, `redo`
  - **aiSlice:** `conversations: Conversation[]`, `activeConversation: string | null`, `isStreaming: boolean`, `providers: ProviderConfig[]`, `activeProvider: AIProviderType`, actions: `addMessage`, `setStreaming`, `setActiveProvider`
  - **uiSlice:** `panels: PanelState`, `viewport: ViewportSize`, `debugMode: boolean`, actions: `togglePanel`, `setViewport`, `setDebugMode`
  - Each slice uses Zustand's `StateCreator` pattern for composition
- **Test Cases:**
  - TC-E-3-01: Project slice — setProject updates projectInfo, setActiveFile updates activeFile
  - TC-E-3-02: Editor slice — pushUndo adds to undoStack, undo pops from undoStack to redoStack
  - TC-E-3-03: UI slice — togglePanel('leftSidebar') toggles the value
- **Acceptance Criteria:**
  - [ ] Four slices covering project, editor, AI, UI state
  - [ ] Undo/redo stack in editor slice per §2.7
  - [ ] Change buffer in project slice per §1.3
  - [ ] All slices composable via Zustand StateCreator

#### Task E-4: Create useProject Hook
- **Estimated Effort:** M
- **Dependencies:** E-2, E-3 (uses store)
- **Files Touched:** Create `src/hooks/useProject.ts`
- **Context:** Meta-prompt §2.2 hooks/useProject.ts. Abstracts Tauri IPC calls for project operations. Wraps file ops commands.
- **Implementation Specification:**
  ```typescript
  import { invoke } from '@tauri-apps/api/core';
  import { useAppStore } from '../store';
  import { ProjectInfo, FileNode } from '../types';

  export function useProject() {
    const { setProject, setActiveFile, fileTree } = useAppStore();

    const openProject = async (path: string): Promise<ProjectInfo> => {
      const info = await invoke<ProjectInfo>('open_project', { path });
      setProject(info);
      const tree = await invoke<FileNode[]>('scan_directory', { path });
      // Update file tree in store
      return info;
    };

    const readFile = async (path: string): Promise<string> => {
      return invoke<string>('read_file', { path });
    };

    const writeFile = async (path: string, content: string): Promise<void> => {
      return invoke<void>('write_file', { path, content });
    };

    return { openProject, readFile, writeFile, fileTree };
  }
  ```
- **Test Cases:**
  - TC-E-4-01: Hook shape — useProject() returns openProject, readFile, writeFile, fileTree
- **Acceptance Criteria:**
  - [ ] Wraps Tauri invoke calls for file operations
  - [ ] Updates Zustand store on project open
  - [ ] Returns typed results
  - [ ] All IPC calls use invoke (not fetch)

#### Task E-5: Create Frontend Logger
- **Estimated Effort:** S
- **Dependencies:** None
- **Files Touched:** Create `src/utils/logger.ts`
- **Context:** Meta-prompt §2.12.1. Structured logging utility for frontend. Forwards warn/error to Rust backend via IPC for unified log output. ISO 8601 timestamps.
- **Implementation Specification:**
  ```typescript
  import { invoke } from '@tauri-apps/api/core';

  type LogLevel = 'debug' | 'info' | 'warn' | 'error';

  interface LogEntry {
    timestamp: string;
    level: LogLevel;
    module: string;
    message: string;
    data?: Record<string, unknown>;
  }

  function createLogEntry(level: LogLevel, module: string, message: string, data?: Record<string, unknown>): LogEntry {
    return { timestamp: new Date().toISOString(), level, module, message, data };
  }

  export const logger = {
    debug: (module: string, message: string, data?: Record<string, unknown>) => {
      const entry = createLogEntry('debug', module, message, data);
      console.debug(`[${entry.timestamp}] [${module}] ${message}`, data);
    },
    info: (module: string, message: string, data?: Record<string, unknown>) => {
      const entry = createLogEntry('info', module, message, data);
      console.info(`[${entry.timestamp}] [${module}] ${message}`, data);
    },
    warn: (module: string, message: string, data?: Record<string, unknown>) => {
      const entry = createLogEntry('warn', module, message, data);
      console.warn(`[${entry.timestamp}] [${module}] ${message}`, data);
      invoke('log_from_frontend', { entry }).catch(() => {});
    },
    error: (module: string, message: string, data?: Record<string, unknown>) => {
      const entry = createLogEntry('error', module, message, data);
      console.error(`[${entry.timestamp}] [${module}] ${message}`, data);
      invoke('log_from_frontend', { entry }).catch(() => {});
    },
  };
  ```
- **Test Cases:**
  - TC-E-5-01: Logger shape — logger.debug, .info, .warn, .error are all functions
  - TC-E-5-02: Log format — each function produces ISO 8601 timestamp + module + message
- **Acceptance Criteria:**
  - [ ] Four severity levels: debug, info, warn, error
  - [ ] ISO 8601 timestamps
  - [ ] warn/error forward to Rust backend via IPC
  - [ ] Structured format: timestamp, level, module, message, data

---

### Integration Tasks (Sequential — after all groups complete)

#### Task F-1: Wire Rust Commands into Tauri Builder
- **Estimated Effort:** M
- **Dependencies:** A-1, B-1, B-3, B-4, C-1, C-3, C-4, C-5
- **Files Touched:** Modify `src-tauri/src/main.rs` (add all command handlers to generate_handler![])
- **Context:** After all groups produce their commands, main.rs must register them all. Also set up AppState with PathValidator and PluginRegistry.
- **Implementation Specification:**
  - Add all `#[tauri::command]` functions to the `generate_handler![]` macro
  - Create `AppState` struct holding PathValidator, PluginRegistry, and project root
  - Initialize AppState in the Tauri builder with `.manage(AppState::default())`
- **Acceptance Criteria:**
  - [ ] All commands registered in generate_handler!
  - [ ] AppState managed by Tauri
  - [ ] `cargo check` passes with all modules wired

#### Task F-2: Verify Full Build Pipeline
- **Estimated Effort:** M
- **Dependencies:** F-1, all other tasks
- **Files Touched:** None (verification only)
- **Context:** Full stack verification: npm install succeeds, cargo check succeeds, `cargo tauri dev` launches the application window with four-panel layout.
- **Acceptance Criteria:**
  - [ ] `npm install` completes without errors
  - [ ] `cargo check` (in src-tauri/) completes without errors
  - [ ] `cargo tauri dev` launches a window showing the four-panel layout
  - [ ] No console errors in the WebView

---

### PMATCH Drift Check — Level 1 Foundation

| Design Element (Meta-Prompt) | Plan Coverage | Status |
|------------------------------|--------------|--------|
| §2.1 Tauri 2.0 + Rust backend | Task A-1 | ✅ Covered |
| §2.1 React 18+ TypeScript | Task A-2 | ✅ Covered |
| §2.1 Tailwind CSS | Task A-4 | ✅ Covered |
| §2.1 Monaco Editor | Task A-2 (dependency) | ✅ Covered |
| §2.1 Zustand state management | Tasks E-2, E-3 | ✅ Covered |
| §2.2 Full directory structure | Tasks A-1 through E-5 | ✅ Covered |
| §2.3 Four-panel layout | Tasks D-1 through D-5 | ✅ Covered |
| §1.2 Security — path validation | Task B-2 | ✅ Covered |
| §1.2 Security — API key keychain | Task C-1 | ✅ Covered |
| §1.2 Security — CSP config | Task A-3 | ✅ Covered |
| §2.6.1 Permission consent model | Task B-4 (project open) | ✅ Covered |
| §2.6.2 Safe file operations | Task B-3 | ✅ Covered |
| §2.5.1 AI provider trait | Task C-3 | ✅ Covered |
| §2.5.2 Element context types | Task C-2 | ✅ Covered |
| §2.4.3 Image command stubs | Task C-4 | ✅ Covered |
| §2.11 Plugin system foundation | Task C-5 | ✅ Covered |
| §2.12 Logging infrastructure | Task E-5, B-1 (tracing) | ✅ Covered |
| §2.2 models/project.rs types | Task B-5 | ✅ Covered |
| §2.2 models/ai.rs types | Task C-2 | ✅ Covered |
| §2.2 hooks/useProject.ts | Task E-4 | ✅ Covered |
| §2.2 types/index.ts | Task E-1 | ✅ Covered |
| §2.7 Undo/redo foundation | Task E-3 (editorSlice) | ✅ Covered |
| §2.4.5 Viewport toolbar shell | Task D-3 | ✅ Covered |
| §4.2 Level 1 roadmap items | All tasks | ✅ Covered |

**Result: Full coverage. No orphaned tasks. No uncovered requirements.**
