import { Injectable, computed } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { Song } from '../models/song';
import { Practice } from '../models/practice';
import { Recording } from '../models/recording';
import {
  groupByPractice,
  groupBySong,
  joinRecordings,
  PracticeGroup,
  SongGroup,
  sortPracticesMostRecentFirst,
  sortRecordingsBySetOrder,
  sortTakesMostRecentFirst,
} from './rehearsal-grouping';

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

  private readonly joinedRecordings = computed(() =>
    joinRecordings(this.songs(), this.practices(), this.recordings()),
  );

  readonly songsWithRecordings = computed<SongGroup[]>(() =>
    groupBySong(this.songs(), this.joinedRecordings()).map((group) => ({
      ...group,
      recordings: sortTakesMostRecentFirst(group.recordings),
    })),
  );

  readonly practicesWithRecordings = computed<PracticeGroup[]>(() =>
    groupByPractice(sortPracticesMostRecentFirst(this.practices()), this.joinedRecordings()).map(
      (group) => ({
        ...group,
        recordings: sortRecordingsBySetOrder(group.recordings),
      }),
    ),
  );
}
