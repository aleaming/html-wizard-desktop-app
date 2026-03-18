import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { ElementSelectionData, CssVariable } from '../../types';
import ColorPicker from '../editor/ColorPicker';

interface RightSidebarProps {
  width: number;
}

const tabs = ['Styles', 'Attributes', 'Computed', 'AI'] as const;
type TabId = typeof tabs[number];

// ===== Style category definitions =====

const styleCategories: { label: string; props: string[] }[] = [
  {
    label: 'Typography',
    props: ['color', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-align', 'text-decoration', 'text-transform'],
  },
  {
    label: 'Background',
    props: ['background-color', 'background-image', 'background-size', 'background-position', 'background-repeat'],
  },
  {
    label: 'Box Model',
    props: ['width', 'height', 'min-width', 'min-height', 'max-width', 'max-height', 'margin', 'padding'],
  },
  {
    label: 'Border',
    props: ['border', 'border-color', 'border-width', 'border-style', 'border-radius'],
  },
  {
    label: 'Layout',
    props: ['display', 'position', 'top', 'right', 'bottom', 'left', 'flex-direction', 'align-items', 'justify-content', 'gap', 'z-index', 'overflow'],
  },
  {
    label: 'Effects',
    props: ['opacity', 'box-shadow', 'transform', 'transition', 'cursor', 'pointer-events'],
  },
];

const colorProps = new Set(['color', 'background-color', 'border-color']);

// ===== Local tab components =====

const StylesTab: React.FC<{ data: ElementSelectionData }> = ({ data }) => {
  return (
    <div className="py-1">
      {styleCategories.map(category => {
        const activeProps = category.props.filter(p => data.computedStyles[p]);
        if (activeProps.length === 0) return null;
        return (
          <div key={category.label} className="mb-2">
            <div className="px-3 py-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
              {category.label}
            </div>
            {activeProps.map(prop => (
              <div
                key={prop}
                className="flex items-center justify-between px-3 py-1 hover:bg-gray-700 transition-colors"
              >
                <span className="text-xs font-mono text-gray-400">{prop}</span>
                {colorProps.has(prop) ? (
                  <div className="w-28">
                    <ColorPicker
                      value={data.computedStyles[prop]}
                      onChange={() => {}}
                      compact
                    />
                  </div>
                ) : (
                  <span className="text-xs font-mono text-gray-200 truncate max-w-[50%] text-right">
                    {data.computedStyles[prop]}
                  </span>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

const AttributesTab: React.FC<{ data: ElementSelectionData }> = ({ data }) => {
  const entries = Object.entries(data.attributes);
  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-full px-3">
        <p className="text-gray-500 text-sm text-center">No attributes</p>
      </div>
    );
  }
  return (
    <div className="py-1">
      {entries.map(([name, value]) => (
        <div
          key={name}
          className="flex items-start gap-2 px-3 py-1.5 hover:bg-gray-700 transition-colors"
        >
          <span className="text-xs font-mono text-blue-400 flex-shrink-0">{name}</span>
          <span className="text-xs font-mono text-gray-300 break-all">{value}</span>
        </div>
      ))}
    </div>
  );
};

const ComputedTab: React.FC<{ data: ElementSelectionData }> = ({ data }) => {
  const entries = Object.entries(data.computedStyles).sort(([a], [b]) => a.localeCompare(b));
  return (
    <div className="py-1">
      {entries.map(([prop, value]) => (
        <div
          key={prop}
          className="flex items-start justify-between px-3 py-0.5 hover:bg-gray-700 transition-colors"
        >
          <span className="text-xs font-mono text-gray-400 flex-shrink-0">{prop}</span>
          <span className="text-xs font-mono text-gray-200 truncate max-w-[50%] text-right">{value}</span>
        </div>
      ))}
    </div>
  );
};

// ===== Main component =====

const RightSidebar: React.FC<RightSidebarProps> = ({ width }) => {
  const [activeTab, setActiveTab] = useState<TabId>('Styles');
  const [cssVarsOpen, setCssVarsOpen] = useState(false);
  const { selectedElementData } = useAppStore();

  const emptyMessages: Record<TabId, string> = {
    Styles: 'Select an element to inspect its styles',
    Attributes: 'Select an element to view its attributes',
    Computed: 'Select an element to see computed values',
    AI: 'Select an element for AI suggestions',
  };

  const breadcrumb = selectedElementData
    ? `${selectedElementData.tagName.toLowerCase()}${selectedElementData.id ? '#' + selectedElementData.id : ''}${selectedElementData.classes.map((c: string) => '.' + c).join('')}`
    : 'No element selected';

  return (
    <div
      className="h-full flex flex-col bg-gray-800 border-l border-gray-700"
      style={{ width }}
    >
      {/* Breadcrumb Trail */}
      <div className="px-3 py-2 border-b border-gray-700">
        <p className={`text-xs truncate font-mono ${selectedElementData ? 'text-blue-400' : 'text-gray-500'}`}>
          {breadcrumb}
        </p>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-gray-700">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-2 py-2 text-xs font-medium transition-colors ${
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
      <div className="flex-1 overflow-y-auto">
        {!selectedElementData ? (
          <div className="flex items-center justify-center h-full px-3">
            <p className="text-gray-500 text-sm text-center">{emptyMessages[activeTab]}</p>
          </div>
        ) : activeTab === 'Styles' ? (
          <StylesTab data={selectedElementData} />
        ) : activeTab === 'Attributes' ? (
          <AttributesTab data={selectedElementData} />
        ) : activeTab === 'Computed' ? (
          <ComputedTab data={selectedElementData} />
        ) : (
          <div className="flex items-center justify-center h-full px-3">
            <p className="text-gray-500 text-sm text-center">Select an element for AI suggestions</p>
          </div>
        )}
      </div>

      {/* CSS Variables Section */}
      <div className="border-t border-gray-700">
        <button
          onClick={() => setCssVarsOpen(!cssVarsOpen)}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors"
        >
          <span
            className="transition-transform inline-block"
            style={{ transform: cssVarsOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
          >
            &#9654;
          </span>
          CSS Variables
        </button>
        {cssVarsOpen && (
          <div className="px-3 py-2">
            {selectedElementData && selectedElementData.cssVariables.length > 0 ? (
              <div className="space-y-1">
                {selectedElementData.cssVariables.map((v: CssVariable, i: number) => (
                  <div key={`${v.name}-${i}`} className="flex items-center gap-2 text-xs">
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-gray-600 flex-shrink-0"
                      style={{ backgroundColor: /^#/.test(v.value) ? v.value : 'transparent' }}
                    />
                    <span className="font-mono text-blue-400 truncate">{v.name}</span>
                    <span className="font-mono text-gray-400 truncate ml-auto">{v.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                {selectedElementData ? 'No CSS variables used' : 'No CSS variables defined'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RightSidebar;
