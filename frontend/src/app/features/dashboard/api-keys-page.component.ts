import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ButtonComponent } from '../../shared/components/button/button.component';

interface APIKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  active: boolean;
  created_at: string;
  plain_key?: string;
}

@Component({
  selector: 'app-api-keys-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-white">API Keys</h1>
          <p class="text-slate-400">Manage keys for programmatic access.</p>
        </div>
        <app-button (click)="showCreate = true">+ New Key</app-button>
      </div>

      @if (newKey) {
        <div class="card border-emerald-500/30 animate-slide-up">
          <div class="badge-success mb-2">Key Created — copy now, it won't be shown again</div>
          <code class="block rounded bg-slate-950 p-3 font-mono text-sm text-emerald-400 break-all">{{ newKey }}</code>
        </div>
      }

      @if (showCreate) {
        <div class="card">
          <input class="input-field mb-3" [(ngModel)]="keyName" placeholder="Key name (e.g. Production)" />
          <app-button (click)="createKey()" [loading]="creating">Generate Key</app-button>
        </div>
      }

      <div class="card overflow-hidden p-0">
        <table class="w-full text-sm">
          <thead class="border-b border-slate-700 bg-slate-800/50">
            <tr>
              <th class="px-4 py-3 text-left text-slate-400">Name</th>
              <th class="px-4 py-3 text-left text-slate-400">Prefix</th>
              <th class="px-4 py-3 text-left text-slate-400">Status</th>
              <th class="px-4 py-3 text-right text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (key of keys; track key.id) {
              <tr class="border-b border-slate-800">
                <td class="px-4 py-3 text-white">{{ key.name }}</td>
                <td class="px-4 py-3 font-mono text-xs text-slate-400">{{ key.key_prefix }}...</td>
                <td class="px-4 py-3"><span [class]="key.active ? 'badge-success' : 'badge-danger'">{{ key.active ? 'Active' : 'Revoked' }}</span></td>
                <td class="px-4 py-3 text-right">
                  @if (key.active) {
                    <button class="text-xs text-rose-400 hover:underline" (click)="revoke(key.id)">Revoke</button>
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="4" class="px-4 py-8 text-center text-slate-500">No API keys yet.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class ApiKeysPageComponent implements OnInit {
  keys: APIKey[] = [];
  showCreate = false;
  keyName = '';
  creating = false;
  newKey = '';

  constructor(private api: ApiService, private toast: ToastService) {}
  ngOnInit() { this.load(); }
  load() { this.api.get<APIKey[]>('/api/v1/api-keys').subscribe(k => this.keys = k); }

  createKey() {
    this.creating = true;
    this.api.post<APIKey>('/api/v1/api-keys', { name: this.keyName, scopes: ['integrity:anchor', 'integrity:verify'] }).subscribe({
      next: k => {
        this.newKey = k.plain_key || '';
        this.showCreate = false;
        this.keyName = '';
        this.load();
        this.creating = false;
      },
      error: () => { this.toast.error('Failed to create key'); this.creating = false; },
    });
  }

  revoke(id: string) {
    this.api.delete(`/api/v1/api-keys/${id}`).subscribe({
      next: () => { this.toast.success('Key revoked'); this.load(); },
    });
  }
}
