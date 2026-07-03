import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

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
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-white">Anchored Records</h1>
        <p class="text-slate-400">Blockchain hash records captured by ChainProof.</p>
      </div>

      <div class="table-shell">
        <div class="table-toolbar">
          <input class="input-field max-w-sm" [(ngModel)]="q" placeholder="Search entity/id/hash..." />
          <span class="text-sm text-slate-400">{{ filtered.length }} records</span>
        </div>
        <div class="overflow-x-auto">
          <table class="cp-table">
            <thead>
              <tr>
                <th>Entity</th>
                <th>Entity ID</th>
                <th>Status</th>
                <th>Record Hash</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              @for (r of paged(); track r.id) {
                <tr class="border-b border-slate-800">
                  <td class="text-white">{{ r.entity_type }}</td>
                  <td class="font-mono text-xs text-slate-300">{{ r.entity_id }}</td>
                  <td><span [class]="r.blockchain_status === 'submitted' ? 'badge-success' : 'badge-warning'">{{ r.blockchain_status }}</span></td>
                  <td class="font-mono text-xs text-brand-300">{{ r.record_hash.slice(0, 20) }}...</td>
                  <td class="text-slate-400">{{ r.created_at | date: 'medium' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="px-4 py-8 text-center text-slate-500">No records yet.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class RecordsPageComponent implements OnInit {
  rows: RecordItem[] = [];
  q = '';
  page = 1;
  pageSize = 10;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.get<RecordItem[]>('/api/v1/integrity/records').subscribe(r => (this.rows = r));
  }

  get filtered() {
    const q = this.q.trim().toLowerCase();
    if (!q) return this.rows;
    return this.rows.filter(r => `${r.entity_type} ${r.entity_id} ${r.record_hash}`.toLowerCase().includes(q));
  }

  paged() {
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }
}
