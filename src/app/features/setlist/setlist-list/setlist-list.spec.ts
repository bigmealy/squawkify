import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { SetlistList } from './setlist-list';
import { flushManifests } from '../../../testing/flush-manifests';
import { Song } from '../../../models/song';
import { Practice } from '../../../models/practice';
import { Recording } from '../../../models/recording';

describe('SetlistList', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SetlistList],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists every song, including one with zero recordings', async () => {
    // Arrange
    const songWithTakes: Song = { id: 's1', title: 'Song With Takes' };
    const songWithNone: Song = { id: 's2', title: 'Song With No Recordings' };
    const practice: Practice = { id: 'p1', date: '2026-01-01', venue: 'Room 1' };
    const recording: Recording = {
      id: 'r1',
      songId: songWithTakes.id,
      practiceId: practice.id,
      url: 'https://example.com/r1.mp3',
    };

    // Act
    const fixture = TestBed.createComponent(SetlistList);
    TestBed.tick();
    flushManifests(httpMock, {
      songs: [songWithTakes, songWithNone],
      practices: [practice],
      recordings: [recording],
    });
    await fixture.whenStable();

    // Assert
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Song With Takes');
    expect(text).toContain('1 recording');
    expect(text).toContain('Song With No Recordings');
    expect(text).toContain('no recordings yet');
  });
});
