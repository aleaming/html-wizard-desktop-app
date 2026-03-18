import React, { useState, useEffect } from 'react';
import { CssVariable } from '../../types';

export interface ColorPickerProps {
  value: string;
  cssVariables?: CssVariable[];
  onChange: (value: string) => void;
  label?: string;
  compact?: boolean;
}

function isValidHex(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value);
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  cssVariables = [],
  onChange,
  label,
  compact = false,
}) => {
  const [hexInput, setHexInput] = useState(value);
  const [showVarDropdown, setShowVarDropdown] = useState(false);

  useEffect(() => {
    setHexInput(value);
  }, [value]);

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setHexInput(newValue);
    if (isValidHex(newValue)) {
      onChange(newValue);
    }
  };

  const handleHexBlur = () => {
    if (isValidHex(hexInput)) {
      onChange(hexInput);
    } else {
      setHexInput(value);
    }
  };

  const handleColorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setHexInput(newValue);
    onChange(newValue);
  };

  const handleVarSelect = (cssVar: CssVariable) => {
    const varRef = `var(${cssVar.name})`;
    setHexInput(varRef);
    onChange(varRef);
    setShowVarDropdown(false);
  };

  const colorForSwatch = isValidHex(hexInput) ? hexInput : isValidHex(value) ? value : '#000000';

  return (
    <div className="relative">
      {!compact && label && (
        <label className="block text-xs text-gray-400 mb-1">{label}</label>
      )}
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={colorForSwatch}
          onChange={handleColorInputChange}
          className="w-6 h-6 rounded border border-gray-600 cursor-pointer bg-transparent p-0"
          style={{ appearance: 'none', WebkitAppearance: 'none' }}
        />
        <input
          type="text"
          value={hexInput}
          onChange={handleHexChange}
          onBlur={handleHexBlur}
          className="flex-1 min-w-0 px-1.5 py-0.5 text-xs font-mono bg-gray-900 text-gray-200 border border-gray-600 rounded focus:border-blue-500 focus:outline-none"
        />
        {!compact && cssVariables.length > 0 && (
          <button
            onClick={() => setShowVarDropdown(!showVarDropdown)}
            className={`px-1.5 py-0.5 text-xs font-mono border rounded transition-colors ${
              showVarDropdown
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-gray-800 border-gray-600 text-gray-400 hover:text-gray-200 hover:border-gray-500'
            }`}
            title="Select CSS variable"
          >
            --
          </button>
        )}
      </div>
      {showVarDropdown && cssVariables.length > 0 && (
        <div className="absolute z-50 mt-1 left-0 right-0 bg-gray-900 border border-gray-600 rounded shadow-lg max-h-40 overflow-y-auto">
          {cssVariables.map((cssVar, i) => (
            <button
              key={`${cssVar.name}-${i}`}
              onClick={() => handleVarSelect(cssVar)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-gray-700 transition-colors text-left"
            >
              <span
                className="w-3 h-3 rounded-full border border-gray-600 flex-shrink-0"
                style={{ backgroundColor: isValidHex(cssVar.value) ? cssVar.value : '#000' }}
              />
              <span className="text-blue-400 font-mono truncate">{cssVar.name}</span>
              <span className="text-gray-500 font-mono truncate ml-auto">{cssVar.value}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ColorPicker;
