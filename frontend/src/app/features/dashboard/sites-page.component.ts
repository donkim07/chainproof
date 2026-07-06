import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { CopyButtonComponent } from '../../shared/components/copy-button/copy-button.component';
import { environment } from '../../../environments/environment';

interface Site {
  id: string;
  name: string;
  base_url: string;
  integration_mode: string;
  status: string;
  created_at: string;
}

interface Endpoint {
  id: string;
  method: string;
  path_pattern: string;
  enabled: boolean;
  auto_discovered: boolean;
}

interface Discovered {
  method: string;
  path: string;
  status?: number;
  source?: string;
  sources?: string[];
  priority?: number;
}

interface SiteAuth {
  auth_type: string;
  bearer_token_set?: boolean;
  bearer_token?: string;
  api_key_header?: string;
  api_key_value?: string;
  api_key_value_set?: boolean;
  poll_enabled: boolean;
  poll_interval_minutes: number;
}

@Component({
  selector: 'app-sites-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ButtonComponent, PageHeaderComponent, StatCardComponent, EmptyStateComponent, CopyButtonComponent],
  template: `
    <app-page-header
      title="Sites"
      subtitle="Register backends and copy your Site ID for the Developer API integration."
      badge="Owner dashboard">
      <app-button actions (click)="openCreate()">+ Add Site</app-button>
    </app-page-header>

    <div class="grid gap-4 sm:grid-cols-3 mb-6">
      <app-stat-card label="Total Sites" [value]="sites.length" color="text-brand-400" icon="&#127760;"></app-stat-card>
      <app-stat-card label="Protected Routes" [value]="protectedCount" color="text-emerald-400" icon="&#128274;"></app-stat-card>
      <app-stat-card label="Last Discovery" [value]="lastDiscovery" color="text-white" icon="&#128269;" [hint]="selectedSite?.name || 'Select a site'"></app-stat-card>
    </div>

    @if (showForm) {
      <div class="card animate-slide-up mb-6">
        <h3 class="mb-4 font-semibold text-white">{{ editingId ? 'Edit Site' : 'Register Site' }}</h3>
        <form (ngSubmit)="saveSite()" class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm text-slate-400">Site Name</label>
            <input class="input-field" [(ngModel)]="newSite.name" name="name" required placeholder="Production API" />
          </div>
          <div>
            <label class="mb-1 block text-sm text-slate-400">Backend URL (public https)</label>
            <input class="input-field" [(ngModel)]="newSite.base_url" name="url" required placeholder="https://api.example.com" />
          </div>
          <div class="md:col-span-2">
            <p class="text-xs text-slate-500">Integration is via the <a routerLink="/docs" class="text-brand-400 hover:underline">Developer API</a> — call <code class="text-brand-300">/integrity/anchor</code> from your backend after each save.</p>
          </div>
          <div class="flex items-end gap-2 md:col-span-2">
            <app-button type="submit" [loading]="creating">{{ editingId ? 'Update' : 'Create Site' }}</app-button>
            <button class="btn-secondary" type="button" (click)="cancelForm()">Cancel</button>
          </div>
        </form>
      </div>
    }

    <div class="grid gap-6 xl:grid-cols-5">
      <div class="table-shell xl:col-span-2">
        <div class="table-toolbar">
          <input class="input-field max-w-xs" [(ngModel)]="q" placeholder="Search sites..." />
          <span class="text-sm text-slate-400">{{ filtered.length }} sites</span>
        </div>
        <div class="divide-y divide-slate-800 max-h-[520px] overflow-y-auto">
          @for (site of filtered; track site.id) {
            <button type="button"
              class="w-full text-left px-4 py-4 transition-colors hover:bg-slate-800/40"
              [ngClass]="{'bg-brand-600/10': selectedSite?.id === site.id}"
              (click)="selectSite(site)">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <div class="font-medium text-white">{{ site.name }}</div>
                  <div class="mt-1 font-mono text-xs text-slate-500 truncate max-w-[220px]">{{ site.base_url }}</div>
                </div>
              </div>
            </button>
          } @empty {
            <app-empty-state title="No sites yet" description="Add your first backend to get a Site ID." icon="&#127760;">
              <app-button (click)="openCreate()">Add Site</app-button>
            </app-empty-state>
          }
        </div>
      </div>

      <div class="xl:col-span-3 space-y-4">
        @if (selectedSite) {
          <div class="card border-brand-500/30">
            <h3 class="text-sm font-semibold text-brand-300 mb-1">Site ID — use in your backend</h3>
            <p class="text-xs text-slate-400 mb-3">Copy this into <code class="text-brand-300">CHAINPROOF_SITE_ID</code> or the <code class="text-brand-300">site_id</code> field when calling <code class="text-brand-300">/integrity/anchor</code>.</p>
            <div class="flex items-center gap-2 rounded-lg bg-slate-900/80 border border-slate-700 px-3 py-2">
              <code class="text-sm text-emerald-300 font-mono flex-1 break-all">{{ selectedSite.id }}</code>
              <app-copy-button [value]="selectedSite.id" label="Copy Site ID" />
            </div>
            <pre class="mt-3 text-xs font-mono text-slate-500 bg-slate-900/50 rounded-lg p-3 overflow-x-auto">{{ envSnippet }}</pre>
            <a routerLink="/docs" class="inline-block mt-3 text-xs text-brand-400 hover:underline">Full integration guide →</a>
          </div>

          <div class="card">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold text-white">{{ selectedSite.name }}</h2>
                <p class="text-sm font-mono text-slate-400">{{ selectedSite.base_url }}</p>
              </div>
              <div class="flex flex-wrap gap-2">
                <app-button (click)="runDiscover()" [loading]="discovering">Discover routes</app-button>
                <button class="btn-secondary" (click)="startEdit(selectedSite)">Edit</button>
                <button class="btn-ghost text-rose-400" (click)="remove(selectedSite.id)">Delete</button>
              </div>
            </div>
          </div>

          @if (discovered.length) {
            <div class="card border-brand-500/20 animate-slide-up">
              <h3 class="text-sm font-semibold text-white mb-3">Discovered — {{ discovered.length }} routes</h3>
              <div class="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                @for (d of discovered; track d.method + d.path) {
                  <span class="rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-1 text-xs font-mono">
                    <span class="text-brand-400">{{ d.method }}</span> {{ d.path }}
                  </span>
                }
              </div>
            </div>
          }

          <details class="card group">
            <summary class="cursor-pointer font-semibold text-white text-sm">Optional — poll static routes</summary>
            <p class="mt-3 text-xs text-slate-400 leading-relaxed">
              Only for routes <em>without</em> path params (e.g. <code class="text-slate-300">GET /api/health</code>).
              Dynamic routes like <code class="text-slate-300">/users/{{ '{' }}id{{ '}' }}</code> should use the
              <code class="text-brand-300">verify</code> block in <code class="text-brand-300">/integrity/anchor</code> instead.
              Use one <strong class="text-white">service credential</strong> — not end-user logins.
            </p>
            <div class="grid gap-3 md:grid-cols-2 mt-4">
              <div>
                <label class="text-xs text-slate-500">Service auth type</label>
                <select class="input-field mt-1 text-sm" [(ngModel)]="authForm.auth_type">
                  <option value="none">None (public)</option>
                  <option value="api_key">API key header</option>
                  <option value="api_key_bearer">Bearer (service key)</option>
                  <option value="bearer">Bearer (service JWT)</option>
                  <option value="basic">Basic auth</option>
                </select>
              </div>
              @if (authForm.auth_type === 'bearer') {
                <div>
                  <label class="text-xs text-slate-500">Service bearer token</label>
                  <input class="input-field mt-1 font-mono text-sm" [(ngModel)]="authForm.bearer_token" placeholder="Long-lived token from your API" />
                </div>
              }
              @if (authForm.auth_type === 'api_key' || authForm.auth_type === 'api_key_bearer') {
                <div><label class="text-xs text-slate-500">Header</label><input class="input-field mt-1 text-sm" [(ngModel)]="authForm.api_key_header" placeholder="X-API-Key" /></div>
                <div><label class="text-xs text-slate-500">Key value</label><input class="input-field mt-1 font-mono text-sm" [(ngModel)]="authForm.api_key_value" /></div>
              }
              <div class="md:col-span-2 flex flex-wrap items-center gap-4">
                <label class="inline-flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" [(ngModel)]="authForm.poll_enabled" /> Enable scheduled polling
                </label>
                <app-button (click)="saveAuth()">Save polling settings</app-button>
              </div>
            </div>
          </details>

          <div class="card">
            <div class="flex flex-wrap items-end gap-3 mb-4">
              <div class="flex-1 min-w-[140px]">
                <label class="text-xs text-slate-400">Method</label>
                <select class="input-field mt-1" [(ngModel)]="manualMethod">
                  <option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option>
                </select>
              </div>
              <div class="flex-[2] min-w-[200px]">
                <label class="text-xs text-slate-400">Path (static routes only for polling)</label>
                <input class="input-field mt-1 font-mono" [(ngModel)]="manualPath" placeholder="/api/health" />
              </div>
              <app-button (click)="addManual()">Add</app-button>
            </div>

            <div class="table-shell p-0 border-0 shadow-none">
              <div class="table-toolbar border-slate-800">
                <span class="text-sm font-medium text-white">Routes</span>
                <span class="text-xs text-slate-400">{{ enabledCount }} polling enabled</span>
              </div>
              <div class="overflow-x-auto">
                <table class="cp-table">
                  <thead>
                    <tr>
                      <th>Method</th>
                      <th>Path</th>
                      <th>Poll</th>
                      <th class="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (ep of endpoints; track ep.id) {
                      <tr class="border-t border-slate-800 hover:bg-slate-800/30">
                        <td><span class="badge-info font-mono">{{ ep.method }}</span></td>
                        <td class="font-mono text-xs text-slate-300">{{ ep.path_pattern }}</td>
                        <td>
                          <button type="button" (click)="toggleEp(ep)"
                            [class]="ep.enabled ? 'badge-success' : 'badge-danger'">
                            {{ ep.enabled ? 'on' : 'off' }}
                          </button>
                        </td>
                        <td class="text-right space-x-2">
                          <button class="text-xs text-brand-400 hover:underline" (click)="testEp(ep)">Test</button>
                          <button class="text-xs text-rose-400 hover:underline" (click)="deleteEp(ep.id)">Remove</button>
                        </td>
                      </tr>
                    } @empty {
                      <tr><td colspan="4"><app-empty-state title="No routes" description="Run discovery or add a static path." icon="&#128269;"></app-empty-state></td></tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        } @else {
          <div class="card flex items-center justify-center min-h-[400px]">
            <app-empty-state title="Select a site" description="Copy your Site ID and follow the docs to integrate." icon="&#128073;"></app-empty-state>
          </div>
        }
      </div>
    </div>
  `,
})
export class SitesPageComponent implements OnInit {
  sites: Site[] = [];
  endpoints: Endpoint[] = [];
  discovered: Discovered[] = [];
  selectedSite: Site | null = null;
  showForm = false;
  editingId = '';
  q = '';
  creating = false;
  discovering = false;
  lastDiscovery = '—';
  manualMethod = 'GET';
  manualPath = '';
  newSite = { name: '', base_url: '', integration_mode: 'api' };
  authForm: SiteAuth = { auth_type: 'none', poll_enabled: false, poll_interval_minutes: 5, api_key_header: 'X-API-Key' };
  testing = false;
  apiBase = environment.apiUrl;

