import { buildRecordingLink, buildShareTitle } from './recording-link';
import { JoinedRecording } from '../data/rehearsal-grouping';

function item(overrides: Partial<JoinedRecording> = {}): JoinedRecording {
  return {
    recording: { id: 'r1', songId: 's1', practiceId: 'p1', url: 'https://example.com/audio/r1.mp3' },
    song: { id: 's1', title: 'Song Title' },
    practice: { id: '2026-01-01', date: '2026-01-01', venue: 'Room 1' },
    ...overrides,
  };
}

describe('buildRecordingLink', () => {
  it('builds a practice-detail URL with the recording id as a take query param', () => {
    expect(buildRecordingLink(item(), 'https://squawkify.example')).toBe(
      'https://squawkify.example/practices/2026-01-01?take=r1',
    );
  });

  it('percent-encodes the practice id in the path', () => {
    const practice = { ...item().practice, id: '2026-01-01/weird' };
    expect(buildRecordingLink(item({ practice }), 'https://squawkify.example')).toBe(
      'https://squawkify.example/practices/2026-01-01%2Fweird?take=r1',
    );
  });

  it('never reads the origin itself, only the one passed in', () => {
    expect(buildRecordingLink(item(), 'https://other.example')).toContain('https://other.example/');
  });
});

describe('buildShareTitle', () => {
  it('combines song title and practice date with no take label', () => {
    expect(buildShareTitle(item())).toBe('Song Title — 2026-01-01');
  });

  it('includes the take label when present', () => {
    const recording = { ...item().recording, takeLabel: 'Take 2' };
    expect(buildShareTitle(item({ recording }))).toBe('Song Title (Take 2) — 2026-01-01');
  });
});
