import { Injectable, signal } from '@angular/core';
import { JoinedRecording } from '../data/rehearsal-grouping';

@Injectable({ providedIn: 'root' })
export class PlayerState {
  // equal: () => false ensures re-clicking Play on the same recording (same
  // object reference) still notifies consumers, so App's effect re-fires
  // audio.play() instead of silently no-opping.
  private readonly _current = signal<JoinedRecording | null>(null, { equal: () => false });
  private readonly _isPlaying = signal(false);

  readonly current = this._current.asReadonly();
  readonly isPlaying = this._isPlaying.asReadonly();

  play(item: JoinedRecording): void {
    this._current.set(item);
    this._isPlaying.set(true);
  }

  // Called from App in response to real <audio> play/pause/ended events, so
  // isPlaying always mirrors actual playback state.
  setPlaying(isPlaying: boolean): void {
    this._isPlaying.set(isPlaying);
  }
}
