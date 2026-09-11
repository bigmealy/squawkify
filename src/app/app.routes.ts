import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'practices' },
  {
    path: 'setlist',
    loadComponent: () =>
      import('./features/setlist/setlist-list/setlist-list').then((m) => m.SetlistList),
    data: { headerMode: 'list', headerTitle: 'Setlist' },
  },
  {
    path: 'setlist/:songId',
    loadComponent: () =>
      import('./features/setlist/setlist-detail/setlist-detail').then((m) => m.SetlistDetail),
    data: { headerMode: 'detail', backFallback: '/setlist' },
  },
  {
    path: 'practices',
    loadComponent: () =>
      import('./features/practices/practices-list/practices-list').then((m) => m.PracticesList),
    data: { headerMode: 'list', headerTitle: 'Practices' },
  },
  {
    path: 'practices/:practiceId',
    loadComponent: () =>
      import('./features/practices/practice-detail/practice-detail').then((m) => m.PracticeDetail),
    data: { headerMode: 'detail', backFallback: '/practices' },
  },
  { path: '**', redirectTo: 'practices' },
];
