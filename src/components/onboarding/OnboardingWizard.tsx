import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { TEMPLATES, ProjectTemplate } from './templates';
import { useProject } from '../../hooks/useProject';

// ── Types ──────────────────────────────────────────────────────────────────

interface OnboardingWizardProps {
  open: boolean;
  onComplete: () => void;
}

type KeyStatus = 'empty' | 'saved' | 'testing' | 'valid' | 'invalid' | 'error';

interface ProviderState {
  key: string;
  status: KeyStatus;
  masked: string;
}

interface ProviderKeyConfig {
  id: string;
  label: string;
  placeholder: string;
  helpUrl: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

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

const TOTAL_STEPS = 4;

// ── Tour overlay data ──────────────────────────────────────────────────────

const TOUR_STEPS = [
  {
    title: 'File Explorer',
    description: 'Browse and open any file in your project from the left sidebar.',
    position: 'left-4 top-1/4',
    highlight: 'left-0 top-0 w-72 h-full',
  },
  {
    title: 'Live Preview',
    description: 'See your page rendered live in the center panel. Click any element to inspect or edit it.',
    position: 'left-1/2 top-8 -translate-x-1/2',
    highlight: '',
  },
  {
    title: 'Properties & AI',
    description: 'The right sidebar shows element properties and lets you send AI prompts to modify your code.',
    position: 'right-4 top-1/4',
    highlight: '',
  },
  {
    title: 'Console & Output',
    description: 'The bottom panel shows console output, errors, and the raw source of the active file.',
    position: 'left-1/2 bottom-8 -translate-x-1/2',
    highlight: '',
  },
];

// ── Sub-components ─────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: KeyStatus }> = ({ status }) => {
  switch (status) {
    case 'saved':  return <span className="text-xs px-2 py-0.5 bg-green-900/50 text-green-400 rounded-full">Saved</span>;
    case 'testing': return <span className="text-xs px-2 py-0.5 bg-yellow-900/50 text-yellow-400 rounded-full animate-pulse">Testing…</span>;
    case 'valid':  return <span className="text-xs px-2 py-0.5 bg-green-900/50 text-green-300 rounded-full">Valid</span>;
    case 'invalid': return <span className="text-xs px-2 py-0.5 bg-red-900/50 text-red-400 rounded-full">Invalid key</span>;
    case 'error':  return <span className="text-xs px-2 py-0.5 bg-red-900/50 text-red-400 rounded-full">Error</span>;
    default:       return <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-400 rounded-full">Not configured</span>;
  }
};

// ── Step 1: Welcome ────────────────────────────────────────────────────────

const StepWelcome: React.FC<{ onNext: () => void }> = ({ onNext }) => (
  <div className="flex flex-col items-center text-center px-6 py-8 space-y-6">
    {/* Logo / icon */}
    <div className="w-20 h-20 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/40">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <path d="M8 32L20 8L32 32" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 24H28" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <circle cx="20" cy="34" r="2" fill="#60a5fa" />
      </svg>
    </div>

    <div>
      <h1 className="text-3xl font-extrabold text-gray-100 tracking-tight">HTML Wizard</h1>
      <p className="mt-2 text-blue-400 font-medium">AI-powered visual HTML editor</p>
    </div>

    <ul className="space-y-3 text-left w-full max-w-sm">
      {[
        { icon: '◈', label: 'Visual editing', desc: 'Click any element to inspect and edit it in place' },
        { icon: '◉', label: 'AI assistance', desc: 'Let Claude, OpenAI, or Gemini suggest and apply changes' },
        { icon: '◎', label: 'Live preview',  desc: 'See your changes rendered instantly as you work' },
      ].map(({ icon, label, desc }) => (
        <li key={label} className="flex items-start gap-3 bg-gray-700/40 rounded-xl px-4 py-3">
          <span className="text-blue-400 text-lg leading-none mt-0.5">{icon}</span>
          <div>
            <span className="text-gray-100 font-semibold text-sm">{label}</span>
            <p className="text-gray-400 text-xs mt-0.5">{desc}</p>
          </div>
        </li>
      ))}
    </ul>

    <button
      onClick={onNext}
      className="w-full max-w-sm py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-blue-600/30"
    >
      Get Started
    </button>
  </div>
);

