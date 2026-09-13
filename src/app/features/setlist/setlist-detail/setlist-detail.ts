import { Component, computed, effect, inject, input } from '@angular/core';
import { RehearsalData } from '../../../data/rehearsal-data';
import { JoinedRecording } from '../../../data/rehearsal-grouping';
import { PlayerState } from '../../../playback/player-state';
import { PlayPauseButton, PlayPauseState } from '../../../playback/play-pause-button/play-pause-button';
import { ShellState } from '../../../shell/shell-state';

@Component({
  selector: 'app-setlist-detail',
  templateUrl: './setlist-detail.html',
  styleUrl: './setlist-detail.scss',
  imports: [PlayPauseButton],
})
export class SetlistDetail {
  protected readonly data = inject(RehearsalData);
  private readonly player = inject(PlayerState);
  private readonly shellState = inject(ShellState);
  readonly songId = input.required<string>();

  protected readonly group = computed(() =>
    this.data.songsWithRecordings().find((g) => g.song.id === this.songId()),
  );

  constructor() {
    effect(() => {
      const group = this.group();
      this.shellState.setDetailTitle(group ? group.song.title : '');
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
    this.player.togglePlayback(item);
  }
}
