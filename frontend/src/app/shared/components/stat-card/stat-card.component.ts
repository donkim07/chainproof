import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="kpi-card group hover:border-brand-500/30 transition-all duration-300 animate-slide-up">
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class="text-sm font-medium text-slate-400">{{ label }}</div>
          <div class="mt-2 text-3xl font-bold tracking-tight" [class]="color">{{ value }}</div>
          @if (hint) {
            <div class="mt-1 text-xs text-slate-500">{{ hint }}</div>
          }
        </div>
        @if (icon) {
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800/80 text-lg group-hover:bg-brand-600/20 transition-colors" [innerHTML]="icon"></div>
        }
      </div>
      @if (trend) {
        <div class="mt-3 text-xs" [class]="trendPositive ? 'text-emerald-400' : 'text-rose-400'">{{ trend }}</div>
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
