import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PracticeDetail } from './practice-detail';
import { flushManifests } from '../../../testing/flush-manifests';
import { PlayerState } from '../../../playback/player-state';
import { Practice } from '../../../models/practice';
import { Song } from '../../../models/song';
import { Recording } from '../../../models/recording';

describe('PracticeDetail', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PracticeDetail],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('orders recordings by setOrder when every recording in the practice has one', async () => {
    // Arrange
    const practice: Practice = { id: 'p1', date: '2026-04-01', venue: 'Room 1' };
    const songFirst: Song = { id: 's1', title: 'Song First' };
    const songSecond: Song = { id: 's2', title: 'Song Second' };
    const recordingSecond: Recording = {
      id: 'r1',
      songId: songSecond.id,
      practiceId: practice.id,
      url: 'https://example.com/r1.mp3',
      setOrder: 2,
    };
    const recordingFirst: Recording = {
      id: 'r2',
      songId: songFirst.id,
      practiceId: practice.id,
      url: 'https://example.com/r2.mp3',
      setOrder: 1,
    };

    // Act — manifest order deliberately reversed vs. setOrder, to prove
    // setOrder (not array position) drives the result.
    const fixture = TestBed.createComponent(PracticeDetail);
    fixture.componentRef.setInput('practiceId', practice.id);
    TestBed.tick();
    flushManifests(httpMock, {
      songs: [songFirst, songSecond],
      practices: [practice],
      recordings: [recordingSecond, recordingFirst],
    });
    await fixture.whenStable();

    // Assert
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    const firstIndex = text.indexOf('Song First');
    const secondIndex = text.indexOf('Song Second');
    expect(firstIndex).toBeGreaterThanOrEqual(0);
    expect(secondIndex).toBeGreaterThan(firstIndex);
  });

  it('falls back to manifest order when the practice has no setOrder data', async () => {
    // Arrange
    const practice: Practice = { id: 'p1', date: '2026-01-01', venue: 'Room 1' };
    const songFirst: Song = { id: 's1', title: 'Song First' };
    const songSecond: Song = { id: 's2', title: 'Song Second' };
    const recordingFirst: Recording = {
      id: 'r1',
      songId: songFirst.id,
      practiceId: practice.id,
      url: 'https://example.com/r1.mp3',
    };
    const recordingSecond: Recording = {
      id: 'r2',
      songId: songSecond.id,
      practiceId: practice.id,
      url: 'https://example.com/r2.mp3',
    };

    // Act
    const fixture = TestBed.createComponent(PracticeDetail);
    fixture.componentRef.setInput('practiceId', practice.id);
    TestBed.tick();
    flushManifests(httpMock, {
      songs: [songFirst, songSecond],
      practices: [practice],
      recordings: [recordingFirst, recordingSecond],
    });
    await fixture.whenStable();

    // Assert
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    const firstIndex = text.indexOf('Song First');
    const secondIndex = text.indexOf('Song Second');
    expect(firstIndex).toBeGreaterThanOrEqual(0);
    expect(secondIndex).toBeGreaterThan(firstIndex);
  });

  it('starts playback of the clicked recording', async () => {
    // Arrange
    const practice: Practice = { id: 'p1', date: '2026-01-01', venue: 'Room 1' };
    const song: Song = { id: 's1', title: 'Song First' };
    const recording: Recording = {
      id: 'r1',
      songId: song.id,
      practiceId: practice.id,
      url: 'https://example.com/r1.mp3',
    };

    // Act
    const fixture = TestBed.createComponent(PracticeDetail);
    fixture.componentRef.setInput('practiceId', practice.id);
    TestBed.tick();
    flushManifests(httpMock, { songs: [song], practices: [practice], recordings: [recording] });
    await fixture.whenStable();
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'li button',
    );
    button?.click();

    // Assert
    const player = TestBed.inject(PlayerState);
    expect(player.current()?.recording.id).toBe('r1');
  });

  it('clicking the button for the current-but-paused recording resumes rather than restarts it', async () => {
    // Arrange
    const practice: Practice = { id: 'p1', date: '2026-01-01', venue: 'Room 1' };
    const song: Song = { id: 's1', title: 'Song First' };
    const recording: Recording = {
      id: 'r1',
      songId: song.id,
      practiceId: practice.id,
      url: 'https://example.com/r1.mp3',
    };

    // Act
    const fixture = TestBed.createComponent(PracticeDetail);
    fixture.componentRef.setInput('practiceId', practice.id);
    TestBed.tick();
    flushManifests(httpMock, { songs: [song], practices: [practice], recordings: [recording] });
    await fixture.whenStable();
    fixture.detectChanges();

    const player = TestBed.inject(PlayerState);
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('li button')!;
    button.click(); // starts playback
    player.setPlaying(false); // simulate the real <audio> "pause" event
    const playSpy = vi.spyOn(player, 'play');

    button.click(); // toggle again while current-but-paused

    // Assert
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('shows a pause icon for the currently playing recording and a play icon once paused', async () => {
    // Arrange
    const practice: Practice = { id: 'p1', date: '2026-01-01', venue: 'Room 1' };
    const song: Song = { id: 's1', title: 'Song First' };
    const recording: Recording = {
      id: 'r1',
      songId: song.id,
      practiceId: practice.id,
      url: 'https://example.com/r1.mp3',
    };

    // Act
    const fixture = TestBed.createComponent(PracticeDetail);
    fixture.componentRef.setInput('practiceId', practice.id);
    TestBed.tick();
    flushManifests(httpMock, { songs: [song], practices: [practice], recordings: [recording] });
    await fixture.whenStable();
    fixture.detectChanges();

    const player = TestBed.inject(PlayerState);
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('li button')!;
    button.click();
    fixture.detectChanges();

    // Assert
    expect(button.getAttribute('aria-label')).toBe('Pause');

    player.setPlaying(false);
    fixture.detectChanges();
    expect(button.getAttribute('aria-label')).toBe('Play');
  });

  it('shows a "Play all" button and starts the queue at the first recording', async () => {
    // Arrange
    const practice: Practice = { id: 'p1', date: '2026-01-01', venue: 'Room 1' };
    const songFirst: Song = { id: 's1', title: 'Song First' };
    const songSecond: Song = { id: 's2', title: 'Song Second' };
    const recordingFirst: Recording = {
      id: 'r1',
      songId: songFirst.id,
      practiceId: practice.id,
      url: 'https://example.com/r1.mp3',
      setOrder: 1,
    };
    const recordingSecond: Recording = {
      id: 'r2',
      songId: songSecond.id,
      practiceId: practice.id,
      url: 'https://example.com/r2.mp3',
      setOrder: 2,
    };

    // Act
    const fixture = TestBed.createComponent(PracticeDetail);
    fixture.componentRef.setInput('practiceId', practice.id);
    TestBed.tick();
    flushManifests(httpMock, {
      songs: [songFirst, songSecond],
      practices: [practice],
      recordings: [recordingFirst, recordingSecond],
    });
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const playAllButton = Array.from(compiled.querySelectorAll<HTMLButtonElement>('button')).find(
      (btn) => btn.textContent?.trim() === 'Play all',
    );
    expect(playAllButton).toBeTruthy();
    playAllButton?.click();

    // Assert — queue starts at the first (set-order-sorted) recording
    const player = TestBed.inject(PlayerState);
    expect(player.current()?.recording.id).toBe('r1');
  });

  it('does not show a "Play all" button when the practice has no recordings', async () => {
    // Arrange
    const practice: Practice = { id: 'p1', date: '2026-01-01', venue: 'Room 1' };

    // Act
    const fixture = TestBed.createComponent(PracticeDetail);
    fixture.componentRef.setInput('practiceId', practice.id);
    TestBed.tick();
    flushManifests(httpMock, { practices: [practice] });
    await fixture.whenStable();
    fixture.detectChanges();

    // Assert
    const compiled = fixture.nativeElement as HTMLElement;
    const playAllButton = Array.from(compiled.querySelectorAll<HTMLButtonElement>('button')).find(
      (btn) => btn.textContent?.trim() === 'Play all',
    );
    expect(playAllButton).toBeFalsy();
  });

  it('shows an explicit empty state for a practice with no recordings', async () => {
    // Arrange
    const practice: Practice = { id: 'p1', date: '2026-01-01', venue: 'Room 1' };

    // Act
    const fixture = TestBed.createComponent(PracticeDetail);
    fixture.componentRef.setInput('practiceId', practice.id);
    TestBed.tick();
    flushManifests(httpMock, { practices: [practice] });
    await fixture.whenStable();

    // Assert
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No recordings yet');
  });

  it('shows a not-found state for an unknown practiceId', async () => {
    // Act
    const fixture = TestBed.createComponent(PracticeDetail);
    fixture.componentRef.setInput('practiceId', 'missing-practice');
    TestBed.tick();
    flushManifests(httpMock);
    await fixture.whenStable();

    // Assert
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Practice not found');
  });

  it('shows a loading state before manifests resolve, not a false not-found', () => {
    // Act
    const fixture = TestBed.createComponent(PracticeDetail);
    fixture.componentRef.setInput('practiceId', 'p1');
    TestBed.tick();

    // Assert
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Loading');
    expect(text).not.toContain('Practice not found');

    // Cleanup
    httpMock.match(() => true).forEach((req) => req.flush([]));
  });
});
