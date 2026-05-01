import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { environment } from '@env/environment';
import { MessageWebSocketPort } from '@domain/ports/message-websocket.port';
import { Message } from '@domain/entities/message.entity';
import { messageFromApiResponse } from '@infra/mappers/message.mapper';

const PING_INTERVAL_MS = 30_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const BASE_RECONNECT_DELAY_MS = 1_000;

@Injectable({ providedIn: 'root' })
export class WebSocketMessageAdapter implements MessageWebSocketPort, OnDestroy {
  private socket: WebSocket | null = null;
  private readonly messages = new Subject<Message>();
  private readonly connected = new BehaviorSubject<boolean>(false);

  private currentSessionId: string | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private intentionalDisconnect = false;

  connect(sessionId: string): void {
    this.intentionalDisconnect = false;
    this.currentSessionId = sessionId;
    this.reconnectAttempts = 0;
    this.openSocket(sessionId);
  }

  private openSocket(sessionId: string): void {
    this.clearTimers();
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }

    const wsBase = environment.wsBaseUrl
      || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
    this.socket = new WebSocket(`${wsBase}/ws/${sessionId}`);

    this.socket.onopen = () => {
      this.connected.next(true);
      this.reconnectAttempts = 0;
      this.startPing();
    };

    this.socket.onmessage = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.event === 'new_message' && data.data) {
          this.messages.next(messageFromApiResponse(data.data));
        }
      } catch {
        // Ignorar mensajes malformados
      }
    };

    this.socket.onclose = () => {
      this.connected.next(false);
      this.clearTimers();
      if (!this.intentionalDisconnect && this.currentSessionId) {
        this.scheduleReconnect(this.currentSessionId);
      }
    };

    this.socket.onerror = () => {
      // onclose se dispara justo después, la reconexión ocurre allí
    };
  }

  private scheduleReconnect(sessionId: string): void {
    const delay = Math.min(
      BASE_RECONNECT_DELAY_MS * 2 ** this.reconnectAttempts,
      MAX_RECONNECT_DELAY_MS,
    );
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => this.openSocket(sessionId), delay);
  }

  private startPing(): void {
    this.pingTimer = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send('ping');
      }
    }, PING_INTERVAL_MS);
  }

  private clearTimers(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  disconnect(): void {
    this.intentionalDisconnect = true;
    this.currentSessionId = null;
    this.clearTimers();
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

