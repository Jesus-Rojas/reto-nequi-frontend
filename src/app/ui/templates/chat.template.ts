import { Component, input, output } from '@angular/core';
import { Message } from '@domain/entities/message.entity';
import { ChatWindowComponent } from '@ui/components/organisms/chat-window/chat-window.component';
import { SearchPanelComponent } from '@ui/components/organisms/search-panel/search-panel.component';
import { MessageFormComponent, MessageFormValue } from '@ui/components/molecules/message-form/message-form.component';

@Component({
  selector: 'app-chat-template',
  standalone: true,
  imports: [ChatWindowComponent, SearchPanelComponent, MessageFormComponent],
  template: `
    <div class="chat-layout">
      <header class="chat-layout__header">
        <span class="chat-layout__session">Sesión: <strong>{{ sessionId() }}</strong></span>
        <span class="chat-layout__ws" [class.chat-layout__ws--on]="wsConnected()">
          {{ wsConnected() ? '● En vivo' : '○ Desconectado' }}
        </span>
      </header>

      <div class="chat-layout__body">
        <div class="chat-layout__main">
          <app-chat-window [messages]="messages()" [loading]="loading()" />
          <app-message-form
            [sessionId]="sessionId()"
            [loading]="sending()"
            (messageSent)="messageSent.emit($event)"
          />
        </div>
        <app-search-panel
          [results]="searchResults()"
          [loading]="searchLoading()"
          [hasSearched]="hasSearched()"
          (searched)="searched.emit($event)"
          (cleared)="searchCleared.emit()"
        />
      </div>

      @if (error()) {
        <div class="chat-layout__error">
          {{ error() }}
          <button (click)="errorDismissed.emit()">&#x2715;</button>
        </div>
      }
    </div>
  `,
  styleUrl: './chat.template.scss',
})
export class ChatTemplate {
  sessionId = input.required<string>();
  messages = input<Message[]>([]);
  loading = input(false);
  sending = input(false);
  wsConnected = input(false);
  searchResults = input<Message[]>([]);
  searchLoading = input(false);
  hasSearched = input(false);
  error = input<string | null>(null);

  messageSent = output<MessageFormValue>();
  searched = output<string>();
  searchCleared = output<void>();
  errorDismissed = output<void>();
}
