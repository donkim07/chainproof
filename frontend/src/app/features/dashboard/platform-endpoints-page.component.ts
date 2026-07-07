import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

interface PlatformSite {
  org_name: string;
  org_slug: string;
  id: string;
  name: string;
  base_url: string;
  status: string;
  endpoints: number;
  anchors: number;
}

@Component({
  selector: 'app-platform-endpoints-page',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, SearchInputComponent, PaginationComponent, EmptyStateComponent],
  template: `
    <app-page-header title="Projects & Endpoints" subtitle="All monitored backends across every client." badge="Super Admin" />

    <div class="table-shell mb-6">
      <div class="table-toolbar">
        <app-search-input placeholder="Search client, URL..." [(value)]="q" />
        <span class="text-sm text-ink-500">{{ filtered.length }} sites</span>
      </div>
      <div class="overflow-x-auto">
        <table class="cp-table">
          <thead>
            <tr>
              <th>Client</th><th>Site</th><th>Base URL</th><th>Endpoints</th><th>Anchors</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            @for (s of pageRows; track s.id) {
              <tr class="border-t border-ink-800 hover:bg-ink-800/30 transition-colors">
                <td class="text-white">{{ s.org_name }}</td>
                <td>{{ s.name }}</td>
                <td class="font-mono text-xs text-ink-500 max-w-[200px] truncate">{{ s.base_url }}</td>
                <td>{{ s.endpoints }}</td>
                <td>{{ s.anchors }}</td>
                <td><span [class]="s.status === 'active' ? 'badge-success' : 'badge-warning'">{{ s.status }}</span></td>
              </tr>
            } @empty {
              <tr><td colspan="6"><app-empty-state title="No sites" description="No registered backends yet." icon="&#127760;"></app-empty-state></td></tr>
            }
          </tbody>
        </table>
      </div>
      <app-pagination [page]="page" [pageSize]="15" [total]="filtered.length" (pageChange)="page = $event" />
    </div>
  `,
})
export class PlatformEndpointsPageComponent implements OnInit {
  sites: PlatformSite[] = [];
  q = '';
  page = 1;
  constructor(private api: ApiService) {}
  ngOnInit() {
    this.api.get<PlatformSite[]>('/api/v1/platform/sites').subscribe(s => this.sites = s);
  }
  get filtered() {
    const v = this.q.trim().toLowerCase();
    if (!v) return this.sites;
    return this.sites.filter(s => `${s.org_name} ${s.name} ${s.base_url}`.toLowerCase().includes(v));
  }
  get pageRows() {
    const start = (this.page - 1) * 15;
    return this.filtered.slice(start, start + 15);
  }
}
