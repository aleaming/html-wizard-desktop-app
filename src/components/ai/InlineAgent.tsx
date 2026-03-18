import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ElementContext } from '../../types';
import { useAI } from '../../hooks/useAI';
import DiffPreview from './DiffPreview';

// Utility: extract first code block from markdown
function extractCodeBlock(text: string): { code: string; language: string } | null {
  const match = text.match(/```(\w*)\n?([\s\S]*?)```/);
  if (match) {
    return { language: match[1] || 'html', code: match[2] };
  }
  return null;
}

const QUICK_PROMPTS = [
  'Make it more prominent',
  'Fix the spacing',
  'Make it responsive',
];

interface InlineAgentProps {
  position: { x: number; y: number };
  targetSelector: string;
  elementContext: ElementContext | null;
  onClose: () => void;
  onAcceptChange: (code: string, language: string) => void;
}

const InlineAgent: React.FC<InlineAgentProps> = ({
  position,
  targetSelector,
  elementContext,
  onClose,
  onAcceptChange,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [proposedChange, setProposedChange] = useState<{ code: string; language: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage } = useAI();

  // Click outside to close
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [onClose]);

  // Auto-focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Clamp position to viewport
  const clampedX = Math.min(Math.max(position.x, 8), window.innerWidth - 328);
  const clampedY = Math.min(Math.max(position.y, 8), window.innerHeight - 308);

  const handleSend = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return;

    setError(null);
    setIsLoading(true);
    setProposedChange(null);

    try {
      const response = await sendMessage(prompt, elementContext ?? undefined);
      const extracted = extractCodeBlock(response.content);
      if (extracted) {
        setProposedChange(extracted);
      } else {
        // No code block found — treat entire response as proposed HTML
        setProposedChange({ code: response.content, language: 'html' });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI request failed');
    } finally {
      setIsLoading(false);
    }
  }, [sendMessage, elementContext]);

  const handleAccept = useCallback(() => {
    if (proposedChange) {
      onAcceptChange(proposedChange.code, proposedChange.language);
      setProposedChange(null);
      onClose();
    }
  }, [proposedChange, onAcceptChange, onClose]);

  const handleReject = useCallback(() => {
    setProposedChange(null);
  }, []);

  const handleIterate = useCallback((feedback: string) => {
    handleSend(`Iterate on the previous suggestion: ${feedback}`);
  }, [handleSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend(inputValue);
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 80)}px`;
  };

  return (
    <div
      ref={containerRef}
      className="fixed w-80 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50"
      style={{ left: clampedX, top: clampedY }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-100">AI: Edit Element</h3>
          <p className="text-[10px] text-gray-400 truncate" title={targetSelector}>
            {targetSelector}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-200 ml-2 flex-shrink-0"
          aria-label="Close inline agent"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Input area */}
      <div className="px-3 py-2">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Describe the change you want..."
            disabled={isLoading}
            className="flex-1 bg-gray-900 text-gray-200 text-sm rounded px-2 py-1.5 resize-none border border-gray-600 focus:border-blue-500 focus:outline-none disabled:opacity-50"
            rows={1}
          />
          <button
            onClick={() => handleSend(inputValue)}
            disabled={isLoading || !inputValue.trim()}
            className="px-2 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            aria-label="Send prompt"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>

        {/* Quick prompts */}
        <div className="flex flex-wrap gap-1 mt-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => setInputValue(prompt)}
              disabled={isLoading}
              className="text-[10px] px-2 py-0.5 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 hover:text-gray-100 disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center gap-1 py-3 px-3">
          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mx-3 mb-2 px-2 py-1.5 bg-red-900/30 border border-red-700 rounded text-red-300 text-xs">
          {error}
        </div>
      )}

      {/* Diff Preview */}
      {proposedChange && (
        <div className="border-t border-gray-700 px-3 py-2">
          <DiffPreview
            original={elementContext?.html ?? ''}
            proposed={proposedChange.code}
            language={proposedChange.language}
            onAccept={() => handleAccept()}
            onReject={handleReject}
            onIterate={handleIterate}
          />
        </div>
      )}
    </div>
  );
};

export default InlineAgent;
