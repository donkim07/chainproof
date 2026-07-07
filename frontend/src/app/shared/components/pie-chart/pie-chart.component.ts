import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PieChartItem {
  label: string;
  value: number;
  color: string;
}

@Component({
  selector: 'app-pie-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col sm:flex-row items-center gap-6">
      <svg [attr.viewBox]="'0 0 ' + size + ' ' + size" [style.width.px]="size" [style.height.px]="size" class="shrink-0">
        @for (slice of slices; track slice.label) {
          <path [attr.d]="slice.d" [attr.fill]="slice.color" class="transition-all duration-700" />
        }
        @if (!items.length) {
          <circle [attr.cx]="half" [attr.cy]="half" [attr.r]="half - 2" class="fill-ink-800" />
        }
      </svg>
      <div class="flex-1 space-y-2 w-full">
        @for (item of items; track item.label) {
          <div class="flex items-center justify-between text-sm">
            <div class="flex items-center gap-2 min-w-0">
              <span class="h-2.5 w-2.5 rounded-full shrink-0" [style.background]="item.color"></span>
              <span class="text-ink-500 truncate">{{ item.label }}</span>
            </div>
            <span class="font-medium text-white ml-2">{{ pct(item.value) }}%</span>
          </div>
        } @empty {
          <div class="py-6 text-center text-sm text-ink-500">No data yet</div>
        }
      </div>
    </div>
  `,
})
export class PieChartComponent {
  @Input() items: PieChartItem[] = [];
  @Input() size = 140;

  get half() { return this.size / 2; }

  get total() { return this.items.reduce((s, i) => s + i.value, 0); }

  pct(v: number) {
    const t = this.total;
    return t ? Math.round((v / t) * 100) : 0;
  }

  get slices() {
    const total = Math.max(this.total, 1);
    let angle = -Math.PI / 2;
    return this.items.map(item => {
      const slice = (item.value / total) * 2 * Math.PI;
      const x1 = this.half + this.half * Math.cos(angle);
      const y1 = this.half + this.half * Math.sin(angle);
      angle += slice;
      const x2 = this.half + this.half * Math.cos(angle);
      const y2 = this.half + this.half * Math.sin(angle);
      const large = slice > Math.PI ? 1 : 0;
      const d = `M ${this.half} ${this.half} L ${x1} ${y1} A ${this.half} ${this.half} 0 ${large} 1 ${x2} ${y2} Z`;
      return { label: item.label, color: item.color, d };
    });
  }
}
