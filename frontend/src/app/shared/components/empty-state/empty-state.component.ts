import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/80 text-3xl" [innerHTML]="icon"></div>
      <h3 class="text-lg font-semibold text-white">{{ title }}</h3>
      <p class="mt-2 max-w-md text-sm text-slate-400">{{ description }}</p>
      <div class="mt-6">
        <ng-content></ng-content>
      </div>
    </div>
  `,
})
export class EmptyStateComponent {
  @Input() title = 'Nothing here yet';
  @Input() description = '';
  @Input() icon = '&#128269;';
}
