import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { CanDirective } from '../../shared/directives/can.directive';

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
  description?: string;
  is_system?: boolean;
}

interface Permission {
  code: string;
  description: string;
  category: string;
}

@Component({
  selector: 'app-team-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, PageHeaderComponent, SearchInputComponent, PaginationComponent, CanDirective],
  template: `
    <app-page-header title="Team &amp; Roles" subtitle="Manage members and view role permissions (RBAC)." badge="Organization">
      <ng-container actions *appCan="'team:write'">
        <app-button (click)="openCreate = !openCreate">+ Add User</app-button>
      </ng-container>
    </app-page-header>

    @if (openCreate) {
      <div class="card animate-slide-up mb-6 space-y-3">
        <h3 class="font-semibold text-white">New team member</h3>
        <div class="grid gap-3 md:grid-cols-2">
          <input class="input-field" placeholder="Full name" [(ngModel)]="form.full_name" />
          <input class="input-field" placeholder="Email" type="email" [(ngModel)]="form.email" autocomplete="off" />
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

    <div class="grid gap-6 xl:grid-cols-5 mb-8">
      <div class="table-shell xl:col-span-3">
        <div class="table-toolbar">
          <app-search-input placeholder="Search team..." [(value)]="q" />
          <span class="text-sm text-slate-400">{{ filtered.length }} users</span>
        </div>
        <div class="overflow-x-auto">
          <table class="cp-table">
            <thead><tr><th>Name</th><th>Email</th><th>Roles</th><th>Status</th><th class="text-right">Actions</th></tr></thead>
            <tbody>
              @for (u of paged(); track u.id) {
                <tr class="border-t border-slate-800 hover:bg-slate-800/30 transition-colors">
                  <td class="text-white">{{ u.full_name }}</td>
                  <td class="text-slate-400">{{ u.email }}</td>
                  <td>@for (r of u.roles; track r) { <span class="badge-info mr-1">{{ r }}</span> }</td>
                  <td><span [class]="u.active ? 'badge-success' : 'badge-danger'">{{ u.active ? 'Active' : 'Off' }}</span></td>
                  <td class="text-right">
                    <button *appCan="'team:write'" class="text-xs text-brand-400 hover:underline" (click)="toggleActive(u)">{{ u.active ? 'Disable' : 'Enable' }}</button>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="py-8 text-center text-slate-500">No team members.</td></tr>
              }
            </tbody>
          </table>
        </div>
        <app-pagination [page]="page" [pageSize]="8" [total]="filtered.length" (pageChange)="page = $event" />
      </div>

      <div class="xl:col-span-2 card">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-semibold text-white">Role permissions</h3>
          <ng-container *appCan="'team:write'">
            @if (editingPerms) {
              <div class="flex gap-2">
                <button class="text-xs text-slate-400 hover:text-white" (click)="cancelEditPerms()">Cancel</button>
                <app-button (click)="saveRolePerms()" [loading]="savingPerms">Save</app-button>
              </div>
            } @else if (selectedRole !== 'admin') {
              <button class="text-xs text-brand-400 hover:underline" (click)="startEditPerms()">Edit</button>
            }
          </ng-container>
        </div>
        <select class="input-field mb-4" [(ngModel)]="selectedRole" (ngModelChange)="loadRolePerms()">
          @for (r of roles; track r.id) {
            <option [value]="r.name">{{ r.name }}</option>
          }
        </select>
        <div class="max-h-80 overflow-y-auto space-y-2">
          @for (cat of permCategories; track cat) {
            <div class="text-[10px] uppercase tracking-wider text-slate-500 mt-3 first:mt-0">{{ cat }}</div>
            @for (p of permsByCategory(cat); track p.code) {
              <label class="flex items-start gap-2 text-sm py-1" [class.cursor-pointer]="editingPerms">
                @if (editingPerms) {
                  <input type="checkbox" class="mt-0.5" [checked]="editPermSet.has(p.code)" (change)="togglePerm(p.code)" />
                } @else {
                  <span [class]="rolePermSet.has(p.code) ? 'text-emerald-400' : 'text-slate-600'">{{ rolePermSet.has(p.code) ? '&#10003;' : '○' }}</span>
                }
                <div>
                  <code class="text-brand-300 text-xs">{{ p.code }}</code>
                  <p class="text-xs text-slate-500">{{ p.description }}</p>
                </div>
              </label>
            }
          }
        </div>
      </div>
    </div>
  `,
})
export class TeamPageComponent implements OnInit {
  users: TeamUser[] = [];
  roles: Role[] = [];
  permissions: Permission[] = [];
  rolePerms: string[] = [];
  selectedRole = 'admin';
  q = '';
  page = 1;
  openCreate = false;
  saving = false;
  editingPerms = false;
  savingPerms = false;
  editPerms: string[] = [];
  form = { full_name: '', email: '', password: '', role: 'viewer' };

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() {
    this.reload();
    this.api.get<Role[]>('/api/v1/team/roles').subscribe(r => {
      this.roles = r;
      if (r.length) this.selectedRole = r[0].name;
      this.loadRolePerms();
    });
    this.api.get<Permission[]>('/api/v1/team/permissions').subscribe(p => this.permissions = p);
  }

