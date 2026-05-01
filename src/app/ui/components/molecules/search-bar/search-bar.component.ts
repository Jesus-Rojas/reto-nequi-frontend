import { Component, output } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InputComponent } from '@ui/components/atoms/input/input.component';
import { ButtonComponent, ButtonVariant } from '@ui/components/atoms/button/button.component';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [ReactiveFormsModule, InputComponent, ButtonComponent],
  template: `
    <div class="search-bar">
      <app-input
        [formControl]="searchControl"
        [placeholder]="'Buscar mensajes...'"
        [inputId]="'search-input'"
      />
      <app-button [variant]="ButtonVariant.Secondary" (clicked)="onClear()">Limpiar</app-button>
    </div>
  `,
  styleUrl: './search-bar.component.scss',
})
export class SearchBarComponent {
  searched = output<string>();
  cleared = output<void>();
  readonly ButtonVariant = ButtonVariant;

  searchControl = new FormControl('');

  constructor() {
    this.searchControl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntilDestroyed(),
    ).subscribe((value) => {
      if (value?.trim()) this.searched.emit(value.trim());
    });
  }

  onClear(): void {
    this.searchControl.reset('');
    this.cleared.emit();
  }
}
