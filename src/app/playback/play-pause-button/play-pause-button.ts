import { Component, input, output } from '@angular/core';

export type PlayPauseState = 'idle' | 'loading' | 'playing';

@Component({
  selector: 'app-play-pause-button',
  templateUrl: './play-pause-button.html',
  styleUrl: './play-pause-button.scss',
})
export class PlayPauseButton {
  readonly state = input.required<PlayPauseState>();
  readonly variant = input<'row' | 'mini'>('row');
  readonly toggle = output<void>();
}
