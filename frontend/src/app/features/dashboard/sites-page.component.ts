import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ButtonComponent } from '../../shared/components/button/button.component';

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

@Component({
  selector: 'app-sites-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent],
  template: `
    <div class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-white">Sites</h1>
          <p class="text-slate-400">Register websites to protect with blockchain integrity.</p>
        </div>
        <app-button (click)="showForm = true">+ Add Site</app-button>
      </div>

      @if (showForm) {
        <div class="card animate-slide-up">
          <h3 class="mb-4 font-semibold text-white">Register New Site</h3>
          <form (ngSubmit)="createSite()" class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-sm text-slate-400">Site Name</label>
              <input class="input-field" [(ngModel)]="newSite.name" name="name" required placeholder="My App" />
            </div>
            <div>
              <label class="mb-1 block text-sm text-slate-400">Backend URL</label>
              <input class="input-field" [(ngModel)]="newSite.base_url" name="url" required placeholder="https://api.myapp.com" />
            </div>
            <div>
              <label class="mb-1 block text-sm text-slate-400">Integration Mode</label>
              <select class="input-field" [(ngModel)]="newSite.integration_mode" name="mode">
                <option value="api">Developer API</option>
                <option value="proxy">Proxy (Auto-discover)</option>
              </select>
            </div>
            <div class="flex items-end">
              <app-button type="submit" [loading]="creating">Create Site</app-button>
            </div>
          </form>
        </div>
      }

      <div class="card overflow-hidden p-0">
        <table class="w-full text-sm">
          <thead class="border-b border-slate-700 bg-slate-800/50">
            <tr>
              <th class="px-4 py-3 text-left font-medium text-slate-400">Name</th>
              <th class="px-4 py-3 text-left font-medium text-slate-400">URL</th>
              <th class="px-4 py-3 text-left font-medium text-slate-400">Mode</th>
              <th class="px-4 py-3 text-left font-medium text-slate-400">Status</th>
              <th class="px-4 py-3 text-right font-medium text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (site of sites; track site.id) {
              <tr class="border-b border-slate-800 transition-colors hover:bg-slate-800/30">
                <td class="px-4 py-3 font-medium text-white">{{ site.name }}</td>
                <td class="px-4 py-3 text-slate-400 font-mono text-xs">{{ site.base_url }}</td>
                <td class="px-4 py-3"><span class="badge-info">{{ site.integration_mode }}</span></td>
                <td class="px-4 py-3"><span class="badge-success">{{ site.status }}</span></td>
                <td class="px-4 py-3 text-right">
                  <button class="btn-ghost text-xs" (click)="discover(site)">Discover Endpoints</button>
                </td>
              </tr>
              @if (selectedSite?.id === site.id && endpoints.length) {
                <tr>
                  <td colspan="5" class="bg-slate-800/20 px-4 py-3">
                    <div class="text-xs font-medium text-slate-400 mb-2">Protected Endpoints</div>
                    <div class="flex flex-wrap gap-2">
                      @for (ep of endpoints; track ep.id) {
                        <button (click)="toggleEp(ep)"
                          class="rounded-md border px-2 py-1 text-xs font-mono transition-colors"
                          [class]="ep.enabled ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' : 'border-slate-600 text-slate-500'">
                          {{ ep.method }} {{ ep.path_pattern }}
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
            } @empty {
              <tr><td colspan="5" class="px-4 py-8 text-center text-slate-500">No sites yet. Add your first site above.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class SitesPageComponent implements OnInit {
  sites: Site[] = [];
  endpoints: Endpoint[] = [];
  selectedSite: Site | null = null;
  showForm = false;
  creating = false;
  newSite = { name: '', base_url: '', integration_mode: 'proxy' };

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() { this.load(); }

  load() {
    this.api.get<Site[]>('/api/v1/sites').subscribe(s => this.sites = s);
  }

  createSite() {
    this.creating = true;
    this.api.post<Site>('/api/v1/sites', this.newSite).subscribe({
      next: () => {
        this.toast.success('Site registered successfully');
        this.showForm = false;
        this.newSite = { name: '', base_url: '', integration_mode: 'proxy' };
        this.load();
        this.creating = false;
      },
      error: e => { this.toast.error(e.error?.error || 'Failed'); this.creating = false; },
    });
  }

  discover(site: Site) {
    this.selectedSite = site;
    this.api.post<{ discovered: unknown[] }>(`/api/v1/sites/${site.id}/discover`, {}).subscribe({
      next: () => {
        this.toast.success('Endpoint discovery complete');
        this.api.get<Endpoint[]>(`/api/v1/sites/${site.id}/endpoints`).subscribe(e => this.endpoints = e);
      },
      error: () => this.toast.error('Discovery failed — check URL is reachable'),
    });
  }

  toggleEp(ep: Endpoint) {
    this.api.patch(`/api/v1/sites/${this.selectedSite!.id}/endpoints/${ep.id}`, { enabled: !ep.enabled }).subscribe({
      next: () => { ep.enabled = !ep.enabled; this.toast.success(ep.enabled ? 'Endpoint protected' : 'Endpoint unprotected'); },
    });
  }
}
