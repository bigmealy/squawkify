import {
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { PlayerState } from '../player-state';
import { buildMediaMetadata } from '../media-session';
import { formatTime } from '../format-time';
import { PlayPauseButton, PlayPauseState } from '../play-pause-button/play-pause-button';

const hasMediaSession = () => 'mediaSession' in navigator;

@Component({
  selector: 'app-mini-player',
  styleUrl: './mini-player.scss',
  templateUrl: './mini-player.html',
  imports: [PlayPauseButton],
})
export class MiniPlayer {
  protected readonly player = inject(PlayerState);
  private readonly audioRef = viewChild.required<ElementRef<HTMLAudioElement>>('audioEl');
  private readonly destroyRef = inject(DestroyRef);

  protected readonly currentTime = signal(0);
  protected readonly duration = signal(0);
  protected readonly formattedCurrentTime = computed(() => formatTime(this.currentTime()));
  protected readonly formattedDuration = computed(() => formatTime(this.duration()));
  protected readonly playPauseState = computed<PlayPauseState>(() => {
    if (this.player.isLoading()) return 'loading';
    return this.player.isPlaying() ? 'playing' : 'idle';
  });

  // Tracks the blob URL currently (or most recently) assigned to the <audio>
  // element, so it can be revoked once superseded — see the effect below.
  private currentObjectUrl: string | null = null;

  constructor() {
    effect((onCleanup) => {
      // Must be read synchronously, before any `await` below — Angular only
      // tracks signal reads made during an effect's synchronous execution.
      const current = this.player.current();
      if (!current) return;

      this.currentTime.set(0);
      this.duration.set(0);
      this.player.setLoading(true);

      const controller = new AbortController();
      // Aborts a still-in-flight prefetch when the user skips to another
      // track before it resolves, or when the component is destroyed.
      onCleanup(() => controller.abort());

      const url = current.recording.url;
      const audio = this.audioRef().nativeElement;

      (async () => {
        try {
          // Default (cors) mode, not no-cors: we need a readable, non-opaque
          // response so `.blob()` works. Dropbox's dl.dropboxusercontent.com
          // sends `access-control-allow-origin: *` on both plain and
          // Range-bearing GETs (confirmed via curl), so this succeeds.
          // no-store: skip the HTTP cache entirely, on both read and write.
          // A prefetch aborted mid-download (e.g. skipping tracks quickly)
          // can otherwise leave a corrupted, incomplete cache entry that a
          // later request for the same URL replays forever instead of
          // re-fetching — seen in practice as a track stuck loading.
          const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
          if (!response.ok) throw new Error(`Prefetch failed: ${response.status}`);
          const blob = await response.blob();

          // Re-check after the awaits above: if the user has since skipped
          // to another track, that effect run now owns all state — bail
          // before creating an object URL nobody will ever use.
          if (controller.signal.aborted) return;

          const objectUrl = URL.createObjectURL(blob);
          const previousObjectUrl = this.currentObjectUrl;
          this.currentObjectUrl = objectUrl;

          // From here to play(): no further `await`, so `.src` lands in the
          // same synchronous continuation as play() — a declarative [src]
          // binding (or any gap between the two) can leave play() rejecting
          // with NotSupportedError. Assign the new src before revoking the
          // old one, so the old URL is never revoked while still live.
          audio.src = objectUrl;
          if (previousObjectUrl) URL.revokeObjectURL(previousObjectUrl);
          this.player.setLoading(false);
          // Optional chaining: in tests, HTMLMediaElement.play() may not return a Promise.
          audio.play()?.catch(() => this.player.setPlaying(false));

          if (hasMediaSession()) {
            navigator.mediaSession.metadata = buildMediaMetadata(current);
          }
        } catch (err) {
          if (controller.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
            // Superseded by a newer track selection — nothing to do.
            return;
          }
          // Prefetch genuinely failed (offline, non-2xx, transient Dropbox
          // error): fall back to the old direct-streaming behavior so a
          // failed prefetch doesn't break playback outright. isLoading is
          // deliberately left `true` here — the native
          // loadstart/waiting/canplay/error handlers below take over
          // exactly as they did before this change, since it's a real
          // network stream again.
          audio.src = url;
          audio.play()?.catch(() => this.player.setPlaying(false));

          if (hasMediaSession()) {
            navigator.mediaSession.metadata = buildMediaMetadata(current);
          }
        }
      })();
    });

    this.player.registerAudioController({
      pause: () => this.audioRef().nativeElement.pause(),
      resume: () => this.audioRef().nativeElement.play()?.catch(() => this.player.setPlaying(false)),
    });

    this.destroyRef.onDestroy(() => {
      this.player.registerAudioController(null);
      if (this.currentObjectUrl) URL.revokeObjectURL(this.currentObjectUrl);
    });

    // Deliberately no 'seekto'/setPositionState handler: on iOS, registering
    // those makes the lock screen show skip-forward/back-15s buttons instead
    // of previous/next track buttons, which is the opposite of what's wanted
    // here.
    if (hasMediaSession()) {
      navigator.mediaSession.setActionHandler('play', () => this.audioRef().nativeElement.play());
      navigator.mediaSession.setActionHandler('pause', () => this.audioRef().nativeElement.pause());

      effect(() => {
        navigator.mediaSession.setActionHandler(
          'previoustrack',
          this.player.hasPrevious() ? () => this.onPrevious() : null,
        );
        navigator.mediaSession.setActionHandler(
          'nexttrack',
          this.player.hasNext() ? () => this.onNext() : null,
        );
      });
    }
  }

  protected onAudioPlay(): void {
    this.player.setPlaying(true);
    if (hasMediaSession()) navigator.mediaSession.playbackState = 'playing';
  }

  protected onAudioPause(): void {
    this.player.setPlaying(false);
    if (hasMediaSession()) navigator.mediaSession.playbackState = 'paused';
  }

  protected onAudioEnded(): void {
    // Order matters: playNext() may set isPlaying back to true (advancing a
    // "Play all" queue), so setPlaying(false) must run first or it would
    // stomp that back to false.
    this.player.setPlaying(false);
    this.player.playNext();
  }

  protected onTimeUpdate(): void {
    this.currentTime.set(this.audioRef().nativeElement.currentTime);
  }

  protected onLoadedMetadata(): void {
    this.duration.set(this.audioRef().nativeElement.duration);
  }

  protected onWaiting(): void {
    this.player.setLoading(true);
  }

  // Bound to both 'canplay' and 'playing': either means the buffering
  // indicator no longer needs to be shown.
  protected onPlayable(): void {
    this.player.setLoading(false);
  }

  protected onAudioError(): void {
    this.player.setLoading(false);
  }

  protected onSeek(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.audioRef().nativeElement.currentTime = value;
    this.currentTime.set(value);
  }

  protected onTogglePlay(): void {
    const current = this.player.current();
    if (current) this.player.togglePlayback(current);
  }

  protected onPrevious(): void {
    this.player.playPrevious();
  }

  protected onNext(): void {
    this.player.playNext();
  }
}
