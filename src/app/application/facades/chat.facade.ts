import { Injectable, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { MessageRepository, SendMessagePayload, SearchMessagesParams } from '@domain/ports/message.repository';
import { MessageWebSocketPort } from '@domain/ports/message-websocket.port';
import { HttpMessageAdapter } from '@infra/adapters/http-message.adapter';
import { WebSocketMessageAdapter } from '@infra/adapters/websocket-message.adapter';
import { createChatState } from '@application/state/chat.state';
import { Message } from '@domain/entities/message.entity';

@Injectable({ providedIn: 'root' })
export class ChatFacade implements OnDestroy {
  private readonly repo: MessageRepository;
  private readonly wsPort: MessageWebSocketPort;
  private readonly subscriptions = new Subscription();

  private readonly chatState = createChatState();
  private currentSessionId = '';
  private olderOffset = 0;
  private currentSearchParams: SearchMessagesParams | null = null;
  private searchOffset = 0;
  private readonly PAGE_SIZE = 20;

  readonly messages = this.chatState.messages;
  readonly loading = this.chatState.loading;
  readonly sending = this.chatState.sending;
  readonly loadingOlder = this.chatState.loadingOlder;
  readonly hasMore = this.chatState.hasMore;
  readonly error = this.chatState.error;
  readonly wsConnected = this.chatState.wsConnected;
  readonly pagination = this.chatState.pagination;
  readonly searchResults = this.chatState.searchResults;
  readonly searchLoading = this.chatState.searchLoading;
  readonly searchLoadingMore = this.chatState.searchLoadingMore;
  readonly searchHasMore = this.chatState.searchHasMore;

  constructor(
    httpAdapter: HttpMessageAdapter,
    wsAdapter: WebSocketMessageAdapter,
  ) {
    this.repo = httpAdapter;
    this.wsPort = wsAdapter;
  }

  loadSessionMessages(sessionId: string): void {
    this.currentSessionId = sessionId;
    this.chatState.patch({ loading: true, error: null });

    this.subscriptions.add(
      this.repo.getSessionMessages(sessionId, { limit: this.PAGE_SIZE, offset: 0, order: 'desc' }).subscribe({
        next: ({ messages, pagination }) => {
          // desc → invertir para mostrar cronológico (más viejo arriba)
          const reversed = [...messages].reverse();
          this.olderOffset = messages.length;
          this.chatState.patch({
            messages: reversed,
            pagination,
            hasMore: pagination.has_more,
            loading: false,
          });
        },
        error: (err: unknown) => {
          const message = err instanceof Error ? err.message : 'Error al cargar mensajes';
          this.chatState.patch({ loading: false, error: message });
        },
      })
    );
  }

  loadOlderMessages(): void {
    if (this.chatState.loadingOlder() || !this.chatState.hasMore()) return;
    this.chatState.patch({ loadingOlder: true });

    this.subscriptions.add(
      this.repo.getSessionMessages(this.currentSessionId, {
        limit: this.PAGE_SIZE,
        offset: this.olderOffset,
        order: 'desc',
      }).subscribe({
        next: ({ messages, pagination }) => {
          const older = [...messages].reverse();
          this.olderOffset += messages.length;
          this.chatState.patch({
            messages: [...older, ...this.chatState.messages()],
            pagination,
            hasMore: pagination.has_more,
            loadingOlder: false,
          });
        },
        error: (err: unknown) => {
          const message = err instanceof Error ? err.message : 'Error al cargar mensajes anteriores';
          this.chatState.patch({ loadingOlder: false, error: message });
        },
      })
    );
  }

  sendMessage(payload: SendMessagePayload): void {
    this.chatState.patch({ sending: true, error: null });

    this.subscriptions.add(
      this.repo.sendMessage(payload).subscribe({
        next: (message: Message) => {
          const current = this.chatState.messages();
          const alreadyExists = current.some((m) => m.message_id === message.message_id);
          this.chatState.patch({
            messages: alreadyExists ? current : [...current, message],
            sending: false,
          });
        },
        error: (err: unknown) => {
          const message = err instanceof Error ? err.message : 'Error al enviar mensaje';
          this.chatState.patch({ sending: false, error: message });
        },
      })
    );
  }

  searchMessages(params: SearchMessagesParams): void {
    this.currentSearchParams = params;
    this.searchOffset = 0;
    this.chatState.patch({ searchLoading: true, searchHasMore: false, error: null });

    this.subscriptions.add(
      this.repo.searchMessages({ ...params, limit: this.PAGE_SIZE, offset: 0 }).subscribe({
        next: ({ messages, pagination }) => {
          this.searchOffset = messages.length;
          this.chatState.patch({
            searchResults: messages,
            searchLoading: false,
            searchHasMore: pagination.has_more,
          });
        },
        error: (err: unknown) => {
          const message = err instanceof Error ? err.message : 'Error en búsqueda';
          this.chatState.patch({ searchLoading: false, error: message });
        },
      })
    );
  }

  loadMoreSearchResults(): void {
    if (!this.currentSearchParams || this.chatState.searchLoadingMore() || !this.chatState.searchHasMore()) return;
    this.chatState.patch({ searchLoadingMore: true });

    this.subscriptions.add(
      this.repo.searchMessages({ ...this.currentSearchParams, limit: this.PAGE_SIZE, offset: this.searchOffset }).subscribe({
        next: ({ messages, pagination }) => {
          this.searchOffset += messages.length;
          this.chatState.patch({
            searchResults: [...this.chatState.searchResults(), ...messages],
            searchLoadingMore: false,
            searchHasMore: pagination.has_more,
          });
        },
        error: (err: unknown) => {
          const message = err instanceof Error ? err.message : 'Error al cargar más resultados';
          this.chatState.patch({ searchLoadingMore: false, error: message });
        },
      })
    );
  }

  connectWebSocket(sessionId: string): void {
    this.wsPort.connect(sessionId);

    this.subscriptions.add(
      this.wsPort.isConnected$().subscribe((connected) => {
        this.chatState.patch({ wsConnected: connected });
      })
    );

    this.subscriptions.add(
      this.wsPort.messages$().subscribe((message: Message) => {
        const alreadyExists = this.chatState.messages().some((m) => m.message_id === message.message_id);
        if (alreadyExists) return;
        this.chatState.patch({ messages: [...this.chatState.messages(), message] });
      })
    );
  }

  disconnectWebSocket(): void {
    this.wsPort.disconnect();
  }

  clearError(): void {
    this.chatState.patch({ error: null });
  }

  clearSearch(): void {
    this.currentSearchParams = null;
    this.searchOffset = 0;
    this.chatState.patch({ searchResults: [], searchHasMore: false });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.disconnectWebSocket();
  }
}
