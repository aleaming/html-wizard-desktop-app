#!/bin/bash
# =============================================================================
# HTML Wizard — Level 3: AI Integration Agent Teams Launcher
# =============================================================================
# Spawns 5 parallel Claude Code builder agents in separate TMUX panes.
# Each agent receives ONLY its isolated task slice per FORGE builder isolation.
# Group F (Integration) must be run MANUALLY after A-E complete.
#
# Usage:
#   chmod +x agent-teams/scripts/launch-level3.sh
#   ./agent-teams/scripts/launch-level3.sh
#
# Prerequisites:
#   - tmux installed (brew install tmux)
#   - claude CLI available in PATH
#   - Level 1 (foundation) and Level 2 (visual editor) already merged
# =============================================================================

set -euo pipefail

SESSION_NAME="html-wizard-level3"
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
echo -e "${CYAN}║  Level 3: AI Integration Build                         ║${NC}"
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

# Verify Level 3 prompt files exist
for group in a-providers b-orchestration c-frontend-state d-chat-ui e-inline-agent; do
    if [ ! -f "${PROMPTS_DIR}/level3-group-${group}.md" ]; then
        echo -e "${RED}Error: Missing prompt file: level3-group-${group}.md${NC}"
        exit 1
    fi
done

# Warn if integration prompt is missing (F runs manually, not in parallel)
if [ ! -f "${PROMPTS_DIR}/level3-group-f-integration.md" ]; then
    echo -e "${YELLOW}Warning: level3-group-f-integration.md not found — integration step will not be available${NC}"
fi

# Create reports directory
mkdir -p "${REPORTS_DIR}"

# Kill existing session if it exists
tmux kill-session -t "${SESSION_NAME}" 2>/dev/null || true

echo -e "${GREEN}Creating TMUX session: ${SESSION_NAME}${NC}"
echo -e "${YELLOW}Project directory: ${PROJECT_DIR}${NC}"
echo ""

# Create a new detached TMUX session with the first pane (Group A)
tmux new-session -d -s "${SESSION_NAME}" -n "level3-build" -c "${PROJECT_DIR}"

# ─── PANE LAYOUT ───────────────────────────────────────────────────────────
# We create a 5-pane layout:
#
#  ┌──────────────────┬──────────────────┐
#  │   Group A        │   Group B        │
#  │   Rust Providers │   Orchestration  │
#  ├──────────────────┼──────────────────┤
#  │   Group C        │   Group D        │
#  │   Frontend State │   Chat UI        │
#  ├──────────────────┴──────────────────┤
#  │           Group E                   │
#  │        Inline Agent                 │
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

# Pane 0: Group A — Rust AI Provider Implementations
tmux send-keys -t "${SESSION_NAME}:0.0" "echo 'Agent A: Rust AI Provider Implementations' && claude --print --dangerously-skip-permissions 'You are Builder Agent A for Level 3. Read the file agent-teams/prompts/level3-group-a-providers.md and execute ALL tasks (A1 through A5) in that file. Implement real HTTP calls for all three AI providers. Create every file listed with the exact content specified. Work in the current directory. Do not touch any files not listed in your ownership section.' 2>&1 | tee ${REPORTS_DIR}/level3-group-a-output.log" C-m

# Pane 1: Group B — Rust Credentials Validation & Orchestration
tmux send-keys -t "${SESSION_NAME}:0.1" "echo 'Agent B: Rust Credentials Validation & Orchestration' && claude --print --dangerously-skip-permissions 'You are Builder Agent B for Level 3. Read the file agent-teams/prompts/level3-group-b-orchestration.md and execute ALL tasks (B1 through B5) in that file. Add real API validation, extend AppState, create orchestration commands, and enhance the sanitizer. Work in the current directory. Do not touch any files not listed in your ownership section.' 2>&1 | tee ${REPORTS_DIR}/level3-group-b-output.log" C-m

# Pane 2: Group C — Frontend Types, State & AI Hook
tmux send-keys -t "${SESSION_NAME}:0.2" "echo 'Agent C: Frontend Types, State & AI Hook' && claude --print --dangerously-skip-permissions 'You are Builder Agent C for Level 3. Read the file agent-teams/prompts/level3-group-c-frontend-state.md and execute ALL tasks (C1 through C5) in that file. Add streaming types, extend the AI slice, create the useAI hook, and create the token estimator. Work in the current directory. Do not touch any files not listed in your ownership section.' 2>&1 | tee ${REPORTS_DIR}/level3-group-c-output.log" C-m

# Pane 3: Group D — Frontend Chat Panel & Provider Selector
tmux send-keys -t "${SESSION_NAME}:0.3" "echo 'Agent D: Frontend Chat Panel & Provider Selector' && claude --print --dangerously-skip-permissions 'You are Builder Agent D for Level 3. Read the file agent-teams/prompts/level3-group-d-chat-ui.md and execute ALL tasks (D1 through D5) in that file. Create ChatPanel, ProviderSelector, DiffPreview, and refactor LeftSidebar. Work in the current directory. Do not touch any files not listed in your ownership section.' 2>&1 | tee ${REPORTS_DIR}/level3-group-d-output.log" C-m

# Pane 4: Group E — Frontend Inline Agent & Element Context
tmux send-keys -t "${SESSION_NAME}:0.4" "echo 'Agent E: Frontend Inline Agent & Element Context' && claude --print --dangerously-skip-permissions 'You are Builder Agent E for Level 3. Read the file agent-teams/prompts/level3-group-e-inline-agent.md and execute ALL tasks (E1 through E4) in that file. Create useElementContext hook, InlineAgent component, and extend editorSlice. Do NOT modify RightSidebar.tsx or CenterPanel.tsx. Work in the current directory. Do not touch any files not listed in your ownership section.' 2>&1 | tee ${REPORTS_DIR}/level3-group-e-output.log" C-m

# ─── STATUS OUTPUT ─────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  All 5 Level 3 builder agents launched successfully!    ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                                        ║${NC}"
echo -e "${GREEN}║  Agent A: Rust AI Provider Implementations             ║${NC}"
echo -e "${GREEN}║  Agent B: Rust Orchestration & Credentials             ║${NC}"
echo -e "${GREEN}║  Agent C: Frontend Types, State & AI Hook              ║${NC}"
echo -e "${GREEN}║  Agent D: Chat UI, Provider Selector & DiffPreview     ║${NC}"
echo -e "${GREEN}║  Agent E: Inline Agent & Element Context Hook          ║${NC}"
echo -e "${GREEN}║                                                        ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${YELLOW}║  IMPORTANT: After A-E complete, run Group F manually:  ║${NC}"
echo -e "${YELLOW}║  claude --print --dangerously-skip-permissions         ║${NC}"
echo -e "${YELLOW}║    'Read agent-teams/prompts/level3-group-f-           ║${NC}"
echo -e "${YELLOW}║    integration.md and execute all tasks'               ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                                        ║${NC}"
echo -e "${GREEN}║  To attach:  tmux attach -t ${SESSION_NAME}     ║${NC}"
echo -e "${GREEN}║  To detach:  Ctrl+B then D                             ║${NC}"
echo -e "${GREEN}║  To kill:    tmux kill-session -t ${SESSION_NAME}║${NC}"
echo -e "${GREEN}║                                                        ║${NC}"
echo -e "${GREEN}║  Logs: agent-teams/reports/level3-group-[a-e]-output.log ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Attaching to TMUX session...${NC}"

# Attach to the session
tmux attach -t "${SESSION_NAME}"
