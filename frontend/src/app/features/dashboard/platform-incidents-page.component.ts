import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

interface PlatformIncident {
  org_name: string;
  org_slug: string;
  id: string;
  entity_type: string;
  entity_id: string;
  severity: string;
  status: string;
  detected_at: string;
}

@Component({
  selector: 'app-platform-incidents-page',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, SearchInputComponent, PaginationComponent, EmptyStateComponent],
  template: `
    <app-page-header title="Alerts & Incidents" subtitle="Centralized tamper detection inbox across all tenants." badge="Super Admin" />

    <div class="table-shell">
      <div class="table-toolbar">
        <app-search-input placeholder="Search client, entity..." [(value)]="q" />
        <span class="text-sm text-slate-400">{{ filtered.length }} open</span>
      </div>
      <div class="overflow-x-auto">
        <table class="cp-table">
          <thead>
            <tr>
              <th>Severity</th><th>Client</th><th>Entity</th><th>ID</th><th>Status</th><th>Detected</th>
            </tr>
          </thead>
          <tbody>
            @for (i of pageRows; track i.id) {
              <tr class="border-t border-slate-800 hover:bg-slate-800/30 transition-colors">
                <td><span [class]="severityClass(i.severity)">{{ i.severity }}</span></td>
                <td class="text-white">{{ i.org_name }}</td>
                <td class="font-mono text-xs">{{ i.entity_type }}</td>
                <td class="font-mono text-xs text-slate-400 max-w-[140px] truncate">{{ i.entity_id }}</td>
                <td><span class="badge-warning">{{ i.status }}</span></td>
                <td class="text-xs text-slate-500">{{ i.detected_at | date:'medium' }}</td>
              </tr>
            } @empty {
              <tr><td colspan="6"><app-empty-state title="No open incidents" description="All clear across the platform." icon="&#9989;"></app-empty-state></td></tr>
            }
          </tbody>
        </table>
      </div>
      <app-pagination [page]="page" [pageSize]="15" [total]="filtered.length" (pageChange)="page = $event" />
    </div>
  `,
})
export class PlatformIncidentsPageComponent implements OnInit {
  incidents: PlatformIncident[] = [];
  q = '';
  page = 1;
  constructor(private api: ApiService) {}
  ngOnInit() {
    this.api.get<PlatformIncident[]>('/api/v1/platform/incidents').subscribe(i => this.incidents = i);
  }
  get filtered() {
    const v = this.q.trim().toLowerCase();
    if (!v) return this.incidents;
    return this.incidents.filter(i => `${i.org_name} ${i.entity_type} ${i.entity_id}`.toLowerCase().includes(v));
  }
  get pageRows() {
    const start = (this.page - 1) * 15;
    return this.filtered.slice(start, start + 15);
  }
  severityClass(s: string) {
    if (s === 'critical' || s === 'high') return 'badge-danger';
    if (s === 'medium') return 'badge-warning';
    return 'badge-info';
  }
}
