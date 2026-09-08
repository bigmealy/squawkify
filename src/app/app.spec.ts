import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

// App is now just router chrome (nav + <router-outlet>) — it no longer
// injects RehearsalData itself (that moved into the feature components
// under features/), so these tests don't need HttpClientTesting.
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
