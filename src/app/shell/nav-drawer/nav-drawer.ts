import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ShellState } from '../shell-state';

// Uses the native <dialog> + showModal() rather than hand-rolled focus-trap
// JS: for a 2-item menu, <dialog> already gives free focus trapping,
// Escape-to-close (via the 'cancel' event), and an implicit modal role.
@Component({
  selector: 'app-nav-drawer',
  imports: [RouterLink, RouterLinkActive],
  styleUrl: './nav-drawer.scss',
  templateUrl: './nav-drawer.html',
})
export class NavDrawer {
  protected readonly shellState = inject(ShellState);
  private readonly drawerEl = viewChild.required<ElementRef<HTMLDialogElement>>('drawerEl');

  constructor() {
    effect(() => {
      const dialog = this.drawerEl().nativeElement;
      if (this.shellState.drawerOpen() && !dialog.open) {
        dialog.showModal();
      }
      if (!this.shellState.drawerOpen() && dialog.open) {
        dialog.close();
      }
    });
  }

  // The dialog's own click bubbles here for clicks anywhere inside its box
  // (including the ::backdrop, which is outside the element's border box but
  // still dispatches through it) — only close when the click target is the
  // dialog itself, not one of its children.
  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === this.drawerEl().nativeElement) {
      this.shellState.closeDrawer();
    }
  }
}
