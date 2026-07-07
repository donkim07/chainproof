import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

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
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <app-page-header title="Platform Users" subtitle="All owners — impersonate to debug client issues." badge="Super Admin"></app-page-header>
    <div class="table-shell">
      <div class="table-toolbar">
        <input class="input-field max-w-xs" [(ngModel)]="q" placeholder="Search users..." />
      </div>
      <table class="cp-table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Organization</th><th class="text-right">Actions</th></tr></thead>
        <tbody>
          @for (u of filtered; track u.id) {
            <tr class="border-t border-slate-800 hover:bg-slate-800/30">
              <td class="text-white">{{ u.full_name }}</td>
              <td class="text-slate-300">{{ u.email }}</td>
              <td><span class="badge-info capitalize">{{ u.role.replace('_', ' ') }}</span></td>
              <td class="text-slate-400">{{ u.org_name || '—' }}</td>
              <td class="text-right">
                @if (u.role !== 'super_admin' && u.org_slug) {
                  <button class="text-xs text-brand-400 hover:underline" (click)="impersonate(u)">Login as</button>
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5" class="py-12 text-center text-slate-500">No users.</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class PlatformUsersPageComponent implements OnInit {
  users: PlatformUser[] = [];
  q = '';
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
