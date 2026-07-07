import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { DataTableComponent, TableColumn } from '../../shared/components/data-table/data-table.component';

@Component({
  selector: 'app-platform-wordlists-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, ButtonComponent, DataTableComponent],
  template: `
    <app-page-header title="Wordlists" subtitle="Manage API discovery wordlists for ffuf, gobuster, kiterunner." badge="Super Admin" />
    <div class="card mb-6">
      <h3 class="font-semibold text-white mb-3">Upload wordlist</h3>
      <input class="input-field mb-3" placeholder="Name (e.g. api-v2)" [(ngModel)]="uploadName" />
      <textarea class="input-field font-mono text-xs min-h-[120px]" placeholder="/api/health&#10;/api/v1/users&#10;..." [(ngModel)]="uploadContent"></textarea>
      <app-button class="mt-3" (click)="upload()" [loading]="uploading">Upload</app-button>
    </div>

    <app-data-table
      [columns]="columns"
      [rows]="wordlists"
      exportFilename="wordlists.csv"
      [countLabel]="wordlists.length + ' wordlists'"
      emptyTitle="No wordlists"
      emptyIcon="file" />
  `,
})
export class PlatformWordlistsPageComponent implements OnInit {
  wordlists: WordlistRow[] = [];
  uploadName = '';
  uploadContent = '';
  uploading = false;

  columns: TableColumn<WordlistRow>[] = [
    { key: 'name', label: 'Name', class: 'text-white' },
    { key: 'version', label: 'Version' },
    { key: 'line_count', label: 'Lines' },
    { key: 'is_default', label: 'Default', format: r => r.is_default ? 'yes' : '' },
    { key: 'path', label: 'Path', class: 'font-mono text-xs text-ink-500 max-w-[200px] truncate' },
  ];

  constructor(private api: ApiService, private toast: ToastService) {}
  ngOnInit() { this.load(); }
  load() { this.api.get<WordlistRow[]>('/api/v1/platform/wordlists').subscribe(w => this.wordlists = w); }
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

interface WordlistRow {
  id: string;
  name: string;
  version: string;
  line_count: number;
  is_default: boolean;
  path: string;
}
