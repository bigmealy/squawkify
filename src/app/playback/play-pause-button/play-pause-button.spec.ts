import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PlayPauseButton } from './play-pause-button';

describe('PlayPauseButton', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayPauseButton],
    }).compileComponents();
  });

  it('renders a spinner and marks aria-busy while loading', () => {
    const fixture = TestBed.createComponent(PlayPauseButton);
    fixture.componentRef.setInput('state', 'loading');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector('button')!;
    expect(compiled.querySelector('.play-pause-button__spinner')).toBeTruthy();
    expect(compiled.querySelector('svg')).toBeFalsy();
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Play');
  });

  it('renders a pause icon and aria-label when playing', () => {
    const fixture = TestBed.createComponent(PlayPauseButton);
    fixture.componentRef.setInput('state', 'playing');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector('button')!;
    expect(compiled.querySelector('.play-pause-button__spinner')).toBeFalsy();
    expect(compiled.querySelector('svg path')?.getAttribute('d')).toBe('M6 5h4v14H6zM14 5h4v14h-4z');
    expect(button.getAttribute('aria-busy')).toBe('false');
    expect(button.getAttribute('aria-label')).toBe('Pause');
  });

  it('renders a play icon and aria-label when idle', () => {
    const fixture = TestBed.createComponent(PlayPauseButton);
    fixture.componentRef.setInput('state', 'idle');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector('button')!;
    expect(compiled.querySelector('svg path')?.getAttribute('d')).toBe('M8 5v14l11-7z');
    expect(button.getAttribute('aria-label')).toBe('Play');
  });

  it('emits toggle exactly once per click', () => {
    const fixture = TestBed.createComponent(PlayPauseButton);
    fixture.componentRef.setInput('state', 'idle');
    fixture.detectChanges();

    const toggleSpy = vi.fn();
    fixture.componentInstance.toggle.subscribe(toggleSpy);

    (fixture.nativeElement as HTMLElement).querySelector('button')!.click();

    expect(toggleSpy).toHaveBeenCalledOnce();
  });

  it('applies the mini variant modifier class', () => {
    const fixture = TestBed.createComponent(PlayPauseButton);
    fixture.componentRef.setInput('state', 'idle');
    fixture.componentRef.setInput('variant', 'mini');
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    expect(button.classList).toContain('play-pause-button--mini');
  });

  it('defaults to the row variant when none is given', () => {
    const fixture = TestBed.createComponent(PlayPauseButton);
    fixture.componentRef.setInput('state', 'idle');
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    expect(button.classList).not.toContain('play-pause-button--mini');
  });
});
