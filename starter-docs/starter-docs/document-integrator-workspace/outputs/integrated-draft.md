# Ultimate Meta Prompt: Tauri-Based Visual HTML Editor with AI Integration

You are an expert Tauri developer with deep production experience building professional desktop tool applications. Your expertise spans Rust systems programming, modern frontend frameworks (React, TypeScript), cross-platform desktop architecture, AI/LLM integration patterns, visual editor design, and secure file system operations. You have shipped developer tools used by frontend developers, UI/UX designers, and project managers in production environments.

This task carries real significance. You are building a tool that will enhance developer productivity and make web development more accessible to people of varying technical backgrounds. Every architectural decision, every security measure, every UX interaction pattern must reflect the standards of a professional IDE-grade application.

---

## Mission

Build a complete, production-ready desktop application using **Tauri 2.0** that provides AI-powered visual editing capabilities for HTML/CSS/JS projects. The application streamlines the web development workflow by combining visual editing with intelligent code assistance, making complex HTML/CSS modifications more accessible while maintaining professional development standards.

**Target users:**
- Frontend developers seeking rapid prototyping and visual editing tools
- UI/UX designers requiring code-to-visual workflows without deep coding knowledge
- Project managers needing accessible web content editing capabilities
- Development teams requiring collaborative visual editing solutions

---

## Phase 1 -- Expert Perspective: Foundational Principles

Before writing any code, internalize these foundational principles that must govern every decision:

### 1.1 Cross-Platform Desktop Architecture
- Tauri 2.0 provides a Rust backend with a WebView-based frontend, yielding small binaries and native performance
- The Rust backend handles all privileged operations: file I/O, API calls, credential storage, system keychain access
- The frontend is a single-page TypeScript/React application rendered in the system WebView
- All frontend-to-backend communication flows through Tauri's `invoke` IPC system with typed commands
- The application must run on **Windows, macOS, and Linux** with consistent behavior

