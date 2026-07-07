import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { DataTableComponent, TableColumn } from '../../shared/components/data-table/data-table.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';

interface PlatformUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  org_name?: string;
  org_slug?: string;
}

@Component({
  selector: 'app-platform-users-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, DataTableComponent, SearchInputComponent],
  template: `
    <app-page-header title="Platform Users" subtitle="All owners — impersonate to debug client issues." badge="Super Admin"></app-page-header>

    <app-data-table
      [columns]="columns"
      [rows]="filtered"
      [hasActions]="true"
      exportFilename="platform-users.csv"
      [countLabel]="filtered.length + ' users'"
      emptyTitle="No users"
      emptyIcon="users">
      <app-search-input search [(value)]="q" placeholder="Search users..." />

      <ng-template #rowActions let-u>
        @if (u.role !== 'super_admin' && u.org_slug) {
          <button class="text-xs text-signal-400 hover:underline" (click)="impersonate(u)">Login as</button>
        }
      </ng-template>
    </app-data-table>
  `,
})
export class PlatformUsersPageComponent implements OnInit {
  users: PlatformUser[] = [];
  q = '';

  columns: TableColumn<PlatformUser>[] = [
    { key: 'full_name', label: 'Name', class: 'text-white' },
    { key: 'email', label: 'Email', class: 'text-ink-500' },
    { key: 'role', label: 'Role', format: r => r.role.replace('_', ' ') },
    { key: 'org_name', label: 'Organization', class: 'text-ink-500', format: r => r.org_name || '—' },
  ];

  constructor(private api: ApiService, private auth: AuthService, private toast: ToastService) {}

  ngOnInit() { this.api.get<PlatformUser[]>('/api/v1/platform/users').subscribe(u => this.users = u); }

  impersonate(u: PlatformUser) {
    if (!confirm(`Login as ${u.email}?`)) return;
    this.api.post<{ token: string }>(`/api/v1/platform/users/${u.id}/impersonate`, {}).subscribe({
      next: res => {
        localStorage.setItem('cp_token', res.token);
        if (u.org_slug) localStorage.setItem('cp_org_slug', u.org_slug);
        this.auth.refreshMe();
        this.toast.success(`Now viewing as ${u.email}`);
        window.location.href = '/dashboard';
      },
      error: e => this.toast.error(e.error?.error || 'Impersonation failed'),
    });
  }

  get filtered() {
    const v = this.q.toLowerCase();
    if (!v) return this.users;
    return this.users.filter(u => `${u.full_name} ${u.email} ${u.role}`.toLowerCase().includes(v));
  }
}
