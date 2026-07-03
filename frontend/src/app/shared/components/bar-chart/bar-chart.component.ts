import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface BarChartItem {
  label: string;
  value: number;
  color?: string;
}

@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-3">
      @for (item of items; track item.label) {
        <div>
          <div class="mb-1 flex justify-between text-xs">
            <span class="text-slate-400">{{ item.label }}</span>
            <span class="font-medium text-white">{{ item.value }}</span>
          </div>
          <div class="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div class="h-full rounded-full transition-all duration-700"
              [style.width.%]="barWidth(item.value)"
              [class]="item.color || 'bg-brand-500'"></div>
          </div>
        </div>
      } @empty {
        <div class="py-6 text-center text-sm text-slate-500">No data yet</div>
      }
    </div>
  `,
})
export class BarChartComponent {
  @Input() items: BarChartItem[] = [];

  barWidth(value: number) {
    const max = Math.max(...this.items.map(i => i.value), 1);
    return Math.max(4, (value / max) * 100);
  }
}
