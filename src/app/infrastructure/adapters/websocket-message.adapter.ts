import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { environment } from '@env/environment';
import { MessageWebSocketPort } from '@domain/ports/message-websocket.port';
import { Message } from '@domain/entities/message.entity';
import { messageFromApiResponse } from '@infra/mappers/message.mapper';

@Injectable({ providedIn: 'root' })
export class WebSocketMessageAdapter implements MessageWebSocketPort, OnDestroy {
  private socket: WebSocket | null = null;
  private readonly messages = new Subject<Message>();
  private readonly connected = new BehaviorSubject<boolean>(false);

  connect(sessionId: string): void {
    this.disconnect();

    this.socket = new WebSocket(`${environment.wsBaseUrl}/ws/${sessionId}`);

    this.socket.onopen = () => this.connected.next(true);

    this.socket.onmessage = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data);
        this.messages.next(messageFromApiResponse(data));
      } catch {
        // Ignorar mensajes malformados
      }
    };

    this.socket.onclose = () => this.connected.next(false);
    this.socket.onerror = () => this.connected.next(false);
  }

  disconnect(): void {
    if (!this.socket) return;
    this.socket.close();
    this.socket = null;
  }

  messages$(): Observable<Message> {
    return this.messages.asObservable();
  }

  isConnected$(): Observable<boolean> {
    return this.connected.asObservable();
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
