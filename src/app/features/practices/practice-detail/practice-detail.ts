import { Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RehearsalData } from '../../../data/rehearsal-data';
import { JoinedRecording } from '../../../data/rehearsal-grouping';
import { PlayerState } from '../../../playback/player-state';
import { PlayPauseButton, PlayPauseState } from '../../../playback/play-pause-button/play-pause-button';
import { ShellState } from '../../../shell/shell-state';

@Component({
  selector: 'app-practice-detail',
  templateUrl: './practice-detail.html',
  styleUrl: './practice-detail.scss',
  imports: [PlayPauseButton, RouterLink],
})
export class PracticeDetail {
  protected readonly data = inject(RehearsalData);
  private readonly player = inject(PlayerState);
  private readonly shellState = inject(ShellState);
  readonly practiceId = input.required<string>();

  protected readonly group = computed(() =>
    this.data.practicesWithRecordings().find((g) => g.practice.id === this.practiceId()),
  );

  constructor() {
    effect(() => {
      const group = this.group();
      this.shellState.setDetailTitle(
        group ? `${group.practice.date} — ${group.practice.venue}` : '',
      );
    });
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
