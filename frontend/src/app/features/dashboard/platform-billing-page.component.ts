import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { DataTableComponent, TableColumn } from '../../shared/components/data-table/data-table.component';

@Component({
  selector: 'app-platform-billing-page',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, StatCardComponent, ButtonComponent, DataTableComponent],
  template: `
    <app-page-header title="Billing &amp; Revenue" subtitle="MRR, subscriptions, quotas, and usage reports." badge="Super Admin" />
    <div class="grid gap-4 sm:grid-cols-3 mb-8">
      <app-stat-card label="Est. MRR" [value]="mrr" color="text-signal-400" icon="dollar" />
      <app-stat-card label="Active subs" [value]="data?.active_subscriptions ?? '—'" color="text-signal-400" icon="check-circle" />
      <app-stat-card label="Clients" [value]="clients.length" color="text-white" icon="building" />
    </div>
    <div class="card mb-6">
      <h3 class="font-semibold text-white mb-3">Reports &amp; exports</h3>
      <div class="flex flex-wrap gap-3">
        <app-button (click)="exportCsv()">Usage report (CSV)</app-button>
        <app-button variant="secondary" (click)="exportClients()">Client billing (CSV)</app-button>
      </div>
    </div>

    <app-data-table
      [columns]="columns"
      [rows]="clients"
      exportFilename="platform-billing.csv"
      [countLabel]="clients.length + ' clients'"
      emptyTitle="No clients"
      emptyIcon="credit-card" />

    <div class="mt-8">
      <app-data-table
        [columns]="usageColumns"
        [rows]="usageRecords"
        exportFilename="usage-records.csv"
        [countLabel]="usageRecords.length + ' usage records'"
        emptyTitle="No usage recorded yet"
        emptyDescription="Anchor events will populate monthly usage meters."
        emptyIcon="database" />
    </div>
  `,
})
export class PlatformBillingPageComponent implements OnInit {
  data: { estimated_mrr?: number; active_subscriptions?: number; clients?: ClientRow[] } | null = null;
  usageRecords: UsageRow[] = [];

  columns: TableColumn<ClientRow>[] = [
    { key: 'org_name', label: 'Client', class: 'text-white' },
    { key: 'plan', label: 'Plan' },
    { key: 'mrr', label: 'MRR', format: r => r.mrr === 0 ? 'Free' : '$' + r.mrr },
    { key: 'org_slug', label: 'Quota', format: r => quotaLabel(r.plan) },
    { key: 'status', label: 'Status' },
  ];

  usageColumns: TableColumn<UsageRow>[] = [
    { key: 'org_name', label: 'Client', class: 'text-white' },
    { key: 'metric', label: 'Metric' },
    { key: 'value', label: 'Value' },
    { key: 'period_start', label: 'Period start', class: 'text-ink-500 text-xs',
      format: r => new Date(r.period_start).toLocaleDateString() },
    { key: 'period_end', label: 'Period end', class: 'text-ink-500 text-xs',
      format: r => new Date(r.period_end).toLocaleDateString() },
  ];

  constructor(private api: ApiService, private toast: ToastService) {}
  ngOnInit() {
    this.api.get<typeof this.data>('/api/v1/platform/billing').subscribe(d => this.data = d);
    this.api.get<UsageRow[]>('/api/v1/platform/usage-records').subscribe(r => this.usageRecords = r ?? []);
  }
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
}

interface ClientRow {
  org_name: string;
  org_slug: string;
  plan: string;
  mrr: number;
  status: string;
}

interface UsageRow {
  org_name: string;
  org_slug: string;
  metric: string;
  value: number;
  period_start: string;
  period_end: string;
}

function quotaLabel(plan: string) {
  const map: Record<string, string> = {
    free: '1 site · 500 anchors/mo',
    pro: '10 sites · 50k anchors/mo',
    enterprise: 'Unlimited',
  };
  return map[plan] ?? plan;
}
