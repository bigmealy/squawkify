import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ShellState } from '../shell-state';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  styleUrl: './header.scss',
  templateUrl: './header.html',
})
export class Header {
  protected readonly shellState = inject(ShellState);
}
