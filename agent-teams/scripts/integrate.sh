#!/bin/bash
# =============================================================================
# HTML Wizard — FORGE Integration Runner (Group F)
# =============================================================================
# Runs after all parallel agents complete and verification passes.
# Executes integration tasks: wiring commands, final build check.
#
# Usage:
#   ./agent-teams/scripts/integrate.sh
# =============================================================================

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
REPORTS_DIR="${PROJECT_DIR}/agent-teams/reports"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  HTML Wizard — Integration Tasks (Group F)              ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Verify all parallel builds completed
echo -e "${YELLOW}Step 1: Verify parallel builds...${NC}"
bash "${PROJECT_DIR}/agent-teams/scripts/verify-build.sh"

if [ $? -ne 0 ]; then
    echo -e "${RED}Parallel builds have failures. Fix those before integrating.${NC}"
    exit 1
fi

# Step 2: Run integration agent
echo ""
echo -e "${YELLOW}Step 2: Running integration agent (Task F-1 & F-2)...${NC}"

claude --print --dangerously-skip-permissions "$(cat <<'PROMPT'
You are the Integration Agent (Group F). Your job is to wire together the code produced by 5 parallel builder agents.

TASKS:

Task F-1: Wire Rust Commands into Tauri Builder
- Open src-tauri/src/main.rs
- Ensure ALL command handlers from commands/file_ops.rs, commands/project.rs, commands/credentials.rs, commands/ai_provider.rs, and commands/image.rs are registered in the generate_handler![] macro
- Ensure AppState is created with PathValidator and managed by Tauri
- Ensure all plugin registrations are correct
- Fix any compilation errors from module wiring

Task F-2: Verify Full Build Pipeline
- Run: npm install (fix any dependency issues)
- Run: cd src-tauri && cargo check (fix any Rust compilation errors)
- Verify all modules compile together
- Fix any cross-module type mismatches

DO NOT rewrite files from scratch. Make targeted edits to fix integration issues.
Report what you fixed.
PROMPT
)" 2>&1 | tee "${REPORTS_DIR}/integration-output.log"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Integration complete. Run verify-build.sh to confirm.  ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
