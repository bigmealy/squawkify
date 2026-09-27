import {
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { RehearsalData } from '../../../data/rehearsal-data';
import { JoinedRecording } from '../../../data/rehearsal-grouping';
import { PlayerState } from '../../../playback/player-state';
import { PlayPauseButton, PlayPauseState } from '../../../playback/play-pause-button/play-pause-button';
import { ShareLinkButton } from '../../../playback/share-link-button/share-link-button';
import { ShellState } from '../../../shell/shell-state';

@Component({
  selector: 'app-practice-detail',
  templateUrl: './practice-detail.html',
  styleUrl: './practice-detail.scss',
  imports: [PlayPauseButton, ShareLinkButton, RouterLink],
})
export class PracticeDetail {
  protected readonly data = inject(RehearsalData);
  private readonly player = inject(PlayerState);
  private readonly shellState = inject(ShellState);
  private readonly hostEl = inject(ElementRef<HTMLElement>);
  readonly practiceId = input.required<string>();
  // Bound from the `?take=` query param via withComponentInputBinding() —
  // set when this page was reached via a shared take link.
  readonly take = input<string | undefined>(undefined);

  protected readonly group = computed(() =>
    this.data.practicesWithRecordings().find((g) => g.practice.id === this.practiceId()),
  );

  protected readonly highlightedId = signal<string | null>(null);
  private highlightTimeoutId: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    effect(() => {
      const group = this.group();
      this.shellState.setDetailTitle(
        group ? `${group.practice.date} — ${group.practice.venue}` : '',
      );
    });

    effect(() => {
      const takeId = this.take();
      const group = this.group();
      if (!takeId || !group) return;
      // Stale/bad link (recording id no longer exists in this practice) —
      // fail silently rather than scrolling to nothing or throwing.
      if (!group.recordings.some((item) => item.recording.id === takeId)) return;

      queueMicrotask(() => {
        const target = this.hostEl.nativeElement.querySelector(`[data-recording-id="${takeId}"]`);
        if (!target) return;
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        this.highlightedId.set(takeId);
        clearTimeout(this.highlightTimeoutId);
        this.highlightTimeoutId = setTimeout(() => this.highlightedId.set(null), 2500);
      });
    });

    inject(DestroyRef).onDestroy(() => clearTimeout(this.highlightTimeoutId));
  }

  protected isActive(item: JoinedRecording): boolean {
    return this.player.current()?.recording.id === item.recording.id;
  }

  protected stateFor(item: JoinedRecording): PlayPauseState {
    if (!this.isActive(item)) return 'idle';
    if (this.player.isLoading()) return 'loading';
    return this.player.isPlaying() ? 'playing' : 'idle';
  }

  protected onToggle(item: JoinedRecording): void {
    this.player.togglePlayback(item, this.group()?.recordings);
  }

  protected onPlayAll(items: JoinedRecording[]): void {
    this.player.playAll(items);
  }
}
