import { signal, computed } from '@angular/core';
import { Message, PaginationInfo } from '@domain/entities/message.entity';

export interface ChatState {
  messages: Message[];
  pagination: PaginationInfo | null;
  loading: boolean;
  sending: boolean;
  loadingOlder: boolean;
  hasMore: boolean;
  error: string | null;
  wsConnected: boolean;
  searchResults: Message[];
  searchLoading: boolean;
  searchLoadingMore: boolean;
  searchHasMore: boolean;
}

const initialState: ChatState = {
  messages: [],
  pagination: null,
  loading: false,
  sending: false,
  loadingOlder: false,
  hasMore: false,
  error: null,
  wsConnected: false,
  searchResults: [],
  searchLoading: false,
  searchLoadingMore: false,
  searchHasMore: false,
};

export function createChatState() {
  const state = signal<ChatState>(initialState);

  const messages = computed(() => state().messages);
  const loading = computed(() => state().loading);
  const sending = computed(() => state().sending);
  const loadingOlder = computed(() => state().loadingOlder);
  const hasMore = computed(() => state().hasMore);
  const error = computed(() => state().error);
  const wsConnected = computed(() => state().wsConnected);
  const pagination = computed(() => state().pagination);
  const searchResults = computed(() => state().searchResults);
  const searchLoading = computed(() => state().searchLoading);
  const searchLoadingMore = computed(() => state().searchLoadingMore);
  const searchHasMore = computed(() => state().searchHasMore);

  function patch(partial: Partial<ChatState>): void {
    state.update((current) => ({ ...current, ...partial }));
  }

  return { state, messages, loading, sending, loadingOlder, hasMore, error, wsConnected, pagination, searchResults, searchLoading, searchLoadingMore, searchHasMore, patch };
}
