import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { SwUpdate, VersionEvent, UnrecoverableStateEvent } from '@angular/service-worker';
import { UpdateToast } from './update-toast';

describe('UpdateToast', () => {
  let versionUpdates: Subject<VersionEvent>;
  let unrecoverable: Subject<UnrecoverableStateEvent>;

  function setup(isEnabled: boolean) {
    versionUpdates = new Subject<VersionEvent>();
    unrecoverable = new Subject<UnrecoverableStateEvent>();
    TestBed.configureTestingModule({
      imports: [UpdateToast],
      providers: [
        {
          provide: SwUpdate,
          useValue: {
            isEnabled,
            versionUpdates,
            unrecoverable,
            checkForUpdate: () => Promise.resolve(false),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(UpdateToast);
    // Stub the component's own reload() rather than document.location.reload
    // itself — jsdom defines `location.reload` as a non-configurable own
    // property, so it can't be spied on directly.
    const instance = fixture.componentInstance as unknown as { reload(): void };
    const reloadSpy = vi.spyOn(instance, 'reload').mockImplementation(() => {});
    fixture.detectChanges();
    return { fixture, reloadSpy };
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when the service worker is disabled', () => {
    const { fixture } = setup(false);
    expect((fixture.nativeElement as HTMLElement).querySelector('.update-toast')).toBeNull();
  });

  it('renders nothing until a new version is ready', () => {
    const { fixture } = setup(true);
    expect((fixture.nativeElement as HTMLElement).querySelector('.update-toast')).toBeNull();
  });

  it('shows a reload prompt once a new version is ready', () => {
    const { fixture } = setup(true);
    versionUpdates.next({ type: 'VERSION_READY' } as VersionEvent);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.update-toast')).toBeTruthy();
  });

  it('reloads the page when the refresh button is clicked', () => {
    const { fixture, reloadSpy } = setup(true);
    versionUpdates.next({ type: 'VERSION_READY' } as VersionEvent);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelector('button')?.click();

    expect(reloadSpy).toHaveBeenCalled();
  });

  it('reloads the page immediately if the app enters an unrecoverable state', () => {
    const { reloadSpy } = setup(true);

    unrecoverable.next({ reason: 'cache eviction' } as UnrecoverableStateEvent);

    expect(reloadSpy).toHaveBeenCalled();
  });
});
