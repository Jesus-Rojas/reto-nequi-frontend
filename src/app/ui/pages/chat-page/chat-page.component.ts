import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ChatFacade } from '@application/facades/chat.facade';
import { ChatTemplate } from '@ui/templates/chat.template';
import { MessageFormValue } from '@ui/components/molecules/message-form/message-form.component';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [ChatTemplate],
  template: `
    <app-chat-template
      [sessionId]="sessionId()"
      [messages]="facade.messages()"
      [loading]="facade.loading()"
      [sending]="facade.sending()"
      [loadingOlder]="facade.loadingOlder()"
      [wsConnected]="facade.wsConnected()"
      [searchResults]="facade.searchResults()"
      [searchLoading]="facade.searchLoading()"
      [searchLoadingMore]="facade.searchLoadingMore()"
      [hasSearched]="hasSearched()"
      [error]="facade.error()"
      (messageSent)="onMessageSent($event)"
      (loadOlder)="facade.loadOlderMessages()"
      (searched)="onSearch($event)"
      (searchLoadMore)="facade.loadMoreSearchResults()"
      (searchCleared)="onSearchCleared()"
      (errorDismissed)="facade.clearError()"
    />
  `,
})
export class ChatPageComponent implements OnInit, OnDestroy {
  readonly sessionId = signal('');
  readonly hasSearched = signal(false);

  constructor(
    readonly facade: ChatFacade,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('sessionId') ?? 'default-session';
    this.sessionId.set(id);
    this.facade.loadSessionMessages(id);
    this.facade.connectWebSocket(id);
  }

  onMessageSent(value: MessageFormValue): void {
    this.facade.sendMessage(value);
  }

  onSearch(keyword: string): void {
    this.hasSearched.set(true);
    this.facade.searchMessages({ keyword, session_id: this.sessionId() });
  }

  onSearchCleared(): void {
    this.hasSearched.set(false);
    this.facade.clearSearch();
  }

  ngOnDestroy(): void {
    this.facade.disconnectWebSocket();
  }
}
