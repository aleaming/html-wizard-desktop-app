import React, { useState, useEffect, useCallback, useRef } from 'react';
import LeftSidebar from './components/layout/LeftSidebar';
import CenterPanel from './components/layout/CenterPanel';
import RightSidebar from './components/layout/RightSidebar';
import BottomPanel from './components/layout/BottomPanel';
import SettingsDialog from './components/settings/SettingsDialog';
import ExportDialog from './components/export/ExportDialog';
import OnboardingWizard from './components/onboarding/OnboardingWizard';
import { useAppStore } from './store';
import { useProject } from './hooks/useProject';

const ResizeHandle: React.FC<{
  direction: 'horizontal' | 'vertical';
  onResize: (delta: number) => void;
}> = ({ direction, onResize }) => {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startPos = direction === 'horizontal' ? e.clientX : e.clientY;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentPos = direction === 'horizontal' ? moveEvent.clientX : moveEvent.clientY;
      onResize(currentPos - startPos);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      className={`${direction === 'horizontal' ? 'w-1 cursor-col-resize hover:bg-blue-500' : 'h-1 cursor-row-resize hover:bg-blue-500'} bg-gray-700 transition-colors flex-shrink-0`}
      onMouseDown={handleMouseDown}
    />
  );
};

const App: React.FC = () => {
  const [leftWidth, setLeftWidth] = useState(300);
  const [rightWidth, setRightWidth] = useState(280);
  const [bottomHeight, setBottomHeight] = useState(200);
  const [showLeft, setShowLeft] = useState(true);
  const [showBottom, setShowBottom] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem('hw-onboarding-complete'),
  );
  const { openProjectDialog, saveAllChanges } = useProject();

  const leftWidthRef = useRef(leftWidth);
  const rightWidthRef = useRef(rightWidth);
  const bottomHeightRef = useRef(bottomHeight);

  useEffect(() => { leftWidthRef.current = leftWidth; }, [leftWidth]);
  useEffect(() => { rightWidthRef.current = rightWidth; }, [rightWidth]);
  useEffect(() => { bottomHeightRef.current = bottomHeight; }, [bottomHeight]);

  const handleLeftResize = useCallback((delta: number) => {
    setLeftWidth(Math.max(200, leftWidthRef.current + delta));
  }, []);

  const handleRightResize = useCallback((delta: number) => {
    setRightWidth(Math.max(200, rightWidthRef.current - delta));
  }, []);

  const handleBottomResize = useCallback((delta: number) => {
    setBottomHeight(Math.max(100, bottomHeightRef.current - delta));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'j') {
        e.preventDefault();
        setShowLeft(prev => !prev);
      }
      if (mod && e.key === '`') {
        e.preventDefault();
        setShowBottom(prev => !prev);
      }
      // Undo: Cmd+Z
      if (mod && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        useAppStore.getState().undo();
      }
      // Redo: Cmd+Shift+Z
      if (mod && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        useAppStore.getState().redo();
      }
      // Settings: Cmd+,
      if (mod && e.key === ',') {
        e.preventDefault();
        setShowSettings(prev => !prev);
      }
      // Open project: Cmd+O
      if (mod && e.key === 'o') {
        e.preventDefault();
        openProjectDialog();
      }
      // Save all: Cmd+S
      if (mod && e.key === 's') {
        e.preventDefault();
        saveAllChanges();
      }
      // Toggle code/visual split view: Cmd+\
      if (mod && e.key === '\\') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('toggle-code-view'));
      }
      // Focus AI chat input: Cmd+K
      if (mod && e.key === 'k') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('focus-ai-input'));
      }
      // Quick file open: Cmd+P (future)
      if (mod && e.key === 'p') {
        e.preventDefault();
        console.log('[HTML Wizard] Cmd+P: quick file open (not yet implemented)');
      }
      // Find in project: Cmd+Shift+F (future)
      if (mod && e.shiftKey && e.key === 'f') {
        e.preventDefault();
        console.log('[HTML Wizard] Cmd+Shift+F: find in project (not yet implemented)');
      }
      // Export: Cmd+E
      if (mod && e.key === 'e') {
        e.preventDefault();
        setShowExport(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openProjectDialog, saveAllChanges]);

  const columns = [
    showLeft ? `${leftWidth}px` : '0px',
    showLeft ? '4px' : '0px',
    '1fr',
    '4px',
    `${rightWidth}px`,
  ].join(' ');

  const rows = [
    '1fr',
    showBottom ? '4px' : '0px',
    showBottom ? `${bottomHeight}px` : '0px',
  ].join(' ');

  return (
    <div
      className="h-screen w-screen bg-gray-900 text-gray-100 overflow-hidden"
      style={{
        display: 'grid',
        gridTemplateColumns: columns,
        gridTemplateRows: rows,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      {/* Left Sidebar */}
      {showLeft && (
        <>
          <div style={{ gridRow: '1 / 2', gridColumn: '1 / 2', overflow: 'hidden' }}>
            <LeftSidebar width={leftWidth} />
          </div>
          <div style={{ gridRow: '1 / 2', gridColumn: '2 / 3' }}>
            <ResizeHandle direction="horizontal" onResize={handleLeftResize} />
          </div>
        </>
      )}

      {/* Center Panel */}
      <div style={{ gridRow: '1 / 2', gridColumn: showLeft ? '3 / 4' : '1 / 4', overflow: 'hidden' }}>
        <CenterPanel />
      </div>

      {/* Right Resize Handle */}
      <div style={{ gridRow: '1 / 2', gridColumn: showLeft ? '4 / 5' : '4 / 5' }}>
        <ResizeHandle direction="horizontal" onResize={handleRightResize} />
      </div>

      {/* Right Sidebar */}
      <div style={{ gridRow: '1 / 2', gridColumn: '5 / 6', overflow: 'hidden' }}>
        <RightSidebar width={rightWidth} />
      </div>

      {/* Bottom Resize Handle */}
      {showBottom && (
        <div style={{ gridRow: '2 / 3', gridColumn: '1 / -1' }}>
          <ResizeHandle direction="vertical" onResize={handleBottomResize} />
        </div>
      )}

      {/* Bottom Panel */}
      {showBottom && (
        <div style={{ gridRow: '3 / 4', gridColumn: '1 / -1', overflow: 'hidden' }}>
          <BottomPanel height={bottomHeight} />
        </div>
      )}

      {/* Settings Dialog */}
      <SettingsDialog open={showSettings} onClose={() => setShowSettings(false)} />

      {/* Export Dialog */}
      <ExportDialog open={showExport} onClose={() => setShowExport(false)} />

      {/* Onboarding Wizard */}
      <OnboardingWizard
        open={showOnboarding}
        onComplete={() => {
          localStorage.setItem('hw-onboarding-complete', 'true');
          setShowOnboarding(false);
        }}
      />
    </div>
  );
};

export default App;
