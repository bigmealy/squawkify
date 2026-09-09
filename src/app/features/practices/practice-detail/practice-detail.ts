import { Component, computed, effect, inject, input } from '@angular/core';
import { RehearsalData } from '../../../data/rehearsal-data';
import { JoinedRecording } from '../../../data/rehearsal-grouping';
import { PlayerState } from '../../../playback/player-state';
import { ShellState } from '../../../shell/shell-state';

@Component({
  selector: 'app-practice-detail',
  templateUrl: './practice-detail.html',
  styleUrl: './practice-detail.scss',
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

  protected onPlay(item: JoinedRecording): void {
    this.player.play(item);
  }

  protected onPlayAll(items: JoinedRecording[]): void {
    this.player.playAll(items);
  }
}
