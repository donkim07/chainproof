import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';

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
  imports: [CommonModule, RouterLink, PageHeaderComponent, StatCardComponent],
  template: `
    <app-page-header
      title="Integrity Overview"
      subtitle="Monitor tamper protection for your sites — your end users never log in here."
      badge="Owner dashboard">
    </app-page-header>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8 items-stretch">
      <app-stat-card label="Sites" [value]="stats?.total_sites ?? '—'" color="text-signal-400" icon="globe" hint="Registered backends"></app-stat-card>
      <app-stat-card label="Protected Endpoints" [value]="stats?.protected_endpoints ?? '—'" color="text-signal-400" icon="lock"></app-stat-card>
      <app-stat-card label="Anchored Records" [value]="stats?.anchored_records ?? '—'" color="text-white" icon="chain"></app-stat-card>
      <app-stat-card
        label="Open Incidents"
        [value]="stats?.open_incidents ?? '—'"
        [color]="(stats?.open_incidents ?? 0) > 0 ? 'text-alert-400' : 'text-signal-400'"
        icon="alert"
        [trend]="(stats?.open_incidents ?? 0) > 0 ? 'Action required' : 'All clear'"
        [trendPositive]="!(stats?.open_incidents ?? 0)">
      </app-stat-card>
    </div>

    <div class="grid gap-6 xl:grid-cols-3">
      <div class="card xl:col-span-2">
        <h2 class="mb-4 text-lg font-semibold text-white">Onboarding Checklist</h2>
        <div class="space-y-3">
          @for (item of checklist; track item.title) {
            <a [routerLink]="item.link" class="flex gap-4 rounded-xl border border-ink-700 p-4 hover:border-signal-500/40 hover:bg-ink-800/30 transition-all group">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-signal-500/15 text-signal-400 font-bold group-hover:bg-signal-500/25">{{ item.step }}</div>
              <div>
                <div class="font-medium text-white">{{ item.title }}</div>
                <div class="text-sm text-ink-500">{{ item.desc }}</div>
              </div>
            </a>
          }
        </div>
      </div>

      <div class="space-y-6">
        <div class="card">
          <h2 class="mb-4 text-lg font-semibold text-white">Integration</h2>
          <div class="rounded-xl border border-signal-500/20 bg-signal-500/5 p-4">
            <div class="font-medium text-signal-400">Developer API</div>
            <p class="mt-1 text-sm text-ink-500">Your backend calls /integrity/anchor after each save. Include a verify block for automatic tamper checks on dynamic routes.</p>
            <a routerLink="/docs" class="inline-block mt-2 text-sm text-signal-400 hover:underline">Read the guide →</a>
          </div>
        </div>

        <div class="card border-ink-700">
          <h2 class="mb-3 text-sm font-semibold text-ink-500 uppercase tracking-wider">Security</h2>
          <ul class="space-y-2 text-sm text-slate-300">
            <li class="flex gap-2"><span class="text-signal-400">✓</span> Per-tenant database isolation</li>
            <li class="flex gap-2"><span class="text-signal-400">✓</span> bcrypt password hashing</li>
            <li class="flex gap-2"><span class="text-signal-400">✓</span> API keys stored as SHA-256 hashes</li>
            <li class="flex gap-2"><span class="text-signal-400">✓</span> Rate limiting on auth endpoints</li>
          </ul>
        </div>
      </div>
    </div>
  `,
})
export class DashboardHomeComponent implements OnInit {
  stats: Stats | null = null;
  checklist = [
    { step: '1', title: 'Register your site', desc: 'Add your backend URL and copy the Site ID.', link: '/dashboard/sites' },
    { step: '2', title: 'Create an API key', desc: 'Put it in your server .env as CHAINPROOF_API_KEY.', link: '/dashboard/api-keys' },
    { step: '3', title: 'Anchor after each save', desc: 'Call /integrity/anchor with site_id, payload, and verify block.', link: '/docs' },
    { step: '4', title: 'Monitor tampering', desc: 'Incidents appear here when live data diverges from anchors.', link: '/dashboard/incidents' },
  ];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.get<Stats>('/api/v1/dashboard/stats').subscribe({ next: s => this.stats = s });
  }
}
