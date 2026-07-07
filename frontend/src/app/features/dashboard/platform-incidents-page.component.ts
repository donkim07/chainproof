import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { DataTableComponent, TableColumn } from '../../shared/components/data-table/data-table.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';

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
  imports: [CommonModule, PageHeaderComponent, DataTableComponent, SearchInputComponent],
  template: `
    <app-page-header title="Alerts & Incidents" subtitle="Centralized tamper detection inbox across all tenants." badge="Super Admin" />

    <app-data-table
      [columns]="columns"
      [rows]="filtered"
      exportFilename="platform-incidents.csv"
      [countLabel]="filtered.length + ' open'"
      emptyTitle="No open incidents"
      emptyIcon="shield">
      <app-search-input search [(value)]="q" placeholder="Search client, entity..." />
    </app-data-table>
  `,
})
export class PlatformIncidentsPageComponent implements OnInit {
  incidents: PlatformIncident[] = [];
  q = '';

  columns: TableColumn<PlatformIncident>[] = [
    { key: 'severity', label: 'Severity' },
    { key: 'org_name', label: 'Client', class: 'text-white' },
    { key: 'entity_type', label: 'Entity', class: 'font-mono text-xs' },
    { key: 'entity_id', label: 'ID', class: 'font-mono text-xs text-ink-500 max-w-[140px] truncate' },
    { key: 'status', label: 'Status' },
    { key: 'detected_at', label: 'Detected', class: 'text-xs text-ink-500',
      format: r => new Date(r.detected_at).toLocaleString() },
  ];

  constructor(private api: ApiService) {}
  ngOnInit() {
    this.api.get<PlatformIncident[]>('/api/v1/platform/incidents').subscribe(i => this.incidents = i);
  }
  get filtered() {
    const v = this.q.trim().toLowerCase();
    if (!v) return this.incidents;
    return this.incidents.filter(i => `${i.org_name} ${i.entity_type} ${i.entity_id}`.toLowerCase().includes(v));
  }
}
