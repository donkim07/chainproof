import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { BarChartComponent, BarChartItem } from '../../shared/components/bar-chart/bar-chart.component';
import { InteractiveChartComponent, ChartSlice } from '../../shared/components/interactive-chart/interactive-chart.component';

interface Analytics {
  total_records: number;
  total_incidents: number;
  total_captures: number;
  protected_endpoints: number;
  records_by_day: { date: string; count: number }[];
  incidents_by_severity: Record<string, number>;
  blockchain_status: Record<string, number>;
}

@Component({
  selector: 'app-analytics-page',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, StatCardComponent, BarChartComponent, InteractiveChartComponent],
  template: `
    <app-page-header title="Analytics & Reports" subtitle="Anchoring activity, captures, and incident trends for your organization." badge="Insights"></app-page-header>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8 items-stretch">
      <app-stat-card label="Anchored Records" [value]="data?.total_records ?? '—'" color="text-signal-400" icon="database"></app-stat-card>
      <app-stat-card label="Proxy Captures" [value]="data?.total_captures ?? '—'" color="text-signal-400" icon="radar"></app-stat-card>
      <app-stat-card label="Open Incidents" [value]="data?.total_incidents ?? '—'" color="text-alert-400" icon="alert"></app-stat-card>
      <app-stat-card label="Protected Routes" [value]="data?.protected_endpoints ?? '—'" color="text-white" icon="shield"></app-stat-card>
    </div>

    <div class="grid gap-6 xl:grid-cols-2">
      <div class="card">
        <h2 class="mb-4 font-semibold text-white">Anchors — last 14 days</h2>
        <app-interactive-chart type="bar" [items]="recordsChart" [height]="200"></app-interactive-chart>
      </div>
      <div class="card">
        <h2 class="mb-4 font-semibold text-white">Blockchain status</h2>
        <p class="text-xs text-ink-500 mb-3">Click slices to toggle · hover for tooltips</p>
        <app-interactive-chart type="doughnut" [items]="statusDonut"></app-interactive-chart>
      </div>
      <div class="card">
        <h2 class="mb-4 font-semibold text-white">Incidents by severity</h2>
        <p class="text-xs text-ink-500 mb-3">Click slices to toggle · hover for tooltips</p>
        <app-interactive-chart type="pie" [items]="severityPie"></app-interactive-chart>
      </div>
      <div class="card">
        <h2 class="mb-4 font-semibold text-white">Activity breakdown</h2>
        <app-bar-chart [items]="activityChart"></app-bar-chart>
      </div>
    </div>
  `,
})
export class AnalyticsPageComponent implements OnInit {
  data: Analytics | null = null;
  recordsChart: ChartSlice[] = [];
  statusDonut: ChartSlice[] = [];
  severityPie: ChartSlice[] = [];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.get<Analytics>('/api/v1/dashboard/analytics').subscribe(d => {
      this.data = d;
      this.recordsChart = (d.records_by_day ?? []).map(r => ({
        label: r.date.slice(5), value: r.count, color: '#17B8A6',
      }));
      const statusColors: Record<string, string> = { submitted: '#17B8A6', pending: '#E8A445', failed: '#F2545B' };
      this.statusDonut = Object.entries(d.blockchain_status ?? {}).map(([k, v]) => ({
        label: k, value: v, color: statusColors[k] ?? '#5B677A',
      }));
      const sevColors: Record<string, string> = { critical: '#F2545B', high: '#F5787E', medium: '#E8A445', low: '#5B677A' };
      this.severityPie = Object.entries(d.incidents_by_severity ?? {}).map(([k, v]) => ({
        label: k, value: v, color: sevColors[k] ?? '#5B677A',
      }));
    });
  }

  get activityChart(): BarChartItem[] {
    if (!this.data) return [];
    return [
      { label: 'Records', value: this.data.total_records, color: 'bg-signal-500' },
      { label: 'Captures', value: this.data.total_captures, color: 'bg-signal-400' },
      { label: 'Incidents', value: this.data.total_incidents, color: 'bg-alert-500' },
      { label: 'Endpoints', value: this.data.protected_endpoints, color: 'bg-warn-500' },
    ];
  }
}