  constructor(private api: ApiService, private toast: ToastService) {}

  get envSnippet() {
    if (!this.selectedSite) return '';
    return `CHAINPROOF_API_KEY=cp_your_key_from_dashboard
CHAINPROOF_BASE_URL=${this.apiBase}/api/v1
CHAINPROOF_SITE_ID=${this.selectedSite.id}`;
  }

  ngOnInit() { this.load(); }

  load() {
    this.api.get<Site[]>('/api/v1/sites').subscribe(s => {
      this.sites = s;
      if (this.selectedSite) {
        const found = s.find(x => x.id === this.selectedSite!.id);
        if (found) this.selectSite(found);
      }
    });
  }

  get filtered() {
    const v = this.q.trim().toLowerCase();
    if (!v) return this.sites;
    return this.sites.filter(s => `${s.name} ${s.base_url}`.toLowerCase().includes(v));
  }

  get protectedCount() {
    return this.endpoints.filter(e => e.enabled).length;
  }

  get enabledCount() {
    return this.endpoints.filter(e => e.enabled).length;
  }

  openCreate() {
    this.showForm = true;
    this.editingId = '';
    this.newSite = { name: '', base_url: '', integration_mode: 'api' };
  }

  cancelForm() {
    this.showForm = false;
    this.editingId = '';
  }