### 1.2 Security-First Design
- User-provided API keys are the only way the application accesses LLM services -- it ships with no embedded credentials
- API keys must be encrypted at rest using the **platform system keychain** (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- File system access is sandboxed to the user-selected project directory -- no access outside that boundary
- All file paths must be validated against the allowed directory before any read/write/create operation
- Content Security Policy (CSP) must be enforced for all web assets loaded in the WebView
- Cross-site scripting (XSS) prevention is critical in the preview rendering layer since the app renders arbitrary user HTML
- AI-generated code must be sanitized before injection to prevent malicious code execution

### 1.3 Non-Destructive Editing Paradigm
This is the single most important architectural decision. The visual editor operates on a **non-destructive editing layer**:
- Visual changes inject temporary styles and use CSS custom properties as an overlay
- The rendered preview uses an **iframe with `postMessage` communication** to isolate user HTML from the editor UI
- Original source files remain unmodified until the user explicitly saves
- The editor maintains a change buffer that can be committed to disk atomically or discarded entirely
- This preserves file integrity during editing sessions and enables robust undo/redo

### 1.4 Dual AI Architecture
The application provides two distinct AI interaction modes -- this is the product's core differentiator and must not be collapsed into a single interface:
1. **Inline Element AI Agents** -- triggered by clicking/selecting a rendered element, scoped to that element's HTML, CSS, and surrounding code context
2. **Persistent Project-Wide Chat** -- a left-sidebar chat interface for broader requests affecting multiple files, structural changes, and complex refactoring

### 1.5 Progressive Enhancement Development Strategy
Build in layers, where each layer is functional before the next begins:
1. Core file system operations and project management
2. Visual HTML rendering with click-to-edit interaction
3. AI integration with context-aware assistance
4. Advanced features (collaboration, export, templates, hotkeys)

---

## Phase 2 -- Expert Reasoning: Technical Architecture and Implementation

### 2.1 Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Runtime** | Tauri 2.0 | Cross-platform, small binary, Rust security, WebView rendering |
| **Backend** | Rust with `tauri`, `serde`, `tokio` | Async file I/O, API management, system keychain, security enforcement |
| **Frontend** | React 18+ with TypeScript | Largest ecosystem, strongest typing, richest component libraries for developer tools |
| **Styling** | Tailwind CSS | Utility-first, fast iteration, consistent design system |
| **Code Editor** | Monaco Editor | VS Code's editor engine -- syntax highlighting, code validation, IntelliSense-like features |
| **Code Parsing** | Tree-sitter (via WASM) | AST-level code understanding for intelligent editing, CSS class/ID relationship mapping |
| **State Management** | Centralized store (Zustand or Redux Toolkit) | Single source of truth for project files, AI responses, UI state, undo/redo history |
| **File System** | `tauri-plugin-fs` | Scoped file access with explicit permission management |
| **HTTP** | `tauri-plugin-http` | Secure API communication with certificate validation |
| **Key Storage** | Platform keychain via Tauri secure storage | Encrypted API key persistence |

**Resolved decision -- why React over Svelte or Vue:** React was chosen because it has the largest ecosystem of developer tool components (Monaco Editor React wrappers, rich drag-and-drop libraries, mature testing infrastructure), the strongest TypeScript integration, and the widest pool of developers familiar with it. Svelte offers smaller bundles but lacks the component ecosystem depth needed for a professional IDE-like tool. Vue is viable but React's dominance in developer tooling tips the scale.

### 2.2 Application Architecture

```
src-tauri/
  src/
    main.rs              -- Tauri entry point, window creation, plugin registration
    commands/
      file_ops.rs        -- Read/write/create/delete with path validation
      project.rs         -- Project opening, scanning, file tree building
      ai_provider.rs     -- LLM API calls (Claude, Gemini, OpenAI)
      credentials.rs     -- System keychain read/write for API keys
      image.rs           -- Image upload handling, optimization, path management
    models/
      project.rs         -- Project, FileNode, ChangeBuffer types
      ai.rs              -- AIRequest, AIResponse, ProviderConfig types
    security/
      path_validator.rs  -- Ensures all paths stay within project boundary
      sanitizer.rs       -- HTML/JS sanitization for AI-generated code
    lib.rs               -- Module declarations
  Cargo.toml
  tauri.conf.json        -- Permissions, window config, CSP, allowed APIs

src/
  App.tsx                -- Root component, layout orchestration
  components/
    layout/
      LeftSidebar.tsx    -- AI chat interface with conversation history
      CenterPanel.tsx    -- Visual editor with iframe preview and overlay controls
      RightSidebar.tsx   -- Property inspector (CSS, attributes, AI suggestions)
      BottomPanel.tsx    -- File explorer, console output, build status
    editor/
      PreviewFrame.tsx   -- Iframe-based HTML preview with postMessage bridge
      ElementOverlay.tsx -- Click-to-select overlay with highlight indicators
      ColorPicker.tsx    -- CSS variable-aware color editor
      ImageHandler.tsx   -- Upload/URL/AI-generated image workflows
      CodeEditor.tsx     -- Monaco Editor wrapper for source view
    ai/
      InlineAgent.tsx    -- Element-scoped AI popover
      ChatPanel.tsx      -- Project-wide AI chat with streaming responses
      ProviderSelector.tsx -- Multi-provider dropdown
    project/
      FileTree.tsx       -- Project structure navigator with live watching
      OnboardingWizard.tsx -- Guided setup for API keys and permissions
      TemplateSelector.tsx -- Starter project templates
  hooks/
    useProject.ts        -- Project state and file operations
    useAI.ts             -- AI provider abstraction and streaming
    useEditor.ts         -- Editor state, selection, undo/redo
    useFileWatcher.ts    -- Real-time file change detection
  store/
    index.ts             -- Centralized state store
    slices/
      projectSlice.ts    -- Project files, tree, active file
      editorSlice.ts     -- Selection, changes, undo/redo stack
      aiSlice.ts         -- Conversations, streaming state, provider config
      uiSlice.ts         -- Panel visibility, layout, preferences
  utils/
    css-variables.ts     -- CSS custom property detection and extraction
    context-builder.ts   -- Element context extraction for AI prompts
    sanitizer.ts         -- Frontend-side HTML sanitization
    debounce.ts          -- Debounced event handlers for real-time edits
  types/
    index.ts             -- Shared TypeScript type definitions

package.json
tsconfig.json
```

### 2.3 Four-Panel UI Layout

The interface uses a four-panel layout with resizable splits:

```
+------------------+---------------------------+------------------+
|                  |                           |                  |
|   LEFT SIDEBAR   |      CENTER PANEL         |  RIGHT SIDEBAR   |
|                  |                           |                  |
|  - AI Chat       |  - Visual preview (iframe)|  - Property      |
|  - Conversation  |  - Element overlay system |    Inspector     |
|    history       |  - Inline AI agent        |  - CSS styles    |
|  - Project       |    popovers               |  - Attributes    |
|    context       |  - Selection highlighting |  - AI suggestions|
|  - Provider      |                           |  - Element tree  |
|    selector      |                           |    path          |
|                  |                           |                  |
+------------------+---------------------------+------------------+
|                       BOTTOM PANEL                              |
|  - File explorer/tree  |  Console output  |  Build status      |
+-----------------------------------------------------------------+
```

- **Left Sidebar (persistent):** The project-wide AI chat interface with full conversation history, project context display, and LLM provider selector. This handles multi-file requests, structural changes, and broad architectural questions.
- **Center Panel:** The visual editor showing an iframe-rendered preview of the active HTML file. An overlay system provides element highlighting on hover and selection indicators on click. Inline AI agent popovers appear near selected elements.
- **Right Sidebar:** Property inspector displaying the selected element's CSS styles, HTML attributes, computed values, and AI-generated suggestions. Includes a CSS variable browser and a breadcrumb trail showing the element's position in the DOM tree.
- **Bottom Panel:** File tree navigator, console/log output, and build/sync status. The file tree shows the project structure with real-time watching indicators for changed files.

### 2.4 Core Feature: Visual Editing Engine

#### 2.4.1 Click-to-Edit System
The visual editor renders user HTML in a sandboxed iframe. An overlay layer sits on top of the iframe to intercept user interactions:

1. **Hover:** Highlight the element under the cursor with a colored outline and tooltip showing the tag name, classes, and ID
2. **Click:** Select the element -- show a selection indicator (handles, bounding box), populate the Right Sidebar property inspector, and make the inline AI agent button available
3. **Double-click:** Enter direct content editing mode for text elements (contenteditable)
4. **Right-click:** Context menu with options: Edit with AI, Change Color, Replace Image, Copy Selector, View Source

The overlay uses coordinate mapping between the iframe content and the editor viewport. Element identification flows through `postMessage`:
- The iframe injects a lightweight selection script that listens for hover/click events
- On interaction, it sends the element's CSS selector path, bounding rect, computed styles, and relevant HTML fragment to the parent window
- The parent window renders the overlay UI at the mapped coordinates

#### 2.4.2 CSS Root Variable Detection and Utilization
When the user selects an element and opens the color picker:
1. Parse all loaded stylesheets using Tree-sitter to extract CSS custom properties (`:root` variables, `--*` declarations)
2. Identify which variables are currently applied to the selected element (directly or through inheritance)
3. Present a color picker that shows:
   - The current color value and which CSS variable it comes from (if any)
   - A palette of all project CSS variables with their current values
   - An option to modify the variable's value (affecting all elements using it)
   - An option to create a custom color override (applying only to this element)
4. When the user picks a CSS variable, generate the edit as `var(--variable-name)` rather than a raw color value -- this respects the existing design system

#### 2.4.3 Image Handling Pipeline
Three methods for image content, all accessible from the element context menu or property inspector:

1. **Local file upload:**
   - File picker dialog filtered to image formats (PNG, JPG, GIF, SVG, WebP)
   - Automatic optimization (resize to reasonable dimensions, compress if over threshold)
   - Copy to project assets directory with deterministic naming
   - Update the HTML `src` attribute with a project-relative path
   - Generate responsive `srcset` variants when appropriate

2. **External URL linking:**
   - URL input with validation (check reachability, verify content-type is image)
   - Optional: download and cache locally for offline development
   - Update the `src` attribute with the external URL

3. **AI-generated images:**
   - Text prompt input describing the desired image
   - Send to the configured LLM's image generation endpoint (if supported)
   - Preview the generated image before accepting
   - On accept, download to project assets and update the HTML reference
   - Provide re-generation and editing prompts for iteration

#### 2.4.4 Bidirectional Code-Visual Synchronization
The editor maintains bidirectional sync between the visual preview and source code:
- **Visual to Code:** When the user makes a visual change (drag, color pick, content edit), the corresponding source code change is computed and staged in the change buffer. The Monaco Editor view highlights the affected lines.
- **Code to Visual:** When the user edits source code directly in the Monaco Editor, the iframe preview reloads with the updated HTML/CSS. Use debouncing (300ms after last keystroke) to avoid excessive reloads.
- **Conflict handling:** If the user edits both visual and source simultaneously on the same element, the most recent edit wins. Display a notification when edits overlap.

### 2.5 Core Feature: AI Integration Framework

#### 2.5.1 Multi-Provider Adapter Pattern (Rust Backend)

```rust
// Core trait for AI providers -- all providers implement this interface
#[async_trait]
pub trait AIProvider: Send + Sync {
    async fn generate_response(&self, request: AIRequest) -> Result<AIResponse, AIError>;
    async fn stream_response(&self, request: AIRequest) -> Result<StreamHandle, AIError>;
    async fn generate_image(&self, prompt: &str) -> Result<ImageResponse, AIError>;
    fn provider_name(&self) -> &str;
    fn supports_streaming(&self) -> bool;
    fn supports_image_generation(&self) -> bool;
}
```

Implement concrete adapters for:
- **Claude** (Anthropic API) -- text generation, code assistance
- **Gemini** (Google AI API) -- text generation, code assistance, image generation
- **OpenAI** (GPT API) -- text generation, code assistance, image generation (DALL-E)

Each adapter handles its provider's specific API format, authentication headers, rate limiting, and error responses. The frontend never communicates directly with LLM APIs -- all requests flow through Rust backend commands.

#### 2.5.2 Element Context Extraction
When an inline AI agent is triggered for a selected element, build a focused context payload:

1. **Element HTML:** The selected element's outer HTML (with children, up to a depth/size limit)
2. **Applied CSS:** All CSS rules affecting this element, resolved from stylesheets (use Tree-sitter AST analysis)
3. **Parent context:** The parent elements up to a reasonable ancestor (e.g., the nearest semantic container: `<section>`, `<main>`, `<article>`)
4. **CSS variables in scope:** All custom properties that are in scope for this element
5. **Sibling context:** Adjacent siblings for layout understanding
6. **File references:** Which HTML file this element is in, which CSS files affect it, any linked JS

**API payload optimization (critical):** Send focused code snippets, not entire files. The context builder should extract only the relevant HTML fragment, applicable CSS rules, and surrounding structure. This maximizes AI response relevance and speed while minimizing token usage and cost.

#### 2.5.3 Inline Element AI Agent
When the user clicks the AI button on a selected element (or right-click > "Edit with AI"):
- A popover appears near the element with a text input and action buttons
- The user types a natural language instruction (e.g., "Make this button larger with rounded corners" or "Add a hover animation")
- The prompt is sent to the configured LLM with the element context from 2.5.2
- The AI response is parsed for code changes
- Changes are previewed in the iframe with a visual diff (green highlight for additions, red for removals)
- The user can accept, reject, or iterate with follow-up prompts
- Accepted changes are staged in the change buffer (not written to disk until explicit save)

#### 2.5.4 Project-Wide Chat Interface
The left sidebar chat provides a conversational interface for broader operations:
- **Streaming responses:** Display AI output token-by-token as it arrives (use SSE or chunked response handling)
- **Conversation history:** Persist conversation per project session, with the ability to reference previous messages
- **Multi-file context:** The chat can reference and modify multiple files. When the AI suggests changes spanning files, present a unified diff view for approval.
- **Project context awareness:** The chat maintains awareness of the project structure (file tree), active file, recently edited elements, and the current state of the change buffer
- **Action execution:** When the AI suggests code changes, provide "Apply" buttons that stage the changes in the change buffer with visual preview

Each AI interaction should maintain project context, understand existing code patterns, and preserve development best practices.

#### 2.5.5 AI Service Orchestration and Reliability
- **Provider fallback:** If the primary provider returns an error (rate limit, outage), automatically attempt the request with the next configured provider. Display a notification to the user.
- **Rate limiting:** Implement client-side rate limiting per provider (configurable by the user). Queue requests that exceed the limit and process them as capacity frees up. Use a background API request queue.
- **Token/cost awareness:** Estimate token count before sending requests. Display estimated cost per request based on provider pricing. Allow users to set monthly spend limits with warnings.
- **Graceful degradation:** If all AI providers are unavailable, the visual editor continues to function normally -- AI features show a clear "AI unavailable" state rather than breaking the application.
- **Offline mode:** The editor is fully functional for visual editing and code changes when offline. AI features display an offline indicator.

### 2.6 Core Feature: File System Operations

#### 2.6.1 Permission and Consent Model
When the user opens a project folder:
1. Display a clear permission dialog explaining what access the application needs (read, write, create within the selected directory)
2. List the specific capabilities: "Read your project files to render previews," "Write changes when you save," "Create new files when adding images or components"
3. The user explicitly confirms with a button click
4. The application stores the granted scope and does not request re-confirmation for the same project unless permissions change
5. All file operations validate the path against the granted scope before executing

#### 2.6.2 Safe File Operations
- **Atomic writes:** Write to a temporary file first, then rename to the target path. This prevents corruption from interrupted writes.
- **Backup creation:** Before any modification, create a backup of the original file (`.bak` or a hidden backup directory). Retain recent backups for recovery.
- **File lock detection:** Check for file locks before writing. If another process holds a lock, warn the user and offer retry or force-write options.
- **Change detection:** Use a file system watcher (`tauri-plugin-fs` or `notify` crate) with debounced callbacks (100ms) to detect external changes. When an external change is detected on a file with unsaved editor changes, prompt the user: "File changed externally. Reload from disk or keep your changes?"

#### 2.6.3 Version Control Integration
- **Git awareness:** Detect if the project directory is a Git repository. If so, show Git status indicators in the file tree (modified, untracked, staged).
- **Pre-edit snapshots:** Before applying AI-generated changes, automatically create a Git commit (or stash) of the current state if the project uses Git. This allows easy rollback.
- **Commit from editor:** Provide a simple commit interface in the Bottom Panel for staging and committing changes without leaving the editor.

### 2.7 Undo/Redo System
Implement a granular, multi-level undo/redo system:
- Every visual edit, code edit, and AI-applied change is recorded as a discrete operation in an undo stack
- Operations are grouped logically (e.g., all changes from a single AI suggestion form one undo group)
- Undo/redo works across the visual editor, code editor, and AI-applied changes uniformly
- The undo stack is per-project-session and persists until the project is closed
- Keyboard shortcuts: `Cmd/Ctrl+Z` for undo, `Cmd/Ctrl+Shift+Z` for redo

### 2.8 Edge Cases and Error Handling

The application must handle these scenarios gracefully:

| Scenario | Handling Strategy |
|----------|------------------|
| **Large projects** (1000+ files) | Lazy-load file tree, virtualize file list, only parse/render active files |
| **Malformed HTML** | Use lenient HTML parsing (e.g., `html5ever` in Rust or DOMParser in JS). Display warnings but do not crash. |
| **CSS specificity conflicts** | When applying visual edits, calculate specificity to determine whether an inline style, class addition, or `!important` override is needed. Prefer class-based changes. |
| **Offline operation** | All local editing works offline. AI features show clear offline state. Queue AI requests for when connectivity returns (optional). |
| **API rate limiting** | Client-side rate tracking, request queuing, provider failover |
| **Network failures mid-request** | Retry with exponential backoff (max 3 attempts). Show progress indicator and failure message. |
| **File permission conflicts** | Detect read-only files, locked files, and insufficient permissions. Show clear error messages with resolution suggestions. |
| **Concurrent external editing** | File watcher detects changes, prompts for resolution (reload or keep) |
| **Corrupted project files** | Validate file encoding (UTF-8), handle binary files gracefully (skip in editor, show in file tree), recover from parse errors |
| **Memory pressure** | Monitor memory usage, release cached file contents for inactive files, warn user if project size approaches limits |

### 2.9 Onboarding and Setup

#### First Launch Wizard
1. **Welcome screen:** Brief overview of the application's capabilities
2. **API key configuration:** Guided input for one or more LLM provider keys, with links to each provider's API key page. Keys are stored immediately in the system keychain. Includes a "Test Connection" button.
3. **First project:** Option to open an existing project or create from a template (Bootstrap, Tailwind, Vanilla HTML/CSS/JS)
4. **Permission granting:** Clear explanation of file access needs with explicit consent
5. **Interactive walkthrough:** Optional overlay tour highlighting the four panels, click-to-edit, and AI features

#### Template Project Creation
Provide starter templates that users can create as new projects:
- Vanilla HTML/CSS/JS (minimal structure)
- Bootstrap 5 layout
- Tailwind CSS starter
- Each template includes well-structured HTML, a CSS file with root variables, and placeholder content

### 2.10 Professional Workflow Features

#### Keyboard Shortcuts
| Action | Shortcut |
|--------|----------|
| Save | `Cmd/Ctrl+S` |
| Undo | `Cmd/Ctrl+Z` |
| Redo | `Cmd/Ctrl+Shift+Z` |
| Toggle AI Chat | `Cmd/Ctrl+J` |
| Toggle Code/Visual View | `Cmd/Ctrl+\\` |
| Quick AI Prompt | `Cmd/Ctrl+K` |
| Find in Project | `Cmd/Ctrl+Shift+F` |
| Open File | `Cmd/Ctrl+P` |
| Toggle Bottom Panel | `Cmd/Ctrl+\`` |

#### Export System
Generate clean, production-ready code output:
- Export strips all editor-specific artifacts, overlay scripts, and temporary styles
- Option to minify HTML/CSS/JS on export
- Option to inline CSS or keep external stylesheets
- Export as a zip archive or to a specified directory

#### Collaboration Features
- Share project snapshots (current state as a zip)
- Export AI conversation histories as Markdown for team reference
- Copy element context and AI suggestions to clipboard for sharing

---

## Phase 3 -- Professional Verification: Quality Standards

Before considering the implementation complete, verify against these concrete standards:

### 3.1 Performance Requirements
- **Element selection response time:** < 100ms from click to overlay display and property inspector population
- **Preview reload after code edit:** < 300ms for files under 500KB
- **AI response initiation:** First streaming token visible within 2 seconds of request (network dependent)
- **Application startup to interactive:** < 3 seconds on modern hardware
- **Memory usage:** < 200MB base, < 500MB with a large project loaded (1000+ files)
- **File tree rendering:** Virtualized list, smooth scrolling with 10,000+ file projects

### 3.2 Security Verification
- [ ] API keys are never stored in plaintext -- verify system keychain usage
- [ ] All file paths are validated against the permitted project scope before I/O
- [ ] CSP headers are configured to prevent script injection from rendered user HTML
- [ ] AI-generated code is sanitized before DOM injection in the preview iframe
- [ ] Network requests only go to configured LLM API endpoints -- no unexpected outbound connections
- [ ] File system access auditing: log all write operations for debugging
- [ ] The preview iframe is sandboxed and cannot access the editor's DOM or state

### 3.3 Accessibility (WCAG 2.1 AA Compliance)
- All interactive elements are keyboard accessible with visible focus indicators
- Screen reader support for panel navigation, file tree, chat interface, and property inspector
- Color contrast ratios meet WCAG 2.1 AA standards (4.5:1 for normal text, 3:1 for large text)
- All images and icons have appropriate alt text or aria-labels
- The editor supports high-contrast and reduced-motion preferences

### 3.4 Internationalization (i18n)
- All user-facing strings are externalized to a localization file
- The UI layout accommodates RTL languages and variable text lengths
- Date, number, and file size formatting respects the user's locale

### 3.5 Testing Requirements
- **Unit tests:** All Rust backend commands, path validation, file operations, and AI provider adapters
- **Integration tests:** IPC command round-trips, file watcher behavior, AI request-response cycles
- **End-to-end tests:** Full user workflows (open project, select element, make AI edit, save) using a testing framework like Playwright or WebdriverIO for the Tauri WebView
- **Security tests:** Path traversal attempts, XSS injection in preview, malformed API responses

### 3.6 Cross-Platform Verification
- [ ] Builds successfully on Windows, macOS, and Linux
- [ ] File path handling works with both `/` and `\` separators
- [ ] System keychain integration works on all three platforms
- [ ] Window management (panels, resizing, minimize/maximize) behaves correctly on each OS
- [ ] Code signing configured for macOS (notarization) and Windows (Authenticode)

### 3.7 Tauri Security Guidelines Compliance
Verify against the official Tauri security checklist:
- [ ] `tauri.conf.json` uses minimal required permissions (no wildcard scopes)
- [ ] CSP is configured and restrictive
- [ ] All IPC commands validate their inputs on the Rust side
- [ ] No dynamic code evaluation constructs used in the frontend
- [ ] WebView does not allow navigation to arbitrary URLs

---

## Phase 4 -- Expert Synthesis: Deliverables and Implementation Roadmap

### 4.1 Required Deliverables

Provide the following as complete, production-ready artifacts:

1. **Project architecture and folder structure** -- the full directory layout as specified in section 2.2, with all files created
2. **Configuration files:**
   - `tauri.conf.json` with proper permissions, CSP, window configuration, and allowed APIs
   - `Cargo.toml` with all Rust dependencies (tauri, serde, tokio, reqwest, keyring, etc.)
   - `package.json` with all frontend dependencies (React, TypeScript, Tailwind, Monaco Editor, Zustand, etc.)
   - `tsconfig.json` with strict TypeScript configuration
3. **Complete Rust backend** -- all commands, handlers, AI provider adapters, path validation, credential management, and file operations with full error handling
4. **Complete frontend application** -- all React components, hooks, state management, and styling for the four-panel layout, visual editor, AI chat, property inspector, and file tree
5. **Visual editor implementation** -- the iframe preview, element overlay, click-to-edit system, color picker with CSS variable awareness, and image handling pipeline
6. **AI integration system** -- multi-provider adapter implementation, context extraction, inline agent, project chat with streaming, and fallback handling
7. **File system management** -- safe file operations, watcher, Git integration, backup creation, and permission enforcement
8. **Testing suite** -- unit tests for Rust backend, integration tests for IPC, and at least one end-to-end test for a core workflow
9. **Step-by-step build and deployment instructions** -- from `npm install` through `cargo tauri build`, including code signing setup for distribution
10. **User documentation** -- setup guide covering API key configuration, first project opening, and basic editing workflows

### 4.2 Implementation Roadmap

#### Level 1 -- Foundation (Sprint 1-2)
- Initialize Tauri 2.0 project with React/TypeScript frontend
- Implement Rust backend: file operations, path validation, project scanning
- Build the permission consent dialog and project opening flow
- Create the four-panel layout shell with resizable splits
- Set up the centralized state store
- Implement API key management with system keychain storage

#### Level 2 -- Visual Editor (Sprint 3-4)
- Build the iframe preview renderer with postMessage bridge
- Implement the element overlay system (hover, click, selection)
- Create the non-destructive editing layer with change buffer
- Build the CSS variable detection engine (Tree-sitter integration)
- Implement the color picker with variable awareness
- Build the image handling pipeline (upload, URL, placeholder for AI)
- Implement the Monaco Editor code view with bidirectional sync
- Build the undo/redo system

#### Level 3 -- AI Integration (Sprint 5-6)
- Implement the AIProvider trait and concrete adapters (Claude, Gemini, OpenAI)
- Build the element context extraction system
- Create the inline AI agent popover with preview-before-apply
- Build the project-wide chat with streaming responses
- Implement AI service orchestration (fallback, rate limiting, queuing)
- Add AI image generation integration
- Implement token/cost estimation and display

#### Level 4 -- Polish and Distribution (Sprint 7-8)
- Implement the onboarding wizard and template system
- Add keyboard shortcuts system
- Build the export system (clean code output)
- Add Git integration (status indicators, pre-edit snapshots)
- Implement file watcher with conflict resolution
- Add collaboration features (snapshot sharing, conversation export)
- Accessibility audit and WCAG 2.1 AA compliance
- Internationalization setup
- Cross-platform testing and bug fixes
- Code signing and installer configuration for all platforms
- Auto-update mechanism using Tauri's built-in updater
- Performance optimization and memory profiling

### 4.3 Key Architectural Decisions (Resolved)

These decisions have been made and should not be revisited during implementation. Each includes the reasoning:

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Frontend framework | React + TypeScript | Largest ecosystem for developer tools, best Monaco Editor integration, strongest typing |
| Preview rendering | iframe with postMessage | Full DOM isolation from editor, standard web API, works with any HTML/CSS/JS without interference. Shadow DOM is insufficient because it doesn't isolate JavaScript execution. |
| State management | Centralized store (Zustand) | Single source of truth needed for undo/redo across visual+code editing, simpler API than Redux |
| Code parsing | Tree-sitter via WASM | AST-level understanding of CSS selectors, variables, and HTML structure for intelligent editing |
| API key storage | Platform system keychain | OS-level encryption, no custom crypto needed, standard for desktop applications |
| Edit model | Non-destructive with explicit save | Prevents accidental data loss, enables undo/redo, supports preview-before-commit for AI changes |
| AI payload strategy | Focused snippets, not entire files | Reduces token usage and cost, improves response relevance and speed, respects context windows |
| File writing strategy | Atomic writes with backup | Prevents corruption from interrupted writes, enables recovery |

### 4.4 Anti-Patterns to Avoid

These are common mistakes in this type of application. The implementation must avoid all of them:

1. **Never store API keys in plaintext** -- not in localStorage, not in a config file, not in the Tauri store. Always use the system keychain.
2. **Never block the main thread with file operations** -- all file I/O runs in async Rust commands via Tokio. The frontend never reads/writes files directly.
3. **Never trust AI-generated code blindly** -- always sanitize before injecting into the preview iframe. Validate HTML structure, strip dangerous elements (`<script>` with arbitrary src, event handlers calling external URLs).
4. **Never apply changes directly to source files** -- always go through the change buffer. The user decides when to persist.
5. **Never send entire files to the AI** -- use the context builder to extract focused, relevant snippets.
6. **Never use dynamic code evaluation constructs** -- these violate CSP and create security holes.
7. **Never allow file access outside the project boundary** -- every path must be validated against the permitted scope.
8. **Never assume file encoding** -- detect encoding, prefer UTF-8, handle binary files gracefully.

### 4.5 Verification Checklist

Before delivering, confirm:
- [ ] All 27 seed requirements from the original specification are implemented (see Appendix A)
- [ ] The dual AI system works: inline element agents AND persistent left-sidebar chat
- [ ] CSS root variable detection correctly identifies and offers existing custom properties
- [ ] All three image methods work: upload, URL, AI-generated
- [ ] Click-to-edit is the primary interaction model on the rendered preview
- [ ] Explicit consent dialog appears during project opening
- [ ] User-provided API keys are the only authentication method
- [ ] The application builds and runs on Windows, macOS, and Linux
- [ ] Undo/redo works across all edit types
- [ ] The change buffer correctly isolates unsaved changes from source files
- [ ] Performance meets the targets in section 3.1

---

## Appendix A: Original Seed Requirements Traceability

Every requirement from the original specification must be present in the final application:

| # | Requirement | Implementation Location |
|---|-------------|------------------------|
| R1 | Desktop application built with Tauri | Entire application |
| R2 | AI-powered visual editing for HTML/CSS/JS | Center Panel visual editor |
| R3 | LLM API integration (Claude, Gemini, or similar) | Rust AI provider adapters (section 2.5.1) |
| R4 | User-provided API key authentication | Onboarding wizard + credentials.rs |
| R5 | Open existing project folders | Project opening flow (section 2.6.1) |
| R6 | Visual editor displays rendered HTML | iframe preview (section 2.4.1) |
| R7 | Direct editing capabilities on rendered output | Click-to-edit overlay (section 2.4.1) |
| R8 | Click-to-edit on page elements | Element overlay system (section 2.4.1) |
| R9 | Content modification via click | Double-click contenteditable (section 2.4.1) |
| R10 | Color modification via click | CSS variable-aware color picker (section 2.4.2) |
| R11 | Image modification via click | Image handling pipeline (section 2.4.3) |
| R12 | CSS root variable detection and utilization | Tree-sitter CSS parsing (section 2.4.2) |
| R13 | Custom color selection fallback | Color picker custom option (section 2.4.2) |
| R14 | Image upload from local files | Image pipeline method 1 (section 2.4.3) |
| R15 | Image linking via external URLs | Image pipeline method 2 (section 2.4.3) |
| R16 | AI-generated/edited images | Image pipeline method 3 (section 2.4.3) |
| R17 | Inline AI agent per clickable element | Inline agent popover (section 2.5.3) |
| R18 | AI agent scoped to specific code section | Context extraction (section 2.5.2) |
| R19 | Persistent chat interface on left side | Left Sidebar chat (section 2.5.4) |
| R20 | Chat handles multi-file requests | Project-wide chat (section 2.5.4) |
| R21 | Chat handles structural changes | Project-wide chat (section 2.5.4) |
| R22 | Read permissions for project directory | Permission model (section 2.6.1) |
| R23 | Write permissions for project directory | Permission model (section 2.6.1) |
| R24 | Create permissions for project directory | Permission model (section 2.6.1) |
| R25 | Explicit user consent for file permissions | Consent dialog (section 2.6.1) |
| R26 | Consent granted during project opening | Project open flow (section 2.6.1) |
| R27 | Maintain professional development standards | Testing, accessibility, security (Phase 3) |
