import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { DataTableComponent, TableColumn } from '../../shared/components/data-table/data-table.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';

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
  imports: [CommonModule, PageHeaderComponent, DataTableComponent, SearchInputComponent],
  template: `
    <app-page-header title="Projects & Endpoints" subtitle="All monitored backends across every client." badge="Super Admin" />

    <app-data-table
      [columns]="columns"
      [rows]="filtered"
      exportFilename="platform-sites.csv"
      [countLabel]="filtered.length + ' sites'"
      emptyTitle="No sites"
      emptyIcon="globe">
      <app-search-input search [(value)]="q" placeholder="Search client, URL..." />
    </app-data-table>
  `,
})
export class PlatformEndpointsPageComponent implements OnInit {
  sites: PlatformSite[] = [];
  q = '';

  columns: TableColumn<PlatformSite>[] = [
    { key: 'org_name', label: 'Client', class: 'text-white' },
    { key: 'name', label: 'Site' },
    { key: 'base_url', label: 'Base URL', class: 'font-mono text-xs text-ink-500 max-w-[200px] truncate' },
    { key: 'endpoints', label: 'Endpoints' },
    { key: 'anchors', label: 'Anchors' },
    { key: 'status', label: 'Status', format: r => r.status },
  ];

  constructor(private api: ApiService) {}
  ngOnInit() {
    this.api.get<PlatformSite[]>('/api/v1/platform/sites').subscribe(s => this.sites = s);
  }
  get filtered() {
    const v = this.q.trim().toLowerCase();
    if (!v) return this.sites;
    return this.sites.filter(s => `${s.org_name} ${s.name} ${s.base_url}`.toLowerCase().includes(v));
  }
}
