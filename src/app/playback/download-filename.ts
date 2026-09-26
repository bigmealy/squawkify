import { JoinedRecording } from '../data/rehearsal-grouping';

const UNSAFE_FILENAME_CHARS = /[/\\:*?"<>|]/g;

export function buildDownloadFilename(current: JoinedRecording): string {
  const { song, recording, practice } = current;
  const base = recording.takeLabel
    ? `${practice.date} ${song.title} (${recording.takeLabel})`
    : `${practice.date} ${song.title}`;

  const sanitizedBase = base.replace(UNSAFE_FILENAME_CHARS, '-').replace(/\s+/g, ' ').trim();

  return `${sanitizedBase}.${extensionFor(recording.url)}`;
}

function extensionFor(url: string): string {
  const path = decodeURIComponent(new URL(url).pathname);
  const dot = path.lastIndexOf('.');
  return dot === -1 ? 'mp3' : path.slice(dot + 1).toLowerCase();
}
