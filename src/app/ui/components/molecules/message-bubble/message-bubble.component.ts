import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Message, MessageSender } from '@domain/entities/message.entity';
import { BadgeComponent } from '@ui/components/atoms/badge/badge.component';

@Component({
  selector: 'app-message-bubble',
  standalone: true,
  imports: [DatePipe, BadgeComponent],
  template: `
    <div class="bubble" [class.bubble--user]="message().sender === Sender.User" [class.bubble--system]="message().sender === Sender.System">
      <div class="bubble__header">
        <app-badge
          [variant]="message().metadata?.is_filtered ? 'filtered' : message().sender"
          [label]="message().metadata?.is_filtered ? 'filtrado' : message().sender"
        />
        <span class="bubble__time">{{ message().timestamp | date:'HH:mm' }}</span>
      </div>
      <p class="bubble__content">{{ message().content }}</p>
      @if (message().metadata; as meta) {
        <div class="bubble__meta">
          {{ meta.word_count }} palabras · {{ meta.character_count }} caracteres
        </div>
      }
    </div>
  `,
  styleUrl: './message-bubble.component.scss',
})
export class MessageBubbleComponent {
  message = input.required<Message>();
  readonly Sender = MessageSender;
}
