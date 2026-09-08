import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RehearsalData } from '../../../data/rehearsal-data';

@Component({
  selector: 'app-practice-detail',
  imports: [RouterLink],
  templateUrl: './practice-detail.html',
})
export class PracticeDetail {
  protected readonly data = inject(RehearsalData);
  readonly practiceId = input.required<string>();

  protected readonly group = computed(() =>
    this.data.practicesWithRecordings().find((g) => g.practice.id === this.practiceId()),
  );
}
