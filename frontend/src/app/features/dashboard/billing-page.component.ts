import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';

interface BillingOverview {
  plan_slug: string;
  plan_name: string;
  price_monthly: number;
  max_sites: number;
  max_endpoints: number;
  max_anchors_monthly: number;
  subscription_status: string;
  sites_used: number;
  anchors_this_month: number;
}

interface Invoice {
  id: string;
  period_start: string;
  period_end: string;
  amount: number;
  status: string;
  plan_slug: string;
}

@Component({
  selector: 'app-billing-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent, ButtonComponent, StatCardComponent],
  template: `
    <app-page-header title="Billing &amp; Subscription" subtitle="Manage your plan, usage, and invoices." badge="Access &amp; Billing" />

    @if (loading) {
      <div class="grid gap-4 sm:grid-cols-3 mb-8">
        @for (_ of [1,2,3]; track $index) {
          <div class="kpi-card animate-pulse"><div class="h-16 rounded-lg bg-ink-800"></div></div>
        }
      </div>
    } @else if (error) {
      <div class="card border-alert-500/30 text-center py-12">
        <p class="text-alert-400 mb-2">{{ error }}</p>
        <app-button variant="secondary" (click)="load()">Retry</app-button>
      </div>
    } @else if (overview) {
      <div class="grid gap-4 sm:grid-cols-3 mb-8">
        <app-stat-card label="Current plan" [value]="overview.plan_name" color="text-signal-400" icon="credit-card" />
        <app-stat-card label="Sites used" [value]="overview.sites_used + ' / ' + siteLimit" color="text-white" icon="globe" />
        <app-stat-card label="Anchors this month" [value]="overview.anchors_this_month + ' / ' + anchorLimit" color="text-signal-400" icon="database" />
      </div>

      <div class="grid gap-6 lg:grid-cols-2 mb-8">
        <div class="card">
          <h3 class="font-semibold text-white mb-2">Subscription</h3>
          <p class="text-sm text-ink-500 mb-4">
            {{ overview.price_monthly === 0 ? 'Free tier' : '$' + overview.price_monthly + '/month' }} ·
            Status: <span class="text-signal-400 capitalize">{{ overview.subscription_status }}</span>
          </p>
          <div class="space-y-2 text-sm text-ink-500 mb-4">
            <div>Max sites: {{ siteLimit }}</div>
            <div>Max endpoints per site: {{ endpointLimit }}</div>
            <div>Monthly anchors: {{ anchorLimit }}</div>
          </div>
          @if (overview.plan_slug !== 'enterprise') {
            <p class="text-sm text-ink-500 border border-ink-700 rounded-lg p-3 bg-ink-900/50">
              Need a higher tier? Contact <a href="mailto:support&#64;chainproof.io" class="text-signal-400 hover:underline">support&#64;chainproof.io</a> or ask your super admin to change your plan.
            </p>
          }
          <a routerLink="/pricing" class="inline-block mt-4 text-xs text-signal-400 hover:underline">Compare all plans →</a>
        </div>

        <div class="card">
          <h3 class="font-semibold text-white mb-4">Usage meters</h3>
          <div class="space-y-4">
            <div>
              <div class="flex justify-between text-xs text-ink-500 mb-1"><span>Sites</span><span>{{ pct(overview.sites_used, overview.max_sites) }}%</span></div>
              <div class="h-2 rounded-full bg-ink-800 overflow-hidden"><div class="h-full bg-signal-500 rounded-full transition-all" [style.width.%]="pct(overview.sites_used, overview.max_sites)"></div></div>
            </div>
            <div>
              <div class="flex justify-between text-xs text-ink-500 mb-1"><span>Monthly anchors</span><span>{{ pct(overview.anchors_this_month, overview.max_anchors_monthly) }}%</span></div>
              <div class="h-2 rounded-full bg-ink-800 overflow-hidden"><div class="h-full bg-signal-500 rounded-full transition-all" [style.width.%]="pct(overview.anchors_this_month, overview.max_anchors_monthly)"></div></div>
            </div>
          </div>
        </div>
      </div>

      <div class="table-shell">
        <div class="table-toolbar"><span class="text-sm font-medium text-white">Invoices</span></div>
        <div class="overflow-x-auto">
          <table class="cp-table">
            <thead><tr><th>Period</th><th>Plan</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              @for (inv of invoices; track inv.id) {
                <tr class="border-t border-ink-800">
                  <td class="text-ink-500 text-sm">{{ inv.period_start | date:'mediumDate' }} – {{ inv.period_end | date:'mediumDate' }}</td>
                  <td><span class="badge-info capitalize">{{ inv.plan_slug }}</span></td>
                  <td>{{ inv.amount === 0 ? 'Free' : '$' + inv.amount }}</td>
                  <td><span [class]="inv.status === 'paid' ? 'badge-success' : 'badge-warning'">{{ inv.status }}</span></td>
                </tr>
              } @empty {
                <tr><td colspan="4" class="py-8 text-center text-ink-500">No invoices yet.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }
  `,
})
export class BillingPageComponent implements OnInit {
  overview: BillingOverview | null = null;
  invoices: Invoice[] = [];
  loading = true;
  error = '';

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.error = '';
    this.api.get<BillingOverview>('/api/v1/billing/overview').subscribe({
      next: o => { this.overview = o; this.loading = false; },
      error: e => {
        this.error = e.error?.message || e.error?.error || 'Could not load billing information';
        this.loading = false;
      },
    });
    this.api.get<Invoice[]>('/api/v1/billing/invoices').subscribe({
      next: i => this.invoices = i,
      error: () => {},
    });
  }

  get siteLimit() { return this.fmtLimit(this.overview?.max_sites); }
  get endpointLimit() { return this.fmtLimit(this.overview?.max_endpoints); }
  get anchorLimit() { return this.fmtLimit(this.overview?.max_anchors_monthly); }

  fmtLimit(n?: number) { return n != null && n < 0 ? 'Unlimited' : String(n ?? '—'); }

  pct(used: number, max: number) {
    if (max < 0) return 0;
    if (!max) return 0;
    return Math.min(100, Math.round((used / max) * 100));
  }
}
