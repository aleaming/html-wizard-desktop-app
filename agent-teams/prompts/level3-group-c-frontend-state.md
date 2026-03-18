# Agent Group C (Level 3): Frontend Types, State & AI Hook

You are a builder agent responsible for TypeScript types, Zustand state extensions, the primary AI hook, and a token estimator utility. You produce complete, production-ready TypeScript — no pseudocode, no placeholders.

## Context

Level 1 established `src/types/index.ts`, `src/store/slices/aiSlice.ts`, and the store in `src/store/index.ts`. Level 2 added visual editor slices. Your job is to extend types, extend the AI slice with streaming state, create the `useAI` hook that wires invoke + listen together, and create the token estimator utility.

## File Ownership (ONLY touch these files)
- `src/types/index.ts` (MODIFY — add new types)
- `src/store/slices/aiSlice.ts` (MODIFY — extend slice with streaming fields)
- `src/hooks/useAI.ts` (CREATE)
- `src/utils/token-estimator.ts` (CREATE)

## DO NOT touch store/index.ts, other slices, or any component files.

---

## CRITICAL: Read Before Writing

Before modifying any existing file, read it in full to understand what already exists. You MUST preserve all existing exports and types — only add new ones.

Read these files first:
- `src/types/index.ts`
- `src/store/slices/aiSlice.ts`
- `src/store/index.ts` (to understand AppStore shape — do not modify it)

---

## Task C1: Add Streaming Types to types/index.ts

MODIFY `src/types/index.ts` — append these types at the end of the file. Do NOT modify existing types.

```typescript
// ===== Level 3: Streaming & Orchestration Types =====

/** Payload received from Tauri event "ai-stream-chunk" */
export interface StreamChunkEvent {
  conversationId: string;
  chunk: string;
  isFinal: boolean;
  tokenUsage?: TokenUsage;
  finishReason?: string;
}

/** Cost estimate before sending a request */
export interface CostEstimate {
  provider: AIProviderType;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number;
}

/** Real-time health status of a provider */
export interface ProviderHealth {
  provider: AIProviderType;
  isHealthy: boolean;
  lastError?: string;
  averageLatencyMs: number;
  successCount: number;
  errorCount: number;
  lastCheckedSecondsAgo?: number;
}

/** Aggregated usage statistics for a provider */
export interface UsageStats {
  provider: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokensUsed: number;
}

/** Configuration passed with each streaming AI request */
export interface AIOrchestrationConfig {
  primaryProvider: AIProviderType;
  fallbackProvider?: AIProviderType;
  maxRetries: number;
  timeoutSeconds: number;
  enableStreaming: boolean;
}

/** Rate limit status from the backend */
export interface RateLimitStatus {
  provider: string;
  requestsThisMinute: number;
  maxRequestsPerMinute: number;
  isLimited: boolean;
  resetInSeconds: number;
}

/** Session usage accumulated during the current session */
export interface SessionUsage {
  totalTokensUsed: number;
  totalRequestsMade: number;
  estimatedTotalCostUsd: number;
  providerBreakdown: Record<string, { tokens: number; requests: number; costUsd: number }>;
}
```

---

## Task C2: Extend aiSlice.ts

MODIFY `src/store/slices/aiSlice.ts`. Read the existing file first. Extend the `AISlice` interface and `createAISlice` with new fields. Preserve ALL existing state fields and actions.

### New imports to add at the top:
```typescript
import {
  AIProviderType, ProviderConfig, Conversation, ChatMessage,
  StreamChunkEvent, CostEstimate, ProviderHealth, SessionUsage
} from '../../types';
```
(Replace the existing import line — just add the new types to the existing import.)

### Add these fields to the `AISlice` interface:

```typescript
  // Level 3: Streaming state
  streamingContent: string;
  streamingConversationId: string | null;
  costEstimate: CostEstimate | null;
  sessionUsage: SessionUsage;
  providerHealth: Record<string, ProviderHealth>;
  isOnline: boolean;
```

### Add these actions to the `AISlice` interface:

```typescript
  // Level 3: Streaming actions
  appendStreamChunk: (chunk: string) => void;
  setStreamingConversationId: (id: string | null) => void;
  finalizeStream: (event: StreamChunkEvent) => void;
  setCostEstimate: (estimate: CostEstimate | null) => void;
  updateProviderHealth: (provider: string, health: ProviderHealth) => void;
  setIsOnline: (online: boolean) => void;
  addSessionUsage: (provider: string, tokens: number, costUsd: number) => void;
  clearStreamingState: () => void;
```

