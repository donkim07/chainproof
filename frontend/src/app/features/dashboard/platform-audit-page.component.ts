import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { DataTableComponent, TableColumn } from '../../shared/components/data-table/data-table.component';

interface AuditLog {
  id: string;
  action: string;
  resource_type: string;
  actor_email: string;
  ip_address?: string;
  created_at: string;
}

@Component({
  selector: 'app-platform-audit-page',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, DataTableComponent],
  template: `
    <app-page-header title="Audit Logs" subtitle="Super-admin actions: logins, org/plan changes, impersonation, and billing checkout attempts." badge="Super Admin"></app-page-header>

    <app-data-table
      [columns]="columns"
      [rows]="logs"
      exportFilename="audit-logs.csv"
      [countLabel]="logs.length + ' events'"
      emptyTitle="No audit events"
      emptyIcon="audit" />
  `,
})
export class PlatformAuditPageComponent implements OnInit {
  logs: AuditLog[] = [];

  columns: TableColumn<AuditLog>[] = [
    { key: 'created_at', label: 'Time', class: 'text-xs text-ink-500',
      format: r => new Date(r.created_at).toLocaleString() },
    { key: 'actor_email', label: 'Actor', class: 'text-white' },
    { key: 'action', label: 'Action' },
    { key: 'resource_type', label: 'Resource', class: 'text-ink-500', format: r => r.resource_type || '—' },
    { key: 'ip_address', label: 'IP', class: 'font-mono text-xs text-ink-500', format: r => r.ip_address || '—' },
  ];

  constructor(private api: ApiService) {}
  ngOnInit() { this.api.get<AuditLog[]>('/api/v1/platform/audit-logs').subscribe(l => this.logs = l); }
}
