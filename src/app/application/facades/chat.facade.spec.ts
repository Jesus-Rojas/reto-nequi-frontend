import { TestBed } from '@angular/core/testing';
import { of, throwError, Subject, BehaviorSubject } from 'rxjs';
import { ChatFacade } from './chat.facade';
import { HttpMessageAdapter } from '@infra/adapters/http-message.adapter';
import { WebSocketMessageAdapter } from '@infra/adapters/websocket-message.adapter';
import { MessageSender } from '@domain/entities/message.entity';
import { SendMessagePayload } from '@domain/ports/message.repository';

const mockPagination = { total: 1, limit: 20, offset: 0, has_more: false };

const mockMessage = {
  message_id: 'm1',
  session_id: 'session-1',
  content: 'Hola',
  timestamp: '2026-01-01T00:00:00Z',
  sender: MessageSender.User,
};

const mockPayload: SendMessagePayload = {
  message_id: 'm1',
  session_id: 'session-1',
  content: 'Hola',
  timestamp: '2026-01-01T00:00:00Z',
  sender: MessageSender.User,
};

describe('ChatFacade', () => {
  let facade: ChatFacade;
  let httpAdapter: { getSessionMessages: ReturnType<typeof vi.fn>; sendMessage: ReturnType<typeof vi.fn>; searchMessages: ReturnType<typeof vi.fn> };
  let wsAdapter: { connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>; isConnected$: ReturnType<typeof vi.fn>; messages$: ReturnType<typeof vi.fn> };
  let connected$: BehaviorSubject<boolean>;
  let wsMessages$: Subject<typeof mockMessage>;

  beforeEach(() => {
    connected$ = new BehaviorSubject<boolean>(false);
    wsMessages$ = new Subject();

    httpAdapter = {
      getSessionMessages: vi.fn(),
      sendMessage: vi.fn(),
      searchMessages: vi.fn(),
    };

    wsAdapter = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      isConnected$: vi.fn(() => connected$.asObservable()),
      messages$: vi.fn(() => wsMessages$.asObservable()),
    };

    TestBed.configureTestingModule({
      providers: [
        ChatFacade,
        { provide: HttpMessageAdapter, useValue: httpAdapter },
        { provide: WebSocketMessageAdapter, useValue: wsAdapter },
      ],
    });

    facade = TestBed.inject(ChatFacade);
  });

  afterEach(() => {
    facade.ngOnDestroy();
  });

  it('se crea correctamente', () => {
    expect(facade).toBeTruthy();
  });

  describe('loadSessionMessages', () => {
    it('carga mensajes y los revierte a orden cronológico', () => {
      const msg2 = { ...mockMessage, message_id: 'm2', content: 'Mundo' };
      httpAdapter.getSessionMessages.mockReturnValue(
        of({ messages: [msg2, mockMessage], pagination: mockPagination }),
      );

      facade.loadSessionMessages('session-1');

      expect(facade.messages()).toHaveLength(2);
      expect(facade.messages()[0].message_id).toBe('m1'); // invertido
      expect(facade.messages()[1].message_id).toBe('m2');
      expect(facade.loading()).toBe(false);
      expect(facade.hasMore()).toBe(false);
    });

    it('establece error si la petición falla', () => {
      httpAdapter.getSessionMessages.mockReturnValue(
        throwError(() => new Error('Network error')),
      );

      facade.loadSessionMessages('session-1');

      expect(facade.error()).toBe('Network error');
      expect(facade.loading()).toBe(false);
    });

    it('establece mensaje genérico si el error no es instancia de Error', () => {
      httpAdapter.getSessionMessages.mockReturnValue(throwError(() => 'unknown'));

      facade.loadSessionMessages('session-1');

      expect(facade.error()).toBe('Error al cargar mensajes');
    });
  });

  describe('sendMessage', () => {
    it('agrega el mensaje al estado', () => {
      httpAdapter.sendMessage.mockReturnValue(of(mockMessage));

      facade.sendMessage(mockPayload);

      expect(facade.messages()).toContainEqual(mockMessage);
      expect(facade.sending()).toBe(false);
    });

    it('no duplica si el mensaje ya existe', () => {
      httpAdapter.getSessionMessages.mockReturnValue(
        of({ messages: [mockMessage], pagination: mockPagination }),
      );
      facade.loadSessionMessages('session-1');

      httpAdapter.sendMessage.mockReturnValue(of(mockMessage));
      facade.sendMessage(mockPayload);

      expect(facade.messages()).toHaveLength(1);
    });

    it('establece error si falla el envío', () => {
      httpAdapter.sendMessage.mockReturnValue(throwError(() => new Error('Send failed')));

      facade.sendMessage(mockPayload);

      expect(facade.error()).toBe('Send failed');
      expect(facade.sending()).toBe(false);
    });
  });

  describe('searchMessages', () => {
    it('carga resultados de búsqueda', () => {
      httpAdapter.searchMessages.mockReturnValue(
        of({ messages: [mockMessage], pagination: mockPagination }),
      );

      facade.searchMessages({ keyword: 'Hola', session_id: 'session-1' });

      expect(facade.searchResults()).toHaveLength(1);
      expect(facade.searchLoading()).toBe(false);
    });

    it('establece error si la búsqueda falla', () => {
      httpAdapter.searchMessages.mockReturnValue(throwError(() => new Error('Search failed')));

      facade.searchMessages({ keyword: 'Hola' });

      expect(facade.error()).toBe('Search failed');
      expect(facade.searchLoading()).toBe(false);
    });
  });

  describe('clearError', () => {
    it('limpia el error del estado', () => {
      httpAdapter.getSessionMessages.mockReturnValue(throwError(() => new Error('fail')));
      facade.loadSessionMessages('session-1');
      expect(facade.error()).toBe('fail');

      facade.clearError();

      expect(facade.error()).toBeNull();
    });
  });

  describe('clearSearch', () => {
    it('limpia resultados y hasMore de búsqueda', () => {
      httpAdapter.searchMessages.mockReturnValue(
        of({ messages: [mockMessage], pagination: { ...mockPagination, has_more: true } }),
      );
      facade.searchMessages({ keyword: 'Hola' });
      expect(facade.searchResults()).toHaveLength(1);

      facade.clearSearch();

      expect(facade.searchResults()).toEqual([]);
      expect(facade.searchHasMore()).toBe(false);
    });
  });

  describe('connectWebSocket', () => {
    it('llama connect del adapter con el sessionId', () => {
      facade.connectWebSocket('session-1');
      expect(wsAdapter.connect).toHaveBeenCalledWith('session-1');
    });

    it('actualiza wsConnected cuando el observable emite', () => {
      facade.connectWebSocket('session-1');
      connected$.next(true);
      expect(facade.wsConnected()).toBe(true);

      connected$.next(false);
      expect(facade.wsConnected()).toBe(false);
    });

    it('agrega mensajes recibidos por WebSocket', () => {
      facade.connectWebSocket('session-1');
      wsMessages$.next(mockMessage);
      expect(facade.messages()).toContainEqual(mockMessage);
    });

    it('no duplica mensajes recibidos por WebSocket', () => {
      facade.connectWebSocket('session-1');
      wsMessages$.next(mockMessage);
      wsMessages$.next(mockMessage);
      expect(facade.messages()).toHaveLength(1);
    });
  });

  describe('loadOlderMessages', () => {
    it('no hace nada cuando loadingOlder es true', () => {
      httpAdapter.getSessionMessages.mockReturnValue(
        of({ messages: [mockMessage], pagination: { ...mockPagination, has_more: true } }),
      );
      facade.loadSessionMessages('session-1');
      // Forzamos loadingOlder=true vía una carga en progreso (mock sin respuesta inmediata)
      httpAdapter.getSessionMessages.mockReturnValue(new Subject());
      facade.loadOlderMessages(); // pone loadingOlder=true
      const callCount = httpAdapter.getSessionMessages.mock.calls.length;

      facade.loadOlderMessages(); // no debe disparar otra petición

      expect(httpAdapter.getSessionMessages.mock.calls.length).toBe(callCount);
    });

    it('no hace nada cuando hasMore es false', () => {
      httpAdapter.getSessionMessages.mockReturnValue(
        of({ messages: [mockMessage], pagination: mockPagination }), // has_more=false
      );
      facade.loadSessionMessages('session-1');
      const callCount = httpAdapter.getSessionMessages.mock.calls.length;

      facade.loadOlderMessages();

      expect(httpAdapter.getSessionMessages.mock.calls.length).toBe(callCount);
    });

    it('carga mensajes anteriores y los antepone', () => {
      const olderMsg = { ...mockMessage, message_id: 'm0', content: 'Antes' };
      httpAdapter.getSessionMessages.mockReturnValue(
        of({ messages: [mockMessage], pagination: { ...mockPagination, has_more: true } }),
      );
      facade.loadSessionMessages('session-1');

      httpAdapter.getSessionMessages.mockReturnValue(
        of({ messages: [olderMsg], pagination: mockPagination }),
      );
      facade.loadOlderMessages();

      expect(facade.messages()[0].message_id).toBe('m0');
      expect(facade.loadingOlder()).toBe(false);
    });

    it('establece error si la carga de mensajes anteriores falla', () => {
      httpAdapter.getSessionMessages.mockReturnValue(
        of({ messages: [mockMessage], pagination: { ...mockPagination, has_more: true } }),
      );
      facade.loadSessionMessages('session-1');

      httpAdapter.getSessionMessages.mockReturnValue(throwError(() => new Error('Older failed')));
      facade.loadOlderMessages();

      expect(facade.error()).toBe('Older failed');
      expect(facade.loadingOlder()).toBe(false);
    });

    it('establece mensaje genérico si el error de carga anterior no es Error', () => {
      httpAdapter.getSessionMessages.mockReturnValue(
        of({ messages: [mockMessage], pagination: { ...mockPagination, has_more: true } }),
      );
      facade.loadSessionMessages('session-1');

      httpAdapter.getSessionMessages.mockReturnValue(throwError(() => 'unknown'));
      facade.loadOlderMessages();

      expect(facade.error()).toBe('Error al cargar mensajes anteriores');
    });
  });

  describe('loadMoreSearchResults', () => {
    it('no hace nada cuando no hay búsqueda activa', () => {
      facade.loadMoreSearchResults();
      expect(httpAdapter.searchMessages).not.toHaveBeenCalled();
    });

    it('no hace nada cuando searchHasMore es false', () => {
      httpAdapter.searchMessages.mockReturnValue(
        of({ messages: [mockMessage], pagination: mockPagination }), // has_more=false
      );
      facade.searchMessages({ keyword: 'test' });
      const callCount = httpAdapter.searchMessages.mock.calls.length;

      facade.loadMoreSearchResults();

      expect(httpAdapter.searchMessages.mock.calls.length).toBe(callCount);
    });

    it('no hace nada cuando searchLoadingMore ya es true', () => {
      httpAdapter.searchMessages.mockReturnValue(
        of({ messages: [mockMessage], pagination: { ...mockPagination, has_more: true } }),
      );
      facade.searchMessages({ keyword: 'test' });

      httpAdapter.searchMessages.mockReturnValue(new Subject());
      facade.loadMoreSearchResults(); // pone searchLoadingMore=true
      const callCount = httpAdapter.searchMessages.mock.calls.length;

      facade.loadMoreSearchResults(); // no debe disparar otra petición

      expect(httpAdapter.searchMessages.mock.calls.length).toBe(callCount);
    });

    it('carga más resultados y los anexa a los existentes', () => {
      const msg2 = { ...mockMessage, message_id: 'm2', content: 'Más' };
      httpAdapter.searchMessages.mockReturnValue(
        of({ messages: [mockMessage], pagination: { ...mockPagination, has_more: true } }),
      );
      facade.searchMessages({ keyword: 'test' });

      httpAdapter.searchMessages.mockReturnValue(
        of({ messages: [msg2], pagination: mockPagination }),
      );
      facade.loadMoreSearchResults();

      expect(facade.searchResults()).toHaveLength(2);
      expect(facade.searchResults()[1].message_id).toBe('m2');
      expect(facade.searchLoadingMore()).toBe(false);
    });

    it('establece error si la carga de más resultados falla', () => {
      httpAdapter.searchMessages.mockReturnValue(
        of({ messages: [mockMessage], pagination: { ...mockPagination, has_more: true } }),
      );
      facade.searchMessages({ keyword: 'test' });

      httpAdapter.searchMessages.mockReturnValue(throwError(() => new Error('Load more failed')));
      facade.loadMoreSearchResults();

      expect(facade.error()).toBe('Load more failed');
      expect(facade.searchLoadingMore()).toBe(false);
    });

    it('establece mensaje genérico si el error de más resultados no es Error', () => {
      httpAdapter.searchMessages.mockReturnValue(
        of({ messages: [mockMessage], pagination: { ...mockPagination, has_more: true } }),
      );
      facade.searchMessages({ keyword: 'test' });

      httpAdapter.searchMessages.mockReturnValue(throwError(() => 'oops'));
      facade.loadMoreSearchResults();

      expect(facade.error()).toBe('Error al cargar más resultados');
    });
  });

  describe('disconnectWebSocket', () => {
    it('llama disconnect del adapter', () => {
      facade.disconnectWebSocket();
      expect(wsAdapter.disconnect).toHaveBeenCalled();
    });
  });

  describe('ngOnDestroy', () => {
    it('cancela suscripciones y desconecta el WebSocket', () => {
      facade.connectWebSocket('session-1');
      facade.ngOnDestroy();
      expect(wsAdapter.disconnect).toHaveBeenCalled();
    });
  });
});
