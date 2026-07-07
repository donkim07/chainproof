import {
  Component, Input, OnChanges, OnDestroy, AfterViewInit,
  ElementRef, ViewChild, SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Chart, DoughnutController, ArcElement, Tooltip, Legend, PieController,
  BarController, BarElement, CategoryScale, LinearScale,
} from 'chart.js';

Chart.register(DoughnutController, PieController, BarController, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export interface ChartSlice {
  label: string;
  value: number;
  color: string;
}

@Component({
  selector: 'app-interactive-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative" [style.height.px]="height">
      <canvas #canvas></canvas>
    </div>
    @if (items.length) {
      <div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        @for (item of items; track item.label; let i = $index) {
          <button type="button"
            class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors"
            [class]="highlighted === i ? 'bg-signal-500/15 text-signal-400' : 'text-ink-500 hover:bg-ink-800'"
            (mouseenter)="highlight(i)" (mouseleave)="highlight(-1)" (click)="toggle(i)">
            <span class="h-2.5 w-2.5 rounded-full shrink-0" [style.background]="item.color"></span>
            <span class="truncate">{{ item.label }}</span>
            <span class="ml-auto font-medium text-white">{{ item.value }}</span>
          </button>
        }
      </div>
    }
  `,
})
export class InteractiveChartComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() type: 'doughnut' | 'pie' | 'bar' = 'doughnut';
  @Input() items: ChartSlice[] = [];
  @Input() height = 220;

  private chart?: Chart;
  highlighted = -1;
  hidden = new Set<number>();

  ngOnChanges(_changes: SimpleChanges) {
    if (this.chart) this.build();
  }

  ngAfterViewInit() {
    this.build();
  }

  ngOnDestroy() {
    this.chart?.destroy();
  }

  highlight(i: number) {
    this.highlighted = i;
    if (!this.chart) return;
    this.chart.setActiveElements(i >= 0 ? [{ datasetIndex: 0, index: i }] : []);
    this.chart.update();
  }

  toggle(i: number) {
    if (!this.chart) return;
    this.chart.toggleDataVisibility(i);
    if (this.hidden.has(i)) this.hidden.delete(i);
    else this.hidden.add(i);
    this.chart.update();
  }

  private build() {
    this.chart?.destroy();
    const ctx = this.canvasRef?.nativeElement?.getContext('2d');
    if (!ctx || !this.items.length) return;

    this.chart = new Chart(ctx, {
      type: this.type,
      data: {
        labels: this.items.map(i => i.label),
        datasets: [{
          data: this.items.map(i => i.value),
          backgroundColor: this.items.map(i => i.color),
          borderColor: '#12161D',
          borderWidth: 2,
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1B212B',
            titleColor: '#fff',
            bodyColor: '#5B677A',
            borderColor: '#262E3A',
            borderWidth: 1,
          },
        },
        ...(this.type === 'bar' ? {
          scales: {
            x: { grid: { color: '#262E3A' }, ticks: { color: '#5B677A' } },
            y: { grid: { color: '#262E3A' }, ticks: { color: '#5B677A' }, beginAtZero: true },
          },
        } : {}),
        onClick: (_e, els) => {
          if (els[0]) this.toggle(els[0].index);
        },
      },
    });
  }
}
