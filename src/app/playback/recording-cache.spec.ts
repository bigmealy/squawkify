import { vi } from 'vitest';
import { warmRecordingCache } from './recording-cache';

// jsdom doesn't implement `navigator.serviceWorker` at all, so it has to be
// defined (and torn down) per test rather than spied on.
function setServiceWorker(value: unknown): void {
  Object.defineProperty(navigator, 'serviceWorker', { value, configurable: true });
}

describe('warmRecordingCache', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'serviceWorker');
    vi.restoreAllMocks();
  });

  it('does nothing when there is no service worker at all', () => {
    const fetchSpy = vi.spyOn(window, 'fetch');

    warmRecordingCache('https://example.com/recording.m4a');

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('does nothing when the service worker has no controller yet', () => {
    setServiceWorker({ controller: null });
    const fetchSpy = vi.spyOn(window, 'fetch');

    warmRecordingCache('https://example.com/recording.m4a');

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fires a headerless no-cors fetch when a service worker controls the page', () => {
    setServiceWorker({ controller: {} });
    const fetchSpy = vi.spyOn(window, 'fetch').mockResolvedValue(new Response());

    warmRecordingCache('https://example.com/recording.m4a');

    expect(fetchSpy).toHaveBeenCalledExactlyOnceWith('https://example.com/recording.m4a', {
      mode: 'no-cors',
    });
  });

  it('swallows a rejected fetch rather than throwing', () => {
    setServiceWorker({ controller: {} });
    vi.spyOn(window, 'fetch').mockRejectedValue(new Error('network error'));

    expect(() => warmRecordingCache('https://example.com/recording.m4a')).not.toThrow();
  });
});
