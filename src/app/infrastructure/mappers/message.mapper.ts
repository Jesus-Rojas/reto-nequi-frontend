import { Message, MessageMetadata, PaginatedMessages, PaginationInfo, MessageSender } from '@domain/entities/message.entity';

interface ApiMetadata {
  word_count: number;
  character_count: number;
  processed_at: string;
  is_filtered: boolean;
}

interface ApiMessageData {
  message_id: string;
  session_id: string;
  content: string;
  timestamp: string;
  sender: MessageSender;
  metadata?: ApiMetadata;
}

interface ApiPaginatedResponse {
  data: unknown[];
  pagination: unknown;
}

export function messageFromApiResponse(data: unknown): Message {
  const msg = data as ApiMessageData;
  const result: Message = {
    message_id: msg.message_id,
    session_id: msg.session_id,
    content: msg.content,
    timestamp: msg.timestamp,
    sender: msg.sender,
  };

  if (msg.metadata) {
    result.metadata = metadataFromApi(msg.metadata);
  }

  return result;
}

function metadataFromApi(meta: ApiMetadata): MessageMetadata {
  return {
    word_count: meta.word_count,
    character_count: meta.character_count,
    processed_at: meta.processed_at,
    is_filtered: meta.is_filtered,
  };
}

export function paginatedMessagesFromApiResponse(res: ApiPaginatedResponse): PaginatedMessages {
  const pagination = res.pagination as PaginationInfo;
  return {
    messages: res.data.map((item) => messageFromApiResponse(item)),
    pagination,
  };
}
