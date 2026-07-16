import {
  Component, Input, OnChanges, OnDestroy, AfterViewInit,
  ElementRef, ViewChild, SimpleChanges, ChangeDetectionStrategy, ChangeDetectorRef, effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Chart, DoughnutController, ArcElement, Tooltip, Legend, PieController,
  BarController, BarElement, CategoryScale, LinearScale, ChartEvent, ActiveElement,
} from 'chart.js';
import { ThemeService } from '../../../core/services/theme.service';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative w-full cursor-pointer" [style.height.px]="height">
      <canvas #canvas class="block w-full h-full touch-none"></canvas>
    </div>
    @if (items.length) {
      <div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        @for (item of items; track item.label; let i = $index) {
          <button type="button"
            class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors"
            [class]="highlighted === i ? 'bg-signal-500/15 text-signal-400' : 'text-ink-500 hover:bg-ink-800'"
            (mouseenter)="highlight(i)" (mouseleave)="highlight(-1)" (click)="toggle(i)">
            <span class="h-2.5 w-2.5 rounded-full shrink-0" [style.background]="item.color"></span>
            <span class="truncate" [class.line-through]="hidden.has(i)" [class.opacity-50]="hidden.has(i)">{{ item.label }}</span>
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
  private viewReady = false;
  private itemsKey = '';
  highlighted = -1;
  hidden = new Set<number>();

  constructor(private cdr: ChangeDetectorRef, private theme: ThemeService) {
    effect(() => {
      this.theme.theme();
      if (this.viewReady) this.build();
    });
  }

  private get chrome() {
    return this.theme.theme() === 'dark'
      ? { surface: '#12161D', tooltipBg: '#1B212B', title: '#fff', body: '#5B677A', line: '#262E3A' }
      : { surface: '#FFFFFF', tooltipBg: '#FFFFFF', title: '#0F172A', body: '#64748B', line: '#E2E8F0' };
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['items'] && this.viewReady) {
      const key = JSON.stringify(this.items);
      if (key !== this.itemsKey) {
        this.itemsKey = key;
        this.hidden.clear();
        this.build();
      }
    }
  }

  ngAfterViewInit() {
    this.viewReady = true;
    this.itemsKey = JSON.stringify(this.items);
    requestAnimationFrame(() => this.build());
  }

  ngOnDestroy() {
    this.chart?.destroy();
  }

  highlight(i: number) {
    this.highlighted = i;
    if (!this.chart) return;
    this.chart.setActiveElements(i >= 0 ? [{ datasetIndex: 0, index: i }] : []);
    this.chart.tooltip?.setActiveElements(i >= 0 ? [{ datasetIndex: 0, index: i }] : [], { x: 0, y: 0 });
    this.chart.update('none');
    this.cdr.markForCheck();
  }

  toggle(i: number) {
    if (!this.chart) return;
    this.chart.toggleDataVisibility(i);
    if (this.hidden.has(i)) this.hidden.delete(i);
    else this.hidden.add(i);
    this.chart.update();
    this.cdr.markForCheck();
  }

  private build() {
    this.chart?.destroy();
    this.chart = undefined;
    const canvas = this.canvasRef?.nativeElement;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !this.items.length) return;

    const self = this;
    const isArc = this.type === 'doughnut' || this.type === 'pie';
    const chrome = this.chrome;

    this.chart = new Chart(ctx, {
      type: this.type,
      data: {
        labels: this.items.map(i => i.label),
        datasets: [{
          data: this.items.map(i => i.value),
          backgroundColor: this.items.map(i => i.color),
          borderColor: chrome.surface,
          borderWidth: 2,
          hoverOffset: isArc ? 12 : 0,
          borderRadius: this.type === 'bar' ? 4 : 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 350 },
        interaction: { mode: isArc ? 'nearest' : 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            backgroundColor: chrome.tooltipBg,
            titleColor: chrome.title,
            bodyColor: chrome.body,
            borderColor: chrome.line,
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.parsed}`,
            },
          },
        },
        ...(this.type === 'bar' ? {
          scales: {
            x: { grid: { color: chrome.line }, ticks: { color: chrome.body } },
            y: { grid: { color: chrome.line }, ticks: { color: chrome.body }, beginAtZero: true },
          },
        } : {}),
        onHover: (_e: ChartEvent, els: ActiveElement[]) => {
          self.highlighted = els[0]?.index ?? -1;
          self.cdr.markForCheck();
        },
        onClick: (_e: ChartEvent, els: ActiveElement[]) => {
          if (els[0]) self.toggle(els[0].index);
        },
      },
    });
  }
}
