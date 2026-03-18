# Level 2 — Group F: Integration (Sequential — Run After Groups A–E)

You are Builder Agent F for the HTML Wizard Level 2 Visual Editor build.

## CRITICAL: Run AFTER Groups A–E complete

This agent runs last. Groups A–E create the components. Your job is to wire them together into the working application. Before writing any code, READ every file you will modify. Make targeted, surgical edits only — do not rewrite any file from scratch.

---

## File Ownership

**MODIFY (read first, then make targeted edits):**
- `src/components/layout/CenterPanel.tsx`
- `src/App.tsx`
- `src/store/slices/editorSlice.ts`
- `src-tauri/src/main.rs`

**DO NOT** create new files. **DO NOT** touch any file not in the list above.

---

## Context: What Groups A–E Built

After Groups A–E complete, the following files will exist:

| File | Created By |
|------|-----------|
| `src/components/editor/PreviewFrame.tsx` | Group A |
| `src/utils/sanitizer.ts` | Group A |
| `src/utils/debounce.ts` | Group A |
| `src/components/editor/ElementOverlay.tsx` | Group B |
| `src/hooks/useEditor.ts` | Group B |
| `src/utils/css-variables.ts` | Group C |
| `src/components/editor/ColorPicker.tsx` | Group C |
| `src/utils/context-builder.ts` | Group C |
| `src/components/editor/CodeEditor.tsx` | Group D |
| `src/hooks/useFileWatcher.ts` | Group D |
| `src-tauri/src/commands/file_watcher.rs` | Group D |
| `src/components/project/FileTree.tsx` | Group E |
| `src/components/editor/ImageHandler.tsx` | Group E |
| `src/components/editor/ViewportSelector.tsx` | Group E |

Group B also extended `src/store/slices/editorSlice.ts` with:
- `hoveredElement: ElementOverlayData | null`
- `selectedElementData: ElementSelectionData | null`
- `contentEditableMode: boolean`
- `setHoveredElement`, `setSelectedElementData`, `setContentEditableMode`

Group D also added `pub mod file_watcher;` to `src-tauri/src/commands/mod.rs`.

---

## Task F1: CenterPanel Integration (`src/components/layout/CenterPanel.tsx`)

READ the existing file completely first. The current CenterPanel has:
- A toolbar row with viewport preset buttons, custom dimensions inputs, orientation toggle, scale display
- A preview container div (with a static placeholder div inside)
- A zoom indicator footer

### Changes to make:

**1. Replace the local viewport state with the Zustand store**

Remove the local `useState` hooks for `viewportWidth`, `viewportHeight`, `activePreset`, `customWidth`, `customHeight`. Instead:

```typescript
import { useAppStore } from '../../store';
const { viewport, setViewport } = useAppStore();
// viewport: ViewportSize (the current viewport from uiSlice)
// setViewport: (v: ViewportSize) => void
```

**2. Import and replace the toolbar with ViewportSelector**

Remove the inline toolbar JSX (the `{/* Viewport Toolbar */}` section including presets, custom inputs, orientation toggle). Replace it with:

```tsx
import ViewportSelector from '../editor/ViewportSelector';

{/* Viewport Toolbar */}
<ViewportSelector
  viewport={viewport}
  onViewportChange={setViewport}
  scale={scale}
/>
```

Keep the `calculateScale` useEffect that computes scale from container size — update it to use `viewport.width` and `viewport.height` instead of the local state variables.

**3. Import and integrate PreviewFrame + ElementOverlay**

Add new state and refs for the editor:

```typescript
import { useRef, useState } from 'react';
import PreviewFrame, { PreviewFrameHandle } from '../editor/PreviewFrame';
import ElementOverlay from '../editor/ElementOverlay';
import CodeEditor, { CodeEditorHandle } from '../editor/CodeEditor';
import { useEditor } from '../../hooks/useEditor';
import { useFileWatcher } from '../../hooks/useFileWatcher';
import { useProject } from '../../hooks/useProject';

// Inside the component:
const previewRef = useRef<PreviewFrameHandle>(null);
const codeEditorRef = useRef<CodeEditorHandle>(null);
const { activeFile, readFile, addChange } = useProject();
const {
  hoveredElement,
  selectedElementData,
  dblClickData,
  editorCallbacks,
  handleEditComplete,
} = useEditor();

const [htmlContent, setHtmlContent] = useState<string>('');
const [showCodeEditor, setShowCodeEditor] = useState(false);
```

