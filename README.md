# HTML Wizard Desktop App

AI-powered visual HTML/CSS/JS editor built with Tauri 2.0. Click-to-edit elements in a live preview, get AI assistance for code changes, and manage web projects with a professional four-panel IDE layout.

## Prerequisites

Before you begin, install the following:

| Requirement | Install | Verify |
|-------------|---------|--------|
| **Node.js** 18+ | [nodejs.org](https://nodejs.org) | `node --version` |
| **Rust** (stable) | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` | `rustc --version` |
| **Tauri CLI** | `cargo install tauri-cli --version "^2.0"` | `cargo tauri --version` |

### Platform-specific dependencies

**macOS** (already included with Xcode Command Line Tools):
```bash
xcode-select --install
```

**Linux** (Debian/Ubuntu):
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev libsoup-3.0-dev libjavascriptcoregtk-4.1-dev
```

**Windows**: Install [Microsoft Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

## Setup

```bash
# Clone the repository
git clone https://github.com/aleaming/html-wizard-desktop-app.git
cd html-wizard-desktop-app

# Install frontend dependencies
npm install

# Verify Rust backend compiles
cd src-tauri && cargo check && cd ..
```

## Running

### Development mode (recommended)

```bash
npx tauri dev
```

This starts both the Vite dev server (port 1420) and the Tauri native window. Hot reload is enabled for frontend changes. Rust changes require a restart.

### Frontend only (no native window)

```bash
npm run dev
```

Opens at `http://localhost:1420`. Useful for frontend iteration, but Tauri IPC commands won't work.

## Building for Production

```bash
npx tauri build
```

Output:
- **macOS**: `src-tauri/target/release/bundle/dmg/HTML Wizard.dmg`
- **Windows**: `src-tauri/target/release/bundle/msi/HTML Wizard.msi`
- **Linux**: `src-tauri/target/release/bundle/deb/html-wizard.deb`

## Project Structure

```
html-wizard-desktop-app/
├── src/                        # React frontend
│   ├── App.tsx                 # Four-panel layout (CSS Grid)
│   ├── components/layout/      # LeftSidebar, CenterPanel, RightSidebar, BottomPanel
│   ├── store/slices/           # Zustand state: project, editor, ai, ui
│   ├── hooks/                  # useProject (Tauri IPC wrapper)
│   ├── types/                  # TypeScript types (mirrors Rust models)
│   └── utils/                  # Logger utility
│
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── main.rs             # Tauri entry point + command registration
│   │   ├── commands/           # IPC handlers: file_ops, project, credentials, ai_provider, image
│   │   ├── models/             # Data types: project, ai
│   │   ├── security/           # PathValidator, HTML sanitizer
│   │   └── plugins/            # Plugin registry and manifest parser
│   ├── Cargo.toml              # Rust dependencies
│   └── tauri.conf.json         # Window config, CSP, plugin permissions
│
├── agent-teams/                # FORGE build orchestration
│   ├── execution-plan.md       # Task specifications for all agent groups
│   ├── prompts/                # Isolated builder agent task files
│   └── scripts/                # TMUX launcher, build verifier, integrator
│
├── package.json                # Frontend dependencies
├── vite.config.ts              # Vite build config (port 1420)
├── tailwind.config.js          # Tailwind CSS with dark mode
└── ultimate-meta-prompt.md     # Complete design specification
```

## UI Layout

The app uses a four-panel layout with resizable splits:

```
+------------------+---------------------------+------------------+
|   LEFT SIDEBAR   |      CENTER PANEL         |  RIGHT SIDEBAR   |
|   AI Chat        |  Visual Preview (iframe)  |  Properties      |
|   Provider       |  Viewport Controls        |  CSS Styles      |
|   Selector       |  Element Overlay          |  Attributes      |
+------------------+---------------------------+------------------+
|                       BOTTOM PANEL                              |
|  File Tree        |  Console Output  |  Build Status            |
+-----------------------------------------------------------------+
```

**Keyboard shortcuts:**
- `Cmd/Ctrl + J` — Toggle left sidebar (AI chat)
- `Cmd/Ctrl + `` ` `` — Toggle bottom panel (file explorer)

## API Key Configuration

HTML Wizard uses your own API keys (stored in the system keychain, never plaintext):

1. Launch the app
2. Open Settings or the onboarding wizard
3. Enter API keys for one or more providers:
   - **Claude** (Anthropic) — [Get key](https://console.anthropic.com/)
   - **Gemini** (Google) — [Get key](https://makersuite.google.com/app/apikey)
   - **OpenAI** — [Get key](https://platform.openai.com/api-keys)

Keys are stored via:
- macOS: Keychain Access
- Windows: Credential Manager
- Linux: Secret Service (D-Bus)

## Development

### Run tests

```bash
# Rust backend tests
cd src-tauri && cargo test

# TypeScript type checking
npx tsc --noEmit

# Build verification (file existence + compilation)
./agent-teams/scripts/verify-build.sh
```

### FORGE Agent Teams

This project uses the FORGE protocol for coordinated multi-agent builds. To run the builder agents:

```bash
# Launch 5 parallel agents in TMUX panes
./agent-teams/scripts/launch-agents.sh

# After agents complete, verify the build
./agent-teams/scripts/verify-build.sh

# Run integration tasks
./agent-teams/scripts/integrate.sh
```

## Implementation Roadmap

| Level | Phase | Description |
|-------|-------|-------------|
| L1 | Foundation | Project setup, Rust backend, layout shell, state store |
| L2 | Visual Editor | iframe preview, click-to-edit, color picker, Monaco editor |
| L3 | AI Integration | Multi-provider API calls, inline agent, streaming chat |
| L4 | Polish | Onboarding, shortcuts, export, Git integration, accessibility |

## License

Private — see [LICENSE](LICENSE) for details.
