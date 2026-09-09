import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RehearsalData } from '../../../data/rehearsal-data';
import { PlayerState } from '../../../playback/player-state';

@Component({
  selector: 'app-practices-list',
  imports: [RouterLink],
  templateUrl: './practices-list.html',
  styleUrl: './practices-list.scss',
})
export class PracticesList {
  protected readonly data = inject(RehearsalData);
  private readonly player = inject(PlayerState);

  protected isActivePractice(practiceId: string): boolean {
    return this.player.current()?.practice.id === practiceId;
  }
}
