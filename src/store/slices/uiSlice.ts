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
