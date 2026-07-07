import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../shared/components/button/button.component';

@Component({
  selector: 'app-platform-wordlists-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, ButtonComponent],
  template: `
    <app-page-header title="Wordlists" subtitle="Manage API discovery wordlists for ffuf, gobuster, kiterunner." badge="Super Admin" />
    <div class="card mb-6">
      <h3 class="font-semibold text-white mb-3">Upload wordlist</h3>
      <input class="input-field mb-3" placeholder="Name (e.g. api-v2)" [(ngModel)]="uploadName" />
      <textarea class="input-field font-mono text-xs min-h-[120px]" placeholder="/api/health&#10;/api/v1/users&#10;..." [(ngModel)]="uploadContent"></textarea>
      <app-button class="mt-3" (click)="upload()" [loading]="uploading">Upload</app-button>
    </div>
    <div class="table-shell">
      <table class="cp-table">
        <thead><tr><th>Name</th><th>Version</th><th>Lines</th><th>Default</th><th>Path</th></tr></thead>
        <tbody>
          @for (w of wordlists; track w.id) {
            <tr class="border-t border-ink-800">
              <td class="text-white">{{ w.name }}</td>
              <td>{{ w.version }}</td>
              <td>{{ w.line_count }}</td>
              <td>@if (w.is_default) { <span class="badge-success">yes</span> }</td>
              <td class="font-mono text-xs text-ink-500 truncate max-w-[200px]">{{ w.path }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class PlatformWordlistsPageComponent implements OnInit {
  wordlists: { id: string; name: string; version: string; line_count: number; is_default: boolean; path: string }[] = [];
  uploadName = '';
  uploadContent = '';
  uploading = false;
  constructor(private api: ApiService, private toast: ToastService) {}
  ngOnInit() { this.load(); }
  load() { this.api.get<typeof this.wordlists>('/api/v1/platform/wordlists').subscribe(w => this.wordlists = w); }
  upload() {
    if (!this.uploadName || !this.uploadContent.trim()) return;
    this.uploading = true;
    this.api.post('/api/v1/platform/wordlists', { name: this.uploadName, content: this.uploadContent }).subscribe({
      next: () => {
        this.toast.success('Wordlist uploaded');
        this.uploadName = '';
        this.uploadContent = '';
        this.load();
        this.uploading = false;
      },
      error: e => { this.toast.error(e.error?.error || 'Failed'); this.uploading = false; },
    });
  }
}
