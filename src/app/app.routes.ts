import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./ui/pages/home-page/home-page.component').then((m) => m.HomePageComponent),
  },
  {
    path: 'chat/:sessionId',
    loadComponent: () =>
      import('./ui/pages/chat-page/chat-page.component').then((m) => m.ChatPageComponent),
  },
  { path: '**', redirectTo: '' },
];
