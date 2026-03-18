# Agent Group E: Frontend — State Management, Hooks, Types & Utils

You are a builder agent responsible for the Zustand state store, hooks, TypeScript type definitions, and logging utility. You produce complete, working TypeScript code — no pseudocode or skeletons.

## File Ownership (ONLY touch these files)
- `src/store/index.ts`
- `src/store/slices/projectSlice.ts`
- `src/store/slices/editorSlice.ts`
- `src/store/slices/aiSlice.ts`
- `src/store/slices/uiSlice.ts`
- `src/hooks/useProject.ts`
- `src/types/index.ts`
- `src/utils/logger.ts`
- `src/types/plugin.ts`

## DO NOT touch any files outside this list. Other agents own other files.

## Important: Create directories:
```
src/store/slices/
src/hooks/
src/types/
src/utils/
```

---

## Task E-1: Define Shared TypeScript Types

### `src/types/index.ts`

These types are the frontend mirror of the Rust serde types. Tauri automatically converts snake_case Rust fields to camelCase TypeScript fields.

```typescript
// ===== Project Types =====

export interface ProjectInfo {
  root: string;
  name: string;
  isGit: boolean;
  fileCount: number;
}

export type FileType = 'html' | 'css' | 'js' | 'image' | 'other';

export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  fileType: FileType;
  children?: FileNode[];
}

export interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
}

export interface ChangeEntry {
  filePath: string;
  original: string | null;
  modified: string;
  timestamp: number;
}

export interface ChangeBuffer {
  entries: ChangeEntry[];
}

// ===== AI Types =====

export type AIProviderType = 'claude' | 'gemini' | 'openai' | { plugin: string };

export interface AIRequest {
  provider: AIProviderType;
  prompt: string;
  context?: ElementContext;
  conversationId?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIResponse {
  content: string;
  provider: AIProviderType;
  tokenUsage: TokenUsage;
  finishReason: string;
}

export interface ElementContext {
  html: string;
  css: string[];
  parentHtml?: string;
  cssVariables: CssVariable[];
  filePath: string;
}

export interface CssVariable {
  name: string;
  value: string;
  scope: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ProviderConfig {
  providerType: AIProviderType;
  model: string;
  baseUrl?: string;
  supportsStreaming: boolean;
  supportsImages: boolean;
}

// ===== UI Types =====

export interface PanelState {
  leftSidebar: boolean;
  rightSidebar: boolean;
  bottomPanel: boolean;
}

export interface ViewportSize {
  width: number;
  height: number;
  label?: string;
}

export const VIEWPORT_PRESETS: ViewportSize[] = [
  { width: 375, height: 667, label: 'Mobile' },
  { width: 768, height: 1024, label: 'Tablet' },
  { width: 1440, height: 900, label: 'Desktop' },
];

// ===== Chat Types =====

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  messages: ChatMessage[];
  projectRoot: string;
  createdAt: number;
}

// ===== Editor Types =====

export type OperationType = 'style' | 'content' | 'attribute' | 'structure' | 'ai';

export interface EditOperation {
  id: string;
  type: OperationType;
  elementSelector: string;
  filePath: string;
  before: string;
  after: string;
  timestamp: number;
  groupId?: string; // For grouping related operations (e.g., all changes from one AI suggestion)
}
```

### `src/types/plugin.ts`

```typescript
export type PluginCapability = 'ai_provider' | 'editing_tool' | 'export_format';

export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  capabilities: PluginCapability[];
  entryPoint: string;
}

export interface LoadedPlugin {
  manifest: PluginManifest;
  enabled: boolean;
}

// Frontend plugin extension API
export interface PluginHandlers {
  onRegister?: () => void;
  onUnregister?: () => void;
  contextMenuItems?: ContextMenuItem[];
  inspectorPanels?: InspectorPanel[];
  exportFormats?: ExportFormat[];
}

export interface ContextMenuItem {
  label: string;
  action: (elementSelector: string) => void;
}

export interface InspectorPanel {
  id: string;
  label: string;
  component: React.ComponentType;
}

export interface ExportFormat {
  id: string;
  label: string;
  extension: string;
  export: (projectRoot: string) => Promise<Blob>;
}
```

---

## Task E-2: Create Centralized Zustand Store

### `src/store/index.ts`

Zustand store combining all four domain slices. Uses the slice pattern for composition.

```typescript
import { create } from 'zustand';
import { createProjectSlice, ProjectSlice } from './slices/projectSlice';
import { createEditorSlice, EditorSlice } from './slices/editorSlice';
import { createAISlice, AISlice } from './slices/aiSlice';
import { createUISlice, UISlice } from './slices/uiSlice';

export type AppStore = ProjectSlice & EditorSlice & AISlice & UISlice;

export const useAppStore = create<AppStore>()((...args) => ({
  ...createProjectSlice(...args),
  ...createEditorSlice(...args),
  ...createAISlice(...args),
  ...createUISlice(...args),
}));
```

---

## Task E-3: Create Store Slices

