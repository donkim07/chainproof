import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ButtonComponent } from '../../shared/components/button/button.component';

interface TeamUser {
  id: string;
  email: string;
  full_name: string;
  roles: string[];
  active: boolean;
}

interface Role {
  id: string;
  name: string;
}

@Component({
  selector: 'app-team-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent],
  template: `
    <div class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-white">Team & Roles</h1>
          <p class="text-slate-400">Manage users and role-based permissions.</p>
        </div>
        <app-button (click)="openCreate = !openCreate">+ Add User</app-button>
      </div>

      @if (openCreate) {
        <div class="card space-y-3">
          <h3 class="text-lg font-semibold">New team member</h3>
          <div class="grid gap-3 md:grid-cols-2">
            <input class="input-field" placeholder="Full name" [(ngModel)]="form.full_name" />
            <input class="input-field" placeholder="Email" type="email" [(ngModel)]="form.email" />
            <input class="input-field" placeholder="Temporary password" type="password" [(ngModel)]="form.password" />
            <select class="input-field" [(ngModel)]="form.role">
              @for (r of roles; track r.id) {
                <option [value]="r.name">{{ r.name }}</option>
              }
            </select>
          </div>
          <app-button (click)="createUser()" [loading]="saving">Create user</app-button>
        </div>
      }

      <div class="card p-0 overflow-hidden">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-4">
          <input class="input-field max-w-sm" [(ngModel)]="q" placeholder="Search team..." />
          <span class="text-sm text-slate-400">{{ filtered.length }} users</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[720px] text-sm">
            <thead class="bg-slate-800/50 text-slate-400">
              <tr>
                <th class="px-4 py-3 text-left">Name</th>
                <th class="px-4 py-3 text-left">Email</th>
                <th class="px-4 py-3 text-left">Roles</th>
                <th class="px-4 py-3 text-left">Status</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (u of paged(); track u.id) {
                <tr class="border-b border-slate-800">
                  <td class="px-4 py-3 text-white">{{ u.full_name }}</td>
                  <td class="px-4 py-3 text-slate-300">{{ u.email }}</td>
                  <td class="px-4 py-3">
                    @for (r of u.roles; track r) { <span class="badge-info mr-1">{{ r }}</span> }
                  </td>
                  <td class="px-4 py-3"><span [class]="u.active ? 'badge-success' : 'badge-danger'">{{ u.active ? 'Active' : 'Disabled' }}</span></td>
                  <td class="px-4 py-3 text-right space-x-2">
                    <button class="btn-ghost text-xs" (click)="toggleActive(u)">{{ u.active ? 'Disable' : 'Enable' }}</button>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="px-4 py-8 text-center text-slate-500">No users yet.</td></tr>
              }
            </tbody>
          </table>
        </div>
        <div class="flex items-center justify-between border-t border-slate-800 p-4 text-sm">
          <span class="text-slate-400">Page {{ page }} / {{ pages }}</span>
          <div class="space-x-2">
            <button class="btn-ghost" [disabled]="page===1" (click)="page = page - 1">Prev</button>
            <button class="btn-ghost" [disabled]="page===pages" (click)="page = page + 1">Next</button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class TeamPageComponent implements OnInit {
  users: TeamUser[] = [];
  roles: Role[] = [];
  q = '';
  page = 1;
  pageSize = 8;
  openCreate = false;
  saving = false;
  form = { full_name: '', email: '', password: '', role: 'viewer' };

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit(): void {
    this.reload();
    this.api.get<Role[]>('/api/v1/team/roles').subscribe(r => (this.roles = r));
  }

  get filtered() {
    const query = this.q.trim().toLowerCase();
    if (!query) return this.users;
    return this.users.filter(u => `${u.full_name} ${u.email} ${u.roles.join(' ')}`.toLowerCase().includes(query));
  }

  get pages() {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  paged() {
    if (this.page > this.pages) this.page = this.pages;
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  reload() {
    this.api.get<TeamUser[]>('/api/v1/team/users').subscribe(users => (this.users = users));
  }

  createUser() {
    this.saving = true;
    this.api.post('/api/v1/team/users', {
      full_name: this.form.full_name,
      email: this.form.email,
      password: this.form.password,
      roles: [this.form.role],
    }).subscribe({
      next: () => {
        this.toast.success('Team member added');
        this.form = { full_name: '', email: '', password: '', role: 'viewer' };
        this.openCreate = false;
        this.reload();
        this.saving = false;
      },
      error: e => {
        this.toast.error(e.error?.error || 'Failed to add team member');
        this.saving = false;
      },
    });
  }

  toggleActive(user: TeamUser) {
    this.api.patch(`/api/v1/team/users/${user.id}`, { active: !user.active }).subscribe({
      next: () => {
        user.active = !user.active;
        this.toast.success('User updated');
      },
      error: () => this.toast.error('Failed to update user'),
    });
  }
}
