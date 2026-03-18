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
    conversationId?: string,
    context?: AIRequest['context'],
    fallbackProvider?: AIProviderType
  ): Promise<AIResponse> => {
    // Clean up any existing stream listener
    if (unlistenRef.current) {
      unlistenRef.current();
      unlistenRef.current = null;
    }

    const convId = conversationId ?? activeConversationId ?? crypto.randomUUID();
    const request: AIRequest = {
      provider: activeProvider,
      prompt,
      context,
      conversationId: convId,
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
    setStreamingConversationId(convId);

    // Subscribe to stream chunks BEFORE invoking the command
    const unlisten = await listen<StreamChunkEvent>('ai-stream-chunk', (event) => {
      const payload = event.payload;
      if (payload.conversationId !== convId) return;

      if (payload.isFinal) {
        finalizeStream(payload);
        if (unlistenRef.current) {
          (unlistenRef.current as UnlistenFn)();
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

  /**
   * Check health of all providers by querying the Rust backend.
   * Updates providerHealth in the store for each provider.
   */
  const checkProviderHealth = useCallback(async (): Promise<Record<string, ProviderHealth>> => {
    try {
      // Returns a map: { claude: {...}, gemini: {...}, openai: {...} }
      const rawMap = await invoke<Record<string, {
        is_healthy: boolean;
        last_error: string | null;
        average_latency_ms: number;
        success_count: number;
        error_count: number;
        last_checked_secs_ago: number | null;
      }>>('get_provider_health');

      const result: Record<string, ProviderHealth> = {};
      for (const [provider, raw] of Object.entries(rawMap)) {
        const health: ProviderHealth = {
          provider: provider as AIProviderType,
          isHealthy: raw.is_healthy,
          lastError: raw.last_error ?? undefined,
          averageLatencyMs: raw.average_latency_ms,
          successCount: raw.success_count,
          errorCount: raw.error_count,
          lastCheckedSecondsAgo: raw.last_checked_secs_ago ?? undefined,
        };
        result[provider] = health;
        updateProviderHealth(provider, health);
      }
      return result;
    } catch (error) {
      const fallback: ProviderHealth = {
        provider: activeProvider,
        isHealthy: false,
        lastError: String(error),
        averageLatencyMs: 0,
        successCount: 0,
        errorCount: 1,
      };
      const key = typeof activeProvider === 'string' ? activeProvider : 'plugin';
      updateProviderHealth(key, fallback);
      return { [key]: fallback };
    }
  }, [activeProvider, updateProviderHealth]);

  /** Check network connectivity by pinging provider endpoints. */
  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      // Returns boolean: true if any provider is reachable
      const online = await invoke<boolean>('check_connectivity');
      setIsOnline(online);
      return online;
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
