# Level 2 — Group B: Element Overlay + Selection System

You are Builder Agent B for the HTML Wizard Level 2 Visual Editor build.

## Your Mission

Build the element overlay rendering system (hover highlight + selection indicator + dimension tooltip), the contenteditable double-click flow for inline text editing, and the `useEditor` hook that ties overlay data from the PreviewFrame callbacks into the Zustand store.

---

## File Ownership

**CREATE (new files — do not exist yet):**
- `src/components/editor/ElementOverlay.tsx`
- `src/hooks/useEditor.ts`

**MODIFY (extend existing files — READ them first, make targeted additions only):**
- `src/store/slices/editorSlice.ts`

**DO NOT TOUCH** any layout components, PreviewFrame.tsx, sanitizer.ts, debounce.ts, types/index.ts, or any file not listed above.

---

## Context: Existing Codebase

### Read This First: `src/store/slices/editorSlice.ts`

The existing file contains:
```typescript
export interface EditorSlice {
  selectedElement: string | null;
  undoStack: EditOperation[];
  redoStack: EditOperation[];
  selectElement: (selector: string | null) => void;
  pushOperation: (op: EditOperation) => void;
  undo: () => EditOperation | null;
  redo: () => EditOperation | null;
  clearHistory: () => void;
}
```

The `createEditorSlice` function implements all of the above with standard undo/redo logic. **Do not change any existing logic.** Only ADD new fields and actions.

### Existing types to import (from `src/types/index.ts`)
After Group A runs, `src/types/index.ts` will contain:
```typescript
import {
  EditOperation,
  ElementOverlayData,
  ElementSelectionData,
} from '../../types';
```

### Store import pattern
```typescript
import { useAppStore } from '../../store';
import { useAppStore } from '../store'; // from hooks/
```

---

## Task B1: Extend `src/store/slices/editorSlice.ts`

**READ the file first.** Then add the following new fields to the `EditorSlice` interface and their implementations to `createEditorSlice`.

### New fields to add to the interface:
```typescript
// Rich selection state (Level 2)
hoveredElement: ElementOverlayData | null;
selectedElementData: ElementSelectionData | null;
contentEditableMode: boolean;

// Actions
setHoveredElement: (data: ElementOverlayData | null) => void;
setSelectedElementData: (data: ElementSelectionData | null) => void;
setContentEditableMode: (active: boolean) => void;
```

### New initial state values:
```typescript
hoveredElement: null,
selectedElementData: null,
contentEditableMode: false,
```

### New action implementations:
```typescript
setHoveredElement: (data) => set({ hoveredElement: data }),
setSelectedElementData: (data) => set({
  selectedElementData: data,
  selectedElement: data?.selector ?? null,
}),
setContentEditableMode: (active) => set({ contentEditableMode: active }),
```

Note: `setSelectedElementData` must also update `selectedElement` (the existing field) so existing consumers keep working.

**Preserve all existing logic unchanged.** The undo/redo functions, `pushOperation`, `selectElement`, and `clearHistory` must remain exactly as they are.

---

## Task B2: ElementOverlay Component (`src/components/editor/ElementOverlay.tsx`)

### Purpose
Renders two absolutely-positioned overlay layers on top of the preview iframe wrapper:
1. **Hover highlight** — a blue semi-transparent border box
2. **Selection indicator** — a dashed blue border box with a dimension tooltip

