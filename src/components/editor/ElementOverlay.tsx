import React, { useState, useEffect, useRef } from 'react';
import { ElementOverlayData, ElementSelectionData, EditOperation } from '../../types';

export interface ElementOverlayProps {
  hoveredElement: ElementOverlayData | null;
  selectedElement: ElementSelectionData | null;
  scale: number;
  onOverlayClick?: () => void;
  dblClickData?: ElementSelectionData | null;
  onEditComplete?: (op: EditOperation) => void;
}

const ElementOverlay: React.FC<ElementOverlayProps> = ({
  hoveredElement,
  selectedElement,
  scale,
  onOverlayClick: _onOverlayClick,
  dblClickData,
  onEditComplete,
}) => {
  const [editingText, setEditingText] = useState<string>('');
  const [editingSelector, setEditingSelector] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // When dblClickData changes to non-null, enter edit mode
  useEffect(() => {
    if (dblClickData) {
      setEditingSelector(dblClickData.selector);
      setEditingText(dblClickData.innerHTML);
    }
  }, [dblClickData]);

  // Focus textarea when editing starts
  useEffect(() => {
    if (editingSelector && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editingSelector]);

  const handleEditComplete = () => {
    if (!editingSelector || !dblClickData) return;
    const before = dblClickData.innerHTML;
    const after = editingText;
    if (before !== after) {
      const op: EditOperation = {
        id: crypto.randomUUID(),
        type: 'content',
        elementSelector: editingSelector,
        filePath: '', // filled in by useEditor when it calls pushOperation
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

  // Skip hover overlay if it targets the same element as selection
  const showHover =
    hoveredElement !== null &&
    (selectedElement === null || hoveredElement.selector !== selectedElement.selector);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
      {/* Hover highlight */}
      {showHover && (
        <div
          style={{
            position: 'absolute',
            top: hoveredElement!.rect.top * scale,
            left: hoveredElement!.rect.left * scale,
            width: hoveredElement!.rect.width * scale,
            height: hoveredElement!.rect.height * scale,
            border: '2px solid #3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            pointerEvents: 'none',
            zIndex: 10,
            boxSizing: 'border-box',
          }}
        />
      )}

      {/* Selection overlay with dimension tooltip */}
      {selectedElement && (
        <div
          style={{
            position: 'absolute',
            top: selectedElement.rect.top * scale,
            left: selectedElement.rect.left * scale,
            width: selectedElement.rect.width * scale,
            height: selectedElement.rect.height * scale,
            border: '2px dashed #3b82f6',
            pointerEvents: 'none',
            zIndex: 11,
            boxSizing: 'border-box',
          }}
        >
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
            {selectedElement.tagName.toLowerCase()}
            {selectedElement.id ? `#${selectedElement.id}` : ''}
            {selectedElement.classes.length > 0 ? `.${selectedElement.classes[0]}` : ''}
            {' '}
            {Math.round(selectedElement.rect.width)} &times; {Math.round(selectedElement.rect.height)}
          </div>
        </div>
      )}

      {/* Floating textarea for inline text editing (contenteditable flow) */}
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
    </div>
  );
};

export default ElementOverlay;