**4. Load the active file when it changes**

```typescript
useEffect(() => {
  if (!activeFile) return;
  readFile(activeFile).then(content => {
    setHtmlContent(content);
    previewRef.current?.reload(content);
  }).catch(console.error);
}, [activeFile]);
```

**5. Wire the file watcher**

```typescript
const { markUserEdit } = useFileWatcher({
  onFileChanged: (_path, content) => {
    setHtmlContent(content);
    previewRef.current?.reload(content);
    codeEditorRef.current?.applyEdit('', htmlContent, content);
  },
  enabled: !!activeFile,
});
```

**6. Handle code editor changes (code-to-preview sync)**

```typescript
const handleCodeChange = (newCode: string) => {
  markUserEdit();
  setHtmlContent(newCode);
  previewRef.current?.reload(newCode);
  // Buffer the change for save
  if (activeFile) {
    addChange({
      filePath: activeFile,
      original: null,
      modified: newCode,
      timestamp: Date.now(),
    });
  }
};
```

**7. Handle visual edits (visual-to-code sync)**

```typescript
const handleVisualEditComplete = (op: import('../../types').EditOperation) => {
  handleEditComplete(op);
  // Apply the edit to Monaco
  codeEditorRef.current?.applyEdit(op.elementSelector, op.before, op.after);
  // Apply to preview
  previewRef.current?.reload(htmlContent);
};
```

**8. Replace the preview container content**

Replace the static placeholder div with the layered preview stack:

```tsx
{/* Preview Container */}
<div
  ref={containerRef}
  className="flex-1 flex items-center justify-center overflow-hidden relative"
  style={{ background: '#09090b' }}
>
  {showCodeEditor ? (
    /* Split view: top half preview, bottom half Monaco */
    <div className="w-full h-full flex flex-col">
      <div
        className="relative flex-shrink-0"
        style={{ height: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div style={{ position: 'relative', width: viewport.width * (scale / 100), height: viewport.height * (scale / 100) }}>
          <PreviewFrame
            ref={previewRef}
            html={htmlContent}
            scale={scale / 100}
            viewport={viewport}
            {...editorCallbacks}
          />
          <ElementOverlay
            hoveredElement={hoveredElement}
            selectedElement={selectedElementData}
            scale={scale / 100}
            dblClickData={dblClickData}
            onEditComplete={handleVisualEditComplete}
          />
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <CodeEditor
          ref={codeEditorRef}
          value={htmlContent}
          language="html"
          filePath={activeFile ?? undefined}
          onChange={handleCodeChange}
          onSave={handleCodeChange}
        />
      </div>
    </div>
  ) : (
    /* Preview only */
    <div
      className="relative"
      style={{ width: viewport.width * (scale / 100), height: viewport.height * (scale / 100) }}
    >
      {htmlContent ? (
        <>
          <PreviewFrame
            ref={previewRef}
            html={htmlContent}
            scale={scale / 100}
            viewport={viewport}
            {...editorCallbacks}
          />
          <ElementOverlay
            hoveredElement={hoveredElement}
            selectedElement={selectedElementData}
            scale={scale / 100}
            dblClickData={dblClickData}
            onEditComplete={handleVisualEditComplete}
          />
        </>
      ) : (
        <div
          className="border border-gray-700 rounded bg-white flex items-center justify-center"
          style={{ width: viewport.width * (scale / 100), height: viewport.height * (scale / 100) }}
        >
          <p className="text-gray-400 text-sm text-center">
            Open a project to see<br />the visual preview
          </p>
        </div>
      )}
    </div>
  )}
</div>
```

**9. Update the footer zoom indicator — add code editor toggle**

Replace the zoom indicator footer with:
```tsx
<div className="flex items-center justify-between px-3 py-1.5 border-t border-gray-700 bg-gray-800">
  <button
    onClick={() => setShowCodeEditor(v => !v)}
    className={`text-xs px-2 py-1 rounded transition-colors ${
      showCodeEditor
        ? 'bg-blue-600 text-white'
        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
    }`}
    title="Toggle code editor split view"
  >
    &lt;/&gt; Code
  </button>
  <span className="text-xs text-gray-500">{scale}%</span>
</div>
```

