import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../core/services/toast.service';

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
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-white">Tampering Incidents</h1>
        <p class="text-slate-400">Records that no longer match their blockchain anchors.</p>
      </div>

      <div class="card overflow-hidden p-0">
        <div class="border-b border-slate-800 p-4 flex flex-wrap gap-3 items-center justify-between">
          <input class="input-field max-w-sm" [(ngModel)]="q" placeholder="Search incidents..." />
          <select class="input-field w-40" [(ngModel)]="severity">
            <option value="">All severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div class="overflow-x-auto">
        <table class="w-full min-w-[960px] text-sm">
          <thead class="border-b border-slate-700 bg-slate-800/50">
            <tr>
              <th class="px-4 py-3 text-left text-slate-400">Entity</th>
              <th class="px-4 py-3 text-left text-slate-400">ID</th>
              <th class="px-4 py-3 text-left text-slate-400">Severity</th>
              <th class="px-4 py-3 text-left text-slate-400">Detected</th>
              <th class="px-4 py-3 text-left text-slate-400">Status</th>
              <th class="px-4 py-3 text-left text-slate-400">Hash</th>
              <th class="px-4 py-3 text-right text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (inc of paged(); track inc.id) {
              <tr class="border-b border-slate-800 hover:bg-rose-500/5 transition-colors">
                <td class="px-4 py-3 font-medium text-white">{{ inc.entity_type }}</td>
                <td class="px-4 py-3 font-mono text-xs text-slate-400">{{ inc.entity_id }}</td>
                <td class="px-4 py-3">
                  <span [class]="inc.severity === 'critical' ? 'badge-danger' : 'badge-warning'">{{ inc.severity }}</span>
                </td>
                <td class="px-4 py-3 text-slate-400">{{ inc.detected_at | date:'medium' }}</td>
                <td class="px-4 py-3"><span class="badge-info">{{ inc.investigation_status }}</span></td>
                <td class="px-4 py-3 font-mono text-xs text-rose-400 truncate max-w-[120px]">{{ inc.expected_hash }}</td>
                <td class="px-4 py-3 text-right">
                  <button class="btn-ghost text-xs" (click)="investigate(inc.id)">Investigate</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="px-4 py-12 text-center">
                <div class="text-emerald-400 text-lg mb-2">&#10003;</div>
                <div class="text-slate-400">No tampering detected. All records are intact.</div>
              </td></tr>
            }
          </tbody>
        </table>
        </div>
        <div class="border-t border-slate-800 p-4 flex items-center justify-between text-sm">
          <span class="text-slate-400">Page {{ page }} / {{ pages }}</span>
          <div class="space-x-2">
            <button class="btn-ghost" [disabled]="page===1" (click)="page = page - 1">Prev</button>
            <button class="btn-ghost" [disabled]="page===pages" (click)="page = page + 1">Next</button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class IncidentsPageComponent implements OnInit {
  incidents: Incident[] = [];
  q = '';
  severity = '';
  page = 1;
  pageSize = 8;

  constructor(private api: ApiService, private toast: ToastService) {}

  get filtered() {
    const q = this.q.trim().toLowerCase();
    return this.incidents.filter(i => {
      const byText = !q || `${i.entity_type} ${i.entity_id} ${i.investigation_status}`.toLowerCase().includes(q);
      const bySeverity = !this.severity || i.severity === this.severity;
      return byText && bySeverity;
    });
  }

  get pages() {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  paged() {
    if (this.page > this.pages) this.page = this.pages;
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  ngOnInit() {
    this.api.get<Incident[]>('/api/v1/tampering').subscribe(i => this.incidents = i);
  }

  investigate(id: string) {
    this.api.post(`/api/v1/tampering/${id}/investigate`, {}).subscribe({
      next: () => {
        this.toast.success('Incident investigated');
        this.api.get<Incident[]>('/api/v1/tampering').subscribe(i => this.incidents = i);
      },
      error: e => this.toast.error(e.error?.error || 'Investigation failed'),
    });
  }
}
