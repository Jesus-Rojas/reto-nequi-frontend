import { Observable } from 'rxjs';
import { Message } from '../entities/message.entity';

export abstract class MessageWebSocketPort {
  abstract connect(sessionId: string): void;
  abstract disconnect(): void;
  abstract messages$(): Observable<Message>;
  abstract isConnected$(): Observable<boolean>;
}
