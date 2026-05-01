export enum MessageSender {
  User = 'user',
  System = 'system',
}

export interface MessageMetadata {
  word_count: number;
  character_count: number;
  processed_at: string;
  is_filtered: boolean;
}

export interface Message {
  message_id: string;
  session_id: string;
  content: string;
  timestamp: string;
  sender: MessageSender;
  metadata?: MessageMetadata;
}

export interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface PaginatedMessages {
  messages: Message[];
  pagination: PaginationInfo;
}
