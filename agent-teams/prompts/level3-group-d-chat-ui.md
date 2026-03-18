# Agent Group D (Level 3): Frontend Chat Panel & Provider Selector

You are a builder agent responsible for the chat UI components and LeftSidebar refactor. You produce complete, production-ready React/TypeScript with Tailwind CSS — no pseudocode, no placeholders.

## Context

Level 1 created a basic `LeftSidebar.tsx` with local state and no real AI integration. Level 2 added visual editor components. Your job is to create the proper chat panel, provider selector, and diff preview components, then refactor `LeftSidebar` to use them with the real `useAI` hook.

## File Ownership (ONLY touch these files)
- `src/components/layout/LeftSidebar.tsx` (MODIFY — refactor to use new components)
- `src/components/ai/ChatPanel.tsx` (CREATE)
- `src/components/ai/ProviderSelector.tsx` (CREATE)
- `src/components/ai/DiffPreview.tsx` (CREATE)
- `src/components/ai/index.ts` (CREATE — barrel exports)

## DO NOT touch RightSidebar.tsx, CenterPanel.tsx, or any files in src/store, src/hooks, or src/types. Group E and F own those.

---

## CRITICAL: Read Before Writing

Read the existing `src/components/layout/LeftSidebar.tsx` in full before modifying it. Preserve the outer container div structure and the `width` prop. You are replacing local state with the `useAI` hook, not rewriting the layout from scratch.

---

## Task D1: Create ChatPanel.tsx

CREATE `src/components/ai/ChatPanel.tsx`.

The ChatPanel is a pure display component. It receives messages and streaming state as props and emits events upward. It does not call `useAI` directly — that is LeftSidebar's responsibility.

### Props interface:
```typescript
interface ChatPanelProps {
  messages: ChatMessage[];         // from src/types
  streamingContent: string;        // current partial stream text
  isStreaming: boolean;
  onApplyCode?: (code: string, language: string) => void;
}
```

### Features:
1. **Empty state**: centered placeholder text "Ask me to modify elements, generate code, or explain styles."
2. **User message bubbles**: `bg-blue-600 text-white ml-4 px-3 py-2 rounded-lg text-sm`
3. **Assistant message bubbles**: `bg-gray-700 text-gray-200 mr-2 rounded-lg text-sm`
4. **Code block detection**: Parse triple-backtick fenced blocks from assistant messages using a regex. Extract `(language, code)` pairs.
5. **Code block renderer**: Shows language label, a Copy button (copies to clipboard, shows "Copied!" for 1.5s), and an Apply button (only for html/css/htm — calls `onApplyCode`). Code displayed in `<pre>` with `bg-gray-900 font-mono text-xs`.
6. **Streaming bubble**: When `isStreaming && streamingContent`, show a bubble with the partial text and a blinking cursor: `<span className="inline-block w-1.5 h-4 bg-blue-400 ml-0.5 align-middle animate-pulse" />`
7. **Loading dots**: When `isStreaming && !streamingContent`, show three bouncing gray dots with staggered `animationDelay` (0ms, 150ms, 300ms).
8. **Auto-scroll**: `useEffect` that calls `chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })` whenever `messages` or `streamingContent` changes.

Import `ChatMessage` from `'../../types'`.

---

## Task D2: Create ProviderSelector.tsx

CREATE `src/components/ai/ProviderSelector.tsx`.

### Props interface:
```typescript
interface ProviderSelectorProps {
  activeProvider: AIProviderType;
  isOnline: boolean;
  providerHealth: Record<string, ProviderHealth>;
  costEstimate: CostEstimate | null;
  sessionUsage: SessionUsage;
  onProviderChange: (provider: AIProviderType) => void;
}
```

### Provider options (hardcoded):
```typescript
const PROVIDER_OPTIONS = [
  { id: 'claude' as AIProviderType, label: 'Claude', model: 'claude-sonnet-4' },
  { id: 'gemini' as AIProviderType, label: 'Gemini', model: 'gemini-2.5-pro' },
  { id: 'openai' as AIProviderType, label: 'GPT-4o', model: 'gpt-4o' },
];
```

### Features:
1. **Health dot**: A `w-1.5 h-1.5 rounded-full` span. Green (`bg-green-400`) if `health.isHealthy`. Red (`bg-red-400`) if not. Gray (`bg-gray-500`) if offline or health unknown.
2. **Dropdown**: Click the active provider to open a list. Each row shows health dot + label + model + pricing from `getProviderPricing()`. Active provider shown in blue. Click row to switch provider and close dropdown.
3. **Offline badge**: If `!isOnline`, show a small `"OFFLINE"` badge in gray next to the provider name.
4. **Cost/usage display**: A small button showing either `~${formatCost(...)}` (if costEstimate is set) or `${formatTokenCount(...)} tok` (if session data exists). On hover, show a tooltip with session usage breakdown per provider and total cost.