These overlays are rendered in the parent coordinate space (they sit outside the iframe, positioned relative to the iframe's containing div).

### Props Interface
```typescript
export interface ElementOverlayProps {
  // Hover overlay (shown on mouseover events from bridge)
  hoveredElement: ElementOverlayData | null;
  // Selection overlay (shown after click)
  selectedElement: ElementSelectionData | null;
  // The CSS scale factor of the iframe (0..1)
  scale: number;
  // onClick on the overlay itself (for forwarding clicks)
  onOverlayClick?: () => void;
}
```

### Hover Overlay
```tsx
// Blue semi-transparent highlight box
<div
  style={{
    position: 'absolute',
    top: data.rect.top * scale,
    left: data.rect.left * scale,
    width: data.rect.width * scale,
    height: data.rect.height * scale,
    border: '2px solid #3b82f6',       // blue-500
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    pointerEvents: 'none',
    zIndex: 10,
    boxSizing: 'border-box',
  }}
/>
```

### Selection Overlay
```tsx
// Dashed selection border with dimension tooltip
<div
  style={{
    position: 'absolute',
    top: data.rect.top * scale,
    left: data.rect.left * scale,
    width: data.rect.width * scale,
    height: data.rect.height * scale,
    border: '2px dashed #3b82f6',
    pointerEvents: 'none',
    zIndex: 11,
    boxSizing: 'border-box',
  }}
>
  {/* Dimension tooltip — top-left corner */}
  <div
    style={{
      position: 'absolute',
      top: -20,
      left: 0,
      background: '#3b82f6',
      color: 'white',
      fontSize: 10,
      padding: '1px 4px',
      borderRadius: 3,
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
    }}
  >
    {data.tagName.toLowerCase()}
    {data.id ? `#${data.id}` : ''}
    {data.classes.length > 0 ? `.${data.classes[0]}` : ''}
    {' '}
    {Math.round(data.rect.width)} × {Math.round(data.rect.height)}
  </div>
</div>
```

### Container
The component itself must render as a fragment or a `<div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>`. It is positioned relative to the iframe wrapper by the parent (CenterPanel in Group F).

### Conditional rendering
- Hover overlay only renders when `hoveredElement !== null`
- Selection overlay only renders when `selectedElement !== null`
- If both exist and point to the same selector, only show the selection overlay (skip hover)

---

## Task B3: ContentEditable Double-Click Flow (inside ElementOverlay.tsx)

When a `dblclick` event occurs on the preview, the overlay renders a floating textarea for inline text editing.

### State within ElementOverlay
```typescript
const [editingText, setEditingText] = useState<string>('');
const [editingSelector, setEditingSelector] = useState<string | null>(null);
const textareaRef = useRef<HTMLTextAreaElement>(null);
```

### How it's triggered
ElementOverlay receives an additional optional prop:
```typescript
dblClickData?: ElementSelectionData | null;
onEditComplete?: (op: EditOperation) => void;
```

When `dblClickData` changes to a non-null value, set `editingSelector` and `editingText = dblClickData.innerHTML`.

### Floating Textarea
Positioned over the selected element's rect:
```tsx
{editingSelector && dblClickData && (
  <div
    style={{
      position: 'absolute',
      top: dblClickData.rect.top * scale,
      left: dblClickData.rect.left * scale,
      width: Math.max(dblClickData.rect.width * scale, 120),
      zIndex: 20,
      pointerEvents: 'all',
    }}
  >
    <textarea
      ref={textareaRef}
      value={editingText}
      onChange={e => setEditingText(e.target.value)}
      onBlur={handleEditComplete}
      onKeyDown={handleEditKeyDown}
      className="w-full bg-gray-900 text-white text-sm border border-blue-500 rounded p-1 resize-none outline-none font-mono"
      style={{ minHeight: dblClickData.rect.height * scale }}
      autoFocus
    />
  </div>
)}
```

### Committing the Edit
On blur OR when the user presses Enter (without Shift):
```typescript
const handleEditComplete = () => {
  if (!editingSelector || !dblClickData) return;
  const before = dblClickData.innerHTML;
  const after = editingText;
  if (before !== after) {
    const op: EditOperation = {
      id: crypto.randomUUID(),
      type: 'content',
      elementSelector: editingSelector,
      filePath: '',  // filled in by useEditor when it calls pushOperation
      before,
      after,
      timestamp: Date.now(),
    };
    onEditComplete?.(op);
  }
  setEditingSelector(null);
};

const handleEditKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleEditComplete();
  }
  if (e.key === 'Escape') {
    setEditingSelector(null);
  }
};
```

Focus the textarea after it mounts using `useEffect` watching `editingSelector`.

---

## Task B4: `useEditor` Hook (`src/hooks/useEditor.ts`)

This hook is the central controller for the visual editor. Components call it to get the current editor state and to register PreviewFrame callbacks.

### Exports
```typescript
export function useEditor() {
  // Returns:
  return {
    // State
    hoveredElement,
    selectedElementData,
    contentEditableMode,
    dblClickData,       // ElementSelectionData | null — last dblclick target
    contextMenuData,    // ContextMenuData | null

    // PreviewFrame callback props (spread into <PreviewFrame {...editorCallbacks} />)
    editorCallbacks: {
      onElementHover,
      onElementClick,
      onElementDblClick,
      onContextMenu,
    },

    // Actions
    clearSelection,     // () => void — clears selected element and dblclick data
    handleEditComplete, // (op: EditOperation) => void — pushes op to store + assigns filePath
    escapeContentEditable, // () => void — clear contentEditableMode and dblClickData
  };
}
```

### Implementation

```typescript
import { useState, useCallback } from 'react';
import { useAppStore } from '../store';
import {
  ElementOverlayData,
  ElementSelectionData,
  ContextMenuData,
  EditOperation,
} from '../types';

