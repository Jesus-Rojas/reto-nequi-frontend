import { Component, computed, input, output, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InputComponent } from '@ui/components/atoms/input/input.component';
import { ButtonComponent, ButtonType } from '@ui/components/atoms/button/button.component';
import { generateMessageId } from '@shared/utils/id.utils';
import { MessageSender } from '@domain/entities/message.entity';

export interface MessageFormValue {
  message_id: string;
  session_id: string;
  content: string;
  timestamp: string;
  sender: MessageSender;
}

@Component({
  selector: 'app-message-form',
  standalone: true,
  imports: [ReactiveFormsModule, InputComponent, ButtonComponent],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="message-form">
      <app-input
        formControlName="content"
        [placeholder]="'Escribe un mensaje...'"
        [error]="contentError()"
      />
      <div class="message-form__actions">
        <select formControlName="sender" class="message-form__select">
          <option [value]="Sender.User">user</option>
          <option [value]="Sender.System">system</option>
        </select>
        <app-button [type]="ButtonType.Submit" [disabled]="form.invalid" [loading]="loading()">
          Enviar
        </app-button>
      </div>
    </form>
  `,
  styleUrl: './message-form.component.scss',
})
export class MessageFormComponent implements OnInit {
  sessionId = input.required<string>();
  loading = input(false);
  messageSent = output<MessageFormValue>();
  readonly Sender = MessageSender;
  readonly ButtonType = ButtonType;

  form!: FormGroup;

  constructor(private readonly fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      content: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(10000)]],
      sender: [MessageSender.User, Validators.required],
    });
  }

  contentError = computed(() => {
    const ctrl = this.form?.get('content');
    if (!ctrl?.touched || !ctrl.errors) return '';
    if (ctrl.errors['required']) return 'El mensaje no puede estar vacío';
    if (ctrl.errors['maxlength']) return 'Máximo 10.000 caracteres';
    return '';
  });

  onSubmit(): void {
    if (this.form.invalid) return;

    const { content, sender } = this.form.value as { content: string; sender: MessageSender };

    this.messageSent.emit({
      message_id: generateMessageId(),
      session_id: this.sessionId(),
      content,
      timestamp: new Date().toISOString(),
      sender,
    });

    this.form.reset({ content: '', sender: MessageSender.User });
  }
}
