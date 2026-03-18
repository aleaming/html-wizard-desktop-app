# Level 2 — Group D: Monaco Code Editor + Bidirectional Sync + File Watcher

You are Builder Agent D for the HTML Wizard Level 2 Visual Editor build.

## Your Mission

Build the Monaco code editor wrapper component, implement debounced code-to-preview sync, implement visual-to-code sync (EditOperation applied to Monaco), build the Rust file watcher command using the notify crate, and build the useFileWatcher hook.

---

## File Ownership

**CREATE (new files — do not exist yet):**
- `src/components/editor/CodeEditor.tsx`
- `src/hooks/useFileWatcher.ts`
- `src-tauri/src/commands/file_watcher.rs`

**MODIFY (extend existing files — READ them first, make targeted additions only):**
- `src-tauri/src/commands/mod.rs` — add `pub mod file_watcher;`

**DO NOT TOUCH** any layout components, store slices, types/index.ts, or any file not in your ownership list.

---

## Context: Existing Codebase

### Package dependencies (already installed)
From `package.json`:
```json
"@monaco-editor/react": "^4.6.0",
"@tauri-apps/api": "^2.0.0"
```

### Cargo.toml dependencies (already present)
```toml
notify = "7"
tokio = { version = "1", features = ["full"] }
tauri = { version = "2", features = ["devtools"] }
```

### Store shape (read-only)
```typescript
import { useAppStore } from '../../store';
// From projectSlice:
// activeFile: string | null
// addChange: (entry: ChangeEntry) => void
// From editorSlice:
// undoStack: EditOperation[]
// pushOperation: (op: EditOperation) => void
```

### Existing types
```typescript
import { EditOperation, ChangeEntry } from '../../types';
// EditOperation: { id, type, elementSelector, filePath, before, after, timestamp, groupId? }
// ChangeEntry: { filePath, original: string | null, modified, timestamp }
```

### Tauri API imports
```typescript
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
```

### Existing commands/mod.rs
```rust
pub mod file_ops;
pub mod project;
pub mod credentials;
pub mod ai_provider;
pub mod image;
```
You must ADD `pub mod file_watcher;` to this file.

---

## Task D1: Monaco Wrapper (`src/components/editor/CodeEditor.tsx`)

### Props Interface
```typescript
export interface CodeEditorProps {
  value: string;
  language?: 'html' | 'css' | 'javascript';
  filePath?: string;
  onChange?: (value: string) => void;
  onSave?: (value: string) => void;
  className?: string;
  readOnly?: boolean;
}

export interface CodeEditorHandle {
  // Apply a diff to the editor without triggering onChange
  applyEdit: (selector: string, before: string, after: string) => void;
  // Get the current full text value
  getValue: () => string;
  // Focus the editor
  focus: () => void;
}
```

Use `React.forwardRef<CodeEditorHandle, CodeEditorProps>`.

### Implementation

```typescript
import React, { useRef, useCallback, useImperativeHandle } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import { debouncedWithCancel } from '../../utils/debounce';

const CodeEditor = React.forwardRef<CodeEditorHandle, CodeEditorProps>((
  { value, language = 'html', filePath, onChange, onSave, className, readOnly = false },
  ref
) => {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Dark theme configuration
    monaco.editor.defineTheme('html-wizard-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#111827',       // gray-900
        'editor.lineHighlightBackground': '#1f2937', // gray-800
        'editorLineNumber.foreground': '#4b5563',    // gray-600
        'editorCursor.foreground': '#3b82f6',        // blue-500
      },
    });
    monaco.editor.setTheme('html-wizard-dark');

    // Cmd+S / Ctrl+S save handler
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      () => {
        const currentValue = editor.getValue();
        onSave?.(currentValue);
      }
    );
  };
```

### Minimap and editor options

```typescript
const editorOptions: MonacoEditor.IStandaloneEditorConstructionOptions = {
  minimap: { enabled: true, side: 'right', scale: 1 },
  fontSize: 13,
  fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Menlo, monospace',
  fontLigatures: true,
  lineNumbers: 'on',
  scrollBeyondLastLine: false,
  wordWrap: 'on',
  tabSize: 2,
  insertSpaces: true,
  automaticLayout: true,
  readOnly,
  padding: { top: 8, bottom: 8 },
  scrollbar: {
    verticalScrollbarSize: 6,
    horizontalScrollbarSize: 6,
  },
};
```

### Render

```tsx
return (
  <div className={`h-full w-full bg-gray-900 ${className ?? ''}`}>
    <Editor
      value={value}
      language={language}
      onMount={handleMount}
      onChange={(val) => onChange?.(val ?? '')}
      options={editorOptions}
    />
  </div>
);
```

