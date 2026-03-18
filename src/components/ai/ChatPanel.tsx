import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '../../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  streamingContent: string;
  isStreaming: boolean;
  onApplyCode?: (code: string, language: string) => void;
}

interface CodeBlock {
  language: string;
  code: string;
}

function parseCodeBlocks(content: string): (string | CodeBlock)[] {
  const parts: (string | CodeBlock)[] = [];
  const regex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    parts.push({ language: match[1] || 'text', code: match[2] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts;
}

const APPLY_LANGUAGES = new Set(['html', 'css', 'htm']);

function CodeBlockRenderer({
  block,
  onApplyCode,
}: {
  block: CodeBlock;
  onApplyCode?: (code: string, language: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(block.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="my-2 rounded overflow-hidden">
      <div className="flex items-center justify-between bg-gray-800 px-3 py-1">
        <span className="text-[10px] text-gray-400 uppercase">{block.language}</span>
        <div className="flex items-center gap-1">
          {APPLY_LANGUAGES.has(block.language) && onApplyCode && (
            <button
              onClick={() => onApplyCode(block.code, block.language)}
              className="text-[10px] text-blue-400 hover:text-blue-300 px-1.5 py-0.5 rounded hover:bg-gray-700"
            >
              Apply
            </button>
          )}
          <button
            onClick={handleCopy}
            className="text-[10px] text-gray-400 hover:text-gray-200 px-1.5 py-0.5 rounded hover:bg-gray-700"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
      <pre className="bg-gray-900 font-mono text-xs p-3 overflow-x-auto">
        <code>{block.code}</code>
      </pre>
    </div>
  );
}

function MessageContent({
  content,
  onApplyCode,
}: {
  content: string;
  onApplyCode?: (code: string, language: string) => void;
}) {
  const parts = parseCodeBlocks(content);

  return (
    <>
      {parts.map((part, i) =>
        typeof part === 'string' ? (
          <span key={i} className="whitespace-pre-wrap">{part}</span>
        ) : (
          <CodeBlockRenderer key={i} block={part} onApplyCode={onApplyCode} />
        )
      )}
    </>
  );
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  streamingContent,
  isStreaming,
  onApplyCode,
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="h-full flex items-center justify-center">
          <p className="text-gray-500 text-sm text-center">
            Ask me to modify elements,<br />generate code, or explain styles.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-4">
      <div className="space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={
              msg.role === 'user'
                ? 'bg-blue-600 text-white ml-4 px-3 py-2 rounded-lg text-sm'
                : 'bg-gray-700 text-gray-200 mr-2 rounded-lg text-sm px-3 py-2'
            }
          >
            {msg.role === 'assistant' ? (
              <MessageContent content={msg.content} onApplyCode={onApplyCode} />
            ) : (
              <span className="whitespace-pre-wrap">{msg.content}</span>
            )}
          </div>
        ))}

        {isStreaming && streamingContent && (
          <div className="bg-gray-700 text-gray-200 mr-2 rounded-lg text-sm px-3 py-2">
            <span className="whitespace-pre-wrap">{streamingContent}</span>
            <span className="inline-block w-1.5 h-4 bg-blue-400 ml-0.5 align-middle animate-pulse" />
          </div>
        )}

        {isStreaming && !streamingContent && <LoadingDots />}

        <div ref={chatEndRef} />
      </div>
    </div>
  );
};

export default ChatPanel;
