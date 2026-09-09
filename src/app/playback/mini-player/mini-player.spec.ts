import { TestBed } from '@angular/core/testing';
import { MiniPlayer } from './mini-player';
import { PlayerState } from '../player-state';
import { JoinedRecording } from '../../data/rehearsal-grouping';

describe('MiniPlayer', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MiniPlayer],
    }).compileComponents();
  });

  it('renders the <audio> element even before any recording is selected', () => {
    const fixture = TestBed.createComponent(MiniPlayer);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('audio')).toBeTruthy();
    expect(compiled.querySelector('.mini-player')?.classList).toContain('mini-player--hidden');
  });

  it('shows the current track once a recording is selected', () => {
    const fixture = TestBed.createComponent(MiniPlayer);
    fixture.detectChanges();

    const item: JoinedRecording = {
      recording: { id: 'r1', songId: 's1', practiceId: 'p1', url: 'https://example.com/r1.mp3' },
      song: { id: 's1', title: 'Song One' },
      practice: { id: 'p1', date: '2026-01-01', venue: 'Room 1' },
    };
    TestBed.inject(PlayerState).play(item);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.mini-player')?.classList).not.toContain('mini-player--hidden');
    expect(compiled.textContent).toContain('Song One');
  });
});
