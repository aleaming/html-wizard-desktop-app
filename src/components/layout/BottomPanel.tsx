import React, { useState } from 'react';
import FileTree from '../project/FileTree';
import { useProject } from '../../hooks/useProject';
import { useAppStore } from '../../store';

interface BottomPanelProps {
  height: number;
}

const panelTabs = ['Files', 'Console', 'Output'] as const;
type PanelTabId = typeof panelTabs[number];

const BottomPanel: React.FC<BottomPanelProps> = ({ height }) => {
  const [activeTab, setActiveTab] = useState<PanelTabId>('Files');
  const { openProjectDialog } = useProject();
  const projectInfo = useAppStore(s => s.projectInfo);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Files':
        return (
          <div className="flex-1 overflow-y-auto">
            {!projectInfo ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <p className="text-gray-500 text-xs">No project open</p>
                <button
                  onClick={() => openProjectDialog()}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-colors"
                >
                  Open Project Folder
                </button>
                <p className="text-gray-600 text-[10px]">or press Cmd+O</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-2 py-1 border-b border-gray-700">
                  <span className="text-xs text-gray-400 font-medium truncate">{projectInfo.name}</span>
                  <button
                    onClick={() => openProjectDialog()}
                    className="text-[10px] text-gray-500 hover:text-gray-300 px-1.5 py-0.5 rounded hover:bg-gray-700"
                  >
                    Change
                  </button>
                </div>
                <FileTree />
              </>
            )}
          </div>
        );
      case 'Console':
        return (
          <div className="flex-1 overflow-y-auto p-3" style={{ background: '#0d0d0d' }}>
            <p className="text-gray-600 text-xs font-mono">Console ready.</p>
          </div>
        );
      case 'Output':
        return (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500 text-sm">No build output</p>
          </div>
        );
    }
  };

  return (
    <div
      className="w-full flex flex-col bg-gray-800 border-t border-gray-700"
      style={{ height }}
    >
      {/* Tab Bar */}
      <div className="flex border-b border-gray-700">
        {panelTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === tab
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 flex overflow-hidden">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default BottomPanel;
