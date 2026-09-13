import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MiniPlayer } from './mini-player';
import { PlayerState } from '../player-state';
import { JoinedRecording } from '../../data/rehearsal-grouping';

function mockFetchResolved(): ReturnType<typeof vi.spyOn> {
  return vi
    .spyOn(window, 'fetch')
    .mockResolvedValue(new Response(new Blob(['fake-audio-bytes'], { type: 'audio/mpeg' })));
}

describe('MiniPlayer', () => {
  beforeEach(async () => {
    // Every play()/playAll() now triggers a real fetch() in the prefetch
    // effect — give it a default mock so tests that don't care about the
    // fetch itself don't hang or leave an unhandled rejection. jsdom has
    // `fetch`/`Response` already, but not `URL.createObjectURL`/
    // `revokeObjectURL`, so those need direct assignment rather than
    // `vi.spyOn`.
    mockFetchResolved();
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = vi.fn();

    await TestBed.configureTestingModule({
      imports: [MiniPlayer],
    }).compileComponents();
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'serviceWorker');
    Reflect.deleteProperty(URL, 'createObjectURL');
    Reflect.deleteProperty(URL, 'revokeObjectURL');
    vi.restoreAllMocks();
  });

  it('renders the <audio> element even before any recording is selected', () => {
    const fixture = TestBed.createComponent(MiniPlayer);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('audio')).toBeTruthy();
    expect(compiled.querySelector('.mini-player')?.classList).toContain('mini-player--hidden');
  });

  it('shows the current track once a recording is selected', () => {
    const fixture = TestBed.createComponent(MiniPlayer);
    fixture.detectChanges();

    const item: JoinedRecording = {
      recording: { id: 'r1', songId: 's1', practiceId: 'p1', url: 'https://example.com/r1.mp3' },
      song: { id: 's1', title: 'Song One' },
      practice: { id: 'p1', date: '2026-01-01', venue: 'Room 1' },
    };
    TestBed.inject(PlayerState).play(item);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.mini-player')?.classList).not.toContain('mini-player--hidden');
    expect(compiled.textContent).toContain('Song One');
  });

  it('auto-advances to the next queued track when the current one ends', () => {
    const fixture = TestBed.createComponent(MiniPlayer);
    fixture.detectChanges();

    const item1: JoinedRecording = {
      recording: { id: 'r1', songId: 's1', practiceId: 'p1', url: 'https://example.com/r1.mp3' },
      song: { id: 's1', title: 'Song One' },
      practice: { id: 'p1', date: '2026-01-01', venue: 'Room 1' },
    };
    const item2: JoinedRecording = {
      recording: { id: 'r2', songId: 's2', practiceId: 'p1', url: 'https://example.com/r2.mp3' },
      song: { id: 's2', title: 'Song Two' },
      practice: { id: 'p1', date: '2026-01-01', venue: 'Room 1' },
    };
    TestBed.inject(PlayerState).playAll([item1, item2]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector('audio')!.dispatchEvent(new Event('ended'));
    fixture.detectChanges();

    expect(compiled.textContent).toContain('Song Two');
  });

  it('prefetches the recording as a blob and assigns the blob URL to the <audio> element', async () => {
    const fetchSpy = mockFetchResolved();
    const fixture = TestBed.createComponent(MiniPlayer);
    fixture.detectChanges();

    const item: JoinedRecording = {
      recording: { id: 'r1', songId: 's1', practiceId: 'p1', url: 'https://example.com/r1.mp3' },
      song: { id: 's1', title: 'Song One' },
      practice: { id: 'p1', date: '2026-01-01', venue: 'Room 1' },
    };
    TestBed.inject(PlayerState).play(item);
    fixture.detectChanges();

    await vi.waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledExactlyOnceWith('https://example.com/r1.mp3', expect.anything());
    });
    const [, options] = fetchSpy.mock.calls[0];
    expect((options as RequestInit).mode).not.toBe('no-cors');

    const audio = fixture.nativeElement.querySelector('audio')!;
    await vi.waitFor(() => expect(audio.src).toContain('blob:mock-url'));
  });

  it('falls back to the raw recording URL when the prefetch fails', async () => {
    vi.spyOn(window, 'fetch').mockRejectedValue(new Error('network error'));
    const fixture = TestBed.createComponent(MiniPlayer);
    fixture.detectChanges();

    const item: JoinedRecording = {
      recording: { id: 'r1', songId: 's1', practiceId: 'p1', url: 'https://example.com/r1.mp3' },
      song: { id: 's1', title: 'Song One' },
      practice: { id: 'p1', date: '2026-01-01', venue: 'Room 1' },
    };
    TestBed.inject(PlayerState).play(item);
    fixture.detectChanges();

    const audio = fixture.nativeElement.querySelector('audio')!;
    await vi.waitFor(() => expect(audio.src).toBe('https://example.com/r1.mp3'));
  });

  it('aborts a stale prefetch when the track is skipped before it resolves', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation((_input, init) => {
      const signal = (init as RequestInit | undefined)?.signal;
      return new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      });
    });

    const fixture = TestBed.createComponent(MiniPlayer);
    fixture.detectChanges();

    const item1: JoinedRecording = {
      recording: { id: 'r1', songId: 's1', practiceId: 'p1', url: 'https://example.com/r1.mp3' },
      song: { id: 's1', title: 'Song One' },
      practice: { id: 'p1', date: '2026-01-01', venue: 'Room 1' },
    };
    const item2: JoinedRecording = {
      recording: { id: 'r2', songId: 's2', practiceId: 'p1', url: 'https://example.com/r2.mp3' },
      song: { id: 's2', title: 'Song Two' },
      practice: { id: 'p1', date: '2026-01-01', venue: 'Room 1' },
    };

    TestBed.inject(PlayerState).play(item1);
    fixture.detectChanges();

    fetchSpy.mockResolvedValueOnce(new Response(new Blob(['fake-audio-bytes'])));
    TestBed.inject(PlayerState).play(item2);
    fixture.detectChanges();

    const audio = fixture.nativeElement.querySelector('audio')!;
    await vi.waitFor(() => expect(audio.src).toContain('blob:mock-url'));
    // Never got a chance to be assigned track 1's data — track 2 owns the
    // element's src, and track 1's aborted fetch never reached this point.
    expect(audio.src).not.toBe('https://example.com/r1.mp3');
  });

  it('shows a loading spinner while prefetching and clears it once the blob is assigned', async () => {
    let resolveFetch!: (response: Response) => void;
    vi.spyOn(window, 'fetch').mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const fixture = TestBed.createComponent(MiniPlayer);
    fixture.detectChanges();

    const item: JoinedRecording = {
      recording: { id: 'r1', songId: 's1', practiceId: 'p1', url: 'https://example.com/r1.mp3' },
      song: { id: 's1', title: 'Song One' },
      practice: { id: 'p1', date: '2026-01-01', venue: 'Room 1' },
    };
    TestBed.inject(PlayerState).play(item);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.play-pause-button__spinner')).toBeTruthy();

    resolveFetch(new Response(new Blob(['fake-audio-bytes'])));
    await vi.waitFor(() => {
      expect(compiled.querySelector('.play-pause-button__spinner')).toBeFalsy();
    });
  });

  it('clears the loading spinner on a buffering stall and again on error', async () => {
    const fixture = TestBed.createComponent(MiniPlayer);
    fixture.detectChanges();

    const item: JoinedRecording = {
      recording: { id: 'r1', songId: 's1', practiceId: 'p1', url: 'https://example.com/r1.mp3' },
      song: { id: 's1', title: 'Song One' },
      practice: { id: 'p1', date: '2026-01-01', venue: 'Room 1' },
    };
    TestBed.inject(PlayerState).play(item);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const audio = compiled.querySelector('audio')!;

    // Let the initial prefetch complete first — waiting/error are now a
    // post-load safety net, not the initial-load signal.
    await vi.waitFor(() => expect((audio as HTMLAudioElement).src).toContain('blob:mock-url'));

    audio.dispatchEvent(new Event('waiting'));
    fixture.detectChanges();
    expect(compiled.querySelector('.play-pause-button__spinner')).toBeTruthy();

    audio.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(compiled.querySelector('.play-pause-button__spinner')).toBeFalsy();
  });

  it('clicking the play/pause button pauses and resumes the underlying audio element', async () => {
    const fixture = TestBed.createComponent(MiniPlayer);
    fixture.detectChanges();

    const item: JoinedRecording = {
      recording: { id: 'r1', songId: 's1', practiceId: 'p1', url: 'https://example.com/r1.mp3' },
      song: { id: 's1', title: 'Song One' },
      practice: { id: 'p1', date: '2026-01-01', venue: 'Room 1' },
    };
    TestBed.inject(PlayerState).play(item);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const audio = compiled.querySelector('audio') as HTMLAudioElement;
    await vi.waitFor(() => expect(audio.src).toContain('blob:mock-url'));

    const pauseSpy = vi.spyOn(audio, 'pause');
    const playSpy = vi.spyOn(audio, 'play').mockReturnValue(undefined as unknown as Promise<void>);
    const button = compiled.querySelector<HTMLButtonElement>('.play-pause-button')!;

    button.click();
    expect(pauseSpy).toHaveBeenCalledOnce();

    // Simulate the real <audio> "pause" event that would follow, since
    // isPlaying() only ever mirrors actual playback state.
    audio.dispatchEvent(new Event('pause'));
    fixture.detectChanges();

    button.click();
    expect(playSpy).toHaveBeenCalledOnce();
  });

  it('previous/next buttons are disabled for single-track playback', () => {
    const fixture = TestBed.createComponent(MiniPlayer);
    fixture.detectChanges();

    const item: JoinedRecording = {
      recording: { id: 'r1', songId: 's1', practiceId: 'p1', url: 'https://example.com/r1.mp3' },
      song: { id: 's1', title: 'Song One' },
      practice: { id: 'p1', date: '2026-01-01', venue: 'Room 1' },
    };
    TestBed.inject(PlayerState).play(item);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const prevBtn = compiled.querySelector<HTMLButtonElement>('.mini-player__nav--prev');
    const nextBtn = compiled.querySelector<HTMLButtonElement>('.mini-player__nav--next');
    expect(prevBtn?.disabled).toBe(true);
    expect(nextBtn?.disabled).toBe(true);
  });

  it('next is enabled and previous is disabled at the start of a queue', () => {
    const fixture = TestBed.createComponent(MiniPlayer);
    fixture.detectChanges();

    const item1: JoinedRecording = {
      recording: { id: 'r1', songId: 's1', practiceId: 'p1', url: 'https://example.com/r1.mp3' },
      song: { id: 's1', title: 'Song One' },
      practice: { id: 'p1', date: '2026-01-01', venue: 'Room 1' },
    };
    const item2: JoinedRecording = {
      recording: { id: 'r2', songId: 's2', practiceId: 'p1', url: 'https://example.com/r2.mp3' },
      song: { id: 's2', title: 'Song Two' },
      practice: { id: 'p1', date: '2026-01-01', venue: 'Room 1' },
    };
    TestBed.inject(PlayerState).playAll([item1, item2]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector<HTMLButtonElement>('.mini-player__nav--prev')?.disabled).toBe(true);
    expect(compiled.querySelector<HTMLButtonElement>('.mini-player__nav--next')?.disabled).toBe(false);
  });

  it('clicking next advances the queue and clicking previous returns to the prior track', () => {
    const fixture = TestBed.createComponent(MiniPlayer);
    fixture.detectChanges();

    const item1: JoinedRecording = {
      recording: { id: 'r1', songId: 's1', practiceId: 'p1', url: 'https://example.com/r1.mp3' },
      song: { id: 's1', title: 'Song One' },
      practice: { id: 'p1', date: '2026-01-01', venue: 'Room 1' },
    };
    const item2: JoinedRecording = {
      recording: { id: 'r2', songId: 's2', practiceId: 'p1', url: 'https://example.com/r2.mp3' },
      song: { id: 's2', title: 'Song Two' },
      practice: { id: 'p1', date: '2026-01-01', venue: 'Room 1' },
    };
    TestBed.inject(PlayerState).playAll([item1, item2]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('.mini-player__nav--next')!.click();
    fixture.detectChanges();
    expect(compiled.textContent).toContain('Song Two');
    expect(compiled.querySelector<HTMLButtonElement>('.mini-player__nav--next')?.disabled).toBe(true);

    compiled.querySelector<HTMLButtonElement>('.mini-player__nav--prev')!.click();
    fixture.detectChanges();
    expect(compiled.textContent).toContain('Song One');
    expect(compiled.querySelector<HTMLButtonElement>('.mini-player__nav--prev')?.disabled).toBe(true);
  });
});
