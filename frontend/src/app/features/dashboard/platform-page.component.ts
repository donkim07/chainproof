import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ButtonComponent } from '../../shared/components/button/button.component';

interface Org {
  id: string;
  name: string;
  slug: string;
  plan_slug: string;
  subscription_status: string;
  active: boolean;
  created_at: string;
}

interface Overview {
  total_organizations: number;
  total_users: number;
  organizations: Org[];
}

@Component({
  selector: 'app-platform-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonComponent],
  template: `
    <div class="space-y-6">
      <div>
        <div class="badge-info mb-2">Platform Admin</div>
        <h1 class="text-2xl font-bold text-white">Platform Overview</h1>
        <p class="text-slate-400">Super admin view — manage all organizations on ChainProof.</p>
      </div>

      <div class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
        The <strong>admin&#64;chainproof.io</strong> account is a platform super-admin and is not tied to any organization.
        To use Sites, API Keys, and tamper monitoring, <a routerLink="/register" class="underline text-white">register a new organization</a>
        or sign in with an owner account.
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="card">
          <div class="text-sm text-slate-400">Organizations</div>
          <div class="mt-2 text-3xl font-bold text-brand-400">{{ overview?.total_organizations ?? '—' }}</div>
        </div>
        <div class="card">
          <div class="text-sm text-slate-400">Platform Users</div>
          <div class="mt-2 text-3xl font-bold text-white">{{ overview?.total_users ?? '—' }}</div>
        </div>
      </div>

      <div class="card overflow-hidden p-0">
        <div class="border-b border-slate-700 px-4 py-3 font-medium text-white">All Organizations</div>
        <table class="w-full text-sm">
          <thead class="border-b border-slate-700 bg-slate-800/50">
            <tr>
              <th class="px-4 py-3 text-left text-slate-400">Name</th>
              <th class="px-4 py-3 text-left text-slate-400">Slug</th>
              <th class="px-4 py-3 text-left text-slate-400">Plan</th>
              <th class="px-4 py-3 text-left text-slate-400">Status</th>
            </tr>
          </thead>
          <tbody>
            @for (org of overview?.organizations ?? []; track org.id) {
              <tr class="border-b border-slate-800">
                <td class="px-4 py-3 text-white">{{ org.name }}</td>
                <td class="px-4 py-3 font-mono text-xs text-slate-400">{{ org.slug }}</td>
                <td class="px-4 py-3"><span class="badge-info">{{ org.plan_slug }}</span></td>
                <td class="px-4 py-3"><span class="badge-success">{{ org.subscription_status }}</span></td>
              </tr>
            } @empty {
              <tr><td colspan="4" class="px-4 py-8 text-center text-slate-500">No organizations yet.</td></tr>
            }
          </tbody>
        </table>
      </div>

      <a routerLink="/register"><app-button>Register New Organization</app-button></a>
    </div>
  `,
})
export class PlatformPageComponent implements OnInit {
  overview: Overview | null = null;
  constructor(private api: ApiService, public auth: AuthService) {}
  ngOnInit() {
    this.api.get<Overview>('/api/v1/platform/overview').subscribe({
      next: o => this.overview = o,
    });
  }
}