---

## Task D2: Code-to-Preview Sync (inside CodeEditor.tsx)

When `onChange` fires, the parent component is responsible for debouncing and updating the preview. However, CodeEditor exposes a debounced onChange internally so rapid keystrokes do not flood the parent.

Inside the component, create a debounced wrapper:
```typescript
const { fn: debouncedOnChange, cancel } = useMemo(
  () => debouncedWithCancel((val: string) => onChange?.(val), 300),
  [onChange]
);

useEffect(() => {
  return () => cancel();
}, [cancel]);
```

Wire the Monaco Editor's `onChange` to `debouncedOnChange` instead of calling `onChange` directly.

Import `debouncedWithCancel` from `../../utils/debounce` (created by Group A).

---

## Task D3: Visual-to-Code Sync (imperative handle)

Implement `applyEdit` in the `useImperativeHandle`:

```typescript
useImperativeHandle(ref, () => ({
  applyEdit: (selector: string, before: string, after: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const model = editor.getModel();
    if (!model) return;

    const fullText = model.getValue();
    const beforeIndex = fullText.indexOf(before);
    if (beforeIndex === -1) {
      console.warn('[CodeEditor] applyEdit: could not find "before" text in document');
      return;
    }

    // Convert character offset to line/column position
    const beforePos = model.getPositionAt(beforeIndex);
    const afterPos = model.getPositionAt(beforeIndex + before.length);

    // Apply edit without triggering onChange debounce
    editor.executeEdits('visual-editor', [
      {
        range: {
          startLineNumber: beforePos.lineNumber,
          startColumn: beforePos.column,
          endLineNumber: afterPos.lineNumber,
          endColumn: afterPos.column,
        },
        text: after,
        forceMoveMarkers: true,
      },
    ]);
  },

  getValue: () => editorRef.current?.getValue() ?? '',
  focus: () => editorRef.current?.focus(),
}), []);
```

---

## Task D4: File Watcher Rust Command (`src-tauri/src/commands/file_watcher.rs`)

Use the `notify` crate (version 7, already in Cargo.toml) to watch a file or directory and emit Tauri events when it changes.

```rust
use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher, Event};
use std::sync::Mutex;
use std::collections::HashMap;
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc;

/// Payload emitted to the frontend when a file changes.
#[derive(Clone, serde::Serialize)]
pub struct FileChangedPayload {
    pub path: String,
    pub kind: String, // "modified" | "created" | "removed"
}

/// Global watcher registry — one watcher per watched path.
/// In a production app this would be managed via AppState,
/// but for simplicity we use a process-level Mutex here.
static WATCHERS: Mutex<Option<HashMap<String, RecommendedWatcher>>> =
    Mutex::new(None);

/// Start watching a file path. Emits "file-changed" events to the frontend.
#[tauri::command]
pub async fn watch_file(app: AppHandle, path: String) -> Result<(), String> {
    let (tx, mut rx) = mpsc::channel::<Result<Event, notify::Error>>(64);

    let mut watcher = RecommendedWatcher::new(
        move |res| {
            let _ = tx.blocking_send(res);
        },
        Config::default(),
    )
    .map_err(|e| e.to_string())?;

    watcher
        .watch(std::path::Path::new(&path), RecursiveMode::NonRecursive)
        .map_err(|e| e.to_string())?;

    // Store watcher to keep it alive
    {
        let mut guard = WATCHERS.lock().map_err(|e| e.to_string())?;
        if guard.is_none() {
            *guard = Some(HashMap::new());
        }
        guard.as_mut().unwrap().insert(path.clone(), watcher);
    }

    let app_clone = app.clone();
    let watched_path = path.clone();

    tokio::spawn(async move {
        while let Some(event_result) = rx.recv().await {
            match event_result {
                Ok(event) => {
                    let kind_str = match event.kind {
                        notify::EventKind::Modify(_) => "modified",
                        notify::EventKind::Create(_) => "created",
                        notify::EventKind::Remove(_) => "removed",
                        _ => continue,
                    };
                    let payload = FileChangedPayload {
                        path: watched_path.clone(),
                        kind: kind_str.to_string(),
                    };
                    let _ = app_clone.emit("file-changed", payload);
                }
                Err(e) => {
                    tracing::error!(error = %e, "File watcher error");
                }
            }
        }
    });

    tracing::info!(path = %path, "File watcher started");
    Ok(())
}

/// Stop watching a file path.
#[tauri::command]
pub async fn unwatch_file(path: String) -> Result<(), String> {
    let mut guard = WATCHERS.lock().map_err(|e| e.to_string())?;
    if let Some(watchers) = guard.as_mut() {
        watchers.remove(&path);
        tracing::info!(path = %path, "File watcher stopped");
    }
    Ok(())
}
```

