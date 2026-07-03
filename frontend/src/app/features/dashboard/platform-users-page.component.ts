import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
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
    <app-page-header title="Platform Users" subtitle="All owners and platform administrators." badge="Super Admin"></app-page-header>
    <div class="table-shell">
      <div class="table-toolbar">
        <input class="input-field max-w-xs" [(ngModel)]="q" placeholder="Search users..." />
      </div>
      <table class="cp-table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Organization</th></tr></thead>
        <tbody>
          @for (u of filtered; track u.id) {
            <tr class="border-t border-slate-800">
              <td class="text-white">{{ u.full_name }}</td>
              <td class="text-slate-300">{{ u.email }}</td>
              <td><span class="badge-info capitalize">{{ u.role.replace('_', ' ') }}</span></td>
              <td class="text-slate-400">{{ u.org_name || '—' }}</td>
            </tr>
          } @empty {
            <tr><td colspan="4" class="py-12 text-center text-slate-500">No users.</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class PlatformUsersPageComponent implements OnInit {
  users: PlatformUser[] = [];
  q = '';
  constructor(private api: ApiService) {}
  ngOnInit() { this.api.get<PlatformUser[]>('/api/v1/platform/users').subscribe(u => this.users = u); }
  get filtered() {
    const v = this.q.toLowerCase();
    if (!v) return this.users;
    return this.users.filter(u => `${u.full_name} ${u.email} ${u.role}`.toLowerCase().includes(v));
  }
}
