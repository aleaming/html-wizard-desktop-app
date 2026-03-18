import React, { useState, useRef, useEffect, useCallback } from 'react';
import PreviewFrame, { PreviewFrameHandle } from '../editor/PreviewFrame';
import ElementOverlay from '../editor/ElementOverlay';
import CodeEditor, { CodeEditorHandle } from '../editor/CodeEditor';
import { useAppStore } from '../../store';
import { useProject } from '../../hooks/useProject';
import type { ElementOverlayData, ElementSelectionData } from '../../types';

interface ViewportPreset {
  label: string;
  icon: string;
  width: number;
  height: number;
}

const presets: ViewportPreset[] = [
  { label: 'Mobile', icon: '📱', width: 375, height: 667 },
  { label: 'Tablet', icon: '📱', width: 768, height: 1024 },
  { label: 'Desktop', icon: '🖥', width: 1440, height: 900 },
];

const CenterPanel: React.FC = () => {
  const [activePreset, setActivePreset] = useState(2);
  const [viewportWidth, setViewportWidth] = useState(1440);
  const [viewportHeight, setViewportHeight] = useState(900);
  const [customWidth, setCustomWidth] = useState('');
  const [customHeight, setCustomHeight] = useState('');
  const [scale, setScale] = useState(100);
  const [showCode, setShowCode] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.6);

  const containerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<PreviewFrameHandle>(null);
  const codeEditorRef = useRef<CodeEditorHandle>(null);

  const { activeFile, readFile } = useProject();
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [hoveredElement, setHoveredElement] = useState<ElementOverlayData | null>(null);
  const [selectedElement, setSelectedElement] = useState<ElementSelectionData | null>(null);

  const selectElement = useAppStore(s => s.selectElement);
  const setSelectedElementData = useAppStore(s => (s as any).setSelectedElementData);
  const addChange = useAppStore(s => s.addChange);

  // Load file content when active file changes
  useEffect(() => {
    if (activeFile) {
      readFile(activeFile).then(content => {
        setFileContent(content);
        setShowCode(true);
      }).catch(() => setFileContent(null));
    } else {
      setFileContent(null);
    }
  }, [activeFile, readFile]);

  // Scale calculation
  const calculateScale = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const availableWidth = container.clientWidth - 48;
    const availableHeight = container.clientHeight - 48;
    const scaleX = availableWidth / viewportWidth;
    const scaleY = availableHeight / viewportHeight;
    const newScale = Math.min(scaleX, scaleY, 1);
    setScale(Math.round(newScale * 100));
  }, [viewportWidth, viewportHeight]);

  useEffect(() => {
    calculateScale();
    const observer = new ResizeObserver(calculateScale);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [calculateScale]);

  const handlePresetClick = (index: number) => {
    setActivePreset(index);
    setViewportWidth(presets[index].width);
    setViewportHeight(presets[index].height);
    setCustomWidth('');
    setCustomHeight('');
  };

  const handleOrientationToggle = () => {
    setViewportWidth(viewportHeight);
    setViewportHeight(viewportWidth);
    setActivePreset(-1);
  };

  const handleCustomApply = () => {
    const w = parseInt(customWidth);
    const h = parseInt(customHeight);
    if (w > 0 && h > 0) {
      setViewportWidth(w);
      setViewportHeight(h);
      setActivePreset(-1);
    }
  };

  const handleElementHover = useCallback((data: ElementOverlayData | null) => {
    setHoveredElement(data);
  }, []);

  const handleElementSelect = useCallback((data: ElementSelectionData) => {
    setSelectedElement(data);
    selectElement(data.selector);
    if (setSelectedElementData) {
      setSelectedElementData(data);
    }
  }, [selectElement, setSelectedElementData]);

  const handleCodeChange = useCallback((content: string) => {
    setFileContent(content);
    if (activeFile) {
      addChange({
        filePath: activeFile,
        original: null,
        modified: content,
        timestamp: Date.now(),
      });
    }
    // Reload preview with new content
    previewRef.current?.reload(content);
  }, [activeFile, addChange]);

  const scaledWidth = viewportWidth * (scale / 100);
  const scaledHeight = viewportHeight * (scale / 100);

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Viewport Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-700 bg-gray-800 flex-shrink-0">
        {presets.map((preset, i) => (
          <button
            key={preset.label}
            onClick={() => handlePresetClick(i)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded transition-colors ${
              activePreset === i
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
            }`}
          >
            <span>{preset.icon}</span>
            <span>{preset.width}</span>
          </button>
        ))}

        <div className="w-px h-5 bg-gray-600 mx-1" />

        <div className="flex items-center gap-1">
          <input
            type="number"
            value={customWidth}
            onChange={e => setCustomWidth(e.target.value)}
            placeholder={String(viewportWidth)}
            className="w-14 bg-gray-900 text-gray-300 text-xs px-2 py-1 rounded border border-gray-600 outline-none focus:border-blue-500"
          />
          <span className="text-gray-500 text-xs">&times;</span>
          <input
            type="number"
            value={customHeight}
            onChange={e => setCustomHeight(e.target.value)}
            placeholder={String(viewportHeight)}
            className="w-14 bg-gray-900 text-gray-300 text-xs px-2 py-1 rounded border border-gray-600 outline-none focus:border-blue-500"
          />
          <button onClick={handleCustomApply} className="text-xs text-gray-400 hover:text-blue-400 px-1">
            &#10003;
          </button>
        </div>

        <div className="w-px h-5 bg-gray-600 mx-1" />

        <button
          onClick={handleOrientationToggle}
          className="text-gray-400 hover:text-gray-200 px-2 py-1 text-xs rounded hover:bg-gray-700"
          title="Toggle orientation"
        >
          &#8646;
        </button>

        <div className="flex-1" />

        {/* Code toggle */}
        <button
          onClick={() => setShowCode(prev => !prev)}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            showCode ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
          }`}
          title="Toggle code editor (Cmd+\\)"
        >
          &lt;/&gt;
        </button>

        <span className="text-xs text-gray-500 ml-2">
          {viewportWidth} &times; {viewportHeight}
        </span>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Preview Area */}
        <div
          ref={containerRef}
          className="flex items-center justify-center overflow-hidden relative"
          style={{
            background: '#09090b',
            height: showCode && fileContent !== null ? `${splitRatio * 100}%` : '100%',
          }}
        >
          {fileContent !== null ? (
            <>
              <div
                className="relative"
                style={{ width: scaledWidth, height: scaledHeight }}
              >
                <PreviewFrame
                  ref={previewRef}
                  html={fileContent}
                  scale={scale / 100}
                  viewport={{ width: viewportWidth, height: viewportHeight }}
                  onElementHover={handleElementHover}
                  onElementClick={handleElementSelect}
                />
                <ElementOverlay
                  hoveredElement={hoveredElement}
                  selectedElement={selectedElement}
                  scale={scale / 100}
                />
              </div>
            </>
          ) : (
            <div className="border border-gray-700 rounded bg-white relative" style={{ width: scaledWidth, height: scaledHeight }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-gray-400 text-sm text-center">
                  Open a project to see<br />the visual preview
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Resize handle between preview and code */}
        {showCode && fileContent !== null && (
          <div
            className="h-1 bg-gray-700 cursor-row-resize hover:bg-blue-500 transition-colors flex-shrink-0"
            onMouseDown={(e) => {
              e.preventDefault();
              const startY = e.clientY;
              const startRatio = splitRatio;
              const parent = (e.target as HTMLElement).parentElement;
              if (!parent) return;
              const parentHeight = parent.clientHeight;

              const onMove = (me: MouseEvent) => {
                const delta = me.clientY - startY;
                const newRatio = Math.max(0.2, Math.min(0.8, startRatio + delta / parentHeight));
                setSplitRatio(newRatio);
              };
              const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
              };
              document.addEventListener('mousemove', onMove);
              document.addEventListener('mouseup', onUp);
            }}
          />
        )}

        {/* Code Editor */}
        {showCode && fileContent !== null && (
          <div style={{ height: `${(1 - splitRatio) * 100}%` }} className="overflow-hidden">
            <CodeEditor
              ref={codeEditorRef}
              value={fileContent}
              language={activeFile?.endsWith('.css') ? 'css' : activeFile?.endsWith('.js') ? 'javascript' : 'html'}
              onChange={handleCodeChange}
              onSave={() => {
                // TODO: wire to saveAllChanges
              }}
            />
          </div>
        )}
      </div>

      {/* Zoom Indicator */}
      <div className="flex items-center justify-end px-3 py-1.5 border-t border-gray-700 bg-gray-800 flex-shrink-0">
        <span className="text-xs text-gray-500">{scale}%</span>
      </div>
    </div>
  );
};

export default CenterPanel;
