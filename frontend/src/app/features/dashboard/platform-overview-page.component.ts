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
  total_sites?: number;
  total_endpoints?: number;
  total_anchors?: number;
  open_incidents?: number;
  orgs_by_plan?: Record<string, number>;
  signups_by_day?: { date: string; count: number }[];
  scanner?: { tools: { name: string; available: boolean }[] };
  blockchain_status?: string;
}

@Component({
  selector: 'app-platform-overview-page',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent, StatCardComponent, BarChartComponent],
  template: `
    <app-page-header title="Platform Command Center" subtitle="Global health, clients, blockchain anchors, and scanner status." badge="Super Admin"></app-page-header>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 mb-8">
      <app-stat-card label="Active Clients" [value]="o?.total_organizations ?? '—'" color="text-brand-400" icon="&#127970;"></app-stat-card>
      <app-stat-card label="Monitored Sites" [value]="o?.total_sites ?? '—'" color="text-white" icon="&#127760;"></app-stat-card>
      <app-stat-card label="Protected Endpoints" [value]="o?.total_endpoints ?? '—'" color="text-emerald-400" icon="&#128274;"></app-stat-card>
      <app-stat-card label="Hashes Anchored" [value]="o?.total_anchors ?? '—'" color="text-brand-300" icon="&#9939;"></app-stat-card>
      <app-stat-card label="Open Alerts" [value]="o?.open_incidents ?? '—'" color="text-rose-400" icon="&#128680;"></app-stat-card>
    </div>

    <div class="grid gap-4 sm:grid-cols-3 mb-8">
      <app-stat-card label="Platform Users" [value]="o?.total_users ?? '—'" color="text-slate-300" icon="&#128101;"></app-stat-card>
      <app-stat-card label="Est. MRR" [value]="mrr" color="text-amber-400" icon="&#128176;"></app-stat-card>
      <app-stat-card label="Blockchain" [value]="o?.blockchain_status ?? '—'" color="text-emerald-400" icon="&#9939;"></app-stat-card>
    </div>

    <div class="grid gap-6 xl:grid-cols-2 mb-8">
      <div class="card hover:border-brand-500/20 transition-colors">
        <h2 class="mb-4 font-semibold text-white">Clients by plan</h2>
        <app-bar-chart [items]="planChart"></app-bar-chart>
      </div>
      <div class="card hover:border-emerald-500/20 transition-colors">
        <h2 class="mb-4 font-semibold text-white">New signups — 30 days</h2>
        <app-bar-chart [items]="signupChart"></app-bar-chart>
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      @for (link of quickLinks; track link.path) {
        <a [routerLink]="link.path" class="card group hover:border-brand-500/40 hover:-translate-y-0.5 transition-all duration-200">
          <div class="font-semibold text-white group-hover:text-brand-300 transition-colors">{{ link.title }}</div>
          <p class="mt-1 text-sm text-slate-400">{{ link.desc }}</p>
        </a>
      }
    </div>
  `,
})
export class PlatformOverviewPageComponent implements OnInit {
  o: Overview | null = null;
  quickLinks = [
    { path: '/dashboard/platform/organizations', title: 'Clients', desc: 'Suspend, activate, upgrade plans' },
    { path: '/dashboard/platform/endpoints', title: 'All Endpoints', desc: 'Sites across every tenant' },
    { path: '/dashboard/platform/incidents', title: 'Alert Inbox', desc: 'Open tamper incidents' },
    { path: '/dashboard/platform/scanner', title: 'Scanner', desc: 'ffuf · gobuster · kiterunner' },
  ];
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
