import { StateCreator } from 'zustand';
import { AppStore } from '../index';
import { EditOperation, ElementOverlayData, ElementSelectionData } from '../../types';

export interface EditorSlice {
  // State
  selectedElement: string | null;
  undoStack: EditOperation[];
  redoStack: EditOperation[];

  // Rich selection state (Level 2)
  hoveredElement: ElementOverlayData | null;
  selectedElementData: ElementSelectionData | null;
  contentEditableMode: boolean;

  // Actions
  selectElement: (selector: string | null) => void;
  pushOperation: (op: EditOperation) => void;
  undo: () => EditOperation | null;
  redo: () => EditOperation | null;
  clearHistory: () => void;
  setHoveredElement: (data: ElementOverlayData | null) => void;
  setSelectedElementData: (data: ElementSelectionData | null) => void;
  setContentEditableMode: (active: boolean) => void;
}

export const createEditorSlice: StateCreator<AppStore, [], [], EditorSlice> = (set, get) => ({
  selectedElement: null,
  undoStack: [],
  redoStack: [],
  hoveredElement: null,
  selectedElementData: null,
  contentEditableMode: false,

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

  setHoveredElement: (data) => set({ hoveredElement: data }),
  setSelectedElementData: (data) => set({
    selectedElementData: data,
    selectedElement: data?.selector ?? null,
  }),
  setContentEditableMode: (active) => set({ contentEditableMode: active }),
});
