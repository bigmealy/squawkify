import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ShareLinkButton } from './share-link-button';
import { JoinedRecording } from '../../data/rehearsal-grouping';

function item(): JoinedRecording {
  return {
    recording: { id: 'r1', songId: 's1', practiceId: 'p1', url: 'https://example.com/r1.mp3' },
    song: { id: 's1', title: 'Song One' },
    practice: { id: '2026-01-01', date: '2026-01-01', venue: 'Room 1' },
  };
}

describe('ShareLinkButton', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'share');
    Reflect.deleteProperty(navigator, 'canShare');
    Reflect.deleteProperty(navigator, 'clipboard');
    vi.restoreAllMocks();
  });

  it('shares the link via the Web Share API when available', async () => {
    const shareSpy = vi.fn().mockResolvedValue(undefined);
    (navigator as unknown as { canShare: unknown }).canShare = vi.fn().mockReturnValue(true);
    (navigator as unknown as { share: unknown }).share = shareSpy;

    const fixture = TestBed.createComponent(ShareLinkButton);
    fixture.componentRef.setInput('item', item());
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button').click();
    await vi.waitFor(() => expect(shareSpy).toHaveBeenCalledOnce());

    const { url, title } = shareSpy.mock.calls[0][0];
    expect(url).toBe(`${location.origin}/practices/2026-01-01?take=r1`);
    expect(title).toBe('Song One — 2026-01-01');
  });

  it('falls back to the clipboard and shows a brief confirmation when Web Share is unavailable', async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText: writeTextSpy } });

    const fixture = TestBed.createComponent(ShareLinkButton);
    fixture.componentRef.setInput('item', item());
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();
    await vi.waitFor(() => expect(writeTextSpy).toHaveBeenCalledOnce());
    expect(writeTextSpy).toHaveBeenCalledWith(`${location.origin}/practices/2026-01-01?take=r1`);

    fixture.detectChanges();
    expect(button.getAttribute('aria-label')).toBe('Link copied');
  });
});