  selectSite(site: Site) {
    this.selectedSite = site;
    this.discovered = [];
    this.api.get<Endpoint[]>(`/api/v1/sites/${site.id}/endpoints`).subscribe(e => (this.endpoints = e));
    this.api.get<SiteAuth>(`/api/v1/sites/${site.id}/auth`).subscribe(a => {
      this.authForm = {
        auth_type: a.auth_type || 'none',
        poll_enabled: a.poll_enabled ?? false,
        poll_interval_minutes: a.poll_interval_minutes || 5,
        api_key_header: a.api_key_header || 'X-API-Key',
      };
    });
  }

  startEdit(site: Site) {
    this.showForm = true;
    this.editingId = site.id;
    this.newSite = { name: site.name, base_url: site.base_url, integration_mode: site.integration_mode };
  }

  saveSite() {
    this.creating = true;
    const req = this.editingId
      ? this.api.put<Site>(`/api/v1/sites/${this.editingId}`, this.newSite as unknown as Record<string, unknown>)
      : this.api.post<Site>('/api/v1/sites', this.newSite);
    req.subscribe({
      next: s => {
        this.toast.success(this.editingId ? 'Site updated' : 'Site created');
        this.cancelForm();
        this.load();
        if (!this.editingId) this.selectSite(s);
        this.creating = false;
      },
      error: e => {
        this.toast.error(e.error?.error || 'Failed');
        this.creating = false;
      },
    });
  }

