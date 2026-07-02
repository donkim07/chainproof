import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

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
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-white">Tampering Incidents</h1>
        <p class="text-slate-400">Records that no longer match their blockchain anchors.</p>
      </div>

      <div class="card overflow-hidden p-0">
        <table class="w-full text-sm">
          <thead class="border-b border-slate-700 bg-slate-800/50">
            <tr>
              <th class="px-4 py-3 text-left text-slate-400">Entity</th>
              <th class="px-4 py-3 text-left text-slate-400">ID</th>
              <th class="px-4 py-3 text-left text-slate-400">Severity</th>
              <th class="px-4 py-3 text-left text-slate-400">Detected</th>
              <th class="px-4 py-3 text-left text-slate-400">Status</th>
              <th class="px-4 py-3 text-left text-slate-400">Hash</th>
            </tr>
          </thead>
          <tbody>
            @for (inc of incidents; track inc.id) {
              <tr class="border-b border-slate-800 hover:bg-rose-500/5 transition-colors">
                <td class="px-4 py-3 font-medium text-white">{{ inc.entity_type }}</td>
                <td class="px-4 py-3 font-mono text-xs text-slate-400">{{ inc.entity_id }}</td>
                <td class="px-4 py-3">
                  <span [class]="inc.severity === 'critical' ? 'badge-danger' : 'badge-warning'">{{ inc.severity }}</span>
                </td>
                <td class="px-4 py-3 text-slate-400">{{ inc.detected_at | date:'medium' }}</td>
                <td class="px-4 py-3"><span class="badge-info">{{ inc.investigation_status }}</span></td>
                <td class="px-4 py-3 font-mono text-xs text-rose-400 truncate max-w-[120px]">{{ inc.expected_hash }}</td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="px-4 py-12 text-center">
                <div class="text-emerald-400 text-lg mb-2">&#10003;</div>
                <div class="text-slate-400">No tampering detected. All records are intact.</div>
              </td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class IncidentsPageComponent implements OnInit {
  incidents: Incident[] = [];
  constructor(private api: ApiService) {}
  ngOnInit() {
    this.api.get<Incident[]>('/api/v1/tampering').subscribe(i => this.incidents = i);
  }
}
