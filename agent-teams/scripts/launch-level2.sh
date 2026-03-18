#!/bin/bash
# =============================================================================
# HTML Wizard — Level 2: Visual Editor Agent Teams Launcher
# =============================================================================
# Spawns 5 parallel Claude Code builder agents (Groups A-E) in separate TMUX
# panes. Group F must be run manually AFTER A-E complete — it is the integration
# agent that wires everything together.
#
# Usage:
#   chmod +x agent-teams/scripts/launch-level2.sh
#   ./agent-teams/scripts/launch-level2.sh
#
# Prerequisites:
#   - tmux installed (brew install tmux)
#   - claude CLI available in PATH
#   - Level 1 build complete (all src/ and src-tauri/ foundation files present)
#
# After A-E finish, run Group F manually:
#   claude --print --dangerously-skip-permissions \
#     "$(cat agent-teams/prompts/level2-group-f-integration.md)"
# =============================================================================

set -euo pipefail

SESSION_NAME="html-wizard-level2"
PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
PROMPTS_DIR="${PROJECT_DIR}/agent-teams/prompts"
REPORTS_DIR="${PROJECT_DIR}/agent-teams/reports"

# ---------------------------------------------------------------------------
# Colors
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# ---------------------------------------------------------------------------
# Banner
# ---------------------------------------------------------------------------
echo ""
echo -e "${MAGENTA}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║                                                              ║${NC}"
echo -e "${MAGENTA}║       HTML Wizard — Level 2: Visual Editor Build            ║${NC}"
echo -e "${MAGENTA}║                                                              ║${NC}"
echo -e "${MAGENTA}║   A: Preview Iframe + PostMessage Bridge                    ║${NC}"
echo -e "${MAGENTA}║   B: Element Overlay + Selection System                     ║${NC}"
echo -e "${MAGENTA}║   C: CSS Variables + Color Picker + Property Inspector      ║${NC}"
echo -e "${MAGENTA}║   D: Monaco Code Editor + Bidirectional Sync + Watcher      ║${NC}"
echo -e "${MAGENTA}║   E: Image Handler + File Tree + Viewport Selector          ║${NC}"
echo -e "${MAGENTA}║   F: Integration (run AFTER A-E — see instructions below)  ║${NC}"
echo -e "${MAGENTA}║                                                              ║${NC}"
echo -e "${MAGENTA}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ---------------------------------------------------------------------------
# Prerequisites
# ---------------------------------------------------------------------------
if ! command -v tmux &> /dev/null; then
    echo -e "${RED}Error: tmux is not installed.${NC}"
    echo -e "${RED}Install with: brew install tmux${NC}"
    exit 1
fi

if ! command -v claude &> /dev/null; then
    echo -e "${RED}Error: claude CLI is not in PATH.${NC}"
    echo -e "${RED}Install from: https://claude.ai/download${NC}"
    exit 1
fi

# ---------------------------------------------------------------------------
# Verify prompt files exist
# ---------------------------------------------------------------------------
echo -e "${CYAN}Verifying prompt files...${NC}"
MISSING=0
for group in a-preview b-overlay c-css-props d-monaco e-filetree; do
    PROMPT_FILE="${PROMPTS_DIR}/level2-group-${group}.md"
    if [ ! -f "${PROMPT_FILE}" ]; then
        echo -e "${RED}  Missing: level2-group-${group}.md${NC}"
        MISSING=1
    else
        echo -e "${GREEN}  Found:   level2-group-${group}.md${NC}"
    fi
done

if [ "${MISSING}" -eq 1 ]; then
    echo ""
    echo -e "${RED}Error: One or more prompt files are missing. Aborting.${NC}"
    exit 1
fi

# Also check the integration prompt (not auto-launched, but should exist)
if [ -f "${PROMPTS_DIR}/level2-group-f-integration.md" ]; then
    echo -e "${GREEN}  Found:   level2-group-f-integration.md (Group F — manual)${NC}"
else
    echo -e "${YELLOW}  Warning: level2-group-f-integration.md not found${NC}"
fi

# ---------------------------------------------------------------------------
# Verify Level 1 foundation exists
# ---------------------------------------------------------------------------
echo ""
echo -e "${CYAN}Verifying Level 1 foundation...${NC}"
L1_CHECKS=(
    "src/App.tsx"
    "src/store/index.ts"
    "src/store/slices/editorSlice.ts"
    "src/types/index.ts"
    "src-tauri/src/main.rs"
    "src-tauri/src/commands/mod.rs"
)
L1_MISSING=0
for file in "${L1_CHECKS[@]}"; do
    if [ ! -f "${PROJECT_DIR}/${file}" ]; then
        echo -e "${RED}  Missing Level 1 file: ${file}${NC}"
        L1_MISSING=1
    fi
done

if [ "${L1_MISSING}" -eq 1 ]; then
    echo ""
    echo -e "${RED}Error: Level 1 foundation is incomplete. Run Level 1 build first.${NC}"
    exit 1
