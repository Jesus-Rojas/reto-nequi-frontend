import { Component, computed } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InputComponent } from '@ui/components/atoms/input/input.component';
import { ButtonComponent, ButtonType } from '@ui/components/atoms/button/button.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [ReactiveFormsModule, InputComponent, ButtonComponent],
  template: `
    <div class="home">
      <div class="home__card">
        <img src="assets/nequi-logo.svg" alt="Nequi" class="home__logo" />
        <h1 class="home__title">Chat de mensajes</h1>
        <p class="home__subtitle">Ingresa un ID de sesión para continuar</p>
        <form [formGroup]="form" (ngSubmit)="onEnter()" class="home__form">
          <app-input
            formControlName="sessionId"
            [label]="'ID de sesión'"
            [placeholder]="'Ej: session-abc123'"
            [error]="sessionError()"
          />
          <app-button [type]="ButtonType.Submit" [disabled]="form.invalid">Entrar al chat</app-button>
        </form>
      </div>
    </div>
  `,
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent {
  form: FormGroup;

  readonly ButtonType = ButtonType;

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
  ) {
    this.form = this.fb.group({
      sessionId: ['', [Validators.required, Validators.minLength(3)]],
    });
  }

  sessionError = computed(() => {
    const ctrl = this.form?.get('sessionId');
    if (!ctrl?.touched || !ctrl.errors) return '';
    if (ctrl.errors['required']) return 'El ID de sesión es obligatorio';
    if (ctrl.errors['minlength']) return 'Mínimo 3 caracteres';
    return '';
  });

  onEnter(): void {
    if (this.form.invalid) return;
    const { sessionId } = this.form.value as { sessionId: string };
    this.router.navigate(['/chat', sessionId.trim()]);
  }
}
