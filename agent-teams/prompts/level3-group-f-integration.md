# Agent Group F (Level 3): Integration (Sequential)

You are the Integration Agent for Level 3. You run AFTER Groups A through E complete. Your job is to wire all new commands into Tauri, integrate the InlineAgent overlay into CenterPanel, wire the AI tab in RightSidebar, and verify the full build pipeline compiles.

## You may modify these files:
- `src-tauri/src/commands/mod.rs` — add new module declarations
- `src-tauri/src/main.rs` — register new commands
- `src/components/layout/RightSidebar.tsx` — wire AI tab with agent entry points
- `src/components/layout/CenterPanel.tsx` — add InlineAgent overlay

## You should NOT create new files or rewrite existing files from scratch.
## Read every file before modifying it. Preserve all existing content.

---

## Task F1: Update commands/mod.rs

Read `src-tauri/src/commands/mod.rs`. It currently contains:
```rust
pub mod file_ops;
pub mod project;
pub mod credentials;
pub mod ai_provider;
pub mod image;
```

Add the two new Level 3 modules:
```rust
pub mod streaming;
pub mod orchestration;
```

The final file should have all 7 module declarations.

---

## Task F2: Register New Commands in main.rs

Read `src-tauri/src/main.rs`. The `generate_handler![]` macro currently lists Level 1 commands.

Add these new command registrations inside `generate_handler![]` after the existing entries:

```rust
// Level 3: Streaming
html_wizard::commands::streaming::send_ai_request_stream,
// Level 3: Orchestration
html_wizard::commands::orchestration::check_rate_limit,
html_wizard::commands::orchestration::get_provider_health,
html_wizard::commands::orchestration::check_connectivity,
html_wizard::commands::orchestration::get_usage_stats,
// Level 3: Enhanced credentials
html_wizard::commands::credentials::test_api_key_with_info,
```

Verify the final list includes all Level 1 commands (do not remove any). The complete list should be:

```rust
tauri::generate_handler![
    // File operations
    html_wizard::commands::file_ops::read_file,
    html_wizard::commands::file_ops::write_file,
    html_wizard::commands::file_ops::create_file,
    html_wizard::commands::file_ops::delete_file,
    html_wizard::commands::file_ops::list_directory,
    html_wizard::commands::file_ops::log_from_frontend,
    html_wizard::commands::project::open_project,
    html_wizard::commands::project::scan_directory,
    html_wizard::commands::credentials::store_api_key,
    html_wizard::commands::credentials::get_api_key,
    html_wizard::commands::credentials::delete_api_key,
    html_wizard::commands::credentials::test_api_key,
    html_wizard::commands::credentials::test_api_key_with_info,
    html_wizard::commands::ai_provider::send_ai_request,
    html_wizard::commands::ai_provider::list_providers,
    html_wizard::commands::image::upload_image,
    html_wizard::commands::image::link_image_url,
    html_wizard::commands::image::generate_image,
    html_wizard::commands::streaming::send_ai_request_stream,
    html_wizard::commands::orchestration::check_rate_limit,
    html_wizard::commands::orchestration::get_provider_health,
    html_wizard::commands::orchestration::check_connectivity,
    html_wizard::commands::orchestration::get_usage_stats,
]
```

---

## Task F3: Wire InlineAgent into CenterPanel.tsx

Read `src/components/layout/CenterPanel.tsx` in full before modifying.

The CenterPanel currently shows a preview iframe (or placeholder). Add the InlineAgent as an absolute-positioned overlay on top of the preview container.

### Changes to make:

1. Add imports at the top:
```typescript
import { useAppStore } from '../../store';
import { InlineAgent } from '../ai';
import { useElementContext } from '../../hooks/useElementContext';
```

2. Inside the `CenterPanel` component, add:
```typescript
const {
  selectedElement,
  inlineAgentVisible,
  inlineAgentPosition,
  inlineAgentTargetSelector,
  hideInlineAgent,
} = useAppStore();

const iframeRef = useRef<HTMLIFrameElement>(null);
const elementContext = useElementContext(iframeRef, inlineAgentTargetSelector);
```
(If a `iframeRef` already exists in the file, reuse it — do not create a duplicate.)

3. Wire the iframeRef to the iframe element. Find the `<iframe>` or preview `<div>` in the existing JSX. If an `<iframe>` exists, add `ref={iframeRef}` to it. If there is only a placeholder `<div>`, leave the ref on a wrapping div and note this will be fully functional once Level 2's iframe is in place.

4. Wrap the preview container in a `relative` positioned div (it likely already is). Inside that container, add the InlineAgent overlay after the iframe:

```tsx
{inlineAgentVisible && inlineAgentTargetSelector && (
  <div className="absolute inset-0 pointer-events-none z-40">
    <div className="pointer-events-auto">
      <InlineAgent
        position={inlineAgentPosition}
        targetSelector={inlineAgentTargetSelector}
        elementContext={elementContext}
        onClose={hideInlineAgent}
        onAcceptChange={(code, language) => {
          window.dispatchEvent(new CustomEvent('ai-apply-code', {
            detail: { code, language, selector: inlineAgentTargetSelector }
          }));
          hideInlineAgent();
        }}
      />
    </div>
  </div>
)}
```

