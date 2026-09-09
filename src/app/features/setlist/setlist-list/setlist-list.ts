import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RehearsalData } from '../../../data/rehearsal-data';
import { PlayerState } from '../../../playback/player-state';
import { hueFor } from '../../../playback/artwork';

@Component({
  selector: 'app-setlist-list',
  imports: [RouterLink],
  templateUrl: './setlist-list.html',
  styleUrl: './setlist-list.scss',
})
export class SetlistList {
  protected readonly data = inject(RehearsalData);
  private readonly player = inject(PlayerState);

  protected isActiveSong(songId: string): boolean {
    return this.player.current()?.song.id === songId;
  }

  protected swatchColor(songId: string): string {
    return `hsl(${hueFor(songId)}, 55%, 35%)`;
  }
}
