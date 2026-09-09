import { formatTime } from './format-time';

describe('formatTime', () => {
  it('formats whole minutes and seconds', () => {
    expect(formatTime(65)).toBe('1:05');
  });

  it('pads seconds under 10', () => {
    expect(formatTime(5)).toBe('0:05');
  });

  it('floors fractional seconds', () => {
    expect(formatTime(59.9)).toBe('0:59');
  });

  it('handles minutes over 9', () => {
    expect(formatTime(725)).toBe('12:05');
  });

  it('falls back to 0:00 for non-finite or negative input', () => {
    expect(formatTime(NaN)).toBe('0:00');
    expect(formatTime(-5)).toBe('0:00');
    expect(formatTime(Infinity)).toBe('0:00');
  });
});