// ── Step 2: API Keys ───────────────────────────────────────────────────────

const StepApiKeys: React.FC<{ onSkip: () => void; onNext: () => void }> = ({ onSkip, onNext }) => {
  const [providers, setProviders] = useState<Record<string, ProviderState>>({});

  useEffect(() => {
    const loadKeys = async () => {
      const state: Record<string, ProviderState> = {};
      for (const p of PROVIDERS) {
        try {
          const existing = await invoke<string | null>('get_api_key', { provider: p.id });
          state[p.id] = existing
            ? { key: '', status: 'saved', masked: existing.slice(0, 7) + '...' + existing.slice(-4) }
            : { key: '', status: 'empty', masked: '' };
        } catch {
          state[p.id] = { key: '', status: 'empty', masked: '' };
        }
      }
      setProviders(state);
    };
    loadKeys();
  }, []);

  const handleKeyChange = useCallback((id: string, value: string) => {
    setProviders(prev => ({
      ...prev,
      [id]: { ...prev[id], key: value, status: value ? 'empty' : prev[id]?.status ?? 'empty' },
    }));
  }, []);

  const handleSaveKey = useCallback(async (providerId: string) => {
    const current = providers[providerId];
    if (!current?.key.trim()) return;

    setProviders(prev => ({ ...prev, [providerId]: { ...prev[providerId], status: 'testing' } }));

    try {
      const valid = await invoke<boolean>('test_api_key', { provider: providerId, key: current.key.trim() });
      if (valid) {
        await invoke('store_api_key', { provider: providerId, key: current.key.trim() });
        setProviders(prev => ({
          ...prev,
          [providerId]: {
            key: '',
            status: 'valid',
            masked: current.key.trim().slice(0, 7) + '...' + current.key.trim().slice(-4),
          },
        }));
        setTimeout(() => {
          setProviders(prev => ({ ...prev, [providerId]: { ...prev[providerId], status: 'saved' } }));
        }, 2000);
      } else {
        setProviders(prev => ({ ...prev, [providerId]: { ...prev[providerId], status: 'invalid' } }));
      }
    } catch {
      setProviders(prev => ({ ...prev, [providerId]: { ...prev[providerId], status: 'error' } }));
    }
  }, [providers]);

  const anySaved = PROVIDERS.some(p => {
    const s = providers[p.id]?.status;
    return s === 'saved' || s === 'valid';
  });

  return (
    <div className="flex flex-col px-6 py-6 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-100">Configure AI Providers</h2>
        <p className="text-sm text-gray-400 mt-1">
          API keys are stored securely in your system keychain and never leave your machine.
          You can add or change these later in Settings.
        </p>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto pr-1">
        {PROVIDERS.map(provider => {
          const state = providers[provider.id] ?? { key: '', status: 'empty' as KeyStatus, masked: '' };
          return (
            <div key={provider.id} className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-200">{provider.label}</label>
                <StatusBadge status={state.status} />
              </div>

              {(state.status === 'saved' || state.status === 'valid') ? (
                <code className="block text-xs text-gray-400 bg-gray-900 px-3 py-2 rounded border border-gray-700 font-mono">
                  {state.masked}
                </code>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={state.key}
                    onChange={e => handleKeyChange(provider.id, e.target.value)}
                    placeholder={provider.placeholder}
                    className="flex-1 text-sm bg-gray-900 text-gray-100 px-3 py-2 rounded border border-gray-600 outline-none focus:border-blue-500 font-mono placeholder-gray-600"
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveKey(provider.id); }}
                  />
                  <button
                    onClick={() => handleSaveKey(provider.id)}
                    disabled={!state.key.trim() || state.status === 'testing'}
                    className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors"
                  >
                    {state.status === 'testing' ? '…' : 'Save'}
                  </button>
                </div>
              )}

              <a
                href={provider.helpUrl}
                className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block"
                onClick={e => { e.preventDefault(); window.open(provider.helpUrl, '_blank'); }}
              >
                Get API key &rarr;
              </a>
            </div>
          );
        })}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onSkip}
          className="flex-1 py-2.5 text-sm text-gray-400 hover:text-gray-200 border border-gray-600 hover:border-gray-500 rounded-xl transition-colors"
        >
          Skip for now
        </button>
        <button
          onClick={onNext}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
            anySaved
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow shadow-blue-600/30'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
};

