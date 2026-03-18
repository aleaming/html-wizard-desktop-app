import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface ProviderKeyConfig {
  id: string;
  label: string;
  placeholder: string;
  helpUrl: string;
}

const PROVIDERS: ProviderKeyConfig[] = [
  {
    id: 'claude',
    label: 'Claude (Anthropic)',
    placeholder: 'sk-ant-api03-...',
    helpUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    placeholder: 'sk-...',
    helpUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'gemini',
    label: 'Gemini (Google)',
    placeholder: 'AI...',
    helpUrl: 'https://aistudio.google.com/apikey',
  },
];

type KeyStatus = 'empty' | 'saved' | 'testing' | 'valid' | 'invalid' | 'error';

interface ProviderState {
  key: string;
  status: KeyStatus;
  masked: string;
}

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onClose }) => {
  const [providers, setProviders] = useState<Record<string, ProviderState>>({});
  const [activeTab, setActiveTab] = useState<'keys' | 'about'>('keys');

  // Load existing keys on mount
  useEffect(() => {
    if (!open) return;

    const loadKeys = async () => {
      const state: Record<string, ProviderState> = {};
      for (const p of PROVIDERS) {
        try {
          const existing = await invoke<string | null>('get_api_key', { provider: p.id });
          if (existing) {
            state[p.id] = {
              key: '',
              status: 'saved',
              masked: existing.slice(0, 7) + '...' + existing.slice(-4),
            };
          } else {
            state[p.id] = { key: '', status: 'empty', masked: '' };
          }
        } catch {
          state[p.id] = { key: '', status: 'empty', masked: '' };
        }
      }
      setProviders(state);
    };

    loadKeys();
  }, [open]);

  const handleSaveKey = useCallback(async (providerId: string) => {
    const current = providers[providerId];
    if (!current?.key.trim()) return;

    setProviders(prev => ({
      ...prev,
      [providerId]: { ...prev[providerId], status: 'testing' },
    }));

    try {
      // Test the key first
      const valid = await invoke<boolean>('test_api_key', {
        provider: providerId,
        key: current.key.trim(),
      });

      if (valid) {
        // Store in keychain
        await invoke('store_api_key', {
          provider: providerId,
          key: current.key.trim(),
        });

        setProviders(prev => ({
          ...prev,
          [providerId]: {
            key: '',
            status: 'valid',
            masked: current.key.trim().slice(0, 7) + '...' + current.key.trim().slice(-4),
          },
        }));

        // Reset to "saved" after 2s
        setTimeout(() => {
          setProviders(prev => ({
            ...prev,
            [providerId]: { ...prev[providerId], status: 'saved' },
          }));
        }, 2000);
      } else {
        setProviders(prev => ({
          ...prev,
          [providerId]: { ...prev[providerId], status: 'invalid' },
        }));
      }
    } catch {
      setProviders(prev => ({
        ...prev,
        [providerId]: { ...prev[providerId], status: 'error' },
      }));
    }
  }, [providers]);

  const handleDeleteKey = useCallback(async (providerId: string) => {
    try {
      await invoke('delete_api_key', { provider: providerId });
      setProviders(prev => ({
        ...prev,
        [providerId]: { key: '', status: 'empty', masked: '' },
      }));
    } catch {
      // Key might not exist, that's fine
    }
  }, []);

  const handleKeyChange = useCallback((providerId: string, value: string) => {
    setProviders(prev => ({
      ...prev,
      [providerId]: { ...prev[providerId], key: value, status: value ? 'empty' : prev[providerId].status },
    }));
  }, []);

  if (!open) return null;

  const statusBadge = (status: KeyStatus) => {
    switch (status) {
      case 'saved': return <span className="text-xs px-2 py-0.5 bg-green-900/50 text-green-400 rounded-full">Saved</span>;
      case 'testing': return <span className="text-xs px-2 py-0.5 bg-yellow-900/50 text-yellow-400 rounded-full animate-pulse">Testing...</span>;
      case 'valid': return <span className="text-xs px-2 py-0.5 bg-green-900/50 text-green-300 rounded-full">Valid</span>;
      case 'invalid': return <span className="text-xs px-2 py-0.5 bg-red-900/50 text-red-400 rounded-full">Invalid key</span>;
      case 'error': return <span className="text-xs px-2 py-0.5 bg-red-900/50 text-red-400 rounded-full">Error</span>;
      default: return <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-400 rounded-full">Not configured</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Dialog */}
      <div
        className="relative bg-gray-800 rounded-lg shadow-2xl border border-gray-600 w-[520px] max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-gray-100">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 p-1 rounded hover:bg-gray-700 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 px-5">
          <button
            onClick={() => setActiveTab('keys')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'keys'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            API Keys
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'about'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            About
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'keys' && (
            <div className="space-y-5">
              <p className="text-sm text-gray-400">
                API keys are stored securely in your system keychain. They never leave your machine.
              </p>

              {PROVIDERS.map(provider => {
                const state = providers[provider.id] ?? { key: '', status: 'empty' as KeyStatus, masked: '' };
                return (
                  <div key={provider.id} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-200">{provider.label}</label>
                      {statusBadge(state.status)}
                    </div>

                    {state.status === 'saved' || state.status === 'valid' ? (
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs text-gray-400 bg-gray-900 px-3 py-2 rounded border border-gray-700 font-mono">
                          {state.masked}
                        </code>
                        <button
                          onClick={() => handleDeleteKey(provider.id)}
                          className="px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="password"
                          value={state.key}
                          onChange={e => handleKeyChange(provider.id, e.target.value)}
                          placeholder={provider.placeholder}
                          className="flex-1 text-sm bg-gray-900 text-gray-100 px-3 py-2 rounded border border-gray-600 outline-none focus:border-blue-500 font-mono placeholder-gray-600"
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveKey(provider.id);
                          }}
                        />
                        <button
                          onClick={() => handleSaveKey(provider.id)}
                          disabled={!state.key.trim() || state.status === 'testing'}
                          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded font-medium transition-colors"
                        >
                          {state.status === 'testing' ? '...' : 'Save'}
                        </button>
                      </div>
                    )}

                    <a
                      href={provider.helpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block"
                      onClick={e => {
                        e.preventDefault();
                        // Open in system browser
                        window.open(provider.helpUrl, '_blank');
                      }}
                    >
                      Get API key &rarr;
                    </a>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <h3 className="text-xl font-bold text-gray-100">HTML Wizard</h3>
                <p className="text-sm text-gray-400 mt-1">v0.1.0</p>
              </div>
              <p className="text-sm text-gray-400">
                AI-powered visual HTML/CSS/JS editor built with Tauri 2.0. Click-to-edit elements in a live preview, get AI assistance for code changes, and manage web projects with a professional IDE layout.
              </p>
              <div className="text-xs text-gray-500 space-y-1 pt-2 border-t border-gray-700">
                <p>Tauri 2.0 + React + TypeScript + Rust</p>
                <p>API keys stored in system keychain</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsDialog;
