import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RehearsalData } from '../../../data/rehearsal-data';

@Component({
  selector: 'app-setlist-list',
  imports: [RouterLink],
  templateUrl: './setlist-list.html',
})
export class SetlistList {
  protected readonly data = inject(RehearsalData);
}
