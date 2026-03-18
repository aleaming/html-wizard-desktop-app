import React, { useRef, useCallback } from 'react';
import { useAppStore } from '../../store';
import { useAI } from '../../hooks/useAI';
import { ChatMessage } from '../../types';
import ChatPanel from '../ai/ChatPanel';
import ProviderSelector from '../ai/ProviderSelector';

interface LeftSidebarProps {
  width: number;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ width }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef('');

  // Store state
  const activeConversationId = useAppStore((s) => s.activeConversationId);
  const activeProvider = useAppStore((s) => s.activeProvider);
  const isStreaming = useAppStore((s) => s.isStreaming);
  const addConversation = useAppStore((s) => s.addConversation);
  const addMessage = useAppStore((s) => s.addMessage);
  const setActiveProvider = useAppStore((s) => s.setActiveProvider);
  const getActiveConversation = useAppStore((s) => s.getActiveConversation);

  // AI hook
  const {
    sendStreamingMessage,
    cancelStream,
    streamingContent,
    providerHealth,
    isOnline,
    costEstimate,
    sessionUsage,
  } = useAI();

  const activeConversation = getActiveConversation();
  const messages: ChatMessage[] = activeConversation?.messages ?? [];

  const ensureConversation = useCallback((): string => {
    if (activeConversationId) return activeConversationId;

    const id = crypto.randomUUID();
    addConversation({
      id,
      messages: [],
      projectRoot: '',
      createdAt: Date.now(),
    });
    return id;
  }, [activeConversationId, addConversation]);

  const handleSend = useCallback(async () => {
    const trimmed = inputRef.current.trim();
    if (!trimmed || isStreaming) return;

    const conversationId = ensureConversation();

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };
    addMessage(conversationId, userMessage);

    // Clear input
    inputRef.current = '';
    if (textareaRef.current) {
      textareaRef.current.value = '';
      textareaRef.current.style.height = 'auto';
    }

    // Send to AI and get response
    const response = await sendStreamingMessage(trimmed, conversationId);
    if (response) {
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.content,
        timestamp: Date.now(),
      };
      addMessage(conversationId, assistantMessage);
    }
  }, [isStreaming, ensureConversation, addMessage, sendStreamingMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      inputRef.current = e.target.value;
      const el = e.target;
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    },
    [],
  );

  const handleApplyCode = useCallback((code: string, language: string) => {
    window.dispatchEvent(
      new CustomEvent('ai-apply-code', { detail: { code, language } }),
    );
  }, []);

  const handleProviderChange = useCallback(
    (provider: typeof activeProvider) => {
      setActiveProvider(provider);
    },
    [setActiveProvider],
  );

  return (
    <div
      className="h-full flex flex-col bg-gray-800 border-r border-gray-700"
      style={{ width }}
    >
      {/* Header */}
      <div className="flex items-center px-3 py-2 border-b border-gray-700">
        <span className="text-sm font-semibold text-gray-100">HTML Wizard AI</span>
      </div>

      {/* Provider Selector */}
      <ProviderSelector
        activeProvider={activeProvider}
        isOnline={isOnline}
        providerHealth={providerHealth}
        costEstimate={costEstimate}
        sessionUsage={sessionUsage}
        onProviderChange={handleProviderChange}
      />

      {/* Chat Panel — takes remaining vertical space */}
      <ChatPanel
        messages={messages}
        streamingContent={streamingContent}
        isStreaming={isStreaming}
        onApplyCode={handleApplyCode}
      />

      {/* Input Area */}
      <div className="border-t border-gray-700 p-2">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            rows={1}
            className="flex-1 bg-gray-900 text-gray-100 text-sm rounded px-3 py-2 resize-none outline-none border border-gray-600 focus:border-blue-500 placeholder-gray-500"
            style={{ maxHeight: 120 }}
          />
          {isStreaming ? (
            <button
              onClick={cancelStream}
              className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded font-medium transition-colors"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={handleSend}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded font-medium transition-colors"
            >
              Send
            </button>
          )}
        </div>
        <p className="text-[10px] text-gray-500 mt-1 px-1">
          {typeof navigator !== 'undefined' && navigator.platform?.includes('Mac')
            ? '\u2318'
            : 'Ctrl'}
          +Enter to send
        </p>
      </div>
    </div>
  );
};

export default LeftSidebar;
