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
