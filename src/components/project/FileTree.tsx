import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { FileNode } from '../../types';

const FILE_TYPE_CONFIG: Record<string, { dot: string; label: string }> = {
  html: { dot: 'bg-orange-400', label: 'HTML' },
  css: { dot: 'bg-blue-400', label: 'CSS' },
  js: { dot: 'bg-yellow-400', label: 'JS' },
  image: { dot: 'bg-green-400', label: 'IMG' },
  other: { dot: 'bg-gray-400', label: 'FILE' },
};

const DEFAULT_FILE_CONFIG = { dot: 'bg-gray-400', label: 'FILE' };

function getFileConfig(fileType: string | undefined) {
  if (!fileType) return DEFAULT_FILE_CONFIG;
  return FILE_TYPE_CONFIG[fileType.toLowerCase()] ?? DEFAULT_FILE_CONFIG;
}

export interface FileTreeProps {
  nodes?: FileNode[];
  depth?: number;
}

const FileTree: React.FC<FileTreeProps> = ({ nodes, depth = 0 }) => {
  const { fileTree, activeFile, setActiveFile } = useAppStore();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const items = nodes ?? fileTree;

  const toggleExpand = (path: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  if (items.length === 0 && depth === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 text-xs text-center">Open a project to see files</p>
      </div>
    );
  }

  return (
    <div>
      {items.map(node => {
        const isExpanded = expanded.has(node.path);

        return (
          <React.Fragment key={node.path}>
            <div
              style={{ paddingLeft: depth * 12 + 8 }}
              className={`flex items-center gap-1.5 py-0.5 px-2 cursor-pointer text-xs rounded
                ${node.path === activeFile
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
                }`}
              onClick={() => {
                if (node.isDir) {
                  toggleExpand(node.path);
                } else {
                  setActiveFile(node.path);
                }
              }}
            >
              {node.isDir ? (
                <>
                  <span className="text-gray-400 text-xs w-3">
                    {isExpanded ? '▼' : '▶'}
                  </span>
                  <span className="font-medium">{node.name}/</span>
                </>
              ) : (
                <>
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${getFileConfig(node.fileType).dot}`}
                  />
                  <span className="truncate">{node.name}</span>
                </>
              )}
            </div>
            {isExpanded && node.children && (
              <FileTree nodes={node.children} depth={depth + 1} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default FileTree;
