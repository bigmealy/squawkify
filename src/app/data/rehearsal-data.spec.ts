import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { RehearsalData } from './rehearsal-data';
import { Song } from '../models/song';
import { Practice } from '../models/practice';
import { Recording } from '../models/recording';

// HttpTestingController.expectOne both asserts a matching request exists and
// hands it back — there's no way to fetch a pending request without that
// assertion. Wrapping it as `respondTo` names it for what these tests use it
// for (answering the request), rather than reading as an assertion inside Act.
function respondTo(
  httpMock: HttpTestingController,
  url: string,
  body: Parameters<TestRequest['flush']>[0],
  opts?: { status?: number; statusText?: string },
): void {
  httpMock.expectOne(url).flush(body, opts);
}

describe('RehearsalData', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('exposes songs, practices, and recordings as signals once loaded', async () => {
    // Arrange
    const songs: Song[] = [{ id: 's1', title: 'Song One' }];
    const practices: Practice[] = [{ id: 'p1', date: '2026-01-01', venue: 'Rehearsal Room' }];
    const recordings: Recording[] = [
      { id: 'r1', songId: 's1', practiceId: 'p1', url: 'https://example.com/r1.mp3' },
    ];
    const service = TestBed.inject(RehearsalData);

    // Act — drive the service through one full request/response cycle: let
    // httpResource issue its requests, supply mocked responses, then let the
    // resulting values propagate (httpResource resolves each response via a
    // Promise microtask, so `await` is needed before the second `tick()` will
    // see it — there's no async pipe here to do that implicitly).
    TestBed.tick();
    respondTo(httpMock, 'data/songs.json', songs);
    respondTo(httpMock, 'data/practices.json', practices);
    respondTo(httpMock, 'data/recordings.json', recordings);
    await TestBed.inject(ApplicationRef).whenStable();

    // Assert
    expect(service.songs()).toEqual(songs);
    expect(service.practices()).toEqual(practices);
    expect(service.recordings()).toEqual(recordings);
    expect(service.isLoading()).toBe(false);
    expect(service.error()).toBeUndefined();
  });

  it('exposes songsWithRecordings and practicesWithRecordings joined, grouped, and ordered', async () => {
    // Arrange — two songs (one with no recordings), two practices (most
    // recent second in the manifest, to confirm it's reordered first), and
    // recordings split across both practices to exercise the join.
    const songWithTakes: Song = { id: 's1', title: 'Song With Takes' };
    const songWithNone: Song = { id: 's2', title: 'Song With No Recordings' };
    const olderPractice: Practice = { id: 'p1', date: '2026-01-01', venue: 'Room 1' };
    const newerPractice: Practice = { id: 'p2', date: '2026-02-01', venue: 'Room 2' };
    const olderRecording: Recording = {
      id: 'r1',
      songId: songWithTakes.id,
      practiceId: olderPractice.id,
      url: 'https://example.com/r1.mp3',
    };
    const newerRecording: Recording = {
      id: 'r2',
      songId: songWithTakes.id,
      practiceId: newerPractice.id,
      url: 'https://example.com/r2.mp3',
    };
    const service = TestBed.inject(RehearsalData);

    // Act
    TestBed.tick();
    respondTo(httpMock, 'data/songs.json', [songWithTakes, songWithNone]);
    respondTo(httpMock, 'data/practices.json', [olderPractice, newerPractice]);
    respondTo(httpMock, 'data/recordings.json', [olderRecording, newerRecording]);
    await TestBed.inject(ApplicationRef).whenStable();

    // Assert
    const songGroups = service.songsWithRecordings();
    expect(songGroups.map((g) => g.song.id)).toEqual([songWithTakes.id, songWithNone.id]);
    expect(songGroups[0].recordings.map((r) => r.recording.id)).toEqual(['r2', 'r1']);
    expect(songGroups[1].recordings).toEqual([]);

    const practiceGroups = service.practicesWithRecordings();
    expect(practiceGroups.map((g) => g.practice.id)).toEqual([newerPractice.id, olderPractice.id]);
    expect(practiceGroups[0].recordings.map((r) => r.recording.id)).toEqual(['r2']);
    expect(practiceGroups[1].recordings.map((r) => r.recording.id)).toEqual(['r1']);
  });

  it('reports isLoading as true while the manifest requests are outstanding', () => {
    // Arrange
    const service = TestBed.inject(RehearsalData);

    // Act — let httpResource issue its requests, but don't respond yet.
    // isLoading() is actually true from the moment RehearsalData is
    // constructed (it's a computed reflecting "a request exists", not
    // "a request is in flight"), so this tick isn't what makes the
    // assertion below pass — it's here so the requests genuinely exist for
    // the cleanup step to respond to.
    TestBed.tick();

    // Assert
    expect(service.isLoading()).toBe(true);

    // Cleanup — httpMock.verify() (afterEach) fails if a test ends with
    // requests still outstanding, so these three still need a response even
    // though this test isn't asserting anything about it.
    respondTo(httpMock, 'data/songs.json', []);
    respondTo(httpMock, 'data/practices.json', []);
    respondTo(httpMock, 'data/recordings.json', []);
  });

  it('surfaces an error signal when a manifest request fails', async () => {
    // Arrange
    const service = TestBed.inject(RehearsalData);

    // Act
    TestBed.tick();
    respondTo(httpMock, 'data/songs.json', 'not found', { status: 404, statusText: 'Not Found' });
    respondTo(httpMock, 'data/practices.json', []);
    respondTo(httpMock, 'data/recordings.json', []);
    await TestBed.inject(ApplicationRef).whenStable();

    // Assert
    expect(service.error()).toBeTruthy();
  });
});
