import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

interface Stats {
  total_sites: number;
  protected_endpoints: number;
  anchored_records: number;
  open_incidents: number;
  tampered_records: number;
}

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-white">Dashboard</h1>
        <p class="text-slate-400">Monitor your data integrity across all protected sites.</p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        @for (stat of statCards; track stat.label) {
          <div class="card animate-slide-up">
            <div class="text-sm text-slate-400">{{ stat.label }}</div>
            <div class="mt-2 text-3xl font-bold" [class]="stat.color">{{ stat.value }}</div>
          </div>
        }
      </div>

      <div class="grid gap-6 lg:grid-cols-2">
        <div class="card">
          <h2 class="mb-4 text-lg font-semibold text-white">Quick Start</h2>
          <ol class="space-y-3 text-sm text-slate-300">
            <li class="flex gap-3"><span class="badge-info">1</span> Register a site with your backend URL</li>
            <li class="flex gap-3"><span class="badge-info">2</span> Discover & protect endpoints (or use our API)</li>
            <li class="flex gap-3"><span class="badge-info">3</span> Anchor records — we store hashes on Hyperledger Fabric</li>
            <li class="flex gap-3"><span class="badge-info">4</span> Get alerted when tampering is detected</li>
          </ol>
        </div>
        <div class="card">
          <h2 class="mb-4 text-lg font-semibold text-white">Integration Modes</h2>
          <div class="space-y-4">
            <div class="rounded-lg border border-slate-700 p-4">
              <div class="font-medium text-brand-400">Developer API</div>
              <p class="mt-1 text-sm text-slate-400">Full control via REST API + SDKs. Best for technical teams.</p>
            </div>
            <div class="rounded-lg border border-slate-700 p-4">
              <div class="font-medium text-emerald-400">Proxy Mode</div>
              <p class="mt-1 text-sm text-slate-400">Enter your backend URL — we discover endpoints and protect them silently.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class DashboardHomeComponent implements OnInit {
  stats: Stats | null = null;

  get statCards() {
    const s = this.stats;
    return [
      { label: 'Sites', value: s?.total_sites ?? '—', color: 'text-brand-400' },
      { label: 'Protected Endpoints', value: s?.protected_endpoints ?? '—', color: 'text-emerald-400' },
      { label: 'Anchored Records', value: s?.anchored_records ?? '—', color: 'text-white' },
      { label: 'Open Incidents', value: s?.open_incidents ?? '—', color: s?.open_incidents ? 'text-rose-400' : 'text-emerald-400' },
    ];
  }

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.get<Stats>('/api/v1/dashboard/stats').subscribe({
      next: s => this.stats = s,
    });
  }
}