Import `AIProviderType, ProviderHealth, CostEstimate, SessionUsage` from `'../../types'`.
Import `formatCost, formatTokenCount, getProviderPricing` from `'../../utils/token-estimator'`.

---

## Task D3: Refactor LeftSidebar.tsx

MODIFY `src/components/layout/LeftSidebar.tsx`. Read the existing file first.

Replace the local state-based implementation with one that uses `useAI` and the new components. The outer container `<div>` with `className="h-full flex flex-col bg-gray-800 border-r border-gray-700"` and `style={{ width }}` must be preserved exactly.

### Structure:
```
<div className="h-full flex flex-col bg-gray-800 border-r border-gray-700" style={{ width }}>
  {/* Header */}
  <div className="flex items-center px-3 py-2 border-b border-gray-700">
    <span className="text-sm font-semibold text-gray-100">HTML Wizard AI</span>
  </div>

  {/* Provider Selector */}
  <ProviderSelector ... />

  {/* Chat Panel — takes remaining vertical space */}
  <ChatPanel ... />

  {/* Input Area */}
  <div className="border-t border-gray-700 p-2">
    <div className="flex items-end gap-2">
      <textarea ... />
      {isStreaming ? <Stop button> : <Send button>}
    </div>
    <p className="text-[10px] text-gray-500 mt-1 px-1">Cmd/Ctrl+Enter to send</p>
  </div>
</div>
```

### Logic:
- Use `useAI()` hook for all AI state and actions
- Use `useAppStore()` for conversations, `addConversation`, `addMessage`, `setActiveProvider`, `getActiveConversation`
- `handleSend`: trims input, adds user message to store, calls `sendStreamingMessage`, adds assistant message after completion
- If no conversation exists, create one with `addConversation` before adding messages
- `handleApplyCode`: dispatches `window.dispatchEvent(new CustomEvent('ai-apply-code', { detail: { code, language } }))` so the editor can pick it up
- `handleKeyDown`: `Cmd+Enter` or `Ctrl+Enter` triggers send
- Textarea auto-resize: same pattern as original (set height to 'auto' then scrollHeight, capped at 120px)
- Stop button (shown during streaming): calls `cancelStream()`

---

## Task D4: Create DiffPreview.tsx

CREATE `src/components/ai/DiffPreview.tsx`.

### Props interface:
```typescript
interface DiffPreviewProps {
  original: string;
  proposed: string;
  language?: string;
  onAccept: (proposed: string) => void;
  onReject: () => void;
  onIterate: (feedback: string) => void;
}
```

### Features:
1. **View mode toggle**: "Unified" and "Split" buttons in the header.
2. **Unified view**: A table where each row is color-coded. Removal lines: `bg-red-900/30 text-red-300 line-through`. Addition lines: `bg-green-900/30 text-green-300`. Context lines: `text-gray-300`. A prefix column shows `+`, `-`, or space.
3. **Split view**: Two columns side by side divided by a `divide-x divide-gray-700`. Left = original, right = proposed. Differing lines highlighted red (left) or green (right).
4. **Diff computation**: Simple line-by-line comparison. For each index up to `max(orig.length, prop.length)`: if original[i] is undefined → addition; if proposed[i] is undefined → removal; if equal → context; if different → removal + addition pair.
5. **Stats**: Header shows `+{additions}` in green and `-{removals}` in red.
6. **Action buttons**: Accept (green), Iterate (blue), Reject (gray). Max height `max-h-64` with overflow scroll on the diff content.
7. **Iterate input**: Clicking Iterate shows a text input + Send button. Enter key submits. Calls `onIterate(feedback)` then clears input.

---

## Task D5: Create src/components/ai/index.ts

CREATE `src/components/ai/index.ts` with barrel exports:

```typescript
export { default as ChatPanel } from './ChatPanel';
export { default as ProviderSelector } from './ProviderSelector';
export { default as DiffPreview } from './DiffPreview';
```

Ensure the `src/components/ai/` directory is created when writing these files.

---

## Acceptance Criteria

- `tsc --noEmit` passes with no errors
- `src/components/ai/ChatPanel.tsx` exists and renders message bubbles with code block detection, Apply/Copy buttons, streaming cursor, and loading dots
- `src/components/ai/ProviderSelector.tsx` exists with health dots, dropdown, model/pricing display, offline badge, and usage tooltip
- `src/components/ai/DiffPreview.tsx` exists with unified/split views and Accept/Iterate/Reject buttons
- `src/components/layout/LeftSidebar.tsx` uses `useAI` hook and the new components; outer container with `width` prop preserved
- `src/components/ai/index.ts` barrel-exports all three components
- No imports from files not in the ownership list (importing from `src/types` for types only is allowed)
