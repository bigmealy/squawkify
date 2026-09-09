import { hueFor, initialsFor, songArtworkDataUrl } from './artwork';

describe('initialsFor', () => {
  it('takes the first letter of the first two words, uppercased', () => {
    expect(initialsFor('Hotel California')).toBe('HC');
  });

  it('falls back to the first two characters for a single-word title', () => {
    expect(initialsFor('Aja')).toBe('AJ');
  });

  it('returns an empty string for a blank title', () => {
    expect(initialsFor('   ')).toBe('');
  });
});

describe('hueFor', () => {
  it('is stable for the same id', () => {
    expect(hueFor('song-1')).toBe(hueFor('song-1'));
  });

  it('returns a value in [0, 360)', () => {
    for (const id of ['a', 'song-1', 'a-very-long-song-id-indeed']) {
      const hue = hueFor(id);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    }
  });
});

describe('songArtworkDataUrl', () => {
  it('returns null when canvas 2D rendering is unavailable (jsdom has no canvas support)', () => {
    expect(songArtworkDataUrl({ id: 's1', title: 'Song One' })).toBeNull();
  });
});
