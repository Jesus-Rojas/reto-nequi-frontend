import { Observable } from 'rxjs';
import { Message, PaginatedMessages, MessageSender } from '../entities/message.entity';

export interface SendMessagePayload {
  message_id: string;
  session_id: string;
  content: string;
  timestamp: string;
  sender: MessageSender;
}

export interface GetMessagesParams {
  sender?: MessageSender;
  limit?: number;
  offset?: number;
}

export interface SearchMessagesParams {
  keyword: string;
  session_id?: string;
  limit?: number;
  offset?: number;
}

export abstract class MessageRepository {
  abstract sendMessage(payload: SendMessagePayload): Observable<Message>;
  abstract getSessionMessages(sessionId: string, params?: GetMessagesParams): Observable<PaginatedMessages>;
  abstract searchMessages(params: SearchMessagesParams): Observable<PaginatedMessages>;
}
