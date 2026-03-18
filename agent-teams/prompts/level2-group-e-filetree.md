# Level 2 — Group E: Image Handler + File Tree + Viewport Selector

You are Builder Agent E for the HTML Wizard Level 2 Visual Editor build.

## Your Mission

Build the recursive FileTree component, the ImageHandler dialog (upload/URL/AI Generate tabs), extract the ViewportSelector from CenterPanel into its own reusable component, and wire FileTree into the BottomPanel Files tab.

---

## File Ownership

**CREATE (new files — do not exist yet):**
- `src/components/editor/ImageHandler.tsx`
- `src/components/project/FileTree.tsx`
- `src/components/editor/ViewportSelector.tsx`

**MODIFY (extend existing files — READ them first, make targeted edits only):**
- `src/components/layout/BottomPanel.tsx`

**DO NOT TOUCH** CenterPanel.tsx (Group F owns that), store slices, types/index.ts, or any file not in your ownership list.

---

## Context: Existing Codebase

### READ This First: `src/components/layout/BottomPanel.tsx`

The existing file has:
- Three tabs: `'Files' | 'Console' | 'Output'`
- The Files tab renders: `<p className="text-gray-500 text-sm">Open a project to see files</p>`
- `interface BottomPanelProps { height: number }`

You will replace the Files tab content with `<FileTree />`.

### Store shape (read-only, import do not modify)
```typescript
import { useAppStore } from '../../store';
// From projectSlice:
// fileTree: FileNode[]
// activeFile: string | null
// setActiveFile: (path: string | null) => void
// projectInfo: ProjectInfo | null
```

### useProject hook (read-only)
```typescript
import { useProject } from '../../hooks/useProject';
// Returns: { fileTree, activeFile, setActiveFile, readFile, writeFile, projectInfo, ... }
```

### Existing types
```typescript
import { FileNode, FileType, ViewportSize, VIEWPORT_PRESETS } from '../../types';
// FileNode: { name: string; path: string; isDir: boolean; fileType: FileType; children?: FileNode[] }
// FileType: 'html' | 'css' | 'js' | 'image' | 'other'
// ViewportSize: { width: number; height: number; label?: string }
// VIEWPORT_PRESETS: ViewportSize[] — [Mobile(375x667), Tablet(768x1024), Desktop(1440x900)]
```

### Existing Tauri commands for images (in src-tauri/src/commands/image.rs)
```typescript
// upload_image(source_path: string, project_path: string) -> string (relative path)
// link_image_url(url: string) -> string (validated url)
// generate_image(prompt: string) -> string (stub — returns error)
```

---

## Task E1: FileTree Component (`src/components/project/FileTree.tsx`)

### Props Interface
```typescript
export interface FileTreeProps {
  // If provided, only render this subtree (for recursive calls)
  nodes?: FileNode[];
  // Indent depth (for recursive calls, start at 0)
  depth?: number;
}
```

### Behavior

The root FileTree reads from the store:
```typescript
const { fileTree, activeFile, setActiveFile } = useAppStore();
```

If `nodes` prop is provided, render that array. Otherwise render `fileTree` from the store.

### File type icons (colored text markers, no SVG dependencies)
```typescript
const FILE_TYPE_CONFIG: Record<FileType, { dot: string; label: string }> = {
  html: { dot: 'bg-orange-400',  label: 'HTML' },
  css:  { dot: 'bg-blue-400',    label: 'CSS'  },
  js:   { dot: 'bg-yellow-400',  label: 'JS'   },
  image:{ dot: 'bg-green-400',   label: 'IMG'  },
  other:{ dot: 'bg-gray-400',    label: 'FILE' },
};
```

Each file shows: `[colored dot] [name]`
Each directory shows: `[triangle ▶/▼] [name]/`

### Expand/Collapse State

Use `useState<Set<string>>(new Set())` to track expanded directory paths. Clicking a directory toggles it. Start all directories collapsed by default.

### Row styling

```tsx
<div
  key={node.path}
  style={{ paddingLeft: depth * 12 + 8 }}
  className={`flex items-center gap-1.5 py-0.5 px-2 cursor-pointer text-xs rounded
    ${node.path === activeFile
      ? 'bg-blue-600 text-white'
      : 'text-gray-300 hover:bg-gray-700'
    }`}
  onClick={() => {
    if (node.isDir) {
      toggleExpand(node.path);
    } else {
      setActiveFile(node.path);
    }
  }}
>
  {node.isDir ? (
    <>
      <span className="text-gray-400 text-xs w-3">
        {isExpanded ? '▼' : '▶'}
      </span>
      <span className="font-medium">{node.name}/</span>
    </>
  ) : (
    <>
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${FILE_TYPE_CONFIG[node.fileType].dot}`}
      />
      <span className="truncate">{node.name}</span>
    </>
  )}
