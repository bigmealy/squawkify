import { computed, Injectable, signal } from '@angular/core';
import { JoinedRecording } from '../data/rehearsal-grouping';

@Injectable({ providedIn: 'root' })
export class PlayerState {
  // equal: () => false ensures re-clicking Play on the same recording (same
  // object reference) still notifies consumers, so App's effect re-fires
  // audio.play() instead of silently no-opping.
  private readonly _current = signal<JoinedRecording | null>(null, { equal: () => false });
  private readonly _isPlaying = signal(false);
  private readonly _queue = signal<JoinedRecording[]>([]);
  private readonly _queueIndex = signal(-1);

  readonly current = this._current.asReadonly();
  readonly isPlaying = this._isPlaying.asReadonly();
  readonly hasPrevious = computed(() => this._queueIndex() > 0);
  readonly hasNext = computed(() => {
    const index = this._queueIndex();
    return index >= 0 && index + 1 < this._queue().length;
  });

  play(item: JoinedRecording): void {
    this._queue.set([]);
    this._queueIndex.set(-1);
    this._current.set(item);
    this._isPlaying.set(true);
  }

  // Starts a "Play all" queue. Playback order is whatever order `items`
  // arrives in — callers are expected to pass an already-ordered list.
  playAll(items: JoinedRecording[]): void {
    if (items.length === 0) return;
    this._queue.set(items);
    this._queueIndex.set(0);
    this._current.set(items[0]);
    this._isPlaying.set(true);
  }

  // Advances a "Play all" queue to its next item, or stops (no loop back to
  // the start) once the queue is exhausted. No-op when not queue-driven.
  playNext(): void {
    const queue = this._queue();
    const index = this._queueIndex();
    if (index >= 0 && index + 1 < queue.length) {
      this._queueIndex.set(index + 1);
      this._current.set(queue[index + 1]);
      this._isPlaying.set(true);
    } else {
      this._queue.set([]);
      this._queueIndex.set(-1);
    }
  }

  // Moves a "Play all" queue back to its previous item. Unlike playNext(),
  // reaching the start is a plain no-op rather than clearing the queue:
  // playNext() also fires from the <audio> "ended" event, where exhaustion
  // should end queue mode, but playPrevious() only ever fires from an
  // explicit button click already gated by hasPrevious() — so there's no
  // case where it should tear down an in-progress queue.
  playPrevious(): void {
    const queue = this._queue();
    const index = this._queueIndex();
    if (index > 0) {
      this._queueIndex.set(index - 1);
      this._current.set(queue[index - 1]);
      this._isPlaying.set(true);
    }
  }

  // Called from App in response to real <audio> play/pause/ended events, so
  // isPlaying always mirrors actual playback state.
  setPlaying(isPlaying: boolean): void {
    this._isPlaying.set(isPlaying);
  }
}
