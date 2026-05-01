import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@env/environment';
import { MessageRepository, SendMessagePayload, GetMessagesParams, SearchMessagesParams } from '@domain/ports/message.repository';
import { Message, PaginatedMessages } from '@domain/entities/message.entity';
import { messageFromApiResponse, paginatedMessagesFromApiResponse } from '@infra/mappers/message.mapper';

@Injectable({ providedIn: 'root' })
export class HttpMessageAdapter implements MessageRepository {
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly headers = {
    'X-API-Key': environment.apiKey,
    'Content-Type': 'application/json',
  };

  constructor(private readonly http: HttpClient) {}

  sendMessage(payload: SendMessagePayload): Observable<Message> {
    return this.http
      .post<{ status: string; data: unknown }>(`${this.baseUrl}/api/messages`, payload, { headers: this.headers })
      .pipe(map((res) => messageFromApiResponse(res.data)));
  }

  getSessionMessages(sessionId: string, params: GetMessagesParams = {}): Observable<PaginatedMessages> {
    let httpParams = new HttpParams();

    if (params.sender) httpParams = httpParams.set('sender', params.sender);
    if (params.limit != null) httpParams = httpParams.set('limit', params.limit.toString());
    if (params.offset != null) httpParams = httpParams.set('offset', params.offset.toString());

    return this.http
      .get<{ status: string; data: unknown[]; pagination: unknown }>(
        `${this.baseUrl}/api/messages/${sessionId}`,
        { headers: this.headers, params: httpParams }
      )
      .pipe(map((res) => paginatedMessagesFromApiResponse(res)));
  }

  searchMessages(params: SearchMessagesParams): Observable<PaginatedMessages> {
    let httpParams = new HttpParams().set('keyword', params.keyword);

    if (params.session_id) httpParams = httpParams.set('session_id', params.session_id);
    if (params.limit != null) httpParams = httpParams.set('limit', params.limit.toString());
    if (params.offset != null) httpParams = httpParams.set('offset', params.offset.toString());

    return this.http
      .get<{ status: string; data: unknown[]; pagination: unknown }>(
        `${this.baseUrl}/api/messages/search`,
        { headers: this.headers, params: httpParams }
      )
      .pipe(map((res) => paginatedMessagesFromApiResponse(res)));
  }
}