</div>
```

### Recursive rendering

When a directory is expanded and has `children`, recursively render:
```tsx
{isExpanded && node.children && (
  <FileTree nodes={node.children} depth={(depth ?? 0) + 1} />
)}
```

### Empty state

When `fileTree` is empty (no project open):
```tsx
<div className="flex items-center justify-center h-full">
  <p className="text-gray-500 text-xs text-center">Open a project to see files</p>
</div>
```

Export `FileTree` as the default export.

---

## Task E2: ImageHandler Component (`src/components/editor/ImageHandler.tsx`)

A modal dialog with three tabs for inserting images into the HTML document.

### Props Interface
```typescript
export interface ImageHandlerProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (htmlSnippet: string) => void;  // Called with <img src="..."> snippet
  projectPath?: string;  // For upload tab — needed by upload_image command
}
```

### Three tabs: 'Upload' | 'URL' | 'AI Generate'

**Tab: Upload**
- File input accepting image types: `.png,.jpg,.jpeg,.gif,.svg,.webp,.ico`
- Show selected filename
- "Upload" button calls:
  ```typescript
  const relativePath = await invoke<string>('upload_image', {
    sourcePath: selectedFile.path,  // Note: in Tauri v2 use dialog or path directly
    projectPath,
  });
  onInsert(`<img src="${relativePath}" alt="" />`);
  onClose();
  ```
- Note: For file selection in Tauri v2, use a standard HTML `<input type="file">` with `onChange` capturing `e.target.files[0]`. The file path for Tauri can be obtained from the File object's name (simplified — full path handling requires tauri-plugin-dialog which is a future enhancement; for now pass the file name).
- Show loading state and error handling.

**Tab: URL**
- Text input for image URL (placeholder: `https://example.com/image.png`)
- "Insert" button calls:
  ```typescript
  const validatedUrl = await invoke<string>('link_image_url', { url: inputUrl });
  onInsert(`<img src="${validatedUrl}" alt="" />`);
  onClose();
  ```
- Show error if invoke fails.

**Tab: AI Generate**
- Textarea for prompt (placeholder: `A sunset over the ocean, photorealistic`)
- "Generate" button calls `invoke<string>('generate_image', { prompt })`
- Currently returns an error from the backend ("not yet available") — show that error gracefully with a grayed-out button and note: "AI image generation coming soon"
- Keep the UI functional so the stub can be replaced later.

### Modal layout

```tsx
{isOpen && (
  <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
    <div className="bg-gray-800 border border-gray-700 rounded-lg w-96 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h2 className="text-sm font-semibold text-gray-100">Insert Image</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-200 text-lg leading-none">&times;</button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-700">
        {(['Upload', 'URL', 'AI Generate'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4 space-y-3">
        {/* ... tab-specific content ... */}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-700 flex justify-end gap-2">
        <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-200 px-3 py-1.5 rounded hover:bg-gray-700">
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
```

Close the modal on Escape key using a `useEffect` that listens to `keydown`.

Export `ImageHandler` as the default export.

---

## Task E3: ViewportSelector Component (`src/components/editor/ViewportSelector.tsx`)

Extract the viewport controls from CenterPanel into a standalone component.

NOTE: Do NOT modify CenterPanel.tsx — Group F will handle the integration of ViewportSelector into CenterPanel. Your job is only to create the ViewportSelector component so Group F can import it.

### Props Interface
```typescript
export interface ViewportSelectorProps {
  viewport: ViewportSize;
  onViewportChange: (viewport: ViewportSize) => void;
  scale?: number;  // Current scale percentage (0-100), for display only
}
```

### Implementation