### Add these initial values to `createAISlice`:

```typescript
  streamingContent: '',
  streamingConversationId: null,
  costEstimate: null,
  sessionUsage: {
    totalTokensUsed: 0,
    totalRequestsMade: 0,
    estimatedTotalCostUsd: 0,
    providerBreakdown: {},
  },
  providerHealth: {},
  isOnline: true,
```

### Add these action implementations to `createAISlice`:

```typescript
  appendStreamChunk: (chunk) => set((state) => ({
    streamingContent: state.streamingContent + chunk,
  })),

  setStreamingConversationId: (id) => set({ streamingConversationId: id }),

  finalizeStream: (event) => set((state) => {
    const updates: Partial<AISlice> = {
      isStreaming: false,
      streamingContent: '',
      streamingConversationId: null,
    };
    // If we have token usage, update session stats
    if (event.tokenUsage && state.activeProvider) {
      const providerKey = typeof state.activeProvider === 'string'
        ? state.activeProvider
        : 'plugin';
      const existing = state.sessionUsage.providerBreakdown[providerKey] || {
        tokens: 0, requests: 0, costUsd: 0
      };
      const newTotal = state.sessionUsage.totalTokensUsed + event.tokenUsage.totalTokens;
      updates.sessionUsage = {
        ...state.sessionUsage,
        totalTokensUsed: newTotal,
        totalRequestsMade: state.sessionUsage.totalRequestsMade + 1,
        providerBreakdown: {
          ...state.sessionUsage.providerBreakdown,
          [providerKey]: {
            tokens: existing.tokens + event.tokenUsage.totalTokens,
            requests: existing.requests + 1,
            costUsd: existing.costUsd,
          },
        },
      };
    }
    return updates;
  }),

  setCostEstimate: (estimate) => set({ costEstimate: estimate }),

  updateProviderHealth: (provider, health) => set((state) => ({
    providerHealth: { ...state.providerHealth, [provider]: health },
  })),

  setIsOnline: (online) => set({ isOnline: online }),

  addSessionUsage: (provider, tokens, costUsd) => set((state) => {
    const existing = state.sessionUsage.providerBreakdown[provider] || {
      tokens: 0, requests: 0, costUsd: 0
    };
    return {
      sessionUsage: {
        totalTokensUsed: state.sessionUsage.totalTokensUsed + tokens,
        totalRequestsMade: state.sessionUsage.totalRequestsMade + 1,
        estimatedTotalCostUsd: state.sessionUsage.estimatedTotalCostUsd + costUsd,
        providerBreakdown: {
          ...state.sessionUsage.providerBreakdown,
          [provider]: {
            tokens: existing.tokens + tokens,
            requests: existing.requests + 1,
            costUsd: existing.costUsd + costUsd,
          },
        },
      },
    };
  }),

  clearStreamingState: () => set({
    streamingContent: '',
    streamingConversationId: null,
    isStreaming: false,
    costEstimate: null,
  }),
```

---

## Task C3: Create useAI.ts

CREATE `src/hooks/useAI.ts`:

