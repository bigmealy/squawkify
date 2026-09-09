import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RehearsalData } from '../../../data/rehearsal-data';
import { JoinedRecording } from '../../../data/rehearsal-grouping';
import { PlayerState } from '../../../playback/player-state';

@Component({
  selector: 'app-setlist-detail',
  imports: [RouterLink],
  templateUrl: './setlist-detail.html',
})
export class SetlistDetail {
  protected readonly data = inject(RehearsalData);
  private readonly player = inject(PlayerState);
  readonly songId = input.required<string>();

  protected readonly group = computed(() =>
    this.data.songsWithRecordings().find((g) => g.song.id === this.songId()),
  );

  protected onPlay(item: JoinedRecording): void {
    this.player.play(item);
  }
}
