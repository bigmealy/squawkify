import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { App } from './app';

// App injects RehearsalData (see rehearsal-data.spec.ts for its own tests),
// which fires httpResource requests for the three manifests as soon as the
// component is constructed — HttpClientTesting stands in for the real
// backend so those requests don't hit the network during this test.
describe('App', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function flushManifests(): void {
    httpMock.expectOne('data/songs.json').flush([]);
    httpMock.expectOne('data/practices.json').flush([]);
    httpMock.expectOne('data/recordings.json').flush([]);
  }

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
    TestBed.tick();
    flushManifests();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    TestBed.tick();
    flushManifests();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Hello, band-rehearsal-player');
  });
});
