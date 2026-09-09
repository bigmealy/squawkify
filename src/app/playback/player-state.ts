import { Injectable, signal } from '@angular/core';
import { JoinedRecording } from '../data/rehearsal-grouping';

@Injectable({ providedIn: 'root' })
export class PlayerState {
  // equal: () => false ensures re-clicking Play on the same recording (same
  // object reference) still notifies consumers, so App's effect re-fires
  // audio.play() instead of silently no-opping.
  private readonly _current = signal<JoinedRecording | null>(null, { equal: () => false });
  private readonly _isPlaying = signal(false);
  private _queue: JoinedRecording[] = [];
  private _queueIndex = -1;

  readonly current = this._current.asReadonly();
  readonly isPlaying = this._isPlaying.asReadonly();

  play(item: JoinedRecording): void {
    this._queue = [];
    this._queueIndex = -1;
    this._current.set(item);
    this._isPlaying.set(true);
  }

  // Starts a "Play all" queue. Playback order is whatever order `items`
  // arrives in — callers are expected to pass an already-ordered list.
  playAll(items: JoinedRecording[]): void {
    if (items.length === 0) return;
    this._queue = items;
    this._queueIndex = 0;
    this._current.set(items[0]);
    this._isPlaying.set(true);
  }

  // Advances a "Play all" queue to its next item, or stops (no loop back to
  // the start) once the queue is exhausted. No-op when not queue-driven.
  playNext(): void {
    if (this._queueIndex >= 0 && this._queueIndex + 1 < this._queue.length) {
      this._queueIndex++;
      this._current.set(this._queue[this._queueIndex]);
      this._isPlaying.set(true);
    } else {
      this._queue = [];
      this._queueIndex = -1;
    }
  }

  // Called from App in response to real <audio> play/pause/ended events, so
  // isPlaying always mirrors actual playback state.
  setPlaying(isPlaying: boolean): void {
    this._isPlaying.set(isPlaying);
  }
}
