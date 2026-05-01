import { signal, computed } from '@angular/core';
import { Message, PaginationInfo } from '@domain/entities/message.entity';

export interface ChatState {
  messages: Message[];
  pagination: PaginationInfo | null;
  loading: boolean;
  error: string | null;
  wsConnected: boolean;
  searchResults: Message[];
  searchLoading: boolean;
}

const initialState: ChatState = {
  messages: [],
  pagination: null,
  loading: false,
  error: null,
  wsConnected: false,
  searchResults: [],
  searchLoading: false,
};

export function createChatState() {
  const state = signal<ChatState>(initialState);

  const messages = computed(() => state().messages);
  const loading = computed(() => state().loading);
  const error = computed(() => state().error);
  const wsConnected = computed(() => state().wsConnected);
  const pagination = computed(() => state().pagination);
  const searchResults = computed(() => state().searchResults);
  const searchLoading = computed(() => state().searchLoading);

  function patch(partial: Partial<ChatState>): void {
    state.update((current) => ({ ...current, ...partial }));
  }

  return { state, messages, loading, error, wsConnected, pagination, searchResults, searchLoading, patch };
}
