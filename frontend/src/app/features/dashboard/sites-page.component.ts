import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { CopyButtonComponent } from '../../shared/components/copy-button/copy-button.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

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

import { environment } from '../../../environments/environment';

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
  sample_bodies?: Record<string, string>;
  login_url?: string;
  login_email?: string;
  login_password?: string;
  auto_refresh_enabled?: boolean;
}

@Component({
  selector: 'app-sites-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, PageHeaderComponent, StatCardComponent, EmptyStateComponent, CopyButtonComponent],
  template: `
    <app-page-header
      title="Sites & Endpoints"
      subtitle="Register backends, run multi-source discovery, and choose which routes to protect."
      badge="Protection">
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
          <div>
            <label class="mb-1 block text-sm text-slate-400">Integration Mode</label>
            <select class="input-field" [(ngModel)]="newSite.integration_mode" name="mode">
              <option value="proxy">Proxy — auto-discover & capture</option>
              <option value="api">Developer API — manual anchor</option>
            </select>
          </div>
          <div class="flex items-end gap-2">
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
                <span class="badge-info shrink-0">{{ site.integration_mode }}</span>
              </div>
            </button>
          } @empty {
            <app-empty-state title="No sites yet" description="Add your first backend to start endpoint discovery." icon="&#127760;">
              <app-button (click)="openCreate()">Add Site</app-button>
            </app-empty-state>
          }
        </div>
      </div>

      <div class="xl:col-span-3 space-y-4">
        @if (selectedSite) {
          <div class="card">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold text-white">{{ selectedSite.name }}</h2>
                <p class="text-sm font-mono text-slate-400">{{ selectedSite.base_url }}</p>
              </div>
              <div class="flex flex-wrap gap-2">
                <app-button (click)="runDiscover()" [loading]="discovering">Run Discovery</app-button>
                <button class="btn-secondary" (click)="startEdit(selectedSite)">Edit</button>
                <button class="btn-ghost text-rose-400" (click)="remove(selectedSite.id)">Delete</button>
              </div>
            </div>
            <p class="mt-3 text-xs text-slate-500">
              Scans: OpenAPI/Swagger · robots.txt · JS bundles · API wordlist · HTML links
            </p>
          </div>

          @if (discovered.length) {
            <div class="card border-brand-500/20 animate-slide-up">
              <h3 class="text-sm font-semibold text-white mb-3">Latest scan — {{ discovered.length }} live endpoints</h3>
              <div class="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                @for (d of discovered; track d.method + d.path + (d.priority ?? 0)) {
                  <span class="rounded-lg border px-2 py-1 text-xs font-mono"
                    [class]="d.priority && d.priority > 50 ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-slate-700 bg-slate-900/60'">
                    <span class="text-brand-400">{{ d.method }}</span> {{ d.path }}
                    @if (d.sources?.length) {
                      <span class="text-slate-500 ml-1">[{{ d.sources?.join('+') }}]</span>
                    } @else if (d.source) {
                      <span class="text-slate-500 ml-1">({{ d.source }})</span>
                    }
                    @if (d.priority) { <span class="text-amber-400 ml-1">p{{ d.priority }}</span> }
                    @if (d.status) { <span class="text-emerald-400 ml-1">{{ d.status }}</span> }
                  </span>
                }
              </div>
              <p class="mt-2 text-xs text-slate-500">Sorted by confidence — OpenAPI/JS/HTML first, wordlist-only last.</p>
            </div>
          }

          <div class="card border-emerald-500/20">
            <h3 class="font-semibold text-white mb-1">Backend Authentication</h3>
            <p class="text-xs text-slate-400 mb-4">Required for protected endpoints like <code class="text-brand-300">/api/ask</code>. ChainProof uses these credentials when polling or proxying.</p>
            <div class="grid gap-3 md:grid-cols-2">
              <div>
                <label class="text-xs text-slate-400">Auth type</label>
                <select class="input-field mt-1" [(ngModel)]="authForm.auth_type">
                  <option value="none">None</option>
                  <option value="bearer">Bearer token</option>
                  <option value="api_key">API key header</option>
                  <option value="basic">Basic auth</option>
                </select>
              </div>
              @if (authForm.auth_type === 'bearer') {
                <div>
                  <label class="text-xs text-slate-400">Bearer token</label>
                  <input class="input-field mt-1 font-mono" [(ngModel)]="authForm.bearer_token" [placeholder]="auth?.bearer_token_set ? 'Saved (enter to replace)' : 'eyJ...'" />
                </div>
              }
              @if (authForm.auth_type === 'api_key') {
                <div><label class="text-xs text-slate-400">Header name</label><input class="input-field mt-1" [(ngModel)]="authForm.api_key_header" placeholder="X-API-Key" /></div>
                <div><label class="text-xs text-slate-400">API key value</label><input class="input-field mt-1 font-mono" [(ngModel)]="authForm.api_key_value" /></div>
              }
              <div class="md:col-span-2 border-t border-slate-800 pt-3 mt-1">
                <div class="text-xs font-medium text-amber-300 mb-2">JWT expiring? Auto-refresh (optional)</div>
                <p class="text-xs text-slate-500 mb-3">If your API uses short-lived JWTs, add your login endpoint — ChainProof re-authenticates on 401. Better: use a long-lived API key for polling.</p>
                <div class="grid gap-3 md:grid-cols-3">
                  <input class="input-field text-xs" [(ngModel)]="authForm.login_url" placeholder="Login URL e.g. https://api.../auth/login" />
                  <input class="input-field text-xs" [(ngModel)]="authForm.login_email" placeholder="Service account email" />
                  <input class="input-field text-xs" type="password" [(ngModel)]="authForm.login_password" placeholder="Password" />
                </div>
              </div>
              <div class="md:col-span-2 flex flex-wrap items-center gap-4">
                <label class="inline-flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" [(ngModel)]="authForm.poll_enabled" /> Enable polling (auto-anchor every {{ authForm.poll_interval_minutes || 5 }} min)
                </label>
                <app-button (click)="saveAuth()">Save Auth</app-button>
              </div>
            </div>
            <div class="mt-4 rounded-lg bg-slate-950/80 border border-slate-800 p-3 text-xs flex items-start justify-between gap-2">
              <div>
                <div class="text-slate-500 mb-1">Proxy URL (requires ChainProof JWT — see Docs):</div>
                <code class="text-emerald-400 break-all">{{ proxyUrl }}</code>
              </div>
              <app-copy-button [value]="proxyUrl" label="Copy proxy URL" />
            </div>
            <div class="mt-3 grid gap-2 md:grid-cols-2">
              <div>
                <label class="text-xs text-slate-400">Sample POST body for /api/ask (polling)</label>
                <textarea class="input-field mt-1 font-mono text-xs h-20" [(ngModel)]="sampleBodyAsk"></textarea>
              </div>
              <div class="flex flex-col justify-end gap-2">
                <app-button variant="secondary" (click)="testAndAnchor()" [loading]="testing">Test &amp; Anchor /api/ask</app-button>
                @if (testResult) {
                  <div class="text-xs rounded-lg p-2" [class]="testResult.anchored ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-200'">
                    HTTP {{ testResult.status_code }} — {{ testResult.message || (testResult.anchored ? 'Anchored' : 'Not anchored') }}
                  </div>
                }
              </div>
            </div>
            <p class="mt-3 text-xs text-amber-200/80">Direct visits to your website are NOT monitored. Use proxy URL, polling with auth, or Developer API.</p>
          </div>

          <div class="card">
            <div class="flex flex-wrap items-end gap-3 mb-4">
              <div class="flex-1 min-w-[140px]">
                <label class="text-xs text-slate-400">Method</label>
                <select class="input-field mt-1" [(ngModel)]="manualMethod">
                  <option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option>
                </select>
              </div>
              <div class="flex-[2] min-w-[200px]">
                <label class="text-xs text-slate-400">Path</label>
                <input class="input-field mt-1 font-mono" [(ngModel)]="manualPath" placeholder="/api/v1/users" />
              </div>
              <app-button (click)="addManual()">Add Endpoint</app-button>
            </div>

            <div class="table-shell p-0 border-0 shadow-none">
              <div class="table-toolbar border-slate-800">
                <span class="text-sm font-medium text-white">Protected Endpoints</span>
                <span class="text-xs text-slate-400">{{ endpoints.length }} total · {{ enabledCount }} enabled</span>
              </div>
              <div class="overflow-x-auto">
                <table class="cp-table">
                  <thead>
                    <tr>
                      <th>Method</th>
                      <th>Path</th>
                      <th>Source</th>
                      <th>Status</th>
                      <th class="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (ep of endpoints; track ep.id) {
                      <tr class="border-t border-slate-800 hover:bg-slate-800/30">
                        <td><span class="badge-info font-mono">{{ ep.method }}</span></td>
                        <td class="font-mono text-xs text-slate-300">{{ ep.path_pattern }}</td>
                        <td><span [class]="ep.auto_discovered ? 'badge-info' : 'badge-warning'">{{ ep.auto_discovered ? 'discovered' : 'manual' }}</span></td>
                        <td>
                          <button type="button" (click)="toggleEp(ep)"
                            [class]="ep.enabled ? 'badge-success' : 'badge-danger'">
                            {{ ep.enabled ? 'protected' : 'off' }}
                          </button>
                        </td>
                        <td class="text-right space-x-2">
                          <button class="text-xs text-brand-400 hover:underline" (click)="testEp(ep)">Test</button>
                          <button class="text-xs text-rose-400 hover:underline" (click)="deleteEp(ep.id)">Remove</button>
                        </td>
                      </tr>
                    } @empty {
                      <tr><td colspan="5"><app-empty-state title="No endpoints" description="Run discovery or add paths manually." icon="&#128269;"></app-empty-state></td></tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        } @else {
          <div class="card flex items-center justify-center min-h-[400px]">
            <app-empty-state title="Select a site" description="Choose a site from the list to manage endpoints and run discovery." icon="&#128073;"></app-empty-state>
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
  newSite = { name: '', base_url: '', integration_mode: 'proxy' };
  auth: SiteAuth | null = null;
  authForm: SiteAuth = { auth_type: 'none', poll_enabled: true, poll_interval_minutes: 5, api_key_header: 'X-API-Key' };
  sampleBodyAsk = '{"question":"hi","session_id":"test-session-001"}';
  testing = false;
  testResult: { status_code: number; anchored: boolean; message?: string } | null = null;
  apiBase = environment.apiUrl;

  constructor(private api: ApiService, private toast: ToastService) {}

  get proxyUrl() {
    if (!this.selectedSite) return '';
    return `${this.apiBase}/api/v1/proxy/${this.selectedSite.id}/api/ask`;
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
    this.newSite = { name: '', base_url: '', integration_mode: 'proxy' };
  }

  cancelForm() {
    this.showForm = false;
    this.editingId = '';
  }

  selectSite(site: Site) {
    this.selectedSite = site;
    this.discovered = [];
    this.testResult = null;
    this.api.get<Endpoint[]>(`/api/v1/sites/${site.id}/endpoints`).subscribe(e => (this.endpoints = e));
    this.api.get<SiteAuth>(`/api/v1/sites/${site.id}/auth`).subscribe(a => {
      this.auth = a;
      this.authForm = { ...this.authForm, auth_type: a.auth_type || 'none', poll_enabled: a.poll_enabled, poll_interval_minutes: a.poll_interval_minutes || 5, api_key_header: a.api_key_header || 'X-API-Key', login_url: a.login_url || '', login_email: a.login_email || '' };
      if (a.sample_bodies?.['/api/ask']) this.sampleBodyAsk = a.sample_bodies['/api/ask'];
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
        this.toast.success(`Found ${this.discovered.length} endpoints`);
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
        this.toast.success('Endpoint added');
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
      sample_bodies: { '/api/ask': this.sampleBodyAsk },
    };
    if (this.authForm.bearer_token) payload['bearer_token'] = this.authForm.bearer_token;
    if (this.authForm.api_key_header) payload['api_key_header'] = this.authForm.api_key_header;
    if (this.authForm.api_key_value) payload['api_key_value'] = this.authForm.api_key_value;
    if (this.authForm.login_url) payload['login_url'] = this.authForm.login_url;
    if (this.authForm.login_email) payload['login_email'] = this.authForm.login_email;
    if (this.authForm.login_password) payload['login_password'] = this.authForm.login_password;
    this.api.put(`/api/v1/sites/${this.selectedSite.id}/auth`, payload).subscribe({
      next: () => { this.toast.success('Auth saved'); this.selectSite(this.selectedSite!); },
      error: e => this.toast.error(e.error?.error || 'Failed'),
    });
  }

  testAndAnchor() {
    this.testEp({ method: 'POST', path_pattern: '/api/ask' } as Endpoint, true);
  }

  testEp(ep: Endpoint, anchor = true) {
    if (!this.selectedSite) return;
    this.testing = true;
    const body = ep.path_pattern === '/api/ask' ? this.sampleBodyAsk : '{}';
    this.api.post<{ status_code: number; anchored: boolean; message?: string }>(`/api/v1/sites/${this.selectedSite.id}/test-endpoint`, {
      method: ep.method, path: ep.path_pattern, body, anchor,
    }).subscribe({
      next: r => {
        this.testResult = r;
        this.testing = false;
        if (r.anchored) this.toast.success('Endpoint tested and anchored — check Records');
        else this.toast.error(r.message || `HTTP ${r.status_code} — configure auth if 401/403`);
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
