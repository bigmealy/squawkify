import { JoinedRecording } from '../data/rehearsal-grouping';

export function buildRecordingLink(item: JoinedRecording, origin: string): string {
  const params = new URLSearchParams({ take: item.recording.id });
  return `${origin}/practices/${encodeURIComponent(item.practice.id)}?${params}`;
}

export function buildShareTitle(item: JoinedRecording): string {
  const { song, recording, practice } = item;
  return recording.takeLabel
    ? `${song.title} (${recording.takeLabel}) — ${practice.date}`
    : `${song.title} — ${practice.date}`;
}
