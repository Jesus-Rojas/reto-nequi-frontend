import { messageFromApiResponse, paginatedMessagesFromApiResponse } from './message.mapper';
import { MessageSender } from '@domain/entities/message.entity';

const baseApiMessage = {
  message_id: 'abc-123',
  session_id: 'session-1',
  content: 'Hola mundo',
  timestamp: '2026-01-01T00:00:00Z',
  sender: MessageSender.User,
};

describe('messageFromApiResponse', () => {
  it('mapea correctamente los campos base', () => {
    const result = messageFromApiResponse(baseApiMessage);
    expect(result.message_id).toBe('abc-123');
    expect(result.session_id).toBe('session-1');
    expect(result.content).toBe('Hola mundo');
    expect(result.timestamp).toBe('2026-01-01T00:00:00Z');
    expect(result.sender).toBe(MessageSender.User);
  });

  it('no incluye metadata si no viene en la respuesta', () => {
    const result = messageFromApiResponse(baseApiMessage);
    expect(result.metadata).toBeUndefined();
  });

  it('mapea metadata cuando está presente', () => {
    const msgWithMeta = {
      ...baseApiMessage,
      metadata: {
        word_count: 2,
        character_count: 10,
        processed_at: '2026-01-01T00:00:01Z',
        is_filtered: false,
      },
    };
    const result = messageFromApiResponse(msgWithMeta);
    expect(result.metadata?.word_count).toBe(2);
    expect(result.metadata?.character_count).toBe(10);
    expect(result.metadata?.processed_at).toBe('2026-01-01T00:00:01Z');
    expect(result.metadata?.is_filtered).toBe(false);
  });

  it('mapea correctamente sender de tipo System', () => {
    const sysMessage = { ...baseApiMessage, sender: MessageSender.System };
    const result = messageFromApiResponse(sysMessage);
    expect(result.sender).toBe(MessageSender.System);
  });
});

describe('paginatedMessagesFromApiResponse', () => {
  it('mapea mensajes y paginación correctamente', () => {
    const apiResponse = {
      data: [baseApiMessage],
      pagination: { total: 1, limit: 20, offset: 0, has_more: false },
    };
    const result = paginatedMessagesFromApiResponse(apiResponse);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].message_id).toBe('abc-123');
    expect(result.pagination.total).toBe(1);
    expect(result.pagination.has_more).toBe(false);
  });

  it('retorna array vacío si no hay datos', () => {
    const apiResponse = {
      data: [],
      pagination: { total: 0, limit: 20, offset: 0, has_more: false },
    };
    const result = paginatedMessagesFromApiResponse(apiResponse);
    expect(result.messages).toHaveLength(0);
  });

  it('mapea has_more en true correctamente', () => {
    const apiResponse = {
      data: [baseApiMessage],
      pagination: { total: 50, limit: 20, offset: 0, has_more: true },
    };
    const result = paginatedMessagesFromApiResponse(apiResponse);
    expect(result.pagination.has_more).toBe(true);
    expect(result.pagination.total).toBe(50);
  });
});