### `src/store/slices/projectSlice.ts`

```typescript
import { StateCreator } from 'zustand';
import { AppStore } from '../index';
import { ProjectInfo, FileNode, ChangeBuffer, ChangeEntry } from '../../types';

export interface ProjectSlice {
  // State
  projectInfo: ProjectInfo | null;
  fileTree: FileNode[];
  activeFile: string | null;
  changeBuffer: ChangeBuffer;

  // Actions
  setProject: (info: ProjectInfo) => void;
  setFileTree: (tree: FileNode[]) => void;
  setActiveFile: (path: string | null) => void;
  addChange: (entry: ChangeEntry) => void;
  commitChanges: () => ChangeEntry[];
  discardChanges: () => void;
  hasUnsavedChanges: () => boolean;
}

export const createProjectSlice: StateCreator<AppStore, [], [], ProjectSlice> = (set, get) => ({
  projectInfo: null,
  fileTree: [],
  activeFile: null,
  changeBuffer: { entries: [] },

  setProject: (info) => set({ projectInfo: info }),
  setFileTree: (tree) => set({ fileTree: tree }),
  setActiveFile: (path) => set({ activeFile: path }),

  addChange: (entry) => set((state) => {
    const entries = [...state.changeBuffer.entries];
    const existingIndex = entries.findIndex(e => e.filePath === entry.filePath);
    if (existingIndex >= 0) {
      entries[existingIndex] = entry;
    } else {
      entries.push(entry);
    }
    return { changeBuffer: { entries } };
  }),

  commitChanges: () => {
    const entries = get().changeBuffer.entries;
    set({ changeBuffer: { entries: [] } });
    return entries;
  },

  discardChanges: () => set({ changeBuffer: { entries: [] } }),

  hasUnsavedChanges: () => get().changeBuffer.entries.length > 0,
});
```

### `src/store/slices/editorSlice.ts`

```typescript
import { StateCreator } from 'zustand';
import { AppStore } from '../index';
import { EditOperation } from '../../types';

export interface EditorSlice {
  // State
  selectedElement: string | null;
  undoStack: EditOperation[];
  redoStack: EditOperation[];

  // Actions
  selectElement: (selector: string | null) => void;
  pushOperation: (op: EditOperation) => void;
  undo: () => EditOperation | null;
  redo: () => EditOperation | null;
  clearHistory: () => void;
}

export const createEditorSlice: StateCreator<AppStore, [], [], EditorSlice> = (set, get) => ({
  selectedElement: null,
  undoStack: [],
  redoStack: [],

  selectElement: (selector) => set({ selectedElement: selector }),

  pushOperation: (op) => set((state) => ({
    undoStack: [...state.undoStack, op],
    redoStack: [], // Clear redo stack on new operation
  })),

  undo: () => {
    const { undoStack, redoStack } = get();
    if (undoStack.length === 0) return null;
    const op = undoStack[undoStack.length - 1];
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, op],
    });
    return op;
  },

  redo: () => {
    const { undoStack, redoStack } = get();
    if (redoStack.length === 0) return null;
    const op = redoStack[redoStack.length - 1];
    set({
      redoStack: redoStack.slice(0, -1),
      undoStack: [...undoStack, op],
    });
    return op;
  },

  clearHistory: () => set({ undoStack: [], redoStack: [] }),
});
```

### `src/store/slices/aiSlice.ts`

```typescript
import { StateCreator } from 'zustand';
import { AppStore } from '../index';
import { AIProviderType, ProviderConfig, Conversation, ChatMessage } from '../../types';

export interface AISlice {
  // State
  conversations: Conversation[];
  activeConversationId: string | null;
  isStreaming: boolean;
  providers: ProviderConfig[];
  activeProvider: AIProviderType;

  // Actions
  addConversation: (conversation: Conversation) => void;
  setActiveConversation: (id: string | null) => void;
  addMessage: (conversationId: string, message: ChatMessage) => void;
  setStreaming: (streaming: boolean) => void;
  setProviders: (providers: ProviderConfig[]) => void;
  setActiveProvider: (provider: AIProviderType) => void;
  getActiveConversation: () => Conversation | undefined;
}

export const createAISlice: StateCreator<AppStore, [], [], AISlice> = (set, get) => ({
  conversations: [],
  activeConversationId: null,
  isStreaming: false,
  providers: [],
  activeProvider: 'claude',

  addConversation: (conversation) => set((state) => ({
    conversations: [...state.conversations, conversation],
    activeConversationId: conversation.id,
  })),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  addMessage: (conversationId, message) => set((state) => ({
    conversations: state.conversations.map(c =>
      c.id === conversationId
        ? { ...c, messages: [...c.messages, message] }
        : c
    ),
  })),

  setStreaming: (streaming) => set({ isStreaming: streaming }),

  setProviders: (providers) => set({ providers }),

  setActiveProvider: (provider) => set({ activeProvider: provider }),

  getActiveConversation: () => {
    const { conversations, activeConversationId } = get();
    return conversations.find(c => c.id === activeConversationId);
  },
});
```

