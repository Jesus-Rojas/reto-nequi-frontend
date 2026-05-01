import { Component, input, output, effect, ElementRef, ViewChild } from '@angular/core';
import { Message } from '@domain/entities/message.entity';
import { MessageBubbleComponent } from '@ui/components/molecules/message-bubble/message-bubble.component';
import { SpinnerComponent } from '@ui/components/atoms/spinner/spinner.component';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [MessageBubbleComponent, SpinnerComponent],
  template: `
    <div #scrollContainer class="chat-window" (scroll)="onScroll()">
      @if (loadingOlder()) {
        <div class="chat-window__loading-older">
          <app-spinner />
        </div>
      }

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
export class ChatWindowComponent {
  messages = input<Message[]>([]);
  loading = input(false);
  loadingOlder = input(false);

  loadOlder = output<void>();

  @ViewChild('scrollContainer') private readonly scrollContainer!: ElementRef<HTMLDivElement>;

  private prevScrollHeight = 0;
  private wasLoadingOlder = false;
  private prevMessageCount = 0;
  private shouldScrollToBottom = true;

  constructor() {
    // Al terminar de cargar mensajes más nuevos → scroll al fondo
    // Al terminar de cargar más antiguos → restaurar posición de scroll
    effect(() => {
      const isLoadingOlder = this.loadingOlder();
      const msgCount = this.messages().length;

      if (!isLoadingOlder && this.wasLoadingOlder) {
        // Acaba de terminar la carga de más antiguos: restaurar posición
        requestAnimationFrame(() => {
          const el = this.scrollContainer?.nativeElement;
          if (!el) return;
          el.scrollTop = el.scrollHeight - this.prevScrollHeight;
        });
      } else if (!this.wasLoadingOlder && msgCount > this.prevMessageCount) {
        // Mensaje nuevo al fondo (envío o WS): scroll al fondo solo si ya estaba abajo
        if (this.shouldScrollToBottom) {
          requestAnimationFrame(() => {
            const el = this.scrollContainer?.nativeElement;
            if (!el) return;
            el.scrollTop = el.scrollHeight;
          });
        }
      }

      this.wasLoadingOlder = isLoadingOlder;
      this.prevMessageCount = msgCount;
    });

    // Primer render: siempre bajar al fondo
    effect(() => {
      this.messages(); // track
      if (!this.wasLoadingOlder) {
        requestAnimationFrame(() => {
          const el = this.scrollContainer?.nativeElement;
          if (el && this.shouldScrollToBottom) {
            el.scrollTop = el.scrollHeight;
          }
        });
      }
    });
  }

  onScroll(): void {
    const el = this.scrollContainer?.nativeElement;
    if (!el) return;

    // Detectar si está cerca del fondo (dentro de 80px)
    this.shouldScrollToBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;

    // Detectar scroll al tope → cargar más antiguos
    if (el.scrollTop < 40 && !this.loadingOlder()) {
      this.prevScrollHeight = el.scrollHeight;
      this.loadOlder.emit();
    }
  }
}

