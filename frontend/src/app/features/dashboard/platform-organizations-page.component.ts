import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { DataTableComponent, TableColumn } from '../../shared/components/data-table/data-table.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';

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
  imports: [CommonModule, FormsModule, PageHeaderComponent, ButtonComponent, DataTableComponent, SearchInputComponent],
  template: `
    <app-page-header title="Organizations" subtitle="Tenant CRUD — suspend, activate, and assign plans." badge="Super Admin"></app-page-header>

    <app-data-table
      [columns]="columns"
      [rows]="filtered"
      [hasActions]="true"
      exportFilename="organizations.csv"
      [countLabel]="filtered.length + ' tenants'"
      emptyTitle="No organizations"
      emptyIcon="building">
      <app-search-input search [(value)]="q" placeholder="Search orgs..." />

      <ng-template #rowActions let-org>
        <select class="input-field py-1 text-xs mr-2" [ngModel]="org.plan_slug" (ngModelChange)="changePlan(org, $event)">
          <option value="free">free</option><option value="pro">pro</option><option value="enterprise">enterprise</option>
        </select>
        <app-button variant="secondary" (click)="toggle(org)">{{ org.active ? 'Suspend' : 'Activate' }}</app-button>
      </ng-template>
    </app-data-table>
  `,
})
export class PlatformOrganizationsPageComponent implements OnInit {
  orgs: Org[] = [];
  q = '';

  columns: TableColumn<Org>[] = [
    { key: 'name', label: 'Name', class: 'text-white font-medium' },
    { key: 'slug', label: 'Slug', class: 'font-mono text-xs text-ink-500' },
    { key: 'plan_slug', label: 'Plan', format: r => r.plan_slug },
    { key: 'subscription_status', label: 'Status' },
    { key: 'active', label: 'Active', format: r => r.active ? 'yes' : 'suspended' },
  ];

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
      next: () => { org.plan_slug = plan; this.toast.success('Plan updated'); },
      error: () => this.toast.error('Failed'),
    });
  }
}
