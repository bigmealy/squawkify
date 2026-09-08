import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RehearsalData } from '../../../data/rehearsal-data';

@Component({
  selector: 'app-practices-list',
  imports: [RouterLink],
  templateUrl: './practices-list.html',
})
export class PracticesList {
  protected readonly data = inject(RehearsalData);
}
