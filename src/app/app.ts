import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MiniPlayer } from './playback/mini-player/mini-player';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MiniPlayer],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {}
