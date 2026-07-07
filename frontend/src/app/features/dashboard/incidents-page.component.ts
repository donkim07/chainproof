import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../core/services/toast.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { DataTableComponent, TableColumn } from '../../shared/components/data-table/data-table.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';

interface Incident {
  id: string;
  entity_type: string;
  entity_id: string;
  severity: string;
  expected_hash: string;
  actual_hash?: string;
  detected_at: string;
  investigation_status: string;
}

@Component({
  selector: 'app-incidents-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, DataTableComponent, SearchInputComponent],
  template: `
    <app-page-header title="Tampering Incidents" subtitle="Records that no longer match their blockchain anchors." badge="Security"></app-page-header>

    <app-data-table
      [columns]="columns"
      [rows]="filtered"
      [pageSize]="pageSize"
      [hasActions]="true"
      exportFilename="incidents.csv"
      [countLabel]="filtered.length + ' incidents'"
      emptyTitle="All clear"
      emptyDescription="No tampering detected. All records match their anchors."
      emptyIcon="shield">
      <app-search-input search [(value)]="q" placeholder="Search incidents..." />
      <select toolbar class="input-field w-36 text-sm" [(ngModel)]="severity">
        <option value="">All severity</option>
        <option value="critical">Critical</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>

      <ng-template #rowActions let-inc>
        @if (investigating.has(inc.id)) {
          <span class="text-xs text-ink-500">Updating…</span>
        } @else if (inc.investigation_status === 'investigated') {
          <span class="inline-flex items-center gap-1 text-xs text-signal-400">
            <span class="h-1.5 w-1.5 rounded-full bg-signal-500"></span> Investigated
          </span>
        } @else if (inc.investigation_status === 'investigating') {
          <span class="text-xs text-warn-500">Investigating…</span>
        } @else {
          <button class="btn-ghost text-xs" (click)="investigate(inc)">Investigate</button>
        }
      </ng-template>
    </app-data-table>
  `,
})
export class IncidentsPageComponent implements OnInit {
  incidents: Incident[] = [];
  q = '';
  severity = '';
  pageSize = 10;
  investigating = new Set<string>();

  columns: TableColumn<Incident>[] = [
    { key: 'entity_type', label: 'Entity', class: 'text-white font-medium' },
    { key: 'entity_id', label: 'ID', class: 'font-mono text-xs text-ink-500' },
    { key: 'severity', label: 'Severity' },
    { key: 'detected_at', label: 'Detected', class: 'text-ink-500',
      format: r => new Date(r.detected_at).toLocaleString() },
    { key: 'investigation_status', label: 'Status' },
    { key: 'expected_hash', label: 'Hash', class: 'font-mono text-xs text-alert-400 max-w-[120px] truncate',
      format: r => r.expected_hash.slice(0, 16) + '...', exportFormat: r => r.expected_hash },
  ];

  constructor(private api: ApiService, private toast: ToastService) {}

  get filtered() {
    const q = this.q.trim().toLowerCase();
    return this.incidents.filter(i => {
      const byText = !q || `${i.entity_type} ${i.entity_id} ${i.investigation_status}`.toLowerCase().includes(q);
      const bySeverity = !this.severity || i.severity === this.severity;
      return byText && bySeverity;
    });
  }

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.api.get<Incident[]>('/api/v1/tampering').subscribe(i => this.incidents = i);
  }

  investigate(inc: Incident) {
    if (this.investigating.has(inc.id)) return;
    this.investigating.add(inc.id);
    this.api.post(`/api/v1/tampering/${inc.id}/investigate`, {}).subscribe({
      next: () => {
        inc.investigation_status = 'investigated';
        this.toast.success('Incident marked as investigated');
        this.investigating.delete(inc.id);
      },
      error: e => {
        this.toast.error(e.error?.error || 'Investigation failed');
        this.investigating.delete(inc.id);
      },
    });
  }
}
