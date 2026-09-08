import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'setlist' },
  {
    path: 'setlist',
    loadComponent: () =>
      import('./features/setlist/setlist-list/setlist-list').then((m) => m.SetlistList),
  },
  {
    path: 'setlist/:songId',
    loadComponent: () =>
      import('./features/setlist/setlist-detail/setlist-detail').then((m) => m.SetlistDetail),
  },
  {
    path: 'practices',
    loadComponent: () =>
      import('./features/practices/practices-list/practices-list').then((m) => m.PracticesList),
  },
  {
    path: 'practices/:practiceId',
    loadComponent: () =>
      import('./features/practices/practice-detail/practice-detail').then((m) => m.PracticeDetail),
  },
  { path: '**', redirectTo: 'setlist' },
];
