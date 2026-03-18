#!/bin/bash
# =============================================================================
# HTML Wizard — FORGE Agent Teams Launcher
# =============================================================================
# Spawns 5 parallel Claude Code builder agents in separate TMUX panes.
# Each agent receives ONLY its isolated task slice per FORGE builder isolation.
#
# Usage:
#   chmod +x agent-teams/scripts/launch-agents.sh
#   ./agent-teams/scripts/launch-agents.sh
#
# Prerequisites:
#   - tmux installed (brew install tmux)
#   - claude CLI available in PATH
# =============================================================================

set -euo pipefail

SESSION_NAME="html-wizard-forge"
PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
PROMPTS_DIR="${PROJECT_DIR}/agent-teams/prompts"
REPORTS_DIR="${PROJECT_DIR}/agent-teams/reports"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  HTML Wizard — FORGE Agent Teams Launcher               ║${NC}"
echo -e "${CYAN}║  Level 1: Foundation Build                              ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check prerequisites
if ! command -v tmux &> /dev/null; then
    echo -e "${RED}Error: tmux is not installed. Install with: brew install tmux${NC}"
    exit 1
fi

if ! command -v claude &> /dev/null; then
    echo -e "${RED}Error: claude CLI is not in PATH${NC}"
    exit 1
fi

# Verify prompt files exist
for group in a-scaffold b-rust-fileops c-rust-credentials d-frontend-layout e-frontend-state; do
    if [ ! -f "${PROMPTS_DIR}/group-${group}.md" ]; then
        echo -e "${RED}Error: Missing prompt file: group-${group}.md${NC}"
        exit 1
    fi
done

# Create reports directory
mkdir -p "${REPORTS_DIR}"

# Kill existing session if it exists
tmux kill-session -t "${SESSION_NAME}" 2>/dev/null || true

echo -e "${GREEN}Creating TMUX session: ${SESSION_NAME}${NC}"
echo -e "${YELLOW}Project directory: ${PROJECT_DIR}${NC}"
echo ""

# Create a new detached TMUX session with the first pane (Group A)
tmux new-session -d -s "${SESSION_NAME}" -n "forge-build" -c "${PROJECT_DIR}"

# ─── PANE LAYOUT ───────────────────────────────────────────────────────────
# We create a 5-pane layout:
#
#  ┌──────────────────┬──────────────────┐
#  │   Group A        │   Group B        │
#  │   Scaffold       │   Rust FileOps   │
#  ├──────────────────┼──────────────────┤
#  │   Group C        │   Group D        │
#  │   Rust Creds     │   Frontend       │
#  ├──────────────────┴──────────────────┤
#  │           Group E                   │
#  │        Frontend State               │
#  └─────────────────────────────────────┘

# Split the window into the layout
tmux split-window -h -t "${SESSION_NAME}:0" -c "${PROJECT_DIR}"    # Split right (B)
tmux split-window -v -t "${SESSION_NAME}:0.0" -c "${PROJECT_DIR}"  # Split A down (C)
tmux split-window -v -t "${SESSION_NAME}:0.1" -c "${PROJECT_DIR}"  # Split B down (D)
tmux split-window -v -t "${SESSION_NAME}:0.2" -c "${PROJECT_DIR}"  # Split C down (E)

# ─── AGENT COMMANDS ────────────────────────────────────────────────────────
# Each agent gets a clear, isolated prompt built from its task file.
# --dangerously-skip-permissions is used because these are builder agents
# working on files they own within the project.

# Pane 0: Group A — Project Scaffolding & Configuration
tmux send-keys -t "${SESSION_NAME}:0.0" "echo '🔨 Agent A: Project Scaffolding & Configuration' && claude --print --dangerously-skip-permissions 'You are Builder Agent A. Read the file agent-teams/prompts/group-a-scaffold.md and execute ALL tasks (A-1 through A-5) in that file. Create every file listed with the exact content specified. Work in the current directory. Do not touch any files not listed in your ownership section.' 2>&1 | tee ${REPORTS_DIR}/group-a-output.log" C-m

# Pane 1: Group B — Rust Backend File Operations
tmux send-keys -t "${SESSION_NAME}:0.1" "echo '🔨 Agent B: Rust File Operations & Security' && claude --print --dangerously-skip-permissions 'You are Builder Agent B. Read the file agent-teams/prompts/group-b-rust-fileops.md and execute ALL tasks (B-1 through B-5) in that file. Create every file listed with the exact content specified. Create all necessary directories. Work in the current directory. Do not touch any files not listed in your ownership section.' 2>&1 | tee ${REPORTS_DIR}/group-b-output.log" C-m

# Pane 2: Group C — Rust Credentials & AI
tmux send-keys -t "${SESSION_NAME}:0.2" "echo '🔨 Agent C: Credentials, AI Infra & Plugins' && claude --print --dangerously-skip-permissions 'You are Builder Agent C. Read the file agent-teams/prompts/group-c-rust-credentials.md and execute ALL tasks (C-1 through C-5) in that file. Create every file listed with the exact content specified. Create all necessary directories. Work in the current directory. Do not touch any files not listed in your ownership section.' 2>&1 | tee ${REPORTS_DIR}/group-c-output.log" C-m

# Pane 3: Group D — Frontend Layout
tmux send-keys -t "${SESSION_NAME}:0.3" "echo '🔨 Agent D: Frontend Layout Shell' && claude --print --dangerously-skip-permissions 'You are Builder Agent D. Read the file agent-teams/prompts/group-d-frontend-layout.md and execute ALL tasks (D-1 through D-5) in that file. Create every file listed with the exact content specified. Create all necessary directories. Work in the current directory. Do not touch any files not listed in your ownership section.' 2>&1 | tee ${REPORTS_DIR}/group-d-output.log" C-m

# Pane 4: Group E — Frontend State
tmux send-keys -t "${SESSION_NAME}:0.4" "echo '🔨 Agent E: State Management, Hooks & Types' && claude --print --dangerously-skip-permissions 'You are Builder Agent E. Read the file agent-teams/prompts/group-e-frontend-state.md and execute ALL tasks (E-1 through E-5) in that file. Create every file listed with the exact content specified. Create all necessary directories. Work in the current directory. Do not touch any files not listed in your ownership section.' 2>&1 | tee ${REPORTS_DIR}/group-e-output.log" C-m

# ─── STATUS OUTPUT ─────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  All 5 builder agents launched successfully!            ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                                        ║${NC}"
echo -e "${GREEN}║  Agent A: Project Scaffolding & Configuration          ║${NC}"
echo -e "${GREEN}║  Agent B: Rust File Operations & Security              ║${NC}"
echo -e "${GREEN}║  Agent C: Credentials, AI Infra & Plugins              ║${NC}"
echo -e "${GREEN}║  Agent D: Frontend Layout Shell                        ║${NC}"
echo -e "${GREEN}║  Agent E: State Management, Hooks & Types              ║${NC}"
echo -e "${GREEN}║                                                        ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  To attach: tmux attach -t ${SESSION_NAME}        ║${NC}"
echo -e "${GREEN}║  To detach: Ctrl+B then D                              ║${NC}"
echo -e "${GREEN}║  To kill:   tmux kill-session -t ${SESSION_NAME}  ║${NC}"
echo -e "${GREEN}║                                                        ║${NC}"
echo -e "${GREEN}║  Logs: agent-teams/reports/group-[a-e]-output.log      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Attaching to TMUX session...${NC}"

# Attach to the session
tmux attach -t "${SESSION_NAME}"
