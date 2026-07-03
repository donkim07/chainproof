import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

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
  imports: [CommonModule, PageHeaderComponent],
  template: `
    <app-page-header title="Audit Logs" subtitle="Platform-level actions and security events." badge="Super Admin"></app-page-header>
    <div class="table-shell">
      <table class="cp-table">
        <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Resource</th><th>IP</th></tr></thead>
        <tbody>
          @for (log of logs; track log.id) {
            <tr class="border-t border-slate-800">
              <td class="text-xs text-slate-400">{{ log.created_at | date:'medium' }}</td>
              <td class="text-white">{{ log.actor_email }}</td>
              <td><span class="badge-warning">{{ log.action }}</span></td>
              <td class="text-slate-400">{{ log.resource_type || '—' }}</td>
              <td class="font-mono text-xs text-slate-500">{{ log.ip_address || '—' }}</td>
            </tr>
          } @empty {
            <tr><td colspan="5" class="py-12 text-center text-slate-500">No audit events recorded yet.</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class PlatformAuditPageComponent implements OnInit {
  logs: AuditLog[] = [];
  constructor(private api: ApiService) {}
  ngOnInit() { this.api.get<AuditLog[]>('/api/v1/platform/audit-logs').subscribe(l => this.logs = l); }
}
