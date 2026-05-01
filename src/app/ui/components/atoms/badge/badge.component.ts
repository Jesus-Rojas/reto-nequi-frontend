import { Component, input } from '@angular/core';
import { MessageSender } from '@domain/entities/message.entity';

export type BadgeVariant = MessageSender | 'filtered';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [],
  template: `<span class="badge badge--{{ variant() }}">{{ label() }}</span>`,
  styleUrl: './badge.component.scss',
})
export class BadgeComponent {
  variant = input<BadgeVariant>(MessageSender.User);
  label = input('');
}
