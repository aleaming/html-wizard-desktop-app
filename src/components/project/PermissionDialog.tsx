import React, { useEffect, useState } from 'react';

interface PermissionDialogProps {
  projectPath: string;
  onGrant: () => void;
  onCancel: () => void;
}

interface Capability {
  icon: string;
  label: string;
  description: string;
}

const CAPABILITIES: Capability[] = [
  {
    icon: '📂',
    label: 'Read project files',
    description: 'Read HTML, CSS, JS, and asset files within the selected project folder.',
  },
  {
    icon: '✏️',
    label: 'Write and modify files',
    description: 'Save edits you make to files. Only files inside the project folder are affected.',
  },
  {
    icon: '➕',
    label: 'Create new files',
    description: 'Create new files when you add components, pages, or assets to your project.',
  },
  {
    icon: '🗑️',
    label: 'Delete files',
    description: 'Remove files you explicitly delete from the file tree. This action cannot be undone.',
  },
  {
    icon: '🔒',
    label: 'Scoped to this folder only',
    description: 'Access is strictly limited to the chosen project directory. No other part of your system is accessible.',
  },
];

const CONSENT_KEY_PREFIX = 'html-wizard:consent:';

function getConsentKey(projectPath: string): string {
  return `${CONSENT_KEY_PREFIX}${projectPath}`;
}

export function hasStoredConsent(projectPath: string): boolean {
  try {
    return localStorage.getItem(getConsentKey(projectPath)) === 'granted';
  } catch {
    return false;
  }
}

function storeConsent(projectPath: string): void {
  try {
    localStorage.setItem(getConsentKey(projectPath), 'granted');
  } catch {
    // localStorage may be unavailable in some environments
  }
}

const PermissionDialog: React.FC<PermissionDialogProps> = ({
  projectPath,
  onGrant,
  onCancel,
}) => {
  const [rememberChoice, setRememberChoice] = useState(true);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  const handleGrant = () => {
    if (rememberChoice) {
      storeConsent(projectPath);
    }
    onGrant();
  };

  // Shorten very long paths for display
  const displayPath =
    projectPath.length > 60
      ? '...' + projectPath.slice(-57)
      : projectPath;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onCancel}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Dialog */}
      <div
        className="relative bg-gray-800 rounded-xl shadow-2xl border border-gray-600 w-[500px] max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-xl">
              🔓
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-100">
                Grant Access to Project Folder
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                HTML Wizard needs access to read and write files in this folder.
              </p>
            </div>
          </div>

          {/* Project path pill */}
          <div className="mt-4 flex items-center gap-2 bg-gray-900/60 rounded-lg border border-gray-700 px-3 py-2">
            <svg
              className="flex-shrink-0 text-gray-500"
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M2 4a1 1 0 011-1h4l1 1h6a1 1 0 011 1v7a1 1 0 01-1 1H3a1 1 0 01-1-1V4z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            <code className="text-xs text-gray-300 font-mono truncate" title={projectPath}>
              {displayPath}
            </code>
          </div>
        </div>

        {/* Capabilities */}
        <div className="px-6 pb-4 flex-1 overflow-y-auto">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            What this app will access
          </p>
          <div className="space-y-2">
            {CAPABILITIES.map(cap => (
              <div
                key={cap.label}
                className="flex items-start gap-3 bg-gray-900/40 rounded-lg px-4 py-3 border border-gray-700/50"
              >
                <span className="text-base flex-shrink-0 mt-0.5">{cap.icon}</span>
                <div>
                  <div className="text-sm font-medium text-gray-200">{cap.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{cap.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Remember choice */}
        <div className="px-6 py-3 border-t border-gray-700/50">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberChoice}
              onChange={e => setRememberChoice(e.target.checked)}
              className="accent-blue-500 cursor-pointer"
            />
            <span className="text-sm text-gray-400">
              Remember this choice for this project
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-700">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGrant}
            className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
          >
            Grant Access
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermissionDialog;
