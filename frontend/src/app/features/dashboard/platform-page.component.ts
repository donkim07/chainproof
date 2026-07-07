import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';

interface Org {
  id: string;
  name: string;
  slug: string;
  plan_slug: string;
  subscription_status: string;
  payment_status?: string;
  active: boolean;
  created_at: string;
}

interface Overview {
  total_organizations: number;
  total_users: number;
  active_subscriptions?: number;
  total_plans?: number;
  organizations: Org[];
}

@Component({
  selector: 'app-platform-page',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ButtonComponent, PageHeaderComponent, StatCardComponent],
  template: `
    <app-page-header
      title="Platform Command Center"
      subtitle="Super-admin view across all tenants, plans, and subscription health."
      badge="Super Admin">
      <a actions routerLink="/register"><app-button variant="secondary">+ New Organization</app-button></a>
    </app-page-header>

    <div class="rounded-xl border border-warn-500/25 bg-gradient-to-r from-warn-500/10 to-transparent p-4 mb-6 text-sm text-amber-100">
      <strong>Platform account</strong> — not tied to a tenant org. To test Sites, API Keys, and monitoring,
      <a routerLink="/register" class="underline text-white font-medium">register an organization</a> or sign in as an owner.
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
      <app-stat-card label="Organizations" [value]="overview?.total_organizations ?? '—'" color="text-signal-400" icon="&#127970;" hint="Active tenants"></app-stat-card>
      <app-stat-card label="Platform Users" [value]="overview?.total_users ?? '—'" color="text-white" icon="&#128101;"></app-stat-card>
      <app-stat-card label="Active Subscriptions" [value]="overview?.active_subscriptions ?? '—'" color="text-signal-400" icon="&#9989;"></app-stat-card>
      <app-stat-card label="Plans Available" [value]="overview?.total_plans ?? '—'" color="text-warn-500" icon="&#128176;"></app-stat-card>
    </div>

    <div class="grid gap-6 xl:grid-cols-3 mb-8">
      <div class="card xl:col-span-2 p-0 overflow-hidden">
        <div class="table-toolbar">
          <div>
            <h2 class="font-semibold text-white">All Organizations</h2>
            <p class="text-xs text-ink-500">Tenant isolation — each org gets a dedicated PostgreSQL database</p>
          </div>
          <input class="input-field max-w-xs" [(ngModel)]="q" placeholder="Filter orgs..." />
        </div>
        <div class="overflow-x-auto">
          <table class="cp-table">
            <thead>
              <tr>
                <th>Organization</th>
                <th>Slug</th>
                <th>Plan</th>
                <th>Subscription</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              @for (org of filteredOrgs; track org.id) {
                <tr class="border-t border-ink-800 hover:bg-ink-800/30">
                  <td class="font-medium text-white">{{ org.name }}</td>
                  <td class="font-mono text-xs text-ink-500">{{ org.slug }}</td>
                  <td><span class="badge-info">{{ org.plan_slug || 'free' }}</span></td>
                  <td><span class="badge-success">{{ org.subscription_status }}</span></td>
                  <td>
                    <span [class]="org.active ? 'badge-success' : 'badge-danger'">{{ org.active ? 'active' : 'suspended' }}</span>
                  </td>
                  <td class="text-xs text-ink-500">{{ org.created_at | date:'mediumDate' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="py-12 text-center text-ink-500">No organizations registered yet.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <div class="space-y-4">
        <div class="card">
          <h3 class="font-semibold text-white mb-4">System Health</h3>
          <div class="space-y-3 text-sm">
            <div class="flex justify-between items-center rounded-lg bg-ink-800/50 px-3 py-2">
              <span class="text-ink-500">API</span>
              <span class="badge-success">operational</span>
            </div>
            <div class="flex justify-between items-center rounded-lg bg-ink-800/50 px-3 py-2">
              <span class="text-ink-500">Platform DB</span>
              <span class="badge-success">connected</span>
            </div>
            <div class="flex justify-between items-center rounded-lg bg-ink-800/50 px-3 py-2">
              <span class="text-ink-500">Fabric Gateway</span>
              <span class="badge-warning">dev mode</span>
            </div>
            <div class="flex justify-between items-center rounded-lg bg-ink-800/50 px-3 py-2">
              <span class="text-ink-500">Tenant DBs</span>
              <span class="badge-info">{{ overview?.total_organizations ?? 0 }} provisioned</span>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 class="font-semibold text-white mb-3">Admin Quick Actions</h3>
          <div class="space-y-2">
            <a routerLink="/docs" class="block rounded-lg border border-ink-700 px-3 py-2.5 text-sm text-slate-300 hover:border-signal-500/40 transition-colors">View API documentation</a>
            <a routerLink="/pricing" class="block rounded-lg border border-ink-700 px-3 py-2.5 text-sm text-slate-300 hover:border-signal-500/40 transition-colors">Manage pricing plans</a>
            <a routerLink="/register" class="block rounded-lg border border-ink-700 px-3 py-2.5 text-sm text-slate-300 hover:border-signal-500/40 transition-colors">Provision new tenant</a>
          </div>
        </div>

        <div class="card border-signal-500/20">
          <h3 class="font-semibold text-white mb-2">Architecture</h3>
          <p class="text-xs text-ink-500 leading-relaxed">
            Platform PostgreSQL holds orgs, billing, and users. Each tenant gets an isolated DB for sites,
            endpoints, integrity records, and audit logs. Hashes anchor to Hyperledger Fabric.
          </p>
        </div>
      </div>
    </div>
  `,
})
export class PlatformPageComponent implements OnInit {
  overview: Overview | null = null;
  q = '';

  constructor(private api: ApiService, public auth: AuthService) {}

  ngOnInit() {
    this.api.get<Overview>('/api/v1/platform/overview').subscribe({ next: o => this.overview = o });
  }

  get filteredOrgs() {
    const list = this.overview?.organizations ?? [];
    const v = this.q.trim().toLowerCase();
    if (!v) return list;
    return list.filter(o => `${o.name} ${o.slug} ${o.plan_slug}`.toLowerCase().includes(v));
  }
}
