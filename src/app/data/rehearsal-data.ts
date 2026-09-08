import { Injectable, computed } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { Song } from '../models/song';
import { Practice } from '../models/practice';
import { Recording } from '../models/recording';

@Injectable({ providedIn: 'root' })
export class RehearsalData {
  private readonly songsResource = httpResource<Song[]>(() => 'data/songs.json', {
    defaultValue: [],
  });
  private readonly practicesResource = httpResource<Practice[]>(() => 'data/practices.json', {
    defaultValue: [],
  });
  private readonly recordingsResource = httpResource<Recording[]>(() => 'data/recordings.json', {
    defaultValue: [],
  });

  readonly songs = this.songsResource.value;
  readonly practices = this.practicesResource.value;
  readonly recordings = this.recordingsResource.value;

  readonly isLoading = computed(
    () =>
      this.songsResource.isLoading() ||
      this.practicesResource.isLoading() ||
      this.recordingsResource.isLoading(),
  );

  readonly error = computed(
    () =>
      this.songsResource.error() ??
      this.practicesResource.error() ??
      this.recordingsResource.error(),
  );
}
