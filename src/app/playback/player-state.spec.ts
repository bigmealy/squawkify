import { effect } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PlayerState } from './player-state';
import { JoinedRecording } from '../data/rehearsal-grouping';

function makeItem(id: string): JoinedRecording {
  return {
    recording: { id, songId: 's1', practiceId: 'p1', url: `https://example.com/${id}.mp3` },
    song: { id: 's1', title: 'Song' },
    practice: { id: 'p1', date: '2026-01-01', venue: 'Room 1' },
  };
}

describe('PlayerState', () => {
  it('starts with no current recording and not playing', () => {
    const player = TestBed.inject(PlayerState);
    expect(player.current()).toBeNull();
    expect(player.isPlaying()).toBe(false);
  });

  it('play() sets the current recording and marks playing', () => {
    const player = TestBed.inject(PlayerState);
    const item = makeItem('r1');

    player.play(item);

    expect(player.current()).toBe(item);
    expect(player.isPlaying()).toBe(true);
  });

  it('setPlaying() mirrors real <audio> play/pause events', () => {
    const player = TestBed.inject(PlayerState);
    player.play(makeItem('r1'));

    player.setPlaying(false);
    expect(player.isPlaying()).toBe(false);

    player.setPlaying(true);
    expect(player.isPlaying()).toBe(true);
  });

  it('notifies consumers even when play() is called again with the same recording', () => {
    const player = TestBed.inject(PlayerState);
    const item = makeItem('r1');
    let notifications = 0;

    TestBed.runInInjectionContext(() => {
      effect(() => {
        player.current();
        notifications++;
      });
    });
    TestBed.tick();
    expect(notifications).toBe(1);

    player.play(item);
    TestBed.tick();
    expect(notifications).toBe(2);

    player.play(item);
    TestBed.tick();
    expect(notifications).toBe(3);
  });

  it('playAll() starts the queue at the first item and marks playing', () => {
    const player = TestBed.inject(PlayerState);
    const items = [makeItem('r1'), makeItem('r2')];

    player.playAll(items);

    expect(player.current()).toBe(items[0]);
    expect(player.isPlaying()).toBe(true);
  });

  it('playAll() with an empty list is a no-op', () => {
    const player = TestBed.inject(PlayerState);

    player.playAll([]);

    expect(player.current()).toBeNull();
    expect(player.isPlaying()).toBe(false);
  });

  it('playNext() advances to the next queued item', () => {
    const player = TestBed.inject(PlayerState);
    const items = [makeItem('r1'), makeItem('r2'), makeItem('r3')];
    player.playAll(items);

    player.playNext();

    expect(player.current()).toBe(items[1]);
    expect(player.isPlaying()).toBe(true);
  });

  it('playNext() stops after the last queued item instead of looping back', () => {
    const player = TestBed.inject(PlayerState);
    const items = [makeItem('r1'), makeItem('r2')];
    player.playAll(items);

    player.playNext(); // -> r2 (last item)
    player.playNext(); // queue exhausted

    expect(player.current()).toBe(items[1]);

    // A further call stays a safe no-op.
    player.playNext();
    expect(player.current()).toBe(items[1]);
  });

  it('play() interrupts an active queue so a later playNext() does not resume it', () => {
    const player = TestBed.inject(PlayerState);
    const queued = [makeItem('r1'), makeItem('r2')];
    const single = makeItem('r3');
    player.playAll(queued);

    player.play(single);
    player.playNext();

    expect(player.current()).toBe(single);
  });
});
