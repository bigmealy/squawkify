import { Component, effect, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RehearsalData } from './data/rehearsal-data';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('band-rehearsal-player');
  private readonly rehearsalData = inject(RehearsalData);

  constructor() {
    effect(() => {
      console.log('songs:', this.rehearsalData.songs().length);
      console.log('practices:', this.rehearsalData.practices().length);
      console.log('recordings:', this.rehearsalData.recordings().length);
      console.log('isLoading:', this.rehearsalData.isLoading());
      console.log('error:', this.rehearsalData.error());
    });
  }
}