**10. Clean up local state that was replaced**

Remove the local `viewportWidth`, `viewportHeight`, `activePreset`, `customWidth`, `customHeight` useState declarations and all handler functions for presets, orientation, and custom apply (those are now inside ViewportSelector). Keep `scale` state and `containerRef` and `calculateScale` — but update calculateScale to use `viewport.width` and `viewport.height`:

```typescript
const calculateScale = useCallback(() => {
  if (!containerRef.current) return;
  const container = containerRef.current;
  const availableWidth = container.clientWidth - 48;
  const availableHeight = container.clientHeight - 48;
  const scaleX = availableWidth / viewport.width;
  const scaleY = availableHeight / viewport.height;
  const newScale = Math.min(scaleX, scaleY, 1);
  setScale(Math.round(newScale * 100));
}, [viewport.width, viewport.height]);
```

---

## Task F2: Keyboard Shortcuts in `src/App.tsx`

READ the existing file first. The existing `handleKeyDown` inside `useEffect` handles:
- `Cmd+J` — toggle left sidebar
- `Cmd+backtick` — toggle bottom panel

Add undo/redo and save shortcuts. Import the store at the top of App.tsx:

```typescript
import { useAppStore } from './store';
```

Inside the `App` component, add:

```typescript
const { undo, redo, undoStack, redoStack, commitChanges } = useAppStore();
const { writeFile, activeFile } = useProject();
// Note: import useProject from './hooks/useProject'
```

Extend the existing `handleKeyDown` useEffect to also handle:

```typescript
// Undo: Cmd+Z (without Shift)
if (mod && e.key === 'z' && !e.shiftKey) {
  e.preventDefault();
  undo();
}

// Redo: Cmd+Shift+Z or Cmd+Y
if ((mod && e.key === 'z' && e.shiftKey) || (mod && e.key === 'y')) {
  e.preventDefault();
  redo();
}

// Save: Cmd+S
if (mod && e.key === 's') {
  e.preventDefault();
  if (activeFile) {
    const entries = commitChanges();
    for (const entry of entries) {
      writeFile(entry.filePath, entry.modified).catch(console.error);
    }
  }
}
```

Add these imports at the top of App.tsx:
```typescript
import { useProject } from './hooks/useProject';
```

---

## Task F3: Grouped Undo/Redo in `src/store/slices/editorSlice.ts`

READ the existing file first. The existing editorSlice has `pushOperation`, `undo`, `redo`.

Add two new actions for grouped operations. These pop/push all operations sharing the same `groupId` together:

Add to the `EditorSlice` interface:
```typescript
undoGroup: (groupId: string) => EditOperation[];
redoGroup: (groupId: string) => EditOperation[];
```

Add implementations to `createEditorSlice`:
```typescript
undoGroup: (groupId: string) => {
  const { undoStack, redoStack } = get();
  // Find all ops with this groupId in the undo stack
  const groupOps = undoStack.filter(op => op.groupId === groupId);
  if (groupOps.length === 0) return [];
  set({
    undoStack: undoStack.filter(op => op.groupId !== groupId),
    redoStack: [...redoStack, ...groupOps],
  });
  return groupOps;
},

redoGroup: (groupId: string) => {
  const { undoStack, redoStack } = get();
  const groupOps = redoStack.filter(op => op.groupId === groupId);
  if (groupOps.length === 0) return [];
  set({
    redoStack: redoStack.filter(op => op.groupId !== groupId),
    undoStack: [...undoStack, ...groupOps],
  });
  return groupOps;
},
```

**Preserve all existing logic.** Only ADD the new interface entries and implementations.

---

## Task F4: Register file_watcher Commands in `src-tauri/src/main.rs`

READ the existing file first. The existing `invoke_handler` lists all commands.

Add the two new file watcher commands to the `tauri::generate_handler![]` macro list. Add them after the last image command:

```rust
html_wizard::commands::file_watcher::watch_file,
html_wizard::commands::file_watcher::unwatch_file,
```

