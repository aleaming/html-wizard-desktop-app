import { StateCreator } from 'zustand';
import { AppStore } from '../index';
import { AIProviderType, ProviderConfig, Conversation, ChatMessage } from '../../types';

export interface AISlice {
  // State
  conversations: Conversation[];
  activeConversationId: string | null;
  isStreaming: boolean;
  providers: ProviderConfig[];
  activeProvider: AIProviderType;

  // Actions
  addConversation: (conversation: Conversation) => void;
  setActiveConversation: (id: string | null) => void;
  addMessage: (conversationId: string, message: ChatMessage) => void;
  setStreaming: (streaming: boolean) => void;
  setProviders: (providers: ProviderConfig[]) => void;
  setActiveProvider: (provider: AIProviderType) => void;
  getActiveConversation: () => Conversation | undefined;
}

export const createAISlice: StateCreator<AppStore, [], [], AISlice> = (set, get) => ({
  conversations: [],
  activeConversationId: null,
  isStreaming: false,
  providers: [],
  activeProvider: 'claude',

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
});
