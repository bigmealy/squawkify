import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RehearsalData } from '../../../data/rehearsal-data';

@Component({
  selector: 'app-setlist-detail',
  imports: [RouterLink],
  templateUrl: './setlist-detail.html',
})
export class SetlistDetail {
  protected readonly data = inject(RehearsalData);
  readonly songId = input.required<string>();

  protected readonly group = computed(() =>
    this.data.songsWithRecordings().find((g) => g.song.id === this.songId()),
  );
}
