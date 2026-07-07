import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-800 text-signal-400">
        <app-icon [name]="icon" size="lg" />
      </div>
      <h3 class="text-lg font-semibold text-white">{{ title }}</h3>
      <p class="mt-2 max-w-md text-sm text-ink-500">{{ description }}</p>
      <div class="mt-6">
        <ng-content></ng-content>
      </div>
    </div>
  `,
})
export class EmptyStateComponent {
  @Input() title = 'Nothing here yet';
  @Input() description = '';
  @Input() icon = 'inbox';
}
