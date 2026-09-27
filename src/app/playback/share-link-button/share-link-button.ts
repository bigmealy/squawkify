import { Component, DestroyRef, inject, input, signal } from '@angular/core';
import { JoinedRecording } from '../../data/rehearsal-grouping';
import { buildRecordingLink, buildShareTitle } from '../recording-link';

@Component({
  selector: 'app-share-link-button',
  templateUrl: './share-link-button.html',
  styleUrl: './share-link-button.scss',
})
export class ShareLinkButton {
  readonly item = input.required<JoinedRecording>();

  protected readonly copied = signal(false);
  private copiedTimeoutId: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.copiedTimeoutId));
  }

  protected async onClick(): Promise<void> {
    const item = this.item();
    const url = buildRecordingLink(item, location.origin);
    const title = buildShareTitle(item);

    if (navigator.canShare?.({ url })) {
      try {
        await navigator.share({ url, title });
      } catch (err) {
        // User cancelling the share sheet throws AbortError — swallow it,
        // and any other share failure, rather than falling back to a copy
        // the user didn't ask for.
        if (!(err instanceof DOMException && err.name === 'AbortError')) throw err;
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      this.copied.set(true);
      clearTimeout(this.copiedTimeoutId);
      this.copiedTimeoutId = setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // Non-secure context / permission denied — low-stakes convenience
      // action, fail silently.
    }
  }
}
