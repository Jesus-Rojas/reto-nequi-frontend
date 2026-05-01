import { Component, input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="input-field">
      @if (label()) {
        <label [for]="inputId()" class="input-field__label">{{ label() }}</label>
      }
      <input
        [id]="inputId()"
        [type]="type()"
        [placeholder]="placeholder()"
        [disabled]="isDisabled"
        [value]="value"
        class="input-field__control"
        [class.input-field__control--error]="error()"
        (input)="onInput($event)"
        (blur)="onTouched()"
      />
      @if (error()) {
        <span class="input-field__error">{{ error() }}</span>
      }
    </div>
  `,
  styleUrl: './input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
})
export class InputComponent implements ControlValueAccessor {
  label = input('');
  type = input('text');
  placeholder = input('');
  error = input('');
  inputId = input(`input-${Math.random().toString(36).slice(2)}`);

  value = '';
  isDisabled = false;

  onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(value: string): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  onInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.value = val;
    this.onChange(val);
  }
}
