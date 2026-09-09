import { Song } from '../models/song';

// Up to the first letter of the first two words; falls back to the first two
// characters for a single-word title so every song gets at least one glyph.
export function initialsFor(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// Simple string hash → a stable 0-359 hue per song id, so each song gets a
// distinct-ish placeholder color without a hand-maintained palette.
export function hueFor(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
}

const ARTWORK_SIZE = 512;

// Renders a color-block + initials placeholder for lock-screen artwork.
// Returns null if canvas 2D rendering isn't available (e.g. under jsdom in
// tests) so callers can omit artwork rather than throw.
export function songArtworkDataUrl(song: Song): string | null {
  const canvas = document.createElement('canvas');
  canvas.width = ARTWORK_SIZE;
  canvas.height = ARTWORK_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = `hsl(${hueFor(song.id)}, 55%, 35%)`;
  ctx.fillRect(0, 0, ARTWORK_SIZE, ARTWORK_SIZE);

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${ARTWORK_SIZE * 0.4}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initialsFor(song.title), ARTWORK_SIZE / 2, ARTWORK_SIZE / 2);

  return canvas.toDataURL('image/png');
}
