import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { BarChartComponent, BarChartItem } from '../../shared/components/bar-chart/bar-chart.component';

interface Overview {
  total_organizations: number;
  total_users: number;
  active_subscriptions?: number;
  total_plans?: number;
  estimated_mrr?: number;
  orgs_by_plan?: Record<string, number>;
  signups_by_day?: { date: string; count: number }[];
}

@Component({
  selector: 'app-platform-overview-page',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent, StatCardComponent, BarChartComponent],
  template: `
    <app-page-header title="Platform Overview" subtitle="Global KPIs across all tenants and subscriptions." badge="Super Admin"></app-page-header>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-8">
      <app-stat-card label="Organizations" [value]="o?.total_organizations ?? '—'" color="text-brand-400" icon="&#127970;"></app-stat-card>
      <app-stat-card label="Platform Users" [value]="o?.total_users ?? '—'" color="text-white" icon="&#128101;"></app-stat-card>
      <app-stat-card label="Active Subs" [value]="o?.active_subscriptions ?? '—'" color="text-emerald-400" icon="&#9989;"></app-stat-card>
      <app-stat-card label="Plans" [value]="o?.total_plans ?? '—'" color="text-amber-400" icon="&#128176;"></app-stat-card>
      <app-stat-card label="Est. MRR" [value]="mrr" color="text-brand-300" icon="&#128200;"></app-stat-card>
    </div>

    <div class="grid gap-6 xl:grid-cols-2 mb-8">
      <div class="card">
        <h2 class="mb-4 font-semibold text-white">Organizations by plan</h2>
        <app-bar-chart [items]="planChart"></app-bar-chart>
      </div>
      <div class="card">
        <h2 class="mb-4 font-semibold text-white">New signups — 30 days</h2>
        <app-bar-chart [items]="signupChart"></app-bar-chart>
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-3">
      <a routerLink="/dashboard/platform/organizations" class="card hover:border-brand-500/40 transition-colors">
        <div class="font-semibold text-white">Manage Organizations</div>
        <p class="mt-1 text-sm text-slate-400">Suspend, activate, change plans</p>
      </a>
      <a routerLink="/dashboard/platform/users" class="card hover:border-brand-500/40 transition-colors">
        <div class="font-semibold text-white">Platform Users</div>
        <p class="mt-1 text-sm text-slate-400">Owners, admins, super admins</p>
      </a>
      <a routerLink="/dashboard/platform/audit-logs" class="card hover:border-brand-500/40 transition-colors">
        <div class="font-semibold text-white">Audit Trail</div>
        <p class="mt-1 text-sm text-slate-400">Platform-level actions log</p>
      </a>
    </div>
  `,
})
export class PlatformOverviewPageComponent implements OnInit {
  o: Overview | null = null;
  constructor(private api: ApiService) {}
  ngOnInit() { this.api.get<Overview>('/api/v1/platform/overview').subscribe(x => this.o = x); }
  get mrr() { return this.o?.estimated_mrr != null ? '$' + this.o.estimated_mrr.toFixed(0) : '—'; }
  get planChart(): BarChartItem[] {
    return Object.entries(this.o?.orgs_by_plan ?? {}).map(([k, v]) => ({ label: k, value: v, color: 'bg-brand-500' }));
  }
  get signupChart(): BarChartItem[] {
    return (this.o?.signups_by_day ?? []).map(s => ({ label: s.date.slice(5), value: s.count, color: 'bg-emerald-500' }));
  }
}
