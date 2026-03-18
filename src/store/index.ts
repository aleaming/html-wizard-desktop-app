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
