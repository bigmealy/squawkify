import { Component, effect, ElementRef, inject, viewChild } from '@angular/core';
import { PlayerState } from '../player-state';

@Component({
  selector: 'app-mini-player',
  styleUrl: './mini-player.scss',
  templateUrl: './mini-player.html',
})
export class MiniPlayer {
  protected readonly player = inject(PlayerState);
  private readonly audioRef = viewChild.required<ElementRef<HTMLAudioElement>>('audioEl');

  constructor() {
    effect(() => {
      const current = this.player.current();
      if (!current) return;
      // Set src imperatively (rather than via an [src] template binding) so it's
      // guaranteed to land before play() is called — a declarative [src] binding
      // can still be pending when this effect runs, causing play() to reject
      // with NotSupportedError on the very first click.
      const audio = this.audioRef().nativeElement;
      audio.src = current.recording.url;
      // Optional chaining: in tests, HTMLMediaElement.play() may not return a Promise.
      audio.play()?.catch(() => this.player.setPlaying(false));
    });
  }

  protected onAudioPlay(): void {
    this.player.setPlaying(true);
  }

  protected onAudioPause(): void {
    this.player.setPlaying(false);
  }

  protected onAudioEnded(): void {
    // Order matters: playNext() may set isPlaying back to true (advancing a
    // "Play all" queue), so setPlaying(false) must run first or it would
    // stomp that back to false.
    this.player.setPlaying(false);
    this.player.playNext();
  }

  protected onPrevious(): void {
    this.player.playPrevious();
  }

  protected onNext(): void {
    this.player.playNext();
  }
}
