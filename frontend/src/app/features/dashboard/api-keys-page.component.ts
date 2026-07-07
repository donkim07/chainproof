import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { CopyButtonComponent } from '../../shared/components/copy-button/copy-button.component';
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
  imports: [CommonModule, FormsModule, ButtonComponent, CopyButtonComponent],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-white">API Keys</h1>
          <p class="text-ink-500">Server-side keys for anchoring from your backend. Full keys are shown <strong class="text-white">once</strong> at creation — they are never stored or displayed again in this panel.</p>
        </div>
        <app-button (click)="showCreate = true">+ New Key</app-button>
      </div>

      @if (newKey) {
        <div class="card border-signal-500/30 animate-slide-up">
          <div class="flex items-center justify-between mb-2">
            <div class="badge-success">Key created — copy now and store in your server .env only</div>
            <app-copy-button [value]="newKey" label="Copy API key" />
          </div>
          <p class="text-xs text-ink-500 mb-2">This key will <strong class="text-warn-500">not</strong> appear again in the dashboard. Only the prefix is shown later. Revoke immediately if leaked.</p>
          <code class="block rounded bg-ink-950 p-3 font-mono text-sm text-signal-400 break-all">{{ newKey }}</code>
          <pre class="mt-3 text-xs text-ink-500 whitespace-pre-wrap"># .env on YOUR backend (never commit to git)
CHAINPROOF_API_KEY={{ newKey }}</pre>
        </div>
      }

      @if (showCreate) {
        <div class="card">
          <input class="input-field mb-3" [(ngModel)]="keyName" placeholder="Key name (e.g. Production)" />
          <app-button (click)="createKey()" [loading]="creating">Generate Key</app-button>
        </div>
      }

      <div class="card overflow-hidden p-0">
        <div class="border-b border-ink-800 p-4 flex items-center justify-between gap-3">
          <input class="input-field max-w-sm" [(ngModel)]="q" placeholder="Search API keys..." />
          <span class="text-sm text-ink-500">{{ filtered.length }} keys</span>
        </div>
        <table class="w-full text-sm">
          <thead class="border-b border-ink-700 bg-ink-800/50">
            <tr>
              <th class="px-4 py-3 text-left text-ink-500">Name</th>
              <th class="px-4 py-3 text-left text-ink-500">Prefix</th>
              <th class="px-4 py-3 text-left text-ink-500">Status</th>
              <th class="px-4 py-3 text-right text-ink-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (key of paged(); track key.id) {
              <tr class="border-b border-ink-800">
                <td class="px-4 py-3 text-white">{{ key.name }}</td>
                <td class="px-4 py-3 font-mono text-xs text-ink-500">{{ key.key_prefix }}...</td>
                <td class="px-4 py-3"><span [class]="key.active ? 'badge-success' : 'badge-danger'">{{ key.active ? 'Active' : 'Revoked' }}</span></td>
                <td class="px-4 py-3 text-right">
                  @if (key.active) {
                    <button class="text-xs text-alert-400 hover:underline" (click)="revoke(key.id)">Revoke</button>
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="4" class="px-4 py-8 text-center text-ink-500">No API keys yet.</td></tr>
            }
          </tbody>
        </table>
        <div class="border-t border-ink-800 p-4 flex items-center justify-between text-sm">
          <span class="text-ink-500">Page {{ page }} / {{ pages }}</span>
          <div class="space-x-2">
            <button class="btn-ghost" [disabled]="page===1" (click)="page = page - 1">Prev</button>
            <button class="btn-ghost" [disabled]="page===pages" (click)="page = page + 1">Next</button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ApiKeysPageComponent implements OnInit {
  keys: APIKey[] = [];
  q = '';
  page = 1;
  pageSize = 8;
  showCreate = false;
  keyName = '';
  creating = false;
  newKey = '';

  constructor(private api: ApiService, private toast: ToastService) {}
  ngOnInit() { this.load(); }
  load() { this.api.get<APIKey[]>('/api/v1/api-keys').subscribe(k => this.keys = k); }

  get filtered() {
    const q = this.q.trim().toLowerCase();
    if (!q) return this.keys;
    return this.keys.filter(k => `${k.name} ${k.key_prefix}`.toLowerCase().includes(q));
  }

  get pages() {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  paged() {
    if (this.page > this.pages) this.page = this.pages;
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

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
