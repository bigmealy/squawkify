import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MiniPlayer } from './playback/mini-player/mini-player';
import { Header } from './shell/header/header';
import { NavDrawer } from './shell/nav-drawer/nav-drawer';
import { UpdateToast } from './shell/update-toast/update-toast';

@Component({
  imports: [RouterOutlet, MiniPlayer, Header, NavDrawer, UpdateToast],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {}
