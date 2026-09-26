import { buildDownloadFilename } from './download-filename';
import { JoinedRecording } from '../data/rehearsal-grouping';

function item(overrides: Partial<JoinedRecording> = {}): JoinedRecording {
  return {
    recording: { id: 'r1', songId: 's1', practiceId: 'p1', url: 'https://example.com/audio/r1.mp3' },
    song: { id: 's1', title: 'Song Title' },
    practice: { id: 'p1', date: '2026-01-01', venue: 'Room 1' },
    ...overrides,
  };
}

describe('buildDownloadFilename', () => {
  it('combines practice date and song title with no take label', () => {
    expect(buildDownloadFilename(item())).toBe('2026-01-01 Song Title.mp3');
  });

  it('appends the take label when present', () => {
    const recording = { ...item().recording, takeLabel: 'Take 2' };
    expect(buildDownloadFilename(item({ recording }))).toBe('2026-01-01 Song Title (Take 2).mp3');
  });

  it('derives the extension from the recording URL, ignoring the original filename', () => {
    const recording = {
      ...item().recording,
      url: "https://squawkfiy.blob.core.windows.net/squawkify/20260101/My%20Song%27s%20Take.wav",
    };
    expect(buildDownloadFilename(item({ recording }))).toBe('2026-01-01 Song Title.wav');
  });

  it('lower-cases an uppercase extension', () => {
    const recording = { ...item().recording, url: 'https://example.com/audio/r1.WAV' };
    expect(buildDownloadFilename(item({ recording }))).toBe('2026-01-01 Song Title.wav');
  });

  it('falls back to mp3 when the URL has no extension', () => {
    const recording = { ...item().recording, url: 'https://example.com/audio/r1' };
    expect(buildDownloadFilename(item({ recording }))).toBe('2026-01-01 Song Title.mp3');
  });

  it('sanitizes filesystem-unsafe characters in the song title', () => {
    const song = { ...item().song, title: 'Verse/Chorus: Take?' };
    expect(buildDownloadFilename(item({ song }))).toBe('2026-01-01 Verse-Chorus- Take-.mp3');
  });
});
