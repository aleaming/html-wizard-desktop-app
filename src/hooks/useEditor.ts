import { useState, useCallback, useEffect } from 'react';
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

  // Global Escape key clears selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearSelection();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearSelection]);

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
