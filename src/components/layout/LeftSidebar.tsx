import React, { useState, useRef, useEffect } from 'react';

interface LeftSidebarProps {
  width: number;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ width }) => {
  const [provider, setProvider] = useState('claude');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const providers = [
    { id: 'claude', label: 'Claude' },
    { id: 'gemini', label: 'Gemini' },
    { id: 'openai', label: 'OpenAI' },
  ];

  const selectedProvider = providers.find(p => p.id === provider);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    setMessages(prev => [...prev, { role: 'user', content: trimmed }]);
    setMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  return (
    <div
      className="h-full flex flex-col bg-gray-800 border-r border-gray-700"
      style={{ width }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <span className="text-sm font-semibold text-gray-100">HTML Wizard AI</span>
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-700"
          >
            {selectedProvider?.label}
            <span className="text-[10px]">&#9660;</span>
          </button>
          {showDropdown && (
            <div className="absolute right-0 top-full mt-1 bg-gray-700 border border-gray-600 rounded shadow-lg z-50 min-w-[120px]">
              {providers.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setProvider(p.id); setShowDropdown(false); }}
                  className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-600 ${
                    p.id === provider ? 'text-blue-400' : 'text-gray-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-500 text-sm text-center">
              Open a project to<br />start chatting
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`text-sm px-3 py-2 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white ml-4'
                    : 'bg-gray-700 text-gray-200 mr-4'
                }`}
              >
                {msg.content}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-700 p-2">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            rows={1}
            className="flex-1 bg-gray-900 text-gray-100 text-sm rounded px-3 py-2 resize-none outline-none border border-gray-600 focus:border-blue-500 placeholder-gray-500"
            style={{ maxHeight: 120 }}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded font-medium transition-colors"
          >
            Send
          </button>
        </div>
        <p className="text-[10px] text-gray-500 mt-1 px-1">
          {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to send
        </p>
      </div>
    </div>
  );
};

export default LeftSidebar;
