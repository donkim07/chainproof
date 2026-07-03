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
}

@Component({
  selector: 'app-sites-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ButtonComponent, PageHeaderComponent, StatCardComponent, EmptyStateComponent],
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
              [class.bg-brand-600/10]="selectedSite?.id === site.id"
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
              <div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                @for (d of discovered; track d.method + d.path) {
                  <span class="rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-1 text-xs font-mono">
                    <span class="text-brand-400">{{ d.method }}</span> {{ d.path }}
                    @if (d.source) { <span class="text-slate-500 ml-1">({{ d.source }})</span> }
                    @if (d.status) { <span class="text-emerald-400 ml-1">{{ d.status }}</span> }
                  </span>
                }
              </div>
            </div>
          }

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
                        <td class="text-right">
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

  constructor(private api: ApiService, private toast: ToastService) {}

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
    this.api.get<Endpoint[]>(`/api/v1/sites/${site.id}/endpoints`).subscribe(e => (this.endpoints = e));
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