export function useEditor() {
  const {
    activeFile,
    hoveredElement,
    selectedElementData,
    contentEditableMode,
    setHoveredElement,
    setSelectedElementData,
    setContentEditableMode,
    pushOperation,
  } = useAppStore();

  const [dblClickData, setDblClickData] = useState<ElementSelectionData | null>(null);
  const [contextMenuData, setContextMenuData] = useState<ContextMenuData | null>(null);

  const onElementHover = useCallback((data: ElementOverlayData | null) => {
    setHoveredElement(data);
  }, [setHoveredElement]);

  const onElementClick = useCallback((data: ElementSelectionData) => {
    setSelectedElementData(data);
    setDblClickData(null);
    setContentEditableMode(false);
  }, [setSelectedElementData, setContentEditableMode]);

  const onElementDblClick = useCallback((data: ElementSelectionData) => {
    setSelectedElementData(data);
    setDblClickData(data);
    setContentEditableMode(true);
  }, [setSelectedElementData, setContentEditableMode]);

  const onContextMenu = useCallback((data: ContextMenuData) => {
    setContextMenuData(data);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedElementData(null);
    setHoveredElement(null);
    setDblClickData(null);
    setContentEditableMode(false);
  }, [setSelectedElementData, setHoveredElement, setContentEditableMode]);

  const handleEditComplete = useCallback((op: EditOperation) => {
    // Assign the active file path before pushing
    const enriched: EditOperation = {
      ...op,
      filePath: activeFile ?? '',
    };
    pushOperation(enriched);
    setDblClickData(null);
    setContentEditableMode(false);
  }, [activeFile, pushOperation, setContentEditableMode]);

  const escapeContentEditable = useCallback(() => {
    setDblClickData(null);
    setContentEditableMode(false);
  }, [setContentEditableMode]);

  return {
    hoveredElement,
    selectedElementData,
    contentEditableMode,
    dblClickData,
    contextMenuData,
    editorCallbacks: {
      onElementHover,
      onElementClick,
      onElementDblClick,
      onContextMenu,
    },
    clearSelection,
    handleEditComplete,
    escapeContentEditable,
  };
}
```

### Escape Key Handling
Add a global `keydown` listener in `useEditor` via `useEffect`:
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      clearSelection();
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [clearSelection]);
```

---

## Import Paths Reference

```typescript
// In src/store/slices/editorSlice.ts:
import { StateCreator } from 'zustand';
import { AppStore } from '../index';
import { EditOperation, ElementOverlayData, ElementSelectionData } from '../../types';

// In src/components/editor/ElementOverlay.tsx:
import React, { useState, useEffect, useRef } from 'react';
import { ElementOverlayData, ElementSelectionData, EditOperation } from '../../types';

// In src/hooks/useEditor.ts:
import { useState, useCallback, useEffect } from 'react';
import { useAppStore } from '../store';
import { ElementOverlayData, ElementSelectionData, ContextMenuData, EditOperation } from '../types';
```

---

## Verification Checklist

Before finishing, confirm:
- [ ] `src/store/slices/editorSlice.ts` — new fields added to BOTH the interface and the `createEditorSlice` implementation; existing undo/redo logic untouched
- [ ] `src/store/slices/editorSlice.ts` — `AppStore` type in `src/store/index.ts` does NOT need updating because it spreads all slices already
- [ ] `src/components/editor/ElementOverlay.tsx` exports `ElementOverlay` as default
- [ ] `src/hooks/useEditor.ts` exports `useEditor` as a named export
- [ ] Both hover and selection overlays have `pointerEvents: 'none'` so they don't block iframe interaction
- [ ] The floating textarea has `pointerEvents: 'all'` so it is interactable
- [ ] No files outside your ownership list were modified
