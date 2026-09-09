// Formats a duration in seconds as m:ss (e.g. 65 -> "1:05"). Falls back to
// "0:00" for non-finite/negative input so a not-yet-loaded <audio> element
// (duration is NaN before 'loadedmetadata') doesn't render garbage.
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
