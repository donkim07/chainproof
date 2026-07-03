import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { BarChartComponent, BarChartItem } from '../../shared/components/bar-chart/bar-chart.component';

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
  imports: [CommonModule, PageHeaderComponent, StatCardComponent, BarChartComponent],
  template: `
    <app-page-header title="Analytics & Reports" subtitle="Anchoring activity, captures, and incident trends for your organization." badge="Insights"></app-page-header>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
      <app-stat-card label="Anchored Records" [value]="data?.total_records ?? '—'" color="text-brand-400" icon="&#128274;"></app-stat-card>
      <app-stat-card label="Proxy Captures" [value]="data?.total_captures ?? '—'" color="text-emerald-400" icon="&#128225;"></app-stat-card>
      <app-stat-card label="Open Incidents" [value]="data?.total_incidents ?? '—'" color="text-rose-400" icon="&#9888;"></app-stat-card>
      <app-stat-card label="Protected Routes" [value]="data?.protected_endpoints ?? '—'" color="text-white" icon="&#128737;"></app-stat-card>
    </div>

    <div class="grid gap-6 xl:grid-cols-2">
      <div class="card">
        <h2 class="mb-4 font-semibold text-white">Anchors — last 14 days</h2>
        <app-bar-chart [items]="recordsChart"></app-bar-chart>
      </div>
      <div class="card">
        <h2 class="mb-4 font-semibold text-white">Blockchain status breakdown</h2>
        <app-bar-chart [items]="statusChart"></app-bar-chart>
      </div>
      <div class="card xl:col-span-2">
        <h2 class="mb-4 font-semibold text-white">Incidents by severity</h2>
        <app-bar-chart [items]="severityChart"></app-bar-chart>
      </div>
    </div>
  `,
})
export class AnalyticsPageComponent implements OnInit {
  data: Analytics | null = null;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.get<Analytics>('/api/v1/dashboard/analytics').subscribe(d => this.data = d);
  }

  get recordsChart(): BarChartItem[] {
    return (this.data?.records_by_day ?? []).map(r => ({ label: r.date, value: r.count, color: 'bg-brand-500' }));
  }

  get statusChart(): BarChartItem[] {
    const m = this.data?.blockchain_status ?? {};
    return Object.entries(m).map(([k, v]) => ({ label: k, value: v, color: k === 'submitted' ? 'bg-emerald-500' : 'bg-amber-500' }));
  }

  get severityChart(): BarChartItem[] {
    const m = this.data?.incidents_by_severity ?? {};
    return Object.entries(m).map(([k, v]) => ({ label: k, value: v, color: 'bg-rose-500' }));
  }
}
