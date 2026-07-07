import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { ButtonComponent } from '../../shared/components/button/button.component';

@Component({
  selector: 'app-platform-billing-page',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, StatCardComponent, ButtonComponent],
  template: `
    <app-page-header title="Billing &amp; Revenue" subtitle="MRR, subscriptions, and per-client usage." badge="Super Admin" />
    <div class="grid gap-4 sm:grid-cols-3 mb-8">
      <app-stat-card label="Est. MRR" [value]="mrr" color="text-emerald-400" icon="&#128176;"></app-stat-card>
      <app-stat-card label="Active subs" [value]="data?.active_subscriptions ?? '—'" color="text-brand-400" icon="&#9989;"></app-stat-card>
      <app-stat-card label="Clients" [value]="clients.length" color="text-white" icon="&#127970;"></app-stat-card>
    </div>
    <div class="flex gap-3 mb-4">
      <app-button (click)="exportCsv()">Export usage CSV</app-button>
    </div>
    <div class="table-shell">
      <table class="cp-table">
        <thead><tr><th>Client</th><th>Plan</th><th>MRR</th><th>Status</th></tr></thead>
        <tbody>
          @for (c of clients; track c.org_slug) {
            <tr class="border-t border-slate-800">
              <td class="text-white">{{ c.org_name }}</td>
              <td><span class="badge-info">{{ c.plan }}</span></td>
              <td>{{ c.mrr === 0 ? 'Free' : '$' + c.mrr }}</td>
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
  constructor(private api: ApiService) {}
  ngOnInit() { this.api.get<typeof this.data>('/api/v1/platform/billing').subscribe(d => this.data = d); }
  get mrr() { return this.data?.estimated_mrr != null ? '$' + this.data.estimated_mrr : '—'; }
  get clients() { return this.data?.clients ?? []; }
  exportCsv() { window.open('/api/v1/platform/reports/usage', '_blank'); }
}