  get filtered() {
    const v = this.q.trim().toLowerCase();
    return v ? this.users.filter(u => `${u.full_name} ${u.email}`.toLowerCase().includes(v)) : this.users;
  }

  get rolePermSet() { return new Set(this.rolePerms); }

  get editPermSet() { return new Set(this.editPerms); }

  get permCategories() {
    return [...new Set(this.permissions.map(p => p.category))];
  }

  permsByCategory(cat: string) {
    return this.permissions.filter(p => p.category === cat);
  }

  paged() {
    const start = (this.page - 1) * 8;
    return this.filtered.slice(start, start + 8);
  }

  reload() {
    this.api.get<TeamUser[]>('/api/v1/team/users').subscribe(u => this.users = u);
  }

  loadRolePerms() {
    this.editingPerms = false;
    this.api.get<{ permissions: string[] }>(`/api/v1/team/roles/${this.selectedRole}/permissions`)
      .subscribe(r => this.rolePerms = r.permissions ?? []);
  }

  startEditPerms() {
    this.editPerms = [...this.rolePerms];
    this.editingPerms = true;
  }

  cancelEditPerms() {
    this.editingPerms = false;
    this.editPerms = [];
  }

  togglePerm(code: string) {
    const set = new Set(this.editPerms);
    if (set.has(code)) set.delete(code);
    else set.add(code);
    this.editPerms = [...set];
  }

  saveRolePerms() {
    this.savingPerms = true;
    this.api.put(`/api/v1/team/roles/${this.selectedRole}/permissions`, { permissions: this.editPerms }).subscribe({
      next: () => {
        this.toast.success('Role permissions updated');
        this.rolePerms = [...this.editPerms];
        this.editingPerms = false;
        this.savingPerms = false;
      },
      error: e => { this.toast.error(e.error?.error || 'Save failed'); this.savingPerms = false; },
    });
  }

  createUser() {
    this.saving = true;
    this.api.post('/api/v1/team/users', {
      full_name: this.form.full_name, email: this.form.email,
      password: this.form.password, roles: [this.form.role],
    }).subscribe({
      next: () => {
        this.toast.success('Team member added');
        this.form = { full_name: '', email: '', password: '', role: 'viewer' };
        this.openCreate = false;
        this.reload();
        this.saving = false;
      },
      error: e => { this.toast.error(e.error?.error || 'Failed'); this.saving = false; },
    });
  }

  toggleActive(user: TeamUser) {
    this.api.patch(`/api/v1/team/users/${user.id}`, { active: !user.active }).subscribe({
      next: () => { user.active = !user.active; this.toast.success('Updated'); },
      error: () => this.toast.error('Failed'),
    });
  }
}