```typescript
import { useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { useAppStore } from '../store';
import {
  AIRequest,
  AIResponse,
  AIOrchestrationConfig,
  StreamChunkEvent,
  CostEstimate,
  ProviderHealth,
  AIProviderType,
} from '../types';
import { estimateTokens, estimateCost } from '../utils/token-estimator';

export function useAI() {
  const {
    activeProvider,
    isStreaming,
    streamingContent,
    streamingConversationId,
    costEstimate,
    sessionUsage,
    providerHealth,
    isOnline,
    setStreaming,
    appendStreamChunk,
    setStreamingConversationId,
    finalizeStream,
    setCostEstimate,
    updateProviderHealth,
    setIsOnline,
    clearStreamingState,
    addMessage,
    addConversation,
    getActiveConversation,
    activeConversationId,
  } = useAppStore();

  // Keep a ref to the unlisten function so we can cancel mid-stream
  const unlistenRef = useRef<UnlistenFn | null>(null);

  /** Send a non-streaming AI request. Returns the full response. */
  const sendMessage = useCallback(async (
    prompt: string,
    context?: AIRequest['context']
  ): Promise<AIResponse> => {
    const request: AIRequest = {
      provider: activeProvider,
      prompt,
      context,
      conversationId: activeConversationId ?? undefined,
      maxTokens: 8096,
    };

    setStreaming(true);
    try {
      const response = await invoke<AIResponse>('send_ai_request', { request });
      return response;
    } finally {
      setStreaming(false);
    }
  }, [activeProvider, activeConversationId, setStreaming]);

  /** Send a streaming AI request. Chunks arrive via Tauri events. */
  const sendStreamingMessage = useCallback(async (
    prompt: string,
    context?: AIRequest['context'],
    fallbackProvider?: AIProviderType
  ): Promise<AIResponse> => {
    // Clean up any existing stream listener
    if (unlistenRef.current) {
      unlistenRef.current();
      unlistenRef.current = null;
    }

    const conversationId = activeConversationId ?? crypto.randomUUID();
    const request: AIRequest = {
      provider: activeProvider,
      prompt,
      context,
      conversationId,
      maxTokens: 8096,
    };

    const config: AIOrchestrationConfig = {
      primaryProvider: activeProvider,
      fallbackProvider,
      maxRetries: 1,
      timeoutSeconds: 60,
      enableStreaming: true,
    };

    // Compute and set cost estimate before sending
    const inputTokens = estimateTokens(prompt);
    const estimate = estimateCost(activeProvider, inputTokens, 1000);
    setCostEstimate(estimate);

    setStreaming(true);
    setStreamingConversationId(conversationId);

    // Subscribe to stream chunks BEFORE invoking
    const unlisten = await listen<StreamChunkEvent>('ai-stream-chunk', (event) => {
      const payload = event.payload;
      if (payload.conversationId !== conversationId) return;

      if (payload.isFinal) {
        finalizeStream(payload);
        if (unlisten) {
          (unlisten as UnlistenFn)();
          unlistenRef.current = null;
        }
      } else if (payload.chunk) {
        appendStreamChunk(payload.chunk);
      }
    });
    unlistenRef.current = unlisten;

    try {
      const response = await invoke<AIResponse>('send_ai_request_stream', {
        request,
        config,
      });
      return response;
    } catch (error) {
      clearStreamingState();
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
      throw error;
    }
  }, [
    activeProvider,
    activeConversationId,
    setStreaming,
    setStreamingConversationId,
    appendStreamChunk,
    finalizeStream,
    setCostEstimate,
    clearStreamingState,
  ]);

  /** Cancel an in-progress stream. */
  const cancelStream = useCallback(() => {
    if (unlistenRef.current) {
      unlistenRef.current();
      unlistenRef.current = null;
    }
    clearStreamingState();
  }, [clearStreamingState]);

  /** Estimate cost for a given prompt before sending. */
  const estimateCostForPrompt = useCallback((
    prompt: string,
    estimatedOutputTokens = 1000
  ): CostEstimate => {
    const inputTokens = estimateTokens(prompt);
    return estimateCost(activeProvider, inputTokens, estimatedOutputTokens);
  }, [activeProvider]);

  /** Check provider health by querying the Rust backend. */
  const checkProviderHealth = useCallback(async (
    provider: string
  ): Promise<ProviderHealth> => {
    try {
      const health = await invoke<ProviderHealth>('get_provider_health', { provider });
      updateProviderHealth(provider, health);
      return health;
    } catch (error) {
      const fallback: ProviderHealth = {
        provider: provider as AIProviderType,
        isHealthy: false,
        lastError: String(error),
        averageLatencyMs: 0,
        successCount: 0,
        errorCount: 1,
      };
      updateProviderHealth(provider, fallback);
      return fallback;
    }
  }, [updateProviderHealth]);

  /** Check network connectivity and update isOnline state. */
  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      const status = await invoke<{ online: boolean }>('check_connectivity');
      setIsOnline(status.online);
      return status.online;
    } catch {
      setIsOnline(false);
      return false;
    }
  }, [setIsOnline]);

  return {
    // State
    isStreaming,
    streamingContent,
    streamingConversationId,
    costEstimate,
    sessionUsage,
    providerHealth,
    isOnline,
    activeProvider,

    // Actions
    sendMessage,
    sendStreamingMessage,
    cancelStream,
    estimateCost: estimateCostForPrompt,
    checkProviderHealth,
    checkConnectivity,
  };
}
```

