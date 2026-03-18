import { StateCreator } from 'zustand';
import { AppStore } from '../index';
import {
  AIProviderType, ProviderConfig, Conversation, ChatMessage,
  StreamChunkEvent, CostEstimate, ProviderHealth, SessionUsage
} from '../../types';

export interface AISlice {
  // State
  conversations: Conversation[];
  activeConversationId: string | null;
  isStreaming: boolean;
  providers: ProviderConfig[];
  activeProvider: AIProviderType;

  // Level 3: Streaming state
  streamingContent: string;
  streamingConversationId: string | null;
  costEstimate: CostEstimate | null;
  sessionUsage: SessionUsage;
  providerHealth: Record<string, ProviderHealth>;
  isOnline: boolean;

  // Actions
  addConversation: (conversation: Conversation) => void;
  setActiveConversation: (id: string | null) => void;
  addMessage: (conversationId: string, message: ChatMessage) => void;
  setStreaming: (streaming: boolean) => void;
  setProviders: (providers: ProviderConfig[]) => void;
  setActiveProvider: (provider: AIProviderType) => void;
  getActiveConversation: () => Conversation | undefined;

  // Level 3: Streaming actions
  appendStreamChunk: (chunk: string) => void;
  setStreamingConversationId: (id: string | null) => void;
  finalizeStream: (event: StreamChunkEvent) => void;
  setCostEstimate: (estimate: CostEstimate | null) => void;
  updateProviderHealth: (provider: string, health: ProviderHealth) => void;
  setIsOnline: (online: boolean) => void;
  addSessionUsage: (provider: string, tokens: number, costUsd: number) => void;
  clearStreamingState: () => void;
}

export const createAISlice: StateCreator<AppStore, [], [], AISlice> = (set, get) => ({
  conversations: [],
  activeConversationId: null,
  isStreaming: false,
  providers: [],
  activeProvider: 'claude',

  // Level 3: Streaming state
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

  addConversation: (conversation) => set((state) => ({
    conversations: [...state.conversations, conversation],
    activeConversationId: conversation.id,
  })),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  addMessage: (conversationId, message) => set((state) => ({
    conversations: state.conversations.map(c =>
      c.id === conversationId
        ? { ...c, messages: [...c.messages, message] }
        : c
    ),
  })),

  setStreaming: (streaming) => set({ isStreaming: streaming }),

  setProviders: (providers) => set({ providers }),

  setActiveProvider: (provider) => set({ activeProvider: provider }),

  getActiveConversation: () => {
    const { conversations, activeConversationId } = get();
    return conversations.find(c => c.id === activeConversationId);
  },

  // Level 3: Streaming actions
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
});