```typescript
import React, { useState } from 'react';
import { ViewportSize, VIEWPORT_PRESETS } from '../../types';

// Icon characters for viewport presets (text-based, no SVG)
const PRESET_ICONS: Record<string, string> = {
  'Mobile': 'M',
  'Tablet': 'T',
  'Desktop': 'D',
};

const ViewportSelector: React.FC<ViewportSelectorProps> = ({
  viewport,
  onViewportChange,
  scale,
}) => {
  const [customWidth, setCustomWidth] = useState('');
  const [customHeight, setCustomHeight] = useState('');

  const activePresetIndex = VIEWPORT_PRESETS.findIndex(
    p => p.width === viewport.width && p.height === viewport.height
  );

  const handlePresetClick = (preset: ViewportSize) => {
    setCustomWidth('');
    setCustomHeight('');
    onViewportChange(preset);
  };

  const handleOrientationToggle = () => {
    onViewportChange({ width: viewport.height, height: viewport.width });
  };

  const handleCustomApply = () => {
    const w = parseInt(customWidth);
    const h = parseInt(customHeight);
    if (w > 0 && h > 0) {
      onViewportChange({ width: w, height: h });
    }
  };

  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-700 bg-gray-800">
      {/* Preset buttons */}
      {VIEWPORT_PRESETS.map((preset, i) => (
        <button
          key={preset.label}
          onClick={() => handlePresetClick(preset)}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded transition-colors ${
            activePresetIndex === i
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
          }`}
          title={`${preset.label} (${preset.width}x${preset.height})`}
        >
          <span className="font-mono text-xs">{PRESET_ICONS[preset.label ?? ''] ?? preset.label}</span>
          <span>{preset.width}</span>
        </button>
      ))}

      <div className="w-px h-5 bg-gray-600 mx-1" />

      {/* Custom dimensions */}
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={customWidth}
          onChange={e => setCustomWidth(e.target.value)}
          placeholder={String(viewport.width)}
          className="w-14 bg-gray-900 text-gray-300 text-xs px-2 py-1 rounded border border-gray-600 outline-none focus:border-blue-500"
          min={1}
        />
        <span className="text-gray-500 text-xs">&times;</span>
        <input
          type="number"
          value={customHeight}
          onChange={e => setCustomHeight(e.target.value)}
          placeholder={String(viewport.height)}
          className="w-14 bg-gray-900 text-gray-300 text-xs px-2 py-1 rounded border border-gray-600 outline-none focus:border-blue-500"
          min={1}
        />
        <button
          onClick={handleCustomApply}
          className="text-xs text-gray-400 hover:text-blue-400 px-1"
          title="Apply custom dimensions"
        >
          &#10003;
        </button>
      </div>

      <div className="w-px h-5 bg-gray-600 mx-1" />

      {/* Orientation toggle */}
      <button
        onClick={handleOrientationToggle}
        className="text-gray-400 hover:text-gray-200 px-2 py-1 text-xs rounded hover:bg-gray-700"
        title="Swap width and height (rotate)"
      >
        &#8646;
      </button>

      <div className="flex-1" />

      {/* Dimension display + optional scale */}
      <span className="text-xs text-gray-500">
        {viewport.width} &times; {viewport.height}
        {scale !== undefined && ` @ ${scale}%`}
      </span>
    </div>
  );
};

export default ViewportSelector;
```

---

## Task E4: Wire FileTree into `src/components/layout/BottomPanel.tsx`

READ the existing file first. Make a targeted edit:

### New imports to add at the top
```typescript
import FileTree from '../project/FileTree';
```

### Replace the Files tab render

In the `renderTabContent` function, replace the `case 'Files':` block:

Before (existing):
```tsx
case 'Files':
  return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-gray-500 text-sm">Open a project to see files</p>
    </div>
  );
```

After:
```tsx
case 'Files':
  return (
    <div className="flex-1 overflow-y-auto">
      <FileTree />
    </div>
  );
```

No other changes to BottomPanel.tsx.

---

## Directory Structure Note

You need to create the `src/components/project/` directory. The `FileTree.tsx` file lives there. The `editor/` directory already exists (it will be created by Group A and Group B).

Use absolute file paths when writing files:
- `/Users/alexleaming/ALEX-workspace/custom-work-mates/html-wizard-desktop-app/src/components/project/FileTree.tsx`
- `/Users/alexleaming/ALEX-workspace/custom-work-mates/html-wizard-desktop-app/src/components/editor/ImageHandler.tsx`
- `/Users/alexleaming/ALEX-workspace/custom-work-mates/html-wizard-desktop-app/src/components/editor/ViewportSelector.tsx`

---

## Import Paths Reference

```typescript
// In src/components/project/FileTree.tsx:
import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { FileNode, FileType } from '../../types';

// In src/components/editor/ImageHandler.tsx:
import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

// In src/components/editor/ViewportSelector.tsx:
import React, { useState } from 'react';
import { ViewportSize, VIEWPORT_PRESETS } from '../../types';

// In src/components/layout/BottomPanel.tsx (addition):
import FileTree from '../project/FileTree';
```

---

## Verification Checklist

Before finishing, confirm:
- [ ] `src/components/project/FileTree.tsx` exports `FileTree` as default; handles empty fileTree gracefully
- [ ] `src/components/editor/ImageHandler.tsx` exports `ImageHandler` as default; all three tabs functional
- [ ] `src/components/editor/ViewportSelector.tsx` exports `ViewportSelector` as default and `ViewportSelectorProps` as named export
- [ ] `src/components/layout/BottomPanel.tsx` Files tab now renders `<FileTree />` inside a scrollable container
- [ ] FileTree correctly handles recursive rendering of nested directories
- [ ] ImageHandler closes on Escape key
- [ ] The `src/components/project/` directory is created
- [ ] No files outside your ownership list were modified
- [ ] All imports use correct relative paths
