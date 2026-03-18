import React, { useState } from 'react';
import { ViewportSize, VIEWPORT_PRESETS } from '../../types';

export interface ViewportSelectorProps {
  viewport: ViewportSize;
  onViewportChange: (viewport: ViewportSize) => void;
  scale?: number;
}

const PRESET_ICONS: Record<string, string> = {
  'Mobile': 'M',
  'Tablet': 'T',
  'Desktop': 'D',
};

const ViewportSelector: React.FC<ViewportSelectorProps> = ({
  viewport,
  onViewportChange,
  scale,
}) => {
  const [customWidth, setCustomWidth] = useState('');
  const [customHeight, setCustomHeight] = useState('');

  const activePresetIndex = VIEWPORT_PRESETS.findIndex(
    p => p.width === viewport.width && p.height === viewport.height
  );

  const handlePresetClick = (preset: ViewportSize) => {
    setCustomWidth('');
    setCustomHeight('');
    onViewportChange(preset);
  };

  const handleOrientationToggle = () => {
    onViewportChange({ width: viewport.height, height: viewport.width });
  };

  const handleCustomApply = () => {
    const w = parseInt(customWidth);
    const h = parseInt(customHeight);
    if (w > 0 && h > 0) {
      onViewportChange({ width: w, height: h });
    }
  };

  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-700 bg-gray-800">
      {/* Preset buttons */}
      {VIEWPORT_PRESETS.map((preset, i) => (
        <button
          key={preset.label}
          onClick={() => handlePresetClick(preset)}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded transition-colors ${
            activePresetIndex === i
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
          }`}
          title={`${preset.label} (${preset.width}x${preset.height})`}
        >
          <span className="font-mono text-xs">{PRESET_ICONS[preset.label ?? ''] ?? preset.label}</span>
          <span>{preset.width}</span>
        </button>
      ))}

      <div className="w-px h-5 bg-gray-600 mx-1" />

      {/* Custom dimensions */}
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={customWidth}
          onChange={e => setCustomWidth(e.target.value)}
          placeholder={String(viewport.width)}
          className="w-14 bg-gray-900 text-gray-300 text-xs px-2 py-1 rounded border border-gray-600 outline-none focus:border-blue-500"
          min={1}
        />
        <span className="text-gray-500 text-xs">&times;</span>
        <input
          type="number"
          value={customHeight}
          onChange={e => setCustomHeight(e.target.value)}
          placeholder={String(viewport.height)}
          className="w-14 bg-gray-900 text-gray-300 text-xs px-2 py-1 rounded border border-gray-600 outline-none focus:border-blue-500"
          min={1}
        />
        <button
          onClick={handleCustomApply}
          className="text-xs text-gray-400 hover:text-blue-400 px-1"
          title="Apply custom dimensions"
        >
          &#10003;
        </button>
      </div>

      <div className="w-px h-5 bg-gray-600 mx-1" />

      {/* Orientation toggle */}
      <button
        onClick={handleOrientationToggle}
        className="text-gray-400 hover:text-gray-200 px-2 py-1 text-xs rounded hover:bg-gray-700"
        title="Swap width and height (rotate)"
      >
        &#8646;
      </button>

      <div className="flex-1" />

      {/* Dimension display + optional scale */}
      <span className="text-xs text-gray-500">
        {viewport.width} &times; {viewport.height}
        {scale !== undefined && ` @ ${scale}%`}
      </span>
    </div>
  );
};

export default ViewportSelector;
