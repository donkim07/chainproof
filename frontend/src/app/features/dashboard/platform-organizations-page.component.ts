import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../shared/components/button/button.component';

interface Org {
  id: string;
  name: string;
  slug: string;
  plan_slug: string;
  subscription_status: string;
  active: boolean;
  created_at: string;
}

@Component({
  selector: 'app-platform-organizations-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, ButtonComponent],
  template: `
    <app-page-header title="Organizations" subtitle="Tenant CRUD — suspend, activate, and assign plans." badge="Super Admin"></app-page-header>

    <div class="table-shell">
      <div class="table-toolbar">
        <input class="input-field max-w-xs" [(ngModel)]="q" placeholder="Search orgs..." />
        <span class="text-sm text-ink-500">{{ filtered.length }} tenants</span>
      </div>
      <div class="overflow-x-auto">
        <table class="cp-table">
          <thead><tr><th>Name</th><th>Slug</th><th>Plan</th><th>Status</th><th>Active</th><th class="text-right">Actions</th></tr></thead>
          <tbody>
            @for (org of filtered; track org.id) {
              <tr class="border-t border-ink-800 hover:bg-ink-800/30">
                <td class="font-medium text-white">{{ org.name }}</td>
                <td class="font-mono text-xs text-ink-500">{{ org.slug }}</td>
                <td>
                  <select class="input-field py-1 text-xs" [ngModel]="org.plan_slug" (ngModelChange)="changePlan(org, $event)">
                    <option value="free">free</option><option value="pro">pro</option><option value="enterprise">enterprise</option>
                  </select>
                </td>
                <td><span class="badge-success">{{ org.subscription_status }}</span></td>
                <td><span [class]="org.active ? 'badge-success' : 'badge-danger'">{{ org.active ? 'yes' : 'suspended' }}</span></td>
                <td class="text-right">
                  <app-button variant="secondary" (click)="toggle(org)">{{ org.active ? 'Suspend' : 'Activate' }}</app-button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="py-12 text-center text-ink-500">No organizations.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class PlatformOrganizationsPageComponent implements OnInit {
  orgs: Org[] = [];
  q = '';
  constructor(private api: ApiService, private toast: ToastService) {}
  ngOnInit() { this.load(); }
  load() { this.api.get<Org[]>('/api/v1/platform/organizations').subscribe(o => this.orgs = o); }
  get filtered() {
    const v = this.q.toLowerCase();
    if (!v) return this.orgs;
    return this.orgs.filter(o => `${o.name} ${o.slug}`.toLowerCase().includes(v));
  }
  toggle(org: Org) {
    this.api.patch(`/api/v1/platform/organizations/${org.id}`, { active: !org.active }).subscribe({
      next: () => { this.toast.success('Updated'); this.load(); },
      error: () => this.toast.error('Failed'),
    });
  }
  changePlan(org: Org, plan: string) {
    this.api.patch(`/api/v1/platform/organizations/${org.id}`, { plan_slug: plan }).subscribe({
      next: () => this.toast.success('Plan updated'),
      error: () => this.toast.error('Failed'),
    });
  }
}
