import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { HttpMessageAdapter } from './http-message.adapter';
import { MessageSender } from '@domain/entities/message.entity';
import { SendMessagePayload } from '@domain/ports/message.repository';

const apiMessage = {
  message_id: 'm1',
  session_id: 's1',
  content: 'Hola',
  timestamp: '2026-01-01T00:00:00Z',
  sender: MessageSender.User,
};

const payload: SendMessagePayload = {
  message_id: 'm1',
  session_id: 's1',
  content: 'Hola',
  timestamp: '2026-01-01T00:00:00Z',
  sender: MessageSender.User,
};

const emptyPagination = { total: 0, limit: 20, offset: 0, has_more: false };

describe('HttpMessageAdapter', () => {
  let adapter: HttpMessageAdapter;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        HttpMessageAdapter,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    adapter = TestBed.inject(HttpMessageAdapter);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('sendMessage', () => {
    it('hace POST a /api/messages con el payload', () => {
      adapter.sendMessage(payload).subscribe();

      const req = httpMock.expectOne((r) => r.url.endsWith('/api/messages'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush({ status: 'ok', data: apiMessage });
    });

    it('mapea correctamente la respuesta al dominio', () => {
      let result: ReturnType<typeof Object.assign> | undefined;
      adapter.sendMessage(payload).subscribe((msg) => (result = msg));

      const req = httpMock.expectOne((r) => r.url.endsWith('/api/messages'));
      req.flush({ status: 'ok', data: apiMessage });

      expect(result?.message_id).toBe('m1');
      expect(result?.content).toBe('Hola');
      expect(result?.sender).toBe(MessageSender.User);
    });

    it('incluye el header X-API-Key', () => {
      adapter.sendMessage(payload).subscribe();

      const req = httpMock.expectOne((r) => r.url.endsWith('/api/messages'));
      expect(req.request.headers.get('X-API-Key')).toBeTruthy();
      req.flush({ status: 'ok', data: apiMessage });
    });

    it('mapea mensaje con metadata cuando la respuesta la incluye', () => {
      const withMeta = {
        ...apiMessage,
        metadata: { word_count: 1, character_count: 4, processed_at: '2026-01-01T00:00:01Z', is_filtered: false },
      };
      let result: ReturnType<typeof Object.assign> | undefined;
      adapter.sendMessage(payload).subscribe((msg) => (result = msg));

      const req = httpMock.expectOne((r) => r.url.endsWith('/api/messages'));
      req.flush({ status: 'ok', data: withMeta });

      expect(result?.metadata?.word_count).toBe(1);
    });
  });

  describe('getSessionMessages', () => {
    it('hace GET a /api/messages/:sessionId', () => {
      adapter.getSessionMessages('session-1').subscribe();

      const req = httpMock.expectOne((r) => r.url.includes('/api/messages/session-1'));
      expect(req.request.method).toBe('GET');
      req.flush({ status: 'ok', data: [], pagination: emptyPagination });
    });

    it('mapea mensajes y paginación de la respuesta', () => {
      let result: ReturnType<typeof Object.assign> | undefined;
      adapter.getSessionMessages('session-1').subscribe((r) => (result = r));

      const req = httpMock.expectOne((r) => r.url.includes('/api/messages/session-1'));
      req.flush({ status: 'ok', data: [apiMessage], pagination: { total: 1, limit: 20, offset: 0, has_more: true } });

      expect(result?.messages).toHaveLength(1);
      expect(result?.pagination.has_more).toBe(true);
    });

    it('no incluye parámetros cuando no se pasan opciones', () => {
      adapter.getSessionMessages('session-1').subscribe();

      const req = httpMock.expectOne((r) => r.url.includes('/api/messages/session-1'));
      expect(req.request.params.has('sender')).toBe(false);
      expect(req.request.params.has('limit')).toBe(false);
      expect(req.request.params.has('offset')).toBe(false);
      req.flush({ status: 'ok', data: [], pagination: emptyPagination });
    });

    it('incluye sender cuando se especifica', () => {
      adapter.getSessionMessages('session-1', { sender: MessageSender.User }).subscribe();

      const req = httpMock.expectOne((r) => r.url.includes('/api/messages/session-1'));
      expect(req.request.params.get('sender')).toBe('user');
      req.flush({ status: 'ok', data: [], pagination: emptyPagination });
    });

    it('incluye limit y offset cuando se especifican', () => {
      adapter.getSessionMessages('session-1', { limit: 10, offset: 20 }).subscribe();

      const req = httpMock.expectOne((r) => r.url.includes('/api/messages/session-1'));
      expect(req.request.params.get('limit')).toBe('10');
      expect(req.request.params.get('offset')).toBe('20');
      req.flush({ status: 'ok', data: [], pagination: emptyPagination });
    });

    it('incluye order cuando se especifica', () => {
      adapter.getSessionMessages('session-1', { order: 'desc' }).subscribe();

      const req = httpMock.expectOne((r) => r.url.includes('/api/messages/session-1'));
      expect(req.request.params.get('order')).toBe('desc');
      req.flush({ status: 'ok', data: [], pagination: emptyPagination });
    });

    it('incluye todos los parámetros opcionales a la vez', () => {
      adapter.getSessionMessages('session-1', { sender: MessageSender.System, limit: 5, offset: 15, order: 'asc' }).subscribe();

      const req = httpMock.expectOne((r) => r.url.includes('/api/messages/session-1'));
      expect(req.request.params.get('sender')).toBe('system');
      expect(req.request.params.get('limit')).toBe('5');
      expect(req.request.params.get('offset')).toBe('15');
      expect(req.request.params.get('order')).toBe('asc');
      req.flush({ status: 'ok', data: [], pagination: emptyPagination });
    });
  });

  describe('searchMessages', () => {
    it('hace GET a /api/messages/search con keyword obligatorio', () => {
      adapter.searchMessages({ keyword: 'hola' }).subscribe();

      const req = httpMock.expectOne((r) => r.url.includes('/api/messages/search'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('keyword')).toBe('hola');
      req.flush({ status: 'ok', data: [], pagination: emptyPagination });
    });

    it('no incluye parámetros opcionales si no se proveen', () => {
      adapter.searchMessages({ keyword: 'test' }).subscribe();

      const req = httpMock.expectOne((r) => r.url.includes('/api/messages/search'));
      expect(req.request.params.has('session_id')).toBe(false);
      expect(req.request.params.has('limit')).toBe(false);
      expect(req.request.params.has('offset')).toBe(false);
      req.flush({ status: 'ok', data: [], pagination: emptyPagination });
    });

    it('incluye session_id cuando se provee', () => {
      adapter.searchMessages({ keyword: 'test', session_id: 'session-1' }).subscribe();

      const req = httpMock.expectOne((r) => r.url.includes('/api/messages/search'));
      expect(req.request.params.get('session_id')).toBe('session-1');
      req.flush({ status: 'ok', data: [], pagination: emptyPagination });
    });

    it('incluye limit y offset cuando se proveen', () => {
      adapter.searchMessages({ keyword: 'test', limit: 5, offset: 10 }).subscribe();

      const req = httpMock.expectOne((r) => r.url.includes('/api/messages/search'));
      expect(req.request.params.get('limit')).toBe('5');
      expect(req.request.params.get('offset')).toBe('10');
      req.flush({ status: 'ok', data: [], pagination: emptyPagination });
    });

    it('incluye todos los parámetros opcionales a la vez', () => {
      adapter.searchMessages({ keyword: 'hola', session_id: 's1', limit: 20, offset: 40 }).subscribe();

      const req = httpMock.expectOne((r) => r.url.includes('/api/messages/search'));
      expect(req.request.params.get('keyword')).toBe('hola');
      expect(req.request.params.get('session_id')).toBe('s1');
      expect(req.request.params.get('limit')).toBe('20');
      expect(req.request.params.get('offset')).toBe('40');
      req.flush({ status: 'ok', data: [], pagination: emptyPagination });
    });

    it('mapea correctamente los resultados de búsqueda', () => {
      let result: ReturnType<typeof Object.assign> | undefined;
      adapter.searchMessages({ keyword: 'Hola' }).subscribe((r) => (result = r));

      const req = httpMock.expectOne((r) => r.url.includes('/api/messages/search'));
      req.flush({ status: 'ok', data: [apiMessage], pagination: { total: 1, limit: 20, offset: 0, has_more: false } });

      expect(result?.messages).toHaveLength(1);
      expect(result?.messages[0].content).toBe('Hola');
    });
  });
});
