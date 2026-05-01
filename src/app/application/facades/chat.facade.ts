import { Injectable, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { MessageRepository, SendMessagePayload, GetMessagesParams, SearchMessagesParams } from '@domain/ports/message.repository';
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

  readonly messages = this.chatState.messages;
  readonly loading = this.chatState.loading;
  readonly error = this.chatState.error;
  readonly wsConnected = this.chatState.wsConnected;
  readonly pagination = this.chatState.pagination;
  readonly searchResults = this.chatState.searchResults;
  readonly searchLoading = this.chatState.searchLoading;

  constructor(
    httpAdapter: HttpMessageAdapter,
    wsAdapter: WebSocketMessageAdapter,
  ) {
    this.repo = httpAdapter;
    this.wsPort = wsAdapter;
  }

  loadSessionMessages(sessionId: string, params: GetMessagesParams = {}): void {
    this.chatState.patch({ loading: true, error: null });

    this.subscriptions.add(
      this.repo.getSessionMessages(sessionId, params).subscribe({
        next: ({ messages, pagination }) => {
          this.chatState.patch({ messages, pagination, loading: false });
        },
        error: (err: unknown) => {
          const message = err instanceof Error ? err.message : 'Error al cargar mensajes';
          this.chatState.patch({ loading: false, error: message });
        },
      })
    );
  }

  sendMessage(payload: SendMessagePayload): void {
    this.chatState.patch({ loading: true, error: null });

    this.subscriptions.add(
      this.repo.sendMessage(payload).subscribe({
        next: (message: Message) => {
          this.chatState.patch({
            messages: [...this.chatState.messages(), message],
            loading: false,
          });
        },
        error: (err: unknown) => {
          const message = err instanceof Error ? err.message : 'Error al enviar mensaje';
          this.chatState.patch({ loading: false, error: message });
        },
      })
    );
  }

  searchMessages(params: SearchMessagesParams): void {
    this.chatState.patch({ searchLoading: true, error: null });

    this.subscriptions.add(
      this.repo.searchMessages(params).subscribe({
        next: ({ messages }) => {
          this.chatState.patch({ searchResults: messages, searchLoading: false });
        },
        error: (err: unknown) => {
          const message = err instanceof Error ? err.message : 'Error en búsqueda';
          this.chatState.patch({ searchLoading: false, error: message });
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
    this.chatState.patch({ searchResults: [] });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.disconnectWebSocket();
  }
}
