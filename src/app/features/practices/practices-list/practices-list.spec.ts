import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PracticesList } from './practices-list';
import { flushManifests } from '../../../testing/flush-manifests';
import { Practice } from '../../../models/practice';
import { Song } from '../../../models/song';
import { Recording } from '../../../models/recording';

describe('PracticesList', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PracticesList],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists every practice, most recent first, including one with zero recordings', async () => {
    // Arrange
    const song: Song = { id: 's1', title: 'Song A' };
    const olderPractice: Practice = { id: 'p1', date: '2026-01-01', venue: 'Room 1' };
    const newerPractice: Practice = { id: 'p2', date: '2026-02-01', venue: 'Room 2' };
    const recording: Recording = {
      id: 'r1',
      songId: song.id,
      practiceId: olderPractice.id,
      url: 'https://example.com/r1.mp3',
    };

    // Act
    const fixture = TestBed.createComponent(PracticesList);
    TestBed.tick();
    flushManifests(httpMock, {
      songs: [song],
      practices: [olderPractice, newerPractice],
      recordings: [recording],
    });
    await fixture.whenStable();

    // Assert
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    const olderIndex = text.indexOf('2026-01-01');
    const newerIndex = text.indexOf('2026-02-01');
    expect(newerIndex).toBeGreaterThanOrEqual(0);
    expect(olderIndex).toBeGreaterThan(newerIndex);
    expect(text).toContain('no recordings yet');
  });
});
