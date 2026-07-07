import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DonutChartItem {
  label: string;
  value: number;
  color: string;
}

@Component({
  selector: 'app-donut-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col sm:flex-row items-center gap-6">
      <div class="relative shrink-0" [style.width.px]="size" [style.height.px]="size">
        <svg [attr.viewBox]="'0 0 ' + size + ' ' + size" class="transform -rotate-90">
          <circle [attr.cx]="center" [attr.cy]="center" [attr.r]="radius" fill="none" stroke="currentColor" class="text-ink-800" stroke-width="12" />
          @for (seg of segments; track seg.label) {
            <circle
              [attr.cx]="center"
              [attr.cy]="center"
              [attr.r]="radius"
              fill="none"
              [attr.stroke]="seg.color"
              stroke-width="12"
              [attr.stroke-dasharray]="seg.dash"
              [attr.stroke-dashoffset]="seg.offset"
              class="transition-all duration-700"
            />
          }
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <span class="text-2xl font-bold text-white">{{ total }}</span>
          <span class="text-xs text-ink-500">total</span>
        </div>
      </div>
      <div class="flex-1 space-y-2 w-full">
        @for (item of items; track item.label) {
          <div class="flex items-center justify-between text-sm">
            <div class="flex items-center gap-2 min-w-0">
              <span class="h-2.5 w-2.5 rounded-full shrink-0" [style.background]="item.color"></span>
              <span class="text-ink-500 truncate">{{ item.label }}</span>
            </div>
            <span class="font-medium text-white ml-2">{{ item.value }}</span>
          </div>
        } @empty {
          <div class="py-6 text-center text-sm text-ink-500">No data yet</div>
        }
      </div>
    </div>
  `,
})
export class DonutChartComponent {
  @Input() items: DonutChartItem[] = [];
  @Input() size = 140;

  get center() { return this.size / 2; }
  get radius() { return (this.size / 2) - 8; }
  get circumference() { return 2 * Math.PI * this.radius; }
  get total() { return this.items.reduce((s, i) => s + i.value, 0); }

  get segments() {
    const total = Math.max(this.total, 1);
    let offset = 0;
    return this.items.map(item => {
      const pct = item.value / total;
      const dash = `${pct * this.circumference} ${this.circumference}`;
      const seg = { label: item.label, color: item.color, dash, offset: -offset };
      offset += pct * this.circumference;
      return seg;
    });
  }
}
