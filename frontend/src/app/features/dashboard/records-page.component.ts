import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { DataTableComponent, TableColumn } from '../../shared/components/data-table/data-table.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';

interface RecordItem {
  id: string;
  entity_type: string;
  entity_id: string;
  payload_hash: string;
  record_hash: string;
  blockchain_status: string;
  created_at: string;
}

@Component({
  selector: 'app-records-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, DataTableComponent, SearchInputComponent],
  template: `
    <app-page-header title="Anchored Records" subtitle="Blockchain hash records captured by ChainProof." badge="Integrity"></app-page-header>

    <app-data-table
      [columns]="columns"
      [rows]="filtered"
      [pageSize]="pageSize"
      exportFilename="anchored-records.csv"
      [countLabel]="filtered.length + ' records'"
      emptyTitle="No records yet"
      emptyDescription="Anchors appear here after your backend calls /integrity/anchor."
      emptyIcon="database">
      <app-search-input search [(value)]="q" placeholder="Search entity/id/hash..." />
    </app-data-table>
  `,
})
export class RecordsPageComponent implements OnInit {
  rows: RecordItem[] = [];
  q = '';
  pageSize = 10;

  columns: TableColumn<RecordItem>[] = [
    { key: 'entity_type', label: 'Entity', class: 'text-white' },
    { key: 'entity_id', label: 'Entity ID', class: 'font-mono text-xs text-slate-300' },
    { key: 'blockchain_status', label: 'Status' },
    { key: 'record_hash', label: 'Record Hash', class: 'font-mono text-xs text-signal-400',
      format: r => r.record_hash.slice(0, 20) + '...', exportFormat: r => r.record_hash },
    { key: 'created_at', label: 'Created', class: 'text-ink-500',
      format: r => new Date(r.created_at).toLocaleString(), exportFormat: r => r.created_at },
  ];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.get<RecordItem[]>('/api/v1/integrity/records').subscribe(r => (this.rows = r));
  }

  get filtered() {
    const q = this.q.trim().toLowerCase();
    if (!q) return this.rows;
    return this.rows.filter(r => `${r.entity_type} ${r.entity_id} ${r.record_hash}`.toLowerCase().includes(q));
  }
}