### `src/store/slices/uiSlice.ts`

```typescript
import { StateCreator } from 'zustand';
import { AppStore } from '../index';
import { PanelState, ViewportSize, VIEWPORT_PRESETS } from '../../types';

export interface UISlice {
  // State
  panels: PanelState;
  viewport: ViewportSize;
  debugMode: boolean;
  activeTheme: 'dark' | 'light';

  // Actions
  togglePanel: (panel: keyof PanelState) => void;
  setViewport: (viewport: ViewportSize) => void;
  setDebugMode: (enabled: boolean) => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

export const createUISlice: StateCreator<AppStore, [], [], UISlice> = (set) => ({
  panels: {
    leftSidebar: true,
    rightSidebar: true,
    bottomPanel: true,
  },
  viewport: VIEWPORT_PRESETS[2], // Desktop default
  debugMode: false,
  activeTheme: 'dark',

  togglePanel: (panel) => set((state) => ({
    panels: {
      ...state.panels,
      [panel]: !state.panels[panel],
    },
  })),

  setViewport: (viewport) => set({ viewport }),

  setDebugMode: (enabled) => set({ debugMode: enabled }),

  setTheme: (theme) => set({ activeTheme: theme }),
});
```

---

## Task E-4: Create useProject Hook

### `src/hooks/useProject.ts`

Abstracts Tauri IPC calls for project operations.

```typescript
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../store';
import { ProjectInfo, FileNode } from '../types';
import { logger } from '../utils/logger';

export function useProject() {
  const {
    projectInfo,
    fileTree,
    activeFile,
    changeBuffer,
    setProject,
    setFileTree,
    setActiveFile,
    addChange,
    commitChanges,
    discardChanges,
    hasUnsavedChanges,
  } = useAppStore();

  const openProject = async (path: string): Promise<ProjectInfo> => {
    logger.info('useProject', 'Opening project', { path });
    const info = await invoke<ProjectInfo>('open_project', { path });
    setProject(info);

    const tree = await invoke<FileNode[]>('scan_directory', { path });
    setFileTree(tree);

    logger.info('useProject', 'Project opened', { name: info.name, fileCount: info.fileCount });
    return info;
  };

  const readFile = async (path: string): Promise<string> => {
    logger.debug('useProject', 'Reading file', { path });
    return invoke<string>('read_file', { path });
  };

  const writeFile = async (path: string, content: string): Promise<void> => {
    logger.info('useProject', 'Writing file', { path });
    return invoke<void>('write_file', { path, content });
  };

  const createFile = async (path: string, content: string): Promise<void> => {
    logger.info('useProject', 'Creating file', { path });
    return invoke<void>('create_file', { path, content });
  };

  const deleteFile = async (path: string): Promise<void> => {
    logger.warn('useProject', 'Deleting file', { path });
    return invoke<void>('delete_file', { path });
  };

  const saveAllChanges = async (): Promise<void> => {
    const entries = commitChanges();
    for (const entry of entries) {
      await writeFile(entry.filePath, entry.modified);
    }
    logger.info('useProject', 'All changes saved', { count: entries.length });
  };

  return {
    projectInfo,
    fileTree,
    activeFile,
    changeBuffer,
    openProject,
    readFile,
    writeFile,
    createFile,
    deleteFile,
    setActiveFile,
    addChange,
    saveAllChanges,
    discardChanges,
    hasUnsavedChanges,
  };
}
```

---

## Task E-5: Create Frontend Logger

### `src/utils/logger.ts`

Structured logging with severity levels. warn/error forward to Rust backend via IPC.

```typescript
import { invoke } from '@tauri-apps/api/core';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: Record<string, unknown>;
}

function createLogEntry(
  level: LogLevel,
  module: string,
  message: string,
  data?: Record<string, unknown>
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    module,
    message,
    data,
  };
}

function formatMessage(entry: LogEntry): string {
  return `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.module}] ${entry.message}`;
}

function forwardToBackend(entry: LogEntry): void {
  invoke('log_from_frontend', { entry: JSON.parse(JSON.stringify(entry)) }).catch(() => {
    // Silently fail if backend is not available (e.g., during hot reload)
  });
}

export const logger = {
  debug: (module: string, message: string, data?: Record<string, unknown>): void => {
    const entry = createLogEntry('debug', module, message, data);
    console.debug(formatMessage(entry), data || '');
  },

  info: (module: string, message: string, data?: Record<string, unknown>): void => {
    const entry = createLogEntry('info', module, message, data);
    console.info(formatMessage(entry), data || '');
  },

  warn: (module: string, message: string, data?: Record<string, unknown>): void => {
    const entry = createLogEntry('warn', module, message, data);
    console.warn(formatMessage(entry), data || '');
    forwardToBackend(entry);
  },

  error: (module: string, message: string, data?: Record<string, unknown>): void => {
    const entry = createLogEntry('error', module, message, data);
    console.error(formatMessage(entry), data || '');
    forwardToBackend(entry);
  },
};
```
