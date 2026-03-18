import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useAppStore } from '../../store';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
}

interface ExportOptions {
  project_root: string;
  destination: string;
  minify_html: boolean;
  minify_css: boolean;
  minify_js: boolean;
  inline_css: boolean;
}

interface FileEntry {
  path: string;
  size: string;
}

type ExportDestination = 'zip' | 'folder';

const ExportDialog: React.FC<ExportDialogProps> = ({ open: isOpen, onClose }) => {
  const { projectInfo } = useAppStore();

  const [destination, setDestination] = useState<ExportDestination>('folder');
  const [destPath, setDestPath] = useState('');
  const [minifyHtml, setMinifyHtml] = useState(false);
  const [minifyCss, setMinifyCss] = useState(false);
  const [minifyJs, setMinifyJs] = useState(false);
  const [inlineCss, setInlineCss] = useState(false);
  const [fileList, setFileList] = useState<FileEntry[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load a preview file list when dialog opens or project changes
  useEffect(() => {
    if (!isOpen || !projectInfo?.root) return;

    setExportResult(null);
    setLoadingFiles(true);

    const fetchFiles = async () => {
      try {
        const nodes = await invoke<Array<{ path: string; is_dir: boolean }>>('scan_directory', {
          path: projectInfo.root,
        });
        // Flatten — scan_directory returns top-level nodes; show them as a preview
        const entries: FileEntry[] = nodes
          .filter(n => !n.is_dir)
          .map(n => ({
            path: n.path.replace(projectInfo.root, '').replace(/^[/\\]/, ''),
            size: '—',
          }));
        setFileList(entries);
      } catch {
        setFileList([]);
      } finally {
        setLoadingFiles(false);
      }
    };

    fetchFiles();
  }, [isOpen, projectInfo?.root]);

  const handlePickFolder = useCallback(async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Choose Export Destination',
    });
    if (selected) {
      setDestPath(selected as string);
    }
  }, []);

  const handleExport = useCallback(async () => {
    if (!projectInfo?.root) {
      setExportResult({ success: false, message: 'No project open.' });
      return;
    }
    if (!destPath.trim()) {
      setExportResult({ success: false, message: 'Please choose a destination folder.' });
      return;
    }

    setExporting(true);
    setExportResult(null);

    const options: ExportOptions = {
      project_root: projectInfo.root,
      destination: destPath.trim(),
      minify_html: minifyHtml,
      minify_css: minifyCss,
      minify_js: minifyJs,
      inline_css: inlineCss,
    };

    try {
      const result = await invoke<string>('export_project', { options });
      setExportResult({ success: true, message: `Exported to: ${result}` });
    } catch (err) {
      setExportResult({ success: false, message: String(err) });
    } finally {
      setExporting(false);
    }
  }, [projectInfo?.root, destPath, minifyHtml, minifyCss, minifyJs, inlineCss]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Dialog */}
      <div
        className="relative bg-gray-800 rounded-lg shadow-2xl border border-gray-600 w-[580px] max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-gray-100">Export Project</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 p-1 rounded hover:bg-gray-700 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Project info */}
          {projectInfo ? (
            <div className="text-sm text-gray-400">
              Exporting: <span className="text-gray-200 font-medium">{projectInfo.name}</span>
            </div>
          ) : (
            <div className="text-sm text-yellow-400">No project is currently open.</div>
          )}

          {/* Export destination */}
          <div>
            <p className="text-sm font-medium text-gray-200 mb-2">Export Destination</p>
            <div className="flex gap-3 mb-3">
              <button
                onClick={() => setDestination('folder')}
                className={`flex-1 py-2 text-sm rounded border transition-colors ${
                  destination === 'folder'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                    : 'bg-gray-900/50 border-gray-600 text-gray-400 hover:border-gray-500'
                }`}
              >
                Export to Folder
              </button>
              <button
                onClick={() => setDestination('zip')}
                disabled
                title="ZIP export coming soon"
                className="flex-1 py-2 text-sm rounded border bg-gray-900/20 border-gray-700 text-gray-600 cursor-not-allowed"
              >
                Download as ZIP
                <span className="ml-1 text-xs text-gray-600">(soon)</span>
              </button>
            </div>

            {destination === 'folder' && (
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-900 rounded border border-gray-600 px-3 py-2 text-sm text-gray-300 font-mono truncate min-h-[36px]">
                  {destPath || <span className="text-gray-600">No folder selected</span>}
                </div>
                <button
                  onClick={handlePickFolder}
                  className="px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors whitespace-nowrap"
                >
                  Choose Folder
                </button>
              </div>
            )}
          </div>

          {/* Options */}
          <div>
            <p className="text-sm font-medium text-gray-200 mb-2">Options</p>
            <div className="bg-gray-900/50 rounded-lg border border-gray-700 divide-y divide-gray-700">
              {[
                { label: 'Minify HTML', description: 'Strip whitespace from HTML files', value: minifyHtml, set: setMinifyHtml },
                { label: 'Minify CSS', description: 'Remove comments and collapse CSS whitespace', value: minifyCss, set: setMinifyCss },
                { label: 'Minify JS', description: 'Remove comments and collapse JS whitespace', value: minifyJs, set: setMinifyJs },
                { label: 'Inline CSS into HTML', description: 'Replace <link> tags with <style> blocks', value: inlineCss, set: setInlineCss },
              ].map(opt => (
                <label
                  key={opt.label}
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-800/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={opt.value}
                    onChange={e => opt.set(e.target.checked)}
                    className="mt-0.5 accent-blue-500 cursor-pointer"
                  />
                  <div>
                    <div className="text-sm text-gray-200">{opt.label}</div>
                    <div className="text-xs text-gray-500">{opt.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* File preview */}
          <div>
            <p className="text-sm font-medium text-gray-200 mb-2">
              Files to Export
              {fileList.length > 0 && (
                <span className="ml-2 text-xs text-gray-500">({fileList.length} visible files)</span>
              )}
            </p>
            <div className="bg-gray-900/50 rounded-lg border border-gray-700 max-h-36 overflow-y-auto">
              {loadingFiles ? (
                <div className="px-4 py-3 text-sm text-gray-500 animate-pulse">Loading file list...</div>
              ) : fileList.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500">No files found (open a project first).</div>
              ) : (
                fileList.map(f => (
                  <div
                    key={f.path}
                    className="flex items-center justify-between px-4 py-1.5 text-xs font-mono text-gray-400 hover:text-gray-200 border-b border-gray-800 last:border-0"
                  >
                    <span className="truncate">{f.path}</span>
                    <span className="ml-4 text-gray-600 flex-shrink-0">{f.size}</span>
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              node_modules, .git, target, dist are excluded automatically.
            </p>
          </div>

          {/* Result banner */}
          {exportResult && (
            <div
              className={`rounded-lg px-4 py-3 text-sm ${
                exportResult.success
                  ? 'bg-green-900/30 border border-green-700 text-green-300'
                  : 'bg-red-900/30 border border-red-700 text-red-300'
              }`}
            >
              {exportResult.message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || !projectInfo || !destPath.trim()}
            className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded font-medium transition-colors flex items-center gap-2"
          >
            {exporting ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Exporting...
              </>
            ) : (
              'Export'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;
