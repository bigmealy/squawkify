import { Practice } from '../models/practice';
import { PracticeMinutes } from '../models/practice-minutes';
import { Recording } from '../models/recording';
import { Song } from '../models/song';

export interface JoinedRecording {
  recording: Recording;
  song: Song;
  practice: Practice;
}

export interface SongGroup {
  song: Song;
  recordings: JoinedRecording[];
}

export interface PracticeGroup {
  practice: Practice;
  recordings: JoinedRecording[];
  minutes: PracticeMinutes | undefined;
}

export function joinRecordings(
  songs: Song[],
  practices: Practice[],
  recordings: Recording[],
): JoinedRecording[] {
  const songsById = new Map(songs.map((song) => [song.id, song]));
  const practicesById = new Map(practices.map((practice) => [practice.id, practice]));

  const joined: JoinedRecording[] = [];
  for (const recording of recordings) {
    const song = songsById.get(recording.songId);
    const practice = practicesById.get(recording.practiceId);
    if (!song || !practice) {
      const missing = !song
        ? `songId "${recording.songId}"`
        : `practiceId "${recording.practiceId}"`;
      console.warn(`Skipping recording "${recording.id}": unresolved ${missing}`);
      continue;
    }
    joined.push({ recording, song, practice });
  }
  return joined;
}

export function groupBySong(songs: Song[], joined: JoinedRecording[]): SongGroup[] {
  return songs.map((song) => ({
    song,
    recordings: joined.filter((item) => item.song.id === song.id),
  }));
}

export function groupByPractice(
  practices: Practice[],
  joined: JoinedRecording[],
  minutes: PracticeMinutes[] = [],
): PracticeGroup[] {
  return practices.map((practice) => ({
    practice,
    recordings: joined.filter((item) => item.practice.id === practice.id),
    minutes: minutes.find((m) => m.practiceId === practice.id),
  }));
}

export function sortTakesMostRecentFirst(recordings: JoinedRecording[]): JoinedRecording[] {
  return [...recordings].sort((a, b) => b.practice.date.localeCompare(a.practice.date));
}

export function sortPracticesMostRecentFirst(practices: Practice[]): Practice[] {
  return [...practices].sort((a, b) => b.date.localeCompare(a.date));
}

// Relies on Array.prototype.sort's guaranteed stability: a comparator that
// returns 0 whenever either side lacks setOrder leaves those recordings in
// their original (manifest) relative position instead of pushing them to
// one end, which is the desired fallback for practices with no setOrder
// data at all.
export function sortRecordingsBySetOrder(recordings: JoinedRecording[]): JoinedRecording[] {
  return [...recordings].sort((a, b) => {
    const aOrder = a.recording.setOrder;
    const bOrder = b.recording.setOrder;
    if (aOrder === undefined || bOrder === undefined) {
      return 0;
    }
    return aOrder - bOrder;
  });
}