### Modify `src-tauri/src/commands/mod.rs`

READ the existing file first. It currently contains:
```rust
pub mod file_ops;
pub mod project;
pub mod credentials;
pub mod ai_provider;
pub mod image;
```

Add one line — `pub mod file_watcher;` — at the end. Do not change any existing lines.

---

## Task D5: useFileWatcher Hook (`src/hooks/useFileWatcher.ts`)

### Purpose

Listen for `file-changed` Tauri events for the currently active file. When a change arrives from the file system (i.e., an external editor modified the file), re-read the file and update the editor content. Implement "most recent edit wins" — if the user just made a change in Monaco within the last 2 seconds, ignore the file-system event.

```typescript
import { useEffect, useRef, useCallback } from 'react';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../store';

interface FileChangedPayload {
  path: string;
  kind: 'modified' | 'created' | 'removed';
}

interface UseFileWatcherOptions {
  onFileChanged: (path: string, content: string) => void;
  enabled?: boolean;
}

export function useFileWatcher(options: UseFileWatcherOptions) {
  const { onFileChanged, enabled = true } = options;
  const { activeFile } = useAppStore();
  const lastUserEditRef = useRef<number>(0);
  const unlistenRef = useRef<UnlistenFn | null>(null);
  const watchedPathRef = useRef<string | null>(null);

  // Call this from the parent whenever the user edits in Monaco
  const markUserEdit = useCallback(() => {
    lastUserEditRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!enabled || !activeFile) return;

    // Start watching the new file
    const startWatching = async () => {
      // Stop watching previous file
      if (watchedPathRef.current && watchedPathRef.current !== activeFile) {
        await invoke('unwatch_file', { path: watchedPathRef.current }).catch(() => {});
      }

      watchedPathRef.current = activeFile;
      await invoke('watch_file', { path: activeFile }).catch((e: unknown) => {
        console.warn('[useFileWatcher] Failed to watch file:', e);
      });

      // Subscribe to file-changed events
      if (unlistenRef.current) {
        unlistenRef.current();
      }

      unlistenRef.current = await listen<FileChangedPayload>('file-changed', async (event) => {
        const { path, kind } = event.payload;

        if (path !== activeFile) return;
        if (kind === 'removed') return;

        // Most recent edit wins: ignore FS events within 2s of user typing
        const timeSinceUserEdit = Date.now() - lastUserEditRef.current;
        if (timeSinceUserEdit < 2000) {
          return;
        }

        // Re-read file and notify parent
        try {
          const content = await invoke<string>('read_file', { path });
          onFileChanged(path, content);
        } catch (e) {
          console.warn('[useFileWatcher] Failed to re-read file:', e);
        }
      });
    };

    startWatching();

    return () => {
      // Cleanup on unmount or activeFile change
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
      if (watchedPathRef.current) {
        invoke('unwatch_file', { path: watchedPathRef.current }).catch(() => {});
        watchedPathRef.current = null;
      }
    };
  }, [activeFile, enabled, onFileChanged]);

  return { markUserEdit };
}
```

---

## Import Paths Reference

```typescript
// In src/components/editor/CodeEditor.tsx:
import React, { useRef, useCallback, useImperativeHandle, useEffect, useMemo } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { debouncedWithCancel } from '../../utils/debounce';

// In src/hooks/useFileWatcher.ts:
import { useEffect, useRef, useCallback } from 'react';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../store';
```

---

## Verification Checklist

Before finishing, confirm:
- [ ] `src/components/editor/CodeEditor.tsx` exports `CodeEditor` as default and `CodeEditorHandle`, `CodeEditorProps` as named exports
- [ ] `src/hooks/useFileWatcher.ts` exports `useFileWatcher` as a named export
- [ ] `src-tauri/src/commands/file_watcher.rs` compiles (use `cargo check` to verify if possible)
- [ ] `src-tauri/src/commands/mod.rs` has `pub mod file_watcher;` added at the end; existing lines unchanged
- [ ] `applyEdit` uses `editor.executeEdits` API correctly (not `setValue` which destroys history)
- [ ] The debounced onChange is cancelled on component unmount
- [ ] The file watcher cleans up Tauri event listeners on unmount
- [ ] No files outside your ownership list were modified
