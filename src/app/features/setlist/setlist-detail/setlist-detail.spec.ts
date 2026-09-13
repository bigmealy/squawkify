import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { SetlistDetail } from './setlist-detail';
import { flushManifests } from '../../../testing/flush-manifests';
import { PlayerState } from '../../../playback/player-state';
import { Song } from '../../../models/song';
import { Practice } from '../../../models/practice';
import { Recording } from '../../../models/recording';

describe('SetlistDetail', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SetlistDetail],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('shows recordings for the resolved song, most recent practice first', async () => {
    // Arrange
    const song: Song = { id: 's1', title: 'Song With Takes' };
    const olderPractice: Practice = { id: 'p1', date: '2026-01-01', venue: 'Room 1' };
    const newerPractice: Practice = { id: 'p2', date: '2026-02-01', venue: 'Room 2' };
    const olderRecording: Recording = {
      id: 'r1',
      songId: song.id,
      practiceId: olderPractice.id,
      url: 'https://example.com/r1.mp3',
      takeLabel: 'Take 1',
    };
    const newerRecording: Recording = {
      id: 'r2',
      songId: song.id,
      practiceId: newerPractice.id,
      url: 'https://example.com/r2.mp3',
      takeLabel: 'Take 2',
    };

    // Act
    const fixture = TestBed.createComponent(SetlistDetail);
    fixture.componentRef.setInput('songId', song.id);
    TestBed.tick();
    flushManifests(httpMock, {
      songs: [song],
      practices: [olderPractice, newerPractice],
      recordings: [olderRecording, newerRecording],
    });
    await fixture.whenStable();

    // Assert
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    const take1Index = text.indexOf('Take 1');
    const take2Index = text.indexOf('Take 2');
    expect(take2Index).toBeGreaterThanOrEqual(0);
    expect(take1Index).toBeGreaterThan(take2Index);
  });

  it('starts playback of the clicked recording', async () => {
    // Arrange
    const song: Song = { id: 's1', title: 'Song With Takes' };
    const practice: Practice = { id: 'p1', date: '2026-01-01', venue: 'Room 1' };
    const recording: Recording = {
      id: 'r1',
      songId: song.id,
      practiceId: practice.id,
      url: 'https://example.com/r1.mp3',
      takeLabel: 'Take 1',
    };

    // Act
    const fixture = TestBed.createComponent(SetlistDetail);
    fixture.componentRef.setInput('songId', song.id);
    TestBed.tick();
    flushManifests(httpMock, { songs: [song], practices: [practice], recordings: [recording] });
    await fixture.whenStable();
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button');
    button?.click();

    // Assert
    const player = TestBed.inject(PlayerState);
    expect(player.current()?.recording.id).toBe('r1');
  });

  it('clicking the button for the current-but-paused recording resumes rather than restarts it', async () => {
    // Arrange
    const song: Song = { id: 's1', title: 'Song With Takes' };
    const practice: Practice = { id: 'p1', date: '2026-01-01', venue: 'Room 1' };
    const recording: Recording = {
      id: 'r1',
      songId: song.id,
      practiceId: practice.id,
      url: 'https://example.com/r1.mp3',
      takeLabel: 'Take 1',
    };

    // Act
    const fixture = TestBed.createComponent(SetlistDetail);
    fixture.componentRef.setInput('songId', song.id);
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
    const song: Song = { id: 's1', title: 'Song With Takes' };
    const practice: Practice = { id: 'p1', date: '2026-01-01', venue: 'Room 1' };
    const recording: Recording = {
      id: 'r1',
      songId: song.id,
      practiceId: practice.id,
      url: 'https://example.com/r1.mp3',
      takeLabel: 'Take 1',
    };

    // Act
    const fixture = TestBed.createComponent(SetlistDetail);
    fixture.componentRef.setInput('songId', song.id);
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

  it('shows an explicit empty state for a song with no recordings', async () => {
    // Arrange
    const song: Song = { id: 's1', title: 'Song With No Recordings' };

    // Act
    const fixture = TestBed.createComponent(SetlistDetail);
    fixture.componentRef.setInput('songId', song.id);
    TestBed.tick();
    flushManifests(httpMock, { songs: [song] });
    await fixture.whenStable();

    // Assert
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No recordings yet');
  });

  it('shows a not-found state for an unknown songId', async () => {
    // Act
    const fixture = TestBed.createComponent(SetlistDetail);
    fixture.componentRef.setInput('songId', 'missing-song');
    TestBed.tick();
    flushManifests(httpMock);
    await fixture.whenStable();

    // Assert
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Song not found');
  });

  it('shows a loading state before manifests resolve, not a false not-found', () => {
    // Act
    const fixture = TestBed.createComponent(SetlistDetail);
    fixture.componentRef.setInput('songId', 's1');
    TestBed.tick();

    // Assert
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Loading');
    expect(text).not.toContain('Song not found');

    // Cleanup
    httpMock.match(() => true).forEach((req) => req.flush([]));
  });
});
