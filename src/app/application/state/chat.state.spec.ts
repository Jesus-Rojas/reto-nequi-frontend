import { TestBed } from '@angular/core/testing';
import { createChatState } from './chat.state';
import { MessageSender } from '@domain/entities/message.entity';

function buildState() {
  return TestBed.runInInjectionContext(() => createChatState());
}

describe('createChatState', () => {
  it('tiene valores iniciales correctos', () => {
    const s = buildState();
    expect(s.messages()).toEqual([]);
    expect(s.loading()).toBe(false);
    expect(s.sending()).toBe(false);
    expect(s.loadingOlder()).toBe(false);
    expect(s.hasMore()).toBe(false);
    expect(s.error()).toBeNull();
    expect(s.wsConnected()).toBe(false);
    expect(s.pagination()).toBeNull();
    expect(s.searchResults()).toEqual([]);
    expect(s.searchLoading()).toBe(false);
    expect(s.searchLoadingMore()).toBe(false);
    expect(s.searchHasMore()).toBe(false);
  });

  it('patch actualiza loading y error', () => {
    const s = buildState();
    s.patch({ loading: true, error: 'algo falló' });
    expect(s.loading()).toBe(true);
    expect(s.error()).toBe('algo falló');
    expect(s.sending()).toBe(false);
  });

  it('patch actualiza sending sin afectar otros campos', () => {
    const s = buildState();
    s.patch({ sending: true });
    expect(s.sending()).toBe(true);
    expect(s.loading()).toBe(false);
    expect(s.error()).toBeNull();
  });

  it('patch actualiza wsConnected', () => {
    const s = buildState();
    s.patch({ wsConnected: true });
    expect(s.wsConnected()).toBe(true);
  });

  it('patch actualiza messages y hasMore', () => {
    const s = buildState();
    const msg = {
      message_id: 'm1',
      session_id: 's1',
      content: 'Hola',
      timestamp: '2026-01-01T00:00:00Z',
      sender: MessageSender.User,
    };
    s.patch({ messages: [msg], hasMore: true });
    expect(s.messages()).toHaveLength(1);
    expect(s.messages()[0].content).toBe('Hola');
    expect(s.hasMore()).toBe(true);
  });

  it('patch actualiza estado de búsqueda', () => {
    const s = buildState();
    s.patch({ searchLoading: true, searchHasMore: true, searchLoadingMore: false });
    expect(s.searchLoading()).toBe(true);
    expect(s.searchHasMore()).toBe(true);
    expect(s.searchLoadingMore()).toBe(false);
  });

  it('múltiples patch acumulan cambios correctamente', () => {
    const s = buildState();
    s.patch({ loading: true });
    s.patch({ loading: false, error: 'fallo' });
    expect(s.loading()).toBe(false);
    expect(s.error()).toBe('fallo');
  });
});
