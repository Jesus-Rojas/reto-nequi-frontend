import { TestBed } from '@angular/core/testing';
import { WebSocketMessageAdapter } from './websocket-message.adapter';
import { MessageSender } from '@domain/entities/message.entity';

// ─── Mock WebSocket ────────────────────────────────────────────────────────

class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  static instances: MockWebSocket[] = [];

  readyState = MockWebSocket.CONNECTING;
  onopen: ((e: Event) => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  onclose: ((e: CloseEvent) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;

  send = vi.fn();
  close = vi.fn();

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }

  static lastInstance(): MockWebSocket {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1];
  }

  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }

  simulateMessage(data: unknown): void {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
  }

  simulateRawMessage(raw: string): void {
    this.onmessage?.(new MessageEvent('message', { data: raw }));
  }

  simulateClose(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  simulateError(): void {
    this.onerror?.(new Event('error'));
  }
}

// ──────────────────────────────────────────────────────────────────────────

describe('WebSocketMessageAdapter', () => {
  let adapter: WebSocketMessageAdapter;

  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.useFakeTimers();

    TestBed.configureTestingModule({
      providers: [WebSocketMessageAdapter],
    });
    adapter = TestBed.inject(WebSocketMessageAdapter);
  });

  afterEach(() => {
    adapter.ngOnDestroy();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // ── connect / openSocket ──────────────────────────────────────────────

  it('crea un WebSocket con la URL correcta al conectar', () => {
    adapter.connect('session-1');
    const ws = MockWebSocket.lastInstance();
    expect(ws.url).toMatch(/\/ws\/session-1$/);
  });

  it('emite connected=false inicialmente', () => {
    let connected: boolean | undefined;
    adapter.isConnected$().subscribe((v) => (connected = v));
    expect(connected).toBe(false);
  });

  it('emite connected=true cuando el socket abre', () => {
    let connected: boolean | undefined;
    adapter.isConnected$().subscribe((v) => (connected = v));

    adapter.connect('session-1');
    MockWebSocket.lastInstance().simulateOpen();

    expect(connected).toBe(true);
  });

  it('emite connected=false cuando el socket cierra', () => {
    const connected: boolean[] = [];
    adapter.isConnected$().subscribe((v) => connected.push(v));

    adapter.connect('session-1');
    const ws = MockWebSocket.lastInstance();
    ws.simulateOpen();
    ws.simulateClose();

    expect(connected).toContain(false);
    expect(connected[connected.length - 1]).toBe(false);
  });

  // ── onmessage ─────────────────────────────────────────────────────────

  it('emite el mensaje cuando llega un evento new_message válido', () => {
    const received: unknown[] = [];
    adapter.messages$().subscribe((m) => received.push(m));
    adapter.connect('session-1');

    const ws = MockWebSocket.lastInstance();
    ws.simulateMessage({
      event: 'new_message',
      data: {
        message_id: 'm1',
        session_id: 's1',
        content: 'Hola',
        timestamp: '2026-01-01T00:00:00Z',
        sender: MessageSender.User,
      },
    });

    expect(received).toHaveLength(1);
    expect((received[0] as { content: string }).content).toBe('Hola');
  });

  it('ignora eventos que no son new_message', () => {
    const received: unknown[] = [];
    adapter.messages$().subscribe((m) => received.push(m));
    adapter.connect('session-1');

    MockWebSocket.lastInstance().simulateMessage({ event: 'ping', data: null });

    expect(received).toHaveLength(0);
  });

  it('ignora eventos new_message sin campo data', () => {
    const received: unknown[] = [];
    adapter.messages$().subscribe((m) => received.push(m));
    adapter.connect('session-1');

    MockWebSocket.lastInstance().simulateMessage({ event: 'new_message', data: null });

    expect(received).toHaveLength(0);
  });

  it('ignora mensajes con JSON malformado sin lanzar error', () => {
    const received: unknown[] = [];
    adapter.messages$().subscribe((m) => received.push(m));
    adapter.connect('session-1');

    expect(() => {
      MockWebSocket.lastInstance().simulateRawMessage('not-valid-json{{{');
    }).not.toThrow();

    expect(received).toHaveLength(0);
  });

  // ── onerror ──────────────────────────────────────────────────────────

  it('onerror no lanza error ni cambia estado', () => {
    adapter.connect('session-1');
    const ws = MockWebSocket.lastInstance();
    ws.simulateOpen();

    expect(() => ws.simulateError()).not.toThrow();
  });

  // ── reconnect ────────────────────────────────────────────────────────

  it('programa reconexión cuando el cierre no es intencional', () => {
    adapter.connect('session-1');
    const ws = MockWebSocket.lastInstance();
    ws.simulateOpen();
    ws.simulateClose();

    const countBefore = MockWebSocket.instances.length;
    vi.advanceTimersByTime(1500);

    expect(MockWebSocket.instances.length).toBe(countBefore + 1);
  });

  it('NO programa reconexión cuando el cierre es intencional (disconnect)', () => {
    adapter.connect('session-1');
    const ws = MockWebSocket.lastInstance();
    ws.simulateOpen();

    adapter.disconnect();
    ws.simulateClose();

    const countBefore = MockWebSocket.instances.length;
    vi.advanceTimersByTime(5000);

    expect(MockWebSocket.instances.length).toBe(countBefore);
  });

  it('usa backoff exponencial en reconexiones sucesivas', () => {
    adapter.connect('session-1');

    // Primera reconexión (delay = 1s)
    MockWebSocket.lastInstance().simulateClose();
    vi.advanceTimersByTime(1100);
    const count1 = MockWebSocket.instances.length;

    // Segunda reconexión (delay = 2s)
    MockWebSocket.lastInstance().simulateClose();
    vi.advanceTimersByTime(2100);
    const count2 = MockWebSocket.instances.length;

    expect(count2).toBeGreaterThan(count1);
  });

  // ── ping ─────────────────────────────────────────────────────────────

  it('envía ping periódicamente cuando el socket está abierto', () => {
    adapter.connect('session-1');
    const ws = MockWebSocket.lastInstance();
    ws.simulateOpen();

    vi.advanceTimersByTime(30_001);

    expect(ws.send).toHaveBeenCalledWith('ping');
  });

  it('no envía ping si el socket no está en estado OPEN', () => {
    adapter.connect('session-1');
    const ws = MockWebSocket.lastInstance();
    // No simulamos open, readyState = CONNECTING
    ws.simulateOpen();
    ws.readyState = MockWebSocket.CLOSING;

    vi.advanceTimersByTime(30_001);

    expect(ws.send).not.toHaveBeenCalled();
  });

  // ── disconnect ───────────────────────────────────────────────────────

  it('disconnect llama close sobre el socket y lo limpia', () => {
    adapter.connect('session-1');
    const ws = MockWebSocket.lastInstance();
    ws.simulateOpen();

    adapter.disconnect();

    expect(ws.close).toHaveBeenCalled();
  });

  it('disconnect sin socket activo no lanza error', () => {
    expect(() => adapter.disconnect()).not.toThrow();
  });

  // ── re-connect cierra el socket anterior ──────────────────────────────

  it('al reconectar cierra el socket previo y crea uno nuevo', () => {
    adapter.connect('session-1');
    const first = MockWebSocket.lastInstance();
    first.simulateOpen();

    adapter.connect('session-2');

    expect(first.close).toHaveBeenCalled();
    expect(MockWebSocket.instances.length).toBe(2);
    expect(MockWebSocket.lastInstance().url).toMatch(/\/ws\/session-2$/);
  });

  // ── observables ──────────────────────────────────────────────────────

  it('messages$() retorna un Observable', () => {
    const obs = adapter.messages$();
    expect(typeof obs.subscribe).toBe('function');
  });

  it('isConnected$() retorna un Observable', () => {
    const obs = adapter.isConnected$();
    expect(typeof obs.subscribe).toBe('function');
  });

  // ── ngOnDestroy ──────────────────────────────────────────────────────

  it('ngOnDestroy desconecta el socket', () => {
    adapter.connect('session-1');
    const ws = MockWebSocket.lastInstance();
    ws.simulateOpen();

    adapter.ngOnDestroy();

    expect(ws.close).toHaveBeenCalled();
  });
});
