import { Component, computed, effect, inject, input, ViewEncapsulation } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RehearsalData } from '../../../data/rehearsal-data';
import { ShellState } from '../../../shell/shell-state';
import { renderMarkdownToHtml } from '../../../shared/render-markdown';

@Component({
  selector: 'app-practice-minutes',
  templateUrl: './practice-minutes.html',
  styleUrl: './practice-minutes.scss',
  // The rendered markdown is injected via [innerHTML], so it never receives
  // Angular's emulated-encapsulation content attributes — scoped selectors
  // like `.practice-minutes__body h1` would silently never match. Every
  // selector below is still scoped by the `.practice-minutes__body` prefix.
  encapsulation: ViewEncapsulation.None,
})
export class PracticeMinutesView {
  protected readonly data = inject(RehearsalData);
  private readonly shellState = inject(ShellState);
  private readonly sanitizer = inject(DomSanitizer);
  readonly practiceId = input.required<string>();

  protected readonly group = computed(() =>
    this.data.practicesWithRecordings().find((g) => g.practice.id === this.practiceId()),
  );

  private readonly minutesUrl = computed(() => this.group()?.minutes?.url);

  protected readonly markdownResource = httpResource.text(() => this.minutesUrl(), {
    defaultValue: '',
  });

  protected readonly renderedHtml = computed<SafeHtml>(() => {
    const markdown = this.markdownResource.value();
    return this.sanitizer.bypassSecurityTrustHtml(markdown ? renderMarkdownToHtml(markdown) : '');
  });

  constructor() {
    effect(() => {
      const group = this.group();
      this.shellState.setDetailTitle(group ? `${group.practice.date} — Minutes` : '');
    });
  }
}
