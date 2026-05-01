import { Component } from '@angular/core';

@Component({
  selector: 'app-spinner',
  standalone: true,
  template: `<div class="spinner"></div>`,
  styles: [`
    .spinner {
      width: 32px; height: 32px;
      border: 3px solid #eee;
      border-top-color: #e8144d;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class SpinnerComponent {}
