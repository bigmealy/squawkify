import { Component, DestroyRef, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

// Checks for a new deployed version whenever the app becomes visible again
// (the common case for an iOS home-screen install: it's resumed from the
// background rather than freshly launched) and periodically while it stays
// in the foreground, then prompts the user to reload once one is downloaded
// and ready to activate.
@Component({
  selector: 'app-update-toast',
  styleUrl: './update-toast.scss',
  templateUrl: './update-toast.html',
})
export class UpdateToast {
  private readonly swUpdate = inject(SwUpdate);

  protected readonly updateReady = signal(false);

  constructor() {
    if (!this.swUpdate.isEnabled) return;

    this.swUpdate.versionUpdates
      .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
      .subscribe(() => this.updateReady.set(true));

    // The app itself is now on a version the service worker can no longer
    // update from (e.g. its own cached resources were evicted) — reload
    // straight away rather than waiting for the user to notice anything.
    this.swUpdate.unrecoverable.subscribe(() => this.reload());

    const checkForUpdate = () => void this.swUpdate.checkForUpdate().catch(() => {});
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    const intervalId = setInterval(checkForUpdate, 30 * 60 * 1000);

    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearInterval(intervalId);
    });
  }

  protected reload(): void {
    document.location.reload();
  }
}
