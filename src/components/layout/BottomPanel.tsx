import React, { useState } from 'react';
import FileTree from '../project/FileTree';

interface BottomPanelProps {
  height: number;
}

const panelTabs = ['Files', 'Console', 'Output'] as const;
type PanelTabId = typeof panelTabs[number];

const BottomPanel: React.FC<BottomPanelProps> = ({ height }) => {
  const [activeTab, setActiveTab] = useState<PanelTabId>('Files');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Files':
        return (
          <div className="flex-1 overflow-y-auto">
            <FileTree />
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
