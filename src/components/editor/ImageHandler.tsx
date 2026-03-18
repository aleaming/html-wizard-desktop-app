import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface ImageHandlerProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (htmlSnippet: string) => void;
  projectPath?: string;
}

type ImageTab = 'Upload' | 'URL' | 'AI Generate';

const ImageHandler: React.FC<ImageHandlerProps> = ({
  isOpen,
  onClose,
  onInsert,
  projectPath,
}) => {
  const [activeTab, setActiveTab] = useState<ImageTab>('Upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setUrlInput('');
      setAiPrompt('');
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  const handleUpload = async () => {
    if (!selectedFile || !projectPath) return;
    setLoading(true);
    setError(null);
    try {
      const relativePath = await invoke<string>('upload_image', {
        sourcePath: selectedFile.name,
        projectPath,
      });
      onInsert(`<img src="${relativePath}" alt="" />`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleUrlInsert = async () => {
    if (!urlInput.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const validatedUrl = await invoke<string>('link_image_url', { url: urlInput });
      onInsert(`<img src="${validatedUrl}" alt="" />`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<string>('generate_image', { prompt: aiPrompt });
      onInsert(`<img src="${result}" alt="" />`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg w-96 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-gray-100">Insert Image</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-gray-700">
          {(['Upload', 'URL', 'AI Generate'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setError(null); }}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === tab
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-4 space-y-3">
          {activeTab === 'Upload' && (
            <>
              <label className="block">
                <span className="text-xs text-gray-400">Select an image file</span>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.gif,.svg,.webp,.ico"
                  onChange={e => setSelectedFile(e.target.files?.[0] ?? null)}
                  className="mt-1 block w-full text-xs text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:bg-gray-700 file:text-gray-200 hover:file:bg-gray-600"
                />
              </label>
              {selectedFile && (
                <p className="text-xs text-gray-400">Selected: {selectedFile.name}</p>
              )}
              <button
                onClick={handleUpload}
                disabled={!selectedFile || !projectPath || loading}
                className="w-full py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? 'Uploading...' : 'Upload'}
              </button>
            </>
          )}

          {activeTab === 'URL' && (
            <>
              <input
                type="text"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="https://example.com/image.png"
                className="w-full bg-gray-900 text-gray-300 text-xs px-3 py-2 rounded border border-gray-600 outline-none focus:border-blue-500"
              />
              <button
                onClick={handleUrlInsert}
                disabled={!urlInput.trim() || loading}
                className="w-full py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? 'Validating...' : 'Insert'}
              </button>
            </>
          )}

          {activeTab === 'AI Generate' && (
            <>
              <textarea
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder="A sunset over the ocean, photorealistic"
                rows={3}
                className="w-full bg-gray-900 text-gray-300 text-xs px-3 py-2 rounded border border-gray-600 outline-none focus:border-blue-500 resize-none"
              />
              <p className="text-xs text-gray-500 italic">AI image generation coming soon</p>
              <button
                onClick={handleAiGenerate}
                disabled={!aiPrompt.trim() || loading}
                className="w-full py-1.5 text-xs rounded bg-gray-600 text-gray-400 cursor-not-allowed"
              >
                {loading ? 'Generating...' : 'Generate'}
              </button>
            </>
          )}

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="text-xs text-gray-400 hover:text-gray-200 px-3 py-1.5 rounded hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageHandler;
