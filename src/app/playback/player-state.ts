import { computed, Injectable, signal } from '@angular/core';
import { JoinedRecording } from '../data/rehearsal-grouping';

export interface AudioController {
  pause(): void;
  resume(): void;
}

@Injectable({ providedIn: 'root' })
export class PlayerState {
  // equal: () => false ensures re-clicking Play on the same recording (same
  // object reference) still notifies consumers, so App's effect re-fires
  // audio.play() instead of silently no-opping.
  private readonly _current = signal<JoinedRecording | null>(null, { equal: () => false });
  private readonly _isPlaying = signal(false);
  private readonly _isLoading = signal(false);
  private readonly _queue = signal<JoinedRecording[]>([]);
  private readonly _queueIndex = signal(-1);

  // Set by MiniPlayer (the sole owner of the <audio> element) so other
  // consumers, like a recording list row, can pause/resume the currently
  // loaded track without restarting it.
  private audioController: AudioController | null = null;

  readonly current = this._current.asReadonly();
  readonly isPlaying = this._isPlaying.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
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

  // Like playAll(), but positions the queue at `item` instead of index 0 —
  // used when a specific row's play button is clicked so it continues
  // through the rest of that practice's set rather than playing in
  // isolation.
  playFrom(items: JoinedRecording[], item: JoinedRecording): void {
    const index = items.findIndex((i) => i.recording.id === item.recording.id);
    if (index === -1) {
      this.play(item);
      return;
    }
    this._queue.set(items);
    this._queueIndex.set(index);
    this._current.set(item);
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

  setLoading(isLoading: boolean): void {
    this._isLoading.set(isLoading);
  }

  registerAudioController(controller: AudioController | null): void {
    this.audioController = controller;
  }

  // Pauses/resumes in place when `item` is already the loaded recording;
  // otherwise starts it fresh via play(), matching the row-click behavior
  // for any recording that isn't the current one.
  togglePlayback(item: JoinedRecording, queue?: JoinedRecording[]): void {
    if (this._current()?.recording.id === item.recording.id) {
      if (this._isPlaying()) {
        this.audioController?.pause();
      } else {
        this.audioController?.resume();
      }
    } else if (queue) {
      this.playFrom(queue, item);
    } else {
      this.play(item);
    }
  }
}
