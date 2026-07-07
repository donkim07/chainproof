import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        @if (badge) {
          <div class="badge-info mb-2 inline-flex">{{ badge }}</div>
        }
        <h1 class="text-2xl sm:text-3xl font-bold text-white tracking-tight">{{ title }}</h1>
        @if (subtitle) {
          <p class="mt-1 text-ink-500 max-w-2xl">{{ subtitle }}</p>
        }
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <ng-content select="[actions]"></ng-content>
      </div>
    </div>
  `,
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() badge = '';
}