The full updated handler list should look like:
```rust
.invoke_handler(tauri::generate_handler![
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
    html_wizard::commands::ai_provider::send_ai_request,
    html_wizard::commands::ai_provider::list_providers,
    html_wizard::commands::image::upload_image,
    html_wizard::commands::image::link_image_url,
    html_wizard::commands::image::generate_image,
    html_wizard::commands::file_watcher::watch_file,
    html_wizard::commands::file_watcher::unwatch_file,
])
```

---

## Task F5: Build Verification

After making all edits, run the following checks from the project root directory:

### TypeScript check
```bash
npx tsc --noEmit
```

If there are errors, fix them. Common issues to look out for:
- Missing imports (e.g., `useProject` not imported in App.tsx)
- Type mismatches between `ElementOverlay` props and what `useEditor` returns
- `EditorSlice` interface not updated when adding new fields to the implementation

### Rust check
```bash
cd src-tauri && cargo check
```

If there are errors, fix them. Common issues:
- Missing `use` statements in `file_watcher.rs`
- `Emitter` trait not in scope (needs `use tauri::Emitter;`)
- The `WATCHERS` static with `Mutex<Option<HashMap>>` — if `RecommendedWatcher` is not `Send`, use `std::sync::Arc<Mutex<...>>` or restructure

### If cargo check fails due to Watcher not being Send

Alternative simpler implementation for file_watcher.rs — use a channel-based approach without storing the watcher globally. Instead, keep the watcher alive in the tokio task by moving it in:

```rust
#[tauri::command]
pub async fn watch_file(app: AppHandle, path: String) -> Result<(), String> {
    let path_clone = path.clone();
    tokio::task::spawn_blocking(move || {
        use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
        use std::sync::mpsc;

        let (tx, rx) = mpsc::channel();
        let mut watcher = RecommendedWatcher::new(tx, Config::default())
            .map_err(|e| e.to_string())?;
        watcher.watch(std::path::Path::new(&path_clone), RecursiveMode::NonRecursive)
            .map_err(|e| e.to_string())?;

        // Block this thread watching for events
        for event in rx {
            match event {
                Ok(e) => {
                    let kind_str = match e.kind {
                        notify::EventKind::Modify(_) => "modified",
                        notify::EventKind::Create(_) => "created",
                        notify::EventKind::Remove(_) => "removed",
                        _ => continue,
                    };
                    let payload = serde_json::json!({
                        "path": path_clone,
                        "kind": kind_str
                    });
                    let _ = app.emit("file-changed", payload);
                }
                Err(e) => tracing::error!(error = %e, "Watcher error"),
            }
        }
        Ok::<(), String>(())
    });
    Ok(())
}

#[tauri::command]
pub async fn unwatch_file(_path: String) -> Result<(), String> {
    // Simplified: watcher stops when the thread exits or we track handles
    Ok(())
}
```

Use whichever implementation compiles cleanly.

---

## Import Paths Reference

```typescript
// In src/components/layout/CenterPanel.tsx additions:
import { useAppStore } from '../../store';
import ViewportSelector from '../editor/ViewportSelector';
import PreviewFrame, { PreviewFrameHandle } from '../editor/PreviewFrame';
import ElementOverlay from '../editor/ElementOverlay';
import CodeEditor, { CodeEditorHandle } from '../editor/CodeEditor';
import { useEditor } from '../../hooks/useEditor';
import { useFileWatcher } from '../../hooks/useFileWatcher';
import { useProject } from '../../hooks/useProject';

// In src/App.tsx additions:
import { useAppStore } from './store';
import { useProject } from './hooks/useProject';
```

---

## Verification Checklist

Before finishing, confirm:
- [ ] `npx tsc --noEmit` runs without errors
- [ ] `cd src-tauri && cargo check` runs without errors
- [ ] CenterPanel uses `viewport`/`setViewport` from the store (not local state)
- [ ] PreviewFrame and ElementOverlay are layered correctly with z-index — ElementOverlay is in the DOM AFTER PreviewFrame so it renders on top
- [ ] The code editor split view toggles with the "</> Code" button
- [ ] Cmd+Z triggers `undo()`, Cmd+Shift+Z triggers `redo()`, Cmd+S saves all changes
- [ ] `undoGroup` and `redoGroup` are added to EditorSlice interface and implementation
- [ ] `watch_file` and `unwatch_file` are registered in main.rs
- [ ] No files outside your ownership list were modified
- [ ] The existing undo/redo logic and all existing App.tsx keyboard shortcuts still work
