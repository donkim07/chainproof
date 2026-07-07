import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';

interface ScannerTool {
  name: string;
  available: boolean;
  path?: string;
  version?: string;
}

interface ScannerStatus {
  tools: ScannerTool[];
  wordlist_path: string;
  wordlist_ok: boolean;
}

@Component({
  selector: 'app-platform-scanner-page',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, StatCardComponent],
  template: `
    <app-page-header title="Discovery & Scanner" subtitle="ffuf, gobuster, and kiterunner power passive + active API route discovery." badge="Super Admin" />

    <div class="grid gap-4 sm:grid-cols-3 mb-8">
      <app-stat-card label="Tools available" [value]="availableCount + '/' + (status?.tools?.length ?? 0)" color="text-brand-400" icon="&#128269;"></app-stat-card>
      <app-stat-card label="Wordlist" [value]="status?.wordlist_ok ? 'Ready' : 'Missing'" [color]="status?.wordlist_ok ? 'text-emerald-400' : 'text-rose-400'" icon="&#128196;"></app-stat-card>
      <app-stat-card label="Discovery modes" value="Passive + Active" color="text-white" icon="&#9881;"></app-stat-card>
    </div>

    <div class="card mb-6">
      <h2 class="text-lg font-semibold text-white mb-4">Scanner tools</h2>
      <div class="grid gap-3 md:grid-cols-3">
        @for (tool of status?.tools ?? []; track tool.name) {
          <div class="rounded-xl border p-4 transition-all hover:border-brand-500/30"
            [class]="tool.available ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-700 bg-slate-900/50'">
            <div class="flex items-center justify-between">
              <span class="font-mono font-semibold text-white">{{ tool.name }}</span>
              <span [class]="tool.available ? 'badge-success' : 'badge-danger'">{{ tool.available ? 'online' : 'missing' }}</span>
            </div>
            @if (tool.version) {
              <p class="mt-2 text-xs text-slate-500 truncate">{{ tool.version }}</p>
            }
            @if (tool.path) {
              <p class="mt-1 text-xs font-mono text-slate-600 truncate">{{ tool.path }}</p>
            }
          </div>
        }
      </div>
    </div>

    <div class="card">
      <h2 class="text-lg font-semibold text-white mb-3">How discovery works</h2>
      <ol class="space-y-3 text-sm text-slate-400 list-decimal list-inside">
        <li><strong class="text-white">Passive</strong> — OpenAPI/Swagger specs, /docs, robots.txt, JS bundles</li>
        <li><strong class="text-white">Active</strong> — ffuf, gobuster, kiterunner against bundled API wordlist</li>
        <li><strong class="text-white">Filter</strong> — Only HTTP 200, 401, or 403 responses are shown</li>
        <li><strong class="text-white">Fallback</strong> — Wordlist suggestions when no passive routes found</li>
      </ol>
      <p class="mt-4 text-xs text-slate-500 font-mono">Wordlist: {{ status?.wordlist_path }}</p>
    </div>
  `,
})
export class PlatformScannerPageComponent implements OnInit {
  status: ScannerStatus | null = null;
  constructor(private api: ApiService) {}
  ngOnInit() {
    this.api.get<ScannerStatus>('/api/v1/platform/scanner').subscribe(s => this.status = s);
  }
  get availableCount() {
    return (this.status?.tools ?? []).filter(t => t.available).length;
  }
}
