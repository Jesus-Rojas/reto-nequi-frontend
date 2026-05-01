import { Component, input, output } from '@angular/core';
import { Message } from '@domain/entities/message.entity';
import { SearchBarComponent } from '@ui/components/molecules/search-bar/search-bar.component';
import { MessageBubbleComponent } from '@ui/components/molecules/message-bubble/message-bubble.component';
import { SpinnerComponent } from '@ui/components/atoms/spinner/spinner.component';

@Component({
  selector: 'app-search-panel',
  standalone: true,
  imports: [SearchBarComponent, MessageBubbleComponent, SpinnerComponent],
  template: `
    <aside class="search-panel">
      <h3 class="search-panel__title">Buscar mensajes</h3>
      <app-search-bar (searched)="searched.emit($event)" (cleared)="cleared.emit()" />

      <div class="search-panel__results">
        @if (loading()) {
          <app-spinner />
        }

        @if (!loading() && results().length === 0 && hasSearched()) {
          <p class="search-panel__empty">Sin resultados.</p>
        }

        @if (!loading()) {
          @for (msg of results(); track msg.message_id) {
            <app-message-bubble [message]="msg" />
          }
        }
      </div>
    </aside>
  `,
  styleUrl: './search-panel.component.scss',
})
export class SearchPanelComponent {
  results = input<Message[]>([]);
  loading = input(false);
  hasSearched = input(false);
  searched = output<string>();
  cleared = output<void>();
}
