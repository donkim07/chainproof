import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { ButtonComponent } from '../../shared/components/button/button.component';

@Component({
  selector: 'app-platform-billing-page',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, StatCardComponent, ButtonComponent],
  template: `
    <app-page-header title="Billing &amp; Revenue" subtitle="MRR, subscriptions, quotas, and usage reports." badge="Super Admin" />
    <div class="grid gap-4 sm:grid-cols-3 mb-8">
      <app-stat-card label="Est. MRR" [value]="mrr" color="text-signal-400" icon="&#128176;"></app-stat-card>
      <app-stat-card label="Active subs" [value]="data?.active_subscriptions ?? '—'" color="text-signal-400" icon="&#9989;"></app-stat-card>
      <app-stat-card label="Clients" [value]="clients.length" color="text-white" icon="&#127970;"></app-stat-card>
    </div>
    <div class="card mb-6">
      <h3 class="font-semibold text-white mb-3">Reports &amp; exports</h3>
      <div class="flex flex-wrap gap-3">
        <app-button (click)="exportCsv()">Usage report (CSV)</app-button>
        <app-button variant="secondary" (click)="exportClients()">Client billing (CSV)</app-button>
      </div>
    </div>
    <div class="table-shell">
      <table class="cp-table">
        <thead><tr><th>Client</th><th>Plan</th><th>MRR</th><th>Quota</th><th>Status</th></tr></thead>
        <tbody>
          @for (c of clients; track c.org_slug) {
            <tr class="border-t border-ink-800">
              <td class="text-white">{{ c.org_name }}</td>
              <td><span class="badge-info">{{ c.plan }}</span></td>
              <td>{{ c.mrr === 0 ? 'Free' : '$' + c.mrr }}</td>
              <td class="text-ink-500 text-xs">{{ quotaLabel(c.plan) }}</td>
              <td><span class="badge-success">{{ c.status }}</span></td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class PlatformBillingPageComponent implements OnInit {
  data: { estimated_mrr?: number; active_subscriptions?: number; clients?: { org_name: string; org_slug: string; plan: string; mrr: number; status: string }[] } | null = null;
  constructor(private api: ApiService, private toast: ToastService) {}
  ngOnInit() { this.api.get<typeof this.data>('/api/v1/platform/billing').subscribe(d => this.data = d); }
  get mrr() { return this.data?.estimated_mrr != null ? '$' + this.data.estimated_mrr : '—'; }
  get clients() { return this.data?.clients ?? []; }
  exportCsv() {
    this.api.downloadText('/api/v1/platform/reports/usage', 'chainproof-usage-report.csv');
    this.toast.success('Usage report downloaded');
  }
  exportClients() {
    const header = 'org_name,org_slug,plan,mrr,status\n';
    const rows = this.clients.map(c =>
      `"${c.org_name}","${c.org_slug}","${c.plan}",${c.mrr},"${c.status}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chainproof-clients.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
  quotaLabel(plan: string) {
    const map: Record<string, string> = {
      free: '1 site · 500 anchors/mo',
      pro: '10 sites · 50k anchors/mo',
      enterprise: 'Unlimited',
    };
    return map[plan] ?? plan;
  }
}
