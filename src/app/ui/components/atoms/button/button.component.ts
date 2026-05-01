import { Component, computed, input, output } from '@angular/core';

export enum ButtonVariant {
  Primary = 'primary',
  Secondary = 'secondary',
  Danger = 'danger',
}

export enum ButtonType {
  Button = 'button',
  Submit = 'submit',
  Reset = 'reset',
}

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [],
  template: `
    <button
      [type]="type()"
      [disabled]="disabled() || loading()"
      [class]="buttonClass()"
      (click)="clicked.emit($event)"
    >
      @if (loading()) {
        <span class="btn__spinner"></span>
      }
      <ng-content />
    </button>
  `,
  styleUrl: './button.component.scss',
})
export class ButtonComponent {
  type = input<ButtonType>(ButtonType.Button);
  variant = input<ButtonVariant>(ButtonVariant.Primary);
  disabled = input(false);
  loading = input(false);
  clicked = output<MouseEvent>();

  buttonClass = computed(
    () => `btn btn--${this.variant()}${this.disabled() || this.loading() ? ' btn--disabled' : ''}`
  );
}
