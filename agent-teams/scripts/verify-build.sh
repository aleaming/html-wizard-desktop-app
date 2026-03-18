#!/bin/bash
# =============================================================================
# HTML Wizard — FORGE Build Verification Script
# =============================================================================
# Run this after all 5 builder agents complete to verify the build.
# Checks file existence, Rust compilation, and frontend dependencies.
#
# Usage:
#   chmod +x agent-teams/scripts/verify-build.sh
#   ./agent-teams/scripts/verify-build.sh
# =============================================================================

set -uo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
REPORTS_DIR="${PROJECT_DIR}/agent-teams/reports"
REPORT_FILE="${REPORTS_DIR}/build-verification.md"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

check_file() {
    local file="$1"
    local description="$2"
    if [ -f "${PROJECT_DIR}/${file}" ]; then
        echo -e "  ${GREEN}✅ ${file}${NC} — ${description}"
        ((PASS++))
        echo "- [x] \`${file}\` — ${description}" >> "${REPORT_FILE}"
    else
        echo -e "  ${RED}❌ ${file}${NC} — ${description}"
        ((FAIL++))
        echo "- [ ] \`${file}\` — ${description} **MISSING**" >> "${REPORT_FILE}"
    fi
}

echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  HTML Wizard — FORGE Build Verification                 ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

mkdir -p "${REPORTS_DIR}"

# Initialize report
cat > "${REPORT_FILE}" << 'EOF'
# Build Verification Report
## Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
## Level 1 — Foundation

### File Existence Check
EOF

echo -e "${YELLOW}── Group A: Project Scaffolding ──${NC}"
check_file "src-tauri/Cargo.toml" "Rust package configuration"
check_file "package.json" "Frontend package configuration"
check_file "tsconfig.json" "TypeScript configuration"
check_file "src-tauri/tauri.conf.json" "Tauri window and security config"
check_file "tailwind.config.js" "Tailwind CSS configuration"
check_file "postcss.config.js" "PostCSS configuration"
check_file "vite.config.ts" "Vite build tool configuration"
check_file "index.html" "HTML entry point"
check_file "src/main.tsx" "React entry point"
check_file "src/index.css" "Base styles with Tailwind"
check_file ".gitignore" "Git ignore rules"

echo ""
echo -e "${YELLOW}── Group B: Rust File Operations ──${NC}"
check_file "src-tauri/src/main.rs" "Tauri entry point"
check_file "src-tauri/src/lib.rs" "Module declarations"
check_file "src-tauri/src/commands/mod.rs" "Commands module"
check_file "src-tauri/src/commands/file_ops.rs" "File operations"
check_file "src-tauri/src/commands/project.rs" "Project scanner"
check_file "src-tauri/src/models/mod.rs" "Models module"
check_file "src-tauri/src/models/project.rs" "Project types"
check_file "src-tauri/src/security/mod.rs" "Security module"
check_file "src-tauri/src/security/path_validator.rs" "Path validator"
check_file "src-tauri/src/security/sanitizer.rs" "HTML sanitizer"

echo ""
echo -e "${YELLOW}── Group C: Credentials & AI ──${NC}"
check_file "src-tauri/src/commands/credentials.rs" "Keychain credential storage"
check_file "src-tauri/src/commands/ai_provider.rs" "AI provider trait & stubs"
check_file "src-tauri/src/commands/image.rs" "Image command stubs"
check_file "src-tauri/src/models/ai.rs" "AI model types"
check_file "src-tauri/src/plugins/mod.rs" "Plugin registry"
check_file "src-tauri/src/plugins/plugin_manifest.rs" "Plugin manifest parser"

echo ""
echo -e "${YELLOW}── Group D: Frontend Layout ──${NC}"
check_file "src/App.tsx" "Root app component"
check_file "src/components/layout/LeftSidebar.tsx" "AI chat sidebar"
check_file "src/components/layout/CenterPanel.tsx" "Visual preview panel"
check_file "src/components/layout/RightSidebar.tsx" "Property inspector"
check_file "src/components/layout/BottomPanel.tsx" "File explorer panel"

