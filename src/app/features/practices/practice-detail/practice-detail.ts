import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RehearsalData } from '../../../data/rehearsal-data';
import { JoinedRecording } from '../../../data/rehearsal-grouping';
import { PlayerState } from '../../../playback/player-state';

@Component({
  selector: 'app-practice-detail',
  imports: [RouterLink],
  templateUrl: './practice-detail.html',
})
export class PracticeDetail {
  protected readonly data = inject(RehearsalData);
  private readonly player = inject(PlayerState);
  readonly practiceId = input.required<string>();

  protected readonly group = computed(() =>
    this.data.practicesWithRecordings().find((g) => g.practice.id === this.practiceId()),
  );

  protected onPlay(item: JoinedRecording): void {
    this.player.play(item);
  }
}