fi
echo -e "${GREEN}  Level 1 foundation verified.${NC}"

# ---------------------------------------------------------------------------
# Create necessary directories
# ---------------------------------------------------------------------------
mkdir -p "${REPORTS_DIR}"
mkdir -p "${PROJECT_DIR}/src/components/editor"
mkdir -p "${PROJECT_DIR}/src/components/project"

# ---------------------------------------------------------------------------
# Kill existing Level 2 session if it exists
# ---------------------------------------------------------------------------
if tmux has-session -t "${SESSION_NAME}" 2>/dev/null; then
    echo ""
    echo -e "${YELLOW}Killing existing session: ${SESSION_NAME}${NC}"
    tmux kill-session -t "${SESSION_NAME}"
fi

echo ""
echo -e "${GREEN}Creating TMUX session: ${SESSION_NAME}${NC}"
echo -e "${YELLOW}Project directory: ${PROJECT_DIR}${NC}"
echo ""

# ---------------------------------------------------------------------------
# Create detached TMUX session with 5-pane layout
#
#  ┌───────────────────────┬───────────────────────┐
#  │   Group A             │   Group B             │
#  │   Preview + Bridge    │   Overlay + Selection │
#  ├───────────────────────┼───────────────────────┤
#  │   Group C             │   Group D             │
#  │   CSS + ColorPicker   │   Monaco + Watcher    │
#  ├───────────────────────┴───────────────────────┤
#  │              Group E                          │
#  │         FileTree + Images + Viewport          │
#  └───────────────────────────────────────────────┘
# ---------------------------------------------------------------------------

# Create session with window named "level2-build"
tmux new-session -d -s "${SESSION_NAME}" -n "level2-build" -c "${PROJECT_DIR}"

# Split into 5 panes
tmux split-window -h -t "${SESSION_NAME}:0" -c "${PROJECT_DIR}"    # Pane 1: right half (B)
tmux split-window -v -t "${SESSION_NAME}:0.0" -c "${PROJECT_DIR}"  # Pane 2: bottom-left (C)
tmux split-window -v -t "${SESSION_NAME}:0.1" -c "${PROJECT_DIR}"  # Pane 3: bottom-right (D)
tmux split-window -v -t "${SESSION_NAME}:0.2" -c "${PROJECT_DIR}"  # Pane 4: below C (E)

# Balance the layout
tmux select-layout -t "${SESSION_NAME}:0" tiled

# ---------------------------------------------------------------------------
# Agent A — Preview Iframe + PostMessage Bridge
# ---------------------------------------------------------------------------
tmux send-keys -t "${SESSION_NAME}:0.0" \
  "echo '[Agent A] Preview Iframe + PostMessage Bridge — starting...' && \
   claude --print --dangerously-skip-permissions \
   'You are Builder Agent A for the HTML Wizard Level 2 Visual Editor. \
    Read the file agent-teams/prompts/level2-group-a-preview.md and execute \
    ALL tasks (A1 through A4) in that file. \
    Create every file listed under your file ownership section. \
    Append the type definitions to src/types/index.ts as specified. \
    Do not touch any file not listed in your ownership section. \
    Work in the current directory: ${PROJECT_DIR}' \
   2>&1 | tee ${REPORTS_DIR}/level2-group-a-output.log && \
   echo '[Agent A] COMPLETE'" \
  C-m

# ---------------------------------------------------------------------------
# Agent B — Element Overlay + Selection System
# ---------------------------------------------------------------------------
tmux send-keys -t "${SESSION_NAME}:0.1" \
  "echo '[Agent B] Element Overlay + Selection System — starting...' && \
   claude --print --dangerously-skip-permissions \
   'You are Builder Agent B for the HTML Wizard Level 2 Visual Editor. \
    Read the file agent-teams/prompts/level2-group-b-overlay.md and execute \
    ALL tasks (B1 through B4) in that file. \
    Read src/store/slices/editorSlice.ts before modifying it. \
    Create every file listed under CREATE in your ownership section. \
    Modify only the files listed under MODIFY. \
    Do not touch any file not listed in your ownership section. \
    Work in the current directory: ${PROJECT_DIR}' \
   2>&1 | tee ${REPORTS_DIR}/level2-group-b-output.log && \
   echo '[Agent B] COMPLETE'" \
  C-m

# ---------------------------------------------------------------------------
# Agent C — CSS Variables + Color Picker + Property Inspector
# ---------------------------------------------------------------------------
tmux send-keys -t "${SESSION_NAME}:0.2" \
  "echo '[Agent C] CSS Variables + Color Picker + Property Inspector — starting...' && \
   claude --print --dangerously-skip-permissions \
   'You are Builder Agent C for the HTML Wizard Level 2 Visual Editor. \
    Read the file agent-teams/prompts/level2-group-c-css-props.md and execute \
    ALL tasks (C1 through C5) in that file. \
    Read src/components/layout/RightSidebar.tsx before modifying it. \
    Create every file listed under CREATE in your ownership section. \
    Modify only the files listed under MODIFY. \
    Do not touch any file not listed in your ownership section. \
    Work in the current directory: ${PROJECT_DIR}' \
   2>&1 | tee ${REPORTS_DIR}/level2-group-c-output.log && \
   echo '[Agent C] COMPLETE'" \
  C-m