echo ""
echo -e "${YELLOW}── Group E: State & Hooks ──${NC}"
check_file "src/store/index.ts" "Zustand store"
check_file "src/store/slices/projectSlice.ts" "Project state slice"
check_file "src/store/slices/editorSlice.ts" "Editor state slice"
check_file "src/store/slices/aiSlice.ts" "AI state slice"
check_file "src/store/slices/uiSlice.ts" "UI state slice"
check_file "src/hooks/useProject.ts" "Project hook"
check_file "src/types/index.ts" "Shared TypeScript types"
check_file "src/utils/logger.ts" "Frontend logger"

echo ""
echo -e "${CYAN}── Build Pipeline Check ──${NC}"

# Check npm install
echo "" >> "${REPORT_FILE}"
echo "### Build Pipeline" >> "${REPORT_FILE}"

if [ -f "${PROJECT_DIR}/package.json" ]; then
    echo -e "  ${YELLOW}Running npm install...${NC}"
    cd "${PROJECT_DIR}"
    if npm install --loglevel=error 2>&1; then
        echo -e "  ${GREEN}✅ npm install succeeded${NC}"
        ((PASS++))
        echo "- [x] npm install — succeeded" >> "${REPORT_FILE}"
    else
        echo -e "  ${RED}❌ npm install failed${NC}"
        ((FAIL++))
        echo "- [ ] npm install — **FAILED**" >> "${REPORT_FILE}"
    fi
else
    echo -e "  ${RED}❌ package.json missing, skipping npm install${NC}"
    ((FAIL++))
fi

# Check cargo check
if [ -f "${PROJECT_DIR}/src-tauri/Cargo.toml" ]; then
    echo -e "  ${YELLOW}Running cargo check...${NC}"
    cd "${PROJECT_DIR}/src-tauri"
    if cargo check 2>&1; then
        echo -e "  ${GREEN}✅ cargo check succeeded${NC}"
        ((PASS++))
        echo "- [x] cargo check — succeeded" >> "${REPORT_FILE}"
    else
        echo -e "  ${RED}❌ cargo check failed${NC}"
        ((FAIL++))
        echo "- [ ] cargo check — **FAILED**" >> "${REPORT_FILE}"
    fi
else
    echo -e "  ${RED}❌ Cargo.toml missing, skipping cargo check${NC}"
    ((FAIL++))
fi

# Summary
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Verification Summary                                   ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║  ${GREEN}Passed: ${PASS}${CYAN}                                            ║${NC}"
echo -e "${CYAN}║  ${RED}Failed: ${FAIL}${CYAN}                                            ║${NC}"
echo -e "${CYAN}║  ${YELLOW}Warnings: ${WARN}${CYAN}                                          ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════╣${NC}"

if [ ${FAIL} -eq 0 ]; then
    echo -e "${CYAN}║  ${GREEN}BUILD VERIFICATION PASSED ✅${CYAN}                          ║${NC}"
    echo -e "${CYAN}║  Ready for Integration Tasks (Group F)                  ║${NC}"
else
    echo -e "${CYAN}║  ${RED}BUILD VERIFICATION FAILED ❌${CYAN}                          ║${NC}"
    echo -e "${CYAN}║  ${FAIL} items need attention before integration          ║${NC}"
fi

echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Full report: ${REPORTS_DIR}/build-verification.md"

# Append summary to report
cat >> "${REPORT_FILE}" << EOF

### Summary
- **Passed:** ${PASS}
- **Failed:** ${FAIL}
- **Warnings:** ${WARN}
- **Status:** $([ ${FAIL} -eq 0 ] && echo "PASSED" || echo "FAILED")
EOF

exit ${FAIL}