5. Add a right-click / double-click handler on the preview area to trigger the InlineAgent. When the user double-clicks inside the preview (on the iframe or its container), dispatch:
```typescript
const handlePreviewDoubleClick = (e: React.MouseEvent) => {
  if (!selectedElement) return;
  const { showInlineAgent } = useAppStore.getState();
  showInlineAgent({ x: e.clientX, y: e.clientY }, selectedElement);
};
```
Add `onDoubleClick={handlePreviewDoubleClick}` to the preview container div.

NOTE: If CenterPanel does not yet have a real `<iframe>` (Level 2 may have used a placeholder), add the overlay logic anyway using the placeholder div as the container. The InlineAgent will activate once a project is open and an element is selected.

---

## Task F4: Wire RightSidebar.tsx AI Tab

Read `src/components/layout/RightSidebar.tsx` in full before modifying.

The RightSidebar currently has a tab bar with "Styles", "Attributes", "Computed", "AI" tabs. The AI tab content is a placeholder message "Select an element for AI suggestions".

Replace the AI tab content with:

```tsx
import { useAppStore } from '../../store';
```

Inside the component (not at file top, use inside component body):
```typescript
const { selectedElement, showInlineAgent } = useAppStore();
```

Replace the AI tab content in the `{activeTab === 'AI' && ...}` section (or equivalent — adapt to the actual tab rendering pattern in the file):

```tsx
{/* AI Tab Content */}
<div className="flex-1 overflow-y-auto p-3 space-y-3">
  {selectedElement ? (
    <>
      <div className="bg-gray-700/50 rounded p-2 border border-gray-600">
        <p className="text-[10px] text-gray-400 font-mono truncate mb-1">Selected</p>
        <p className="text-xs text-blue-300 font-mono truncate">{selectedElement}</p>
      </div>

      <button
        onClick={() => {
          showInlineAgent(
            { x: window.innerWidth / 2 - 160, y: window.innerHeight / 2 - 150 },
            selectedElement
          );
        }}
        className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded transition-colors"
      >
        Open AI Agent
      </button>

      <div className="space-y-1">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Quick Actions</p>
        {[
          'Make this element more prominent',
          'Fix the spacing and padding',
          'Make it mobile responsive',
          'Improve the color contrast',
          'Add a smooth hover effect',
        ].map((prompt) => (
          <button
            key={prompt}
            onClick={() => {
              showInlineAgent(
                { x: window.innerWidth / 2 - 160, y: window.innerHeight / 2 - 150 },
                selectedElement
              );
              // Pre-fill the inline agent input via a custom event
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('inline-agent-prefill', {
                  detail: { prompt }
                }));
              }, 100);
            }}
            className="w-full text-left px-2 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>
    </>
  ) : (
    <div className="flex-1 flex items-center justify-center h-32">
      <p className="text-gray-500 text-sm text-center">
        Select an element to<br />get AI suggestions
      </p>
    </div>
  )}
</div>
```

### How to apply this to the existing file:

The existing file renders tab content with a switch or conditional. Find the block that handles the AI tab (likely `activeTab === 'AI'` or the `emptyMessages['AI']` reference). Replace that tab's empty-state render with the full content above.

The exact approach depends on how the tabs are rendered — adapt to what you see in the file. Preserve the tab bar, breadcrumb trail, and CSS variables section. Only change the AI tab's content area.

---

## Task F5: Build Verification

Run these checks in order and fix any errors found:

### 1. Rust build check
```bash
cd src-tauri && cargo check 2>&1
```

Common issues to fix:
- Missing `use` imports in new files
- Type mismatches between `StreamChunkEvent` in Rust vs expected by Tauri emit
- `futures-util` not in Cargo.toml (add `futures-util = "0.3"` if missing)
- `reqwest` missing `stream` feature (verify `reqwest = { version = "0.12", features = ["json", "stream"] }`)
- Module `streaming` or `orchestration` not found (verify mod.rs was updated)
- `RateLimiterState` or `ProviderHealth` not imported in orchestration.rs (add `use crate::{RateLimiterState, ProviderHealth};`)
- `AppState` missing new fields (verify lib.rs was updated by Group B)

### 2. TypeScript type check
```bash
npx tsc --noEmit 2>&1
```

Common issues to fix:
- `useAI` hook not found — verify `src/hooks/useAI.ts` exists
- `token-estimator` not found — verify `src/utils/token-estimator.ts` exists
- Missing exports in `src/components/ai/index.ts`
- `StreamChunkEvent` not in `types/index.ts`
- `AISlice` missing new fields — verify Group C updated the slice correctly
- `EditorSlice` missing `inlineAgentVisible` — verify Group E updated the slice

### 3. Report
After running checks, list:
- Every file you modified and what you changed
- Every error you found and how you fixed it
- Whether `cargo check` passes
- Whether `tsc --noEmit` passes

---

## Acceptance Criteria

- `src-tauri/src/commands/mod.rs` declares `pub mod streaming;` and `pub mod orchestration;`
- `src-tauri/src/main.rs` registers all 6 new commands in `generate_handler!`
- `cargo check` passes in src-tauri/
- `src/components/layout/CenterPanel.tsx` renders `InlineAgent` as an overlay when `inlineAgentVisible` is true
- `src/components/layout/RightSidebar.tsx` AI tab shows "Open AI Agent" button and quick-action prompts when an element is selected
- `tsc --noEmit` passes with no errors
- All pre-existing commands and components remain functional (nothing removed)