# ---------------------------------------------------------------------------
# Agent D — Monaco + Bidirectional Sync + File Watcher
# ---------------------------------------------------------------------------
tmux send-keys -t "${SESSION_NAME}:0.3" \
  "echo '[Agent D] Monaco Code Editor + File Watcher — starting...' && \
   claude --print --dangerously-skip-permissions \
   'You are Builder Agent D for the HTML Wizard Level 2 Visual Editor. \
    Read the file agent-teams/prompts/level2-group-d-monaco.md and execute \
    ALL tasks (D1 through D5) in that file. \
    Read src-tauri/src/commands/mod.rs before modifying it. \
    Create every file listed under CREATE in your ownership section. \
    Modify only the files listed under MODIFY. \
    Do not touch any file not listed in your ownership section. \
    Work in the current directory: ${PROJECT_DIR}' \
   2>&1 | tee ${REPORTS_DIR}/level2-group-d-output.log && \
   echo '[Agent D] COMPLETE'" \
  C-m

# ---------------------------------------------------------------------------
# Agent E — Image Handler + File Tree + Viewport Selector
# ---------------------------------------------------------------------------
tmux send-keys -t "${SESSION_NAME}:0.4" \
  "echo '[Agent E] Image Handler + File Tree + Viewport Selector — starting...' && \
   claude --print --dangerously-skip-permissions \
   'You are Builder Agent E for the HTML Wizard Level 2 Visual Editor. \
    Read the file agent-teams/prompts/level2-group-e-filetree.md and execute \
    ALL tasks (E1 through E4) in that file. \
    Read src/components/layout/BottomPanel.tsx before modifying it. \
    Create the src/components/project/ directory if it does not exist. \
    Create every file listed under CREATE in your ownership section. \
    Modify only the files listed under MODIFY. \
    Do not touch any file not listed in your ownership section. \
    Work in the current directory: ${PROJECT_DIR}' \
   2>&1 | tee ${REPORTS_DIR}/level2-group-e-output.log && \
   echo '[Agent E] COMPLETE'" \
  C-m

# ---------------------------------------------------------------------------
# Status output
# ---------------------------------------------------------------------------
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  All 5 Level 2 builder agents launched successfully!        ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                                              ║${NC}"
echo -e "${GREEN}║  Agent A: Preview Iframe + PostMessage Bridge               ║${NC}"
echo -e "${GREEN}║  Agent B: Element Overlay + Selection System                ║${NC}"
echo -e "${GREEN}║  Agent C: CSS Variables + Color Picker + Property Inspector ║${NC}"
echo -e "${GREEN}║  Agent D: Monaco Code Editor + File Watcher                ║${NC}"
echo -e "${GREEN}║  Agent E: Image Handler + File Tree + Viewport Selector     ║${NC}"
echo -e "${GREEN}║                                                              ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${YELLOW}║  AFTER A-E FINISH — run Group F (Integration):             ║${NC}"
echo -e "${YELLOW}║                                                              ║${NC}"
echo -e "${YELLOW}║  claude --print --dangerously-skip-permissions \\            ║${NC}"
echo -e "${YELLOW}║    \"\$(cat agent-teams/prompts/level2-group-f-integration.md)\" ║${NC}"
echo -e "${YELLOW}║                                                              ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║  TMUX Controls:                                             ║${NC}"
echo -e "${CYAN}║    Attach:  tmux attach -t ${SESSION_NAME}             ║${NC}"
echo -e "${CYAN}║    Detach:  Ctrl+B then D                                   ║${NC}"
echo -e "${CYAN}║    Kill:    tmux kill-session -t ${SESSION_NAME}       ║${NC}"
echo -e "${CYAN}║    Panes:   Ctrl+B then arrow keys to navigate             ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║  Logs:                                                       ║${NC}"
echo -e "${BLUE}║    agent-teams/reports/level2-group-a-output.log            ║${NC}"
echo -e "${BLUE}║    agent-teams/reports/level2-group-b-output.log            ║${NC}"
echo -e "${BLUE}║    agent-teams/reports/level2-group-c-output.log            ║${NC}"
echo -e "${BLUE}║    agent-teams/reports/level2-group-d-output.log            ║${NC}"
echo -e "${BLUE}║    agent-teams/reports/level2-group-e-output.log            ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Attaching to TMUX session '${SESSION_NAME}'...${NC}"
echo -e "${YELLOW}(Press Ctrl+B then D to detach without killing agents)${NC}"
echo ""

# Attach to the session
tmux attach -t "${SESSION_NAME}"
