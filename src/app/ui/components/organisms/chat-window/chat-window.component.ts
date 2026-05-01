import { Component, input, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { Message } from '@domain/entities/message.entity';
import { MessageBubbleComponent } from '@ui/components/molecules/message-bubble/message-bubble.component';
import { SpinnerComponent } from '@ui/components/atoms/spinner/spinner.component';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [MessageBubbleComponent, SpinnerComponent],
  template: `
    <div #scrollContainer class="chat-window">
      @if (loading()) {
        <div class="chat-window__loading">
          <app-spinner />
        </div>
      }

      @if (!loading() && messages().length === 0) {
        <p class="chat-window__empty">No hay mensajes en esta sesión aún.</p>
      }

      @if (!loading()) {
        @for (msg of messages(); track msg.message_id) {
          <app-message-bubble [message]="msg" />
        }
      }
    </div>
  `,
  styleUrl: './chat-window.component.scss',
})
export class ChatWindowComponent implements AfterViewChecked {
  messages = input<Message[]>([]);
  loading = input(false);

  @ViewChild('scrollContainer') private readonly scrollContainer!: ElementRef<HTMLDivElement>;

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    const el = this.scrollContainer?.nativeElement;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }
}
