import React, { useState } from 'react';

interface DiffPreviewProps {
  original: string;
  proposed: string;
  language?: string;
  onAccept: (proposed: string) => void;
  onReject: () => void;
  onIterate: (feedback: string) => void;
}

type DiffLineType = 'addition' | 'removal' | 'context';

interface DiffLine {
  type: DiffLineType;
  content: string;
  oldLineNo?: number;
  newLineNo?: number;
}

function computeDiff(original: string, proposed: string): DiffLine[] {
  const origLines = original.split('\n');
  const propLines = proposed.split('\n');
  const maxLen = Math.max(origLines.length, propLines.length);
  const lines: DiffLine[] = [];
  let oldLineNo = 1;
  let newLineNo = 1;

  for (let i = 0; i < maxLen; i++) {
    const origLine = origLines[i];
    const propLine = propLines[i];

    if (origLine === undefined) {
      lines.push({ type: 'addition', content: propLine, newLineNo: newLineNo++ });
    } else if (propLine === undefined) {
      lines.push({ type: 'removal', content: origLine, oldLineNo: oldLineNo++ });
    } else if (origLine === propLine) {
      lines.push({ type: 'context', content: origLine, oldLineNo: oldLineNo++, newLineNo: newLineNo++ });
    } else {
      lines.push({ type: 'removal', content: origLine, oldLineNo: oldLineNo++ });
      lines.push({ type: 'addition', content: propLine, newLineNo: newLineNo++ });
    }
  }

  return lines;
}

function DiffStats({ lines }: { lines: DiffLine[] }) {
  const additions = lines.filter((l) => l.type === 'addition').length;
  const removals = lines.filter((l) => l.type === 'removal').length;

  return (
    <span className="text-xs">
      <span className="text-green-400">+{additions}</span>
      {' '}
      <span className="text-red-400">-{removals}</span>
    </span>
  );
}

function UnifiedView({ lines }: { lines: DiffLine[] }) {
  return (
    <table className="w-full font-mono text-xs">
      <tbody>
        {lines.map((line, i) => {
          let rowClass = 'text-gray-300';
          let prefix = ' ';

          if (line.type === 'removal') {
            rowClass = 'bg-red-900/30 text-red-300 line-through';
            prefix = '-';
          } else if (line.type === 'addition') {
            rowClass = 'bg-green-900/30 text-green-300';
            prefix = '+';
          }

          return (
            <tr key={i} className={rowClass}>
              <td className="px-2 text-gray-600 select-none w-4 text-right">{prefix}</td>
              <td className="px-2 whitespace-pre">{line.content}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function SplitView({ original, proposed }: { original: string; proposed: string }) {
  const origLines = original.split('\n');
  const propLines = proposed.split('\n');
  const maxLen = Math.max(origLines.length, propLines.length);

  return (
    <div className="flex divide-x divide-gray-700 font-mono text-xs">
      <div className="flex-1 overflow-x-auto">
        {Array.from({ length: maxLen }, (_, i) => {
          const line = origLines[i];
          const isDiff = line !== undefined && propLines[i] !== line;
          const isRemoved = line !== undefined && propLines[i] === undefined;

          return (
            <div
              key={i}
              className={`px-2 whitespace-pre ${
                isDiff || isRemoved ? 'bg-red-900/30 text-red-300' : 'text-gray-300'
              }`}
            >
              {line ?? ''}
            </div>
          );
        })}
      </div>
      <div className="flex-1 overflow-x-auto">
        {Array.from({ length: maxLen }, (_, i) => {
          const line = propLines[i];
          const isDiff = line !== undefined && origLines[i] !== line;
          const isAdded = line !== undefined && origLines[i] === undefined;

          return (
            <div
              key={i}
              className={`px-2 whitespace-pre ${
                isDiff || isAdded ? 'bg-green-900/30 text-green-300' : 'text-gray-300'
              }`}
            >
              {line ?? ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const DiffPreview: React.FC<DiffPreviewProps> = ({
  original,
  proposed,
  onAccept,
  onReject,
  onIterate,
}) => {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');
  const [showIterate, setShowIterate] = useState(false);
  const [feedback, setFeedback] = useState('');

  const diffLines = computeDiff(original, proposed);

  const handleIterate = () => {
    const trimmed = feedback.trim();
    if (!trimmed) return;
    onIterate(trimmed);
    setFeedback('');
    setShowIterate(false);
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-700">
        <DiffStats lines={diffLines} />
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('unified')}
            className={`text-[10px] px-2 py-0.5 rounded ${
              viewMode === 'unified'
                ? 'bg-gray-600 text-gray-100'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Unified
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`text-[10px] px-2 py-0.5 rounded ${
              viewMode === 'split'
                ? 'bg-gray-600 text-gray-100'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Split
          </button>
        </div>
      </div>

      {/* Diff content */}
      <div className="max-h-64 overflow-auto">
        {viewMode === 'unified' ? (
          <UnifiedView lines={diffLines} />
        ) : (
          <SplitView original={original} proposed={proposed} />
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-700">
        <button
          onClick={() => onAccept(proposed)}
          className="text-xs px-3 py-1 rounded bg-green-600 hover:bg-green-500 text-white font-medium"
        >
          Accept
        </button>
        <button
          onClick={() => setShowIterate(!showIterate)}
          className="text-xs px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium"
        >
          Iterate
        </button>
        <button
          onClick={onReject}
          className="text-xs px-3 py-1 rounded bg-gray-600 hover:bg-gray-500 text-gray-200 font-medium"
        >
          Reject
        </button>
      </div>

      {/* Iterate input */}
      {showIterate && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-700">
          <input
            type="text"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleIterate();
              }
            }}
            placeholder="Describe what to change..."
            className="flex-1 bg-gray-900 text-gray-100 text-xs rounded px-2 py-1 border border-gray-600 focus:border-blue-500 outline-none placeholder-gray-500"
          />
          <button
            onClick={handleIterate}
            disabled={!feedback.trim()}
            className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium"
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
};

export default DiffPreview;
