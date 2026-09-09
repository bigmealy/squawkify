import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

// App is just router chrome (nav + <router-outlet>) plus an included
// <app-mini-player> — it knows nothing about playback itself, so these tests
// don't need HttpClientTesting. Mini-player behavior is covered by
// playback/mini-player/mini-player.spec.ts.
describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render nav links to the Setlist and Practices views', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('a[href="/setlist"]')).toBeTruthy();
    expect(compiled.querySelector('a[href="/practices"]')).toBeTruthy();
  });
});
