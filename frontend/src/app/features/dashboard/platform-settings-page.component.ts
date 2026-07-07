import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

interface ScannerConfig {
  default_rate_limit: number;
  max_endpoints_per_scan: number;
  scan_depth?: string;
}

@Component({
  selector: 'app-platform-settings-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <app-page-header title="System &amp; Security" subtitle="Feature flags and scanner configuration." badge="Super Admin" />
    <div class="grid gap-6 lg:grid-cols-2">
      <div class="card">
        <h3 class="font-semibold text-white mb-4">Feature flags</h3>
        <div class="space-y-3">
          @for (flag of flagEntries; track flag.key) {
            <label class="flex items-center justify-between rounded-lg border border-ink-700 px-4 py-3 cursor-pointer hover:bg-ink-800/40">
              <span class="text-sm text-slate-300">{{ flag.key }}</span>
              <input type="checkbox" [(ngModel)]="flag.value" (ngModelChange)="saveFlags()" />
            </label>
          }
        </div>
      </div>
      <div class="card">
        <h3 class="font-semibold text-white mb-4">Scanner config</h3>
        <div class="space-y-3 text-sm">
          <div>
            <label class="text-ink-500">Rate limit (req/s)</label>
            <input class="input-field mt-1" type="number" [(ngModel)]="scannerConfig.default_rate_limit" (change)="saveScanner()" />
          </div>
          <div>
            <label class="text-ink-500">Max endpoints per scan</label>
            <input class="input-field mt-1" type="number" [(ngModel)]="scannerConfig.max_endpoints_per_scan" (change)="saveScanner()" />
          </div>
        </div>
      </div>
    </div>
  `,
})
export class PlatformSettingsPageComponent implements OnInit {
  flags: Record<string, boolean> = {};
  scannerConfig: ScannerConfig = { default_rate_limit: 20, max_endpoints_per_scan: 200 };
  constructor(private api: ApiService, private toast: ToastService) {}
  ngOnInit() {
    this.api.get<Record<string, boolean>>('/api/v1/platform/settings/feature_flags').subscribe(f => this.flags = f ?? {});
    this.api.get<ScannerConfig>('/api/v1/platform/settings/scanner_config').subscribe(c => {
      if (c) this.scannerConfig = { ...this.scannerConfig, ...c };
    });
  }
  get flagEntries() {
    return Object.entries(this.flags).map(([key, value]) => ({ key, value }));
  }
  saveFlags() {
    this.api.put('/api/v1/platform/settings/feature_flags', this.flags).subscribe({
      next: () => this.toast.success('Feature flags saved'),
      error: () => this.toast.error('Save failed'),
    });
  }
  saveScanner() {
    this.api.put('/api/v1/platform/settings/scanner_config', this.scannerConfig).subscribe({
      next: () => this.toast.success('Scanner config saved'),
    });
  }
}