---

## Task C4: Create token-estimator.ts

CREATE `src/utils/token-estimator.ts`:

```typescript
import { AIProviderType, CostEstimate } from '../types';

/**
 * Rough token estimation: ~4 characters per token.
 * This is an approximation; actual tokenizers vary by provider.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Per-provider pricing (USD per 1M tokens) as of early 2026.
 * Update these values when pricing changes.
 */
const PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  claude: {
    inputPer1M: 3.00,   // claude-sonnet-4
    outputPer1M: 15.00,
  },
  gemini: {
    inputPer1M: 1.25,   // gemini-2.5-pro ≤200k context
    outputPer1M: 10.00,
  },
  openai: {
    inputPer1M: 2.50,   // gpt-4o
    outputPer1M: 10.00,
  },
};

function providerKey(provider: AIProviderType): string {
  if (typeof provider === 'string') return provider;
  return 'plugin';
}

/**
 * Estimate the cost of a request given token counts.
 */
export function estimateCost(
  provider: AIProviderType,
  inputTokens: number,
  outputTokens: number
): CostEstimate {
  const key = providerKey(provider);
  const pricing = PRICING[key] ?? { inputPer1M: 0, outputPer1M: 0 };

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
  const totalCost = inputCost + outputCost;

  return {
    provider,
    estimatedInputTokens: inputTokens,
    estimatedOutputTokens: outputTokens,
    estimatedCostUsd: Math.round(totalCost * 1_000_000) / 1_000_000, // 6 decimal places
  };
}

/**
 * Format a cost value for display.
 * Values under $0.01 are shown in fractional cents.
 */
export function formatCost(costUsd: number): string {
  if (costUsd === 0) return '$0.00';
  if (costUsd < 0.0001) return `$${(costUsd * 100).toFixed(4)}¢`;
  if (costUsd < 0.01) return `$${costUsd.toFixed(5)}`;
  if (costUsd < 1) return `$${costUsd.toFixed(4)}`;
  return `$${costUsd.toFixed(2)}`;
}

/**
 * Format a token count for display.
 * Counts over 1000 are shown with K suffix.
 */
export function formatTokenCount(tokens: number): string {
  if (tokens < 1000) return String(tokens);
  if (tokens < 10_000) return `${(tokens / 1000).toFixed(1)}k`;
  return `${Math.round(tokens / 1000)}k`;
}

/**
 * Get the pricing info for a provider (for display in UI).
 */
export function getProviderPricing(provider: AIProviderType): {
  inputPer1M: number;
  outputPer1M: number;
} {
  const key = providerKey(provider);
  return PRICING[key] ?? { inputPer1M: 0, outputPer1M: 0 };
}
```

---

## Task C5: Verify Store Exports

Read `src/store/index.ts`. It should already export `AppStore` as `ProjectSlice & EditorSlice & AISlice & UISlice`. Since you extended `AISlice`, the `AppStore` type will automatically include the new fields. No changes to `store/index.ts` should be needed.

If for any reason the store does not compile after your changes to `aiSlice.ts`, review the interface for missing or mismatched types.

Check that:
- All new action names in `AISlice` interface are implemented in `createAISlice`
- All new state fields in `AISlice` interface have initial values in `createAISlice`
- All new type imports in `aiSlice.ts` are present in `types/index.ts`

---

## Acceptance Criteria

- `tsc --noEmit` passes with no errors
- `src/types/index.ts` exports `StreamChunkEvent`, `CostEstimate`, `ProviderHealth`, `UsageStats`, `AIOrchestrationConfig`, `RateLimitStatus`, `SessionUsage`
- `src/store/slices/aiSlice.ts` has `streamingContent`, `streamingConversationId`, `costEstimate`, `sessionUsage`, `providerHealth`, `isOnline` state + corresponding actions
- `src/hooks/useAI.ts` exports `useAI` hook with `sendMessage`, `sendStreamingMessage`, `cancelStream`, `estimateCost`, `checkProviderHealth`, `checkConnectivity`
- `src/utils/token-estimator.ts` exports `estimateTokens`, `estimateCost`, `formatCost`, `formatTokenCount`, `getProviderPricing`
- All existing types and slice content are preserved
