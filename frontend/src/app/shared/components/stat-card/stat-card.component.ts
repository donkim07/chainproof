import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="kpi-card group hover:border-signal-500/30 transition-all duration-300 animate-slide-up">
      <div class="flex items-start justify-between gap-3 flex-1">
        <div class="min-w-0 flex-1">
          <div class="text-sm font-medium text-ink-500">{{ label }}</div>
          <div class="mt-2 text-3xl font-bold tracking-tight" [class]="color">{{ value }}</div>
          @if (hint) {
            <div class="mt-1 text-xs text-ink-500 line-clamp-2">{{ hint }}</div>
          }
        </div>
        @if (icon) {
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-800 text-signal-400 group-hover:bg-signal-500/15 transition-colors">
            <app-icon [name]="icon" size="md" />
          </div>
        }
      </div>
      @if (trend) {
        <div class="mt-3 text-xs" [class]="trendPositive ? 'text-signal-400' : 'text-alert-400'">{{ trend }}</div>
      }
    </div>
  `,
})
export class StatCardComponent {
  @Input() label = '';
  @Input() value: string | number = '—';
  @Input() color = 'text-white';
  @Input() hint = '';
  @Input() icon = '';
  @Input() trend = '';
  @Input() trendPositive = true;
}
