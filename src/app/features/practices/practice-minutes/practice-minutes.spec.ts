import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PracticeMinutesView } from './practice-minutes';
import { flushManifests } from '../../../testing/flush-manifests';
import { Practice } from '../../../models/practice';
import { PracticeMinutes } from '../../../models/practice-minutes';

// The markdown fetch only starts once the manifest-derived `minutesUrl`
// resolves, so it doesn't exist yet at the moment the manifests are flushed
// — `fixture.whenStable()` would deadlock waiting on a request that isn't
// flushed until after this function returns it. Poll instead.
async function waitForRequest(httpMock: HttpTestingController, url: string): Promise<TestRequest> {
  for (let i = 0; i < 20; i++) {
    const [match] = httpMock.match(url);
    if (match) return match;
    await Promise.resolve();
    TestBed.tick();
  }
  throw new Error(`Request to ${url} never appeared`);
}

describe('PracticeMinutesView', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PracticeMinutesView],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('shows a loading state before manifests resolve', () => {
    // Act
    const fixture = TestBed.createComponent(PracticeMinutesView);
    fixture.componentRef.setInput('practiceId', 'p1');
    TestBed.tick();

    // Assert
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Loading');

    // Cleanup
    httpMock.match(() => true).forEach((req) => req.flush([]));
  });

  it('shows a not-found state for an unknown practiceId', async () => {
    // Act
    const fixture = TestBed.createComponent(PracticeMinutesView);
    fixture.componentRef.setInput('practiceId', 'missing-practice');
    TestBed.tick();
    flushManifests(httpMock);
    await fixture.whenStable();

    // Assert
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Practice not found');
  });

  it('shows an explicit empty state when the practice has no minutes entry', async () => {
    // Arrange
    const practice: Practice = { id: 'p1', date: '2026-01-01', venue: 'Room 1' };

    // Act
    const fixture = TestBed.createComponent(PracticeMinutesView);
    fixture.componentRef.setInput('practiceId', practice.id);
    TestBed.tick();
    flushManifests(httpMock, { practices: [practice] });
    await fixture.whenStable();

    // Assert
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No minutes recorded');
  });

  it('renders the fetched markdown as formatted HTML', async () => {
    // Arrange
    const practice: Practice = { id: 'p1', date: '2026-01-01', venue: 'Room 1' };
    const minutes: PracticeMinutes = {
      practiceId: practice.id,
      url: 'https://example.com/minutes.md',
    };

    // Act
    const fixture = TestBed.createComponent(PracticeMinutesView);
    fixture.componentRef.setInput('practiceId', practice.id);
    TestBed.tick();
    flushManifests(httpMock, { practices: [practice], minutes: [minutes] });
    const markdownRequest = await waitForRequest(httpMock, minutes.url);
    markdownRequest.flush('# Overall points\n\nWent well.');
    await fixture.whenStable();

    // Assert
    const body = (fixture.nativeElement as HTMLElement).querySelector('.practice-minutes__body');
    expect(body?.innerHTML).toContain('<h1>Overall points</h1>');
    expect(body?.textContent).toContain('Went well.');
  });
});
