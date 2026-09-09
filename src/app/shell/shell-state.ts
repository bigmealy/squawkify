import { computed, Injectable, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

export type HeaderMode = 'list' | 'detail';

// Single source of truth for the app-shell chrome (header mode/title, drawer
// open state) so `Header` and `NavDrawer` stay presentational. Route `data`
// (set in app.routes.ts) drives mode/title/backFallback — cheap and reliable
// versus re-deriving them from URL matching in the header itself.
@Injectable({ providedIn: 'root' })
export class ShellState {
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  readonly drawerOpen = signal(false);
  readonly headerMode = signal<HeaderMode>('list');
  readonly listTitle = signal('Squawkify');
  readonly detailTitle = signal('');
  readonly backFallback = signal('/setlist');

  // Counts completed navigations so goBack() can tell a real "came from
  // somewhere in this session" back from a cold load straight into a detail
  // route (e.g. a deep link), where there's no history to pop.
  private readonly navigationCount = signal(0);

  readonly headerTitle = computed(() =>
    this.headerMode() === 'detail' ? this.detailTitle() : this.listTitle(),
  );

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.navigationCount.update((count) => count + 1);
      this.drawerOpen.set(false);

      let route = this.router.routerState.snapshot.root;
      while (route.firstChild) route = route.firstChild;
      this.headerMode.set((route.data['headerMode'] as HeaderMode | undefined) ?? 'list');
      this.listTitle.set((route.data['headerTitle'] as string | undefined) ?? 'Squawkify');
      this.backFallback.set((route.data['backFallback'] as string | undefined) ?? '/setlist');
    });
  }

  openDrawer(): void {
    this.drawerOpen.set(true);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  toggleDrawer(): void {
    this.drawerOpen.update((open) => !open);
  }

  setDetailTitle(title: string): void {
    this.detailTitle.set(title);
  }

  goBack(): void {
    if (this.navigationCount() > 1) {
      this.location.back();
    } else {
      this.router.navigateByUrl(this.backFallback());
    }
  }
}