// ── Step 3: Open Project ───────────────────────────────────────────────────

interface StepOpenProjectProps {
  onNext: () => void;
  onComplete: () => void;
}

const StepOpenProject: React.FC<StepOpenProjectProps> = ({ onNext, onComplete }) => {
  const { openProject } = useProject();
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOpenExisting = async () => {
    setError(null);
    try {
      const selected = await open({ directory: true, multiple: false, title: 'Open Project Folder' });
      if (!selected) return;
      await openProject(selected as string);
      onComplete();
    } catch (err) {
      setError(String(err));
    }
  };

  const handleCreateFromTemplate = async (template: ProjectTemplate) => {
    setError(null);
    setCreating(template.id);
    try {
      const selected = await open({ directory: true, multiple: false, title: 'Choose Folder for New Project' });
      if (!selected) { setCreating(null); return; }

      const dir = selected as string;
      for (const file of template.files) {
        const filePath = `${dir}/${file.path}`;
        await invoke('create_file', { path: filePath, content: file.content });
      }
      await openProject(dir);
      onComplete();
    } catch (err) {
      setError(String(err));
    } finally {
      setCreating(null);
    }
  };

  return (
    <div className="flex flex-col px-6 py-6 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-100">Open a Project</h2>
        <p className="text-sm text-gray-400 mt-1">Open an existing folder or start from one of our templates.</p>
      </div>

      {/* Open existing */}
      <button
        onClick={handleOpenExisting}
        className="flex items-center gap-4 w-full p-4 bg-gray-700/40 hover:bg-gray-700/70 border border-gray-600 hover:border-blue-500 rounded-xl transition-all text-left group"
      >
        <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600/40 transition-colors">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-blue-400">
            <path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-100">Open Existing Project</p>
          <p className="text-xs text-gray-400 mt-0.5">Choose a folder already on your machine</p>
        </div>
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-700" />
        <span className="text-xs text-gray-500">or start from a template</span>
        <div className="flex-1 h-px bg-gray-700" />
      </div>

      {/* Template cards */}
      <div className="space-y-3 overflow-y-auto max-h-64 pr-1">
        {TEMPLATES.map(template => (
          <div
            key={template.id}
            className="flex items-center justify-between p-4 bg-gray-700/40 border border-gray-600 hover:border-blue-500 rounded-xl transition-all"
          >
            <div>
              <p className="text-sm font-semibold text-gray-100">{template.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{template.description}</p>
            </div>
            <button
              onClick={() => handleCreateFromTemplate(template)}
              disabled={creating !== null}
              className="ml-4 px-4 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors flex-shrink-0"
            >
              {creating === template.id ? 'Creating…' : 'Create'}
            </button>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-900/20 px-3 py-2 rounded-lg border border-red-800">
          {error}
        </p>
      )}

      <button
        onClick={onNext}
        className="w-full py-2.5 text-sm text-gray-400 hover:text-gray-200 border border-gray-600 hover:border-gray-500 rounded-xl transition-colors"
      >
        Skip — I'll open a project later
      </button>
    </div>
  );
};

// ── Step 4: Quick Tour ─────────────────────────────────────────────────────

const StepQuickTour: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [tourIndex, setTourIndex] = useState(0);
  const current = TOUR_STEPS[tourIndex];
  const isLast = tourIndex === TOUR_STEPS.length - 1;

  return (
    <div className="flex flex-col px-6 py-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-100">Quick Tour</h2>
        <p className="text-sm text-gray-400 mt-1">A brief overview of the HTML Wizard interface.</p>
      </div>

      {/* Tour illustration */}
      <div className="relative bg-gray-900 rounded-xl border border-gray-700 h-48 overflow-hidden">
        {/* Fake layout panels */}
        <div className="absolute inset-0 flex">
          <div className="w-1/4 border-r border-gray-700 bg-gray-800/60 flex items-center justify-center">
            <span className="text-xs text-gray-500 rotate-0">Files</span>
          </div>
          <div className="flex-1 flex flex-col">
            <div className="flex-1 bg-gray-900/80 flex items-center justify-center border-b border-gray-700">
              <span className="text-xs text-gray-500">Preview</span>
            </div>
            <div className="h-12 bg-gray-800/60 flex items-center justify-center">
              <span className="text-xs text-gray-500">Console</span>
            </div>
          </div>
          <div className="w-1/4 border-l border-gray-700 bg-gray-800/60 flex items-center justify-center">
            <span className="text-xs text-gray-500">Properties</span>
          </div>
        </div>

        {/* Active highlight overlay */}
        <div
          key={tourIndex}
          className={`absolute inset-0 pointer-events-none transition-all duration-500 ${
            tourIndex === 0 ? 'bg-blue-500/10 border-l-2 border-blue-400' :
            tourIndex === 1 ? 'bg-blue-500/10 border-2 border-blue-400 m-4 rounded-lg' :
            tourIndex === 2 ? 'bg-blue-500/10 border-r-2 border-blue-400' :
            'bg-blue-500/10 border-b-2 border-blue-400'
          }`}
        />
      </div>

      {/* Tour step info */}
      <div className="bg-blue-600/10 border border-blue-600/30 rounded-xl px-4 py-4">
        <p className="text-sm font-semibold text-blue-300">{current.title}</p>
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">{current.description}</p>
      </div>

      {/* Step dots */}
      <div className="flex justify-center gap-2">
        {TOUR_STEPS.map((_, i) => (
          <button
            key={i}
            onClick={() => setTourIndex(i)}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === tourIndex ? 'bg-blue-500' : 'bg-gray-600 hover:bg-gray-500'
            }`}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {tourIndex > 0 && (
          <button
            onClick={() => setTourIndex(i => i - 1)}
            className="px-5 py-2.5 text-sm text-gray-400 hover:text-gray-200 border border-gray-600 hover:border-gray-500 rounded-xl transition-colors"
          >
            Back
          </button>
        )}
        {isLast ? (
          <button
            onClick={onComplete}
            className="flex-1 py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors shadow shadow-blue-600/30"
          >
            Got it!
          </button>
        ) : (
          <button
            onClick={() => setTourIndex(i => i + 1)}
            className="flex-1 py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors shadow shadow-blue-600/30"
          >
            Next
          </button>
        )}
      </div>

      <button
        onClick={onComplete}
        className="text-xs text-center text-gray-500 hover:text-gray-300 transition-colors -mt-2"
      >
        Skip tour
      </button>
    </div>
  );
};

// ── Main Wizard ────────────────────────────────────────────────────────────

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ open: isOpen, onComplete }) => {
  const [step, setStep] = useState(1);

  // Reset to step 1 whenever wizard reopens
  useEffect(() => {
    if (isOpen) setStep(1);
  }, [isOpen]);

  if (!isOpen) return null;

  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS));

  const progressPct = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Dialog */}
      <div className="relative bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-[520px] max-h-[90vh] flex flex-col overflow-hidden">
        {/* Top progress bar */}
        <div className="h-1 bg-gray-700 flex-shrink-0">
          <div
            className="h-full bg-blue-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-between px-6 pt-4 pb-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div
                key={i}
                className={`transition-all duration-300 rounded-full ${
                  i + 1 === step
                    ? 'w-6 h-2 bg-blue-500'
                    : i + 1 < step
                    ? 'w-2 h-2 bg-blue-700'
                    : 'w-2 h-2 bg-gray-600'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-500">{step} / {TOTAL_STEPS}</span>
        </div>

        {/* Step content — scrollable */}
        <div className="flex-1 overflow-y-auto">
          {step === 1 && <StepWelcome onNext={next} />}
          {step === 2 && <StepApiKeys onSkip={next} onNext={next} />}
          {step === 3 && <StepOpenProject onNext={next} onComplete={onComplete} />}
          {step === 4 && <StepQuickTour onComplete={onComplete} />}
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