  runDiscover() {
    if (!this.selectedSite) return;
    this.discovering = true;
    this.api.post<{ discovered: Discovered[] }>(`/api/v1/sites/${this.selectedSite.id}/discover`, {}).subscribe({
      next: res => {
        this.discovered = res.discovered || [];
        this.lastDiscovery = new Date().toLocaleTimeString();
        this.toast.success(`Found ${this.discovered.length} routes`);
        this.api.get<Endpoint[]>(`/api/v1/sites/${this.selectedSite!.id}/endpoints`).subscribe(e => (this.endpoints = e));
        this.discovering = false;
      },
      error: e => {
        this.toast.error(e.error?.error || 'Discovery failed');
        this.discovering = false;
      },
    });
  }

  addManual() {
    if (!this.selectedSite || !this.manualPath.trim()) return;
    this.api.post<Endpoint>(`/api/v1/sites/${this.selectedSite.id}/endpoints`, {
      method: this.manualMethod,
      path_pattern: this.manualPath,
    }).subscribe({
      next: () => {
        this.toast.success('Route added');
        this.manualPath = '';
        this.api.get<Endpoint[]>(`/api/v1/sites/${this.selectedSite!.id}/endpoints`).subscribe(e => (this.endpoints = e));
      },
      error: e => this.toast.error(e.error?.error || 'Failed'),
    });
  }

  toggleEp(ep: Endpoint) {
    this.api.patch(`/api/v1/sites/${this.selectedSite!.id}/endpoints/${ep.id}`, { enabled: !ep.enabled }).subscribe({
      next: () => { ep.enabled = !ep.enabled; },
      error: () => this.toast.error('Failed to update'),
    });
  }

  deleteEp(id: string) {
    this.api.delete(`/api/v1/sites/${this.selectedSite!.id}/endpoints/${id}`).subscribe({
      next: () => {
        this.endpoints = this.endpoints.filter(e => e.id !== id);
        this.toast.success('Removed');
      },
    });
  }

  saveAuth() {
    if (!this.selectedSite) return;
    const payload: Record<string, unknown> = {
      auth_type: this.authForm.auth_type,
      poll_enabled: this.authForm.poll_enabled,
      poll_interval_minutes: this.authForm.poll_interval_minutes || 5,
    };
    if (this.authForm.bearer_token) payload['bearer_token'] = this.authForm.bearer_token;
    if (this.authForm.api_key_header) payload['api_key_header'] = this.authForm.api_key_header;
    if (this.authForm.api_key_value) payload['api_key_value'] = this.authForm.api_key_value;
    this.api.put(`/api/v1/sites/${this.selectedSite.id}/auth`, payload).subscribe({
      next: () => { this.toast.success('Polling settings saved'); },
      error: e => this.toast.error(e.error?.error || 'Failed'),
    });
  }

  testEp(ep: Endpoint) {
    if (!this.selectedSite) return;
    this.testing = true;
    this.api.post<{ status_code: number; anchored: boolean; message?: string }>(`/api/v1/sites/${this.selectedSite.id}/test-endpoint`, {
      method: ep.method, path: ep.path_pattern, body: ep.method === 'POST' ? '{}' : '', anchor: false,
    }).subscribe({
      next: r => {
        this.testing = false;
        if (r.status_code >= 200 && r.status_code < 400) this.toast.success(`HTTP ${r.status_code} — route reachable`);
        else this.toast.error(r.message || `HTTP ${r.status_code}`);
      },
      error: e => { this.testing = false; this.toast.error(e.error?.error || 'Test failed'); },
    });
  }

  remove(id: string) {
    if (!confirm('Delete this site and all its endpoints?')) return;
    this.api.delete(`/api/v1/sites/${id}`).subscribe({
      next: () => {
        if (this.selectedSite?.id === id) {
          this.selectedSite = null;
          this.endpoints = [];
        }
        this.toast.success('Site deleted');
        this.load();
      },
    });
  }
}
