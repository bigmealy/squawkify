import { JoinedRecording } from '../data/rehearsal-grouping';
import { songArtworkDataUrl } from './artwork';

export function buildMediaMetadata(current: JoinedRecording): MediaMetadata {
  const { song, recording, practice } = current;
  const title = recording.takeLabel ? `${song.title} (${recording.takeLabel})` : song.title;
  const album = `${practice.label ?? practice.venue} — ${practice.date}`;
  const artworkUrl = songArtworkDataUrl(song);

  return new MediaMetadata({
    title,
    album,
    artwork: artworkUrl ? [{ src: artworkUrl, sizes: '512x512', type: 'image/png' }] : [],
  });
}
