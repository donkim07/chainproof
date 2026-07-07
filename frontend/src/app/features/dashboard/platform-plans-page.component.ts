import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';

interface Plan {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  max_sites: number;
  max_endpoints: number;
  max_anchors_monthly: number;
}

@Component({
  selector: 'app-platform-plans-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, ButtonComponent, ModalComponent],
  template: `
    <app-page-header title="Subscription Plans" subtitle="Pricing tiers and feature limits." badge="Super Admin"></app-page-header>

    <div class="grid gap-6 md:grid-cols-3 items-start">
      @for (p of plans; track p.id) {
        <div class="pricing-card hover:border-signal-500/30 transition-colors">
          <div class="badge-info mb-2">{{ p.slug }}</div>
          <h3 class="text-xl font-bold text-white">{{ p.name }}</h3>
          <div class="mt-2 text-3xl font-bold text-signal-400">{{ '$' + p.price_monthly }}<span class="text-sm text-ink-500">/mo</span></div>
          <ul class="mt-4 space-y-2 text-sm text-ink-500">
            <li>Sites: {{ p.max_sites < 0 ? 'Unlimited' : p.max_sites }}</li>
            <li>Endpoints: {{ p.max_endpoints < 0 ? 'Unlimited' : p.max_endpoints }}</li>
            <li>Anchors/mo: {{ p.max_anchors_monthly < 0 ? 'Unlimited' : p.max_anchors_monthly }}</li>
          </ul>
          <div class="mt-6">
            <button class="btn-secondary text-sm" (click)="openEdit(p)">Edit plan</button>
          </div>
        </div>
      }
    </div>

    <app-modal [open]="!!editing" title="Edit plan" (closed)="editing = null">
      @if (editing) {
        <div class="space-y-3">
          <div>
            <label class="text-xs text-ink-500">Name</label>
            <input class="input-field mt-1" [(ngModel)]="form.name" />
          </div>
          <div>
            <label class="text-xs text-ink-500">Price / month ($)</label>
            <input class="input-field mt-1" type="number" [(ngModel)]="form.price_monthly" />
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="text-xs text-ink-500">Max sites</label>
              <input class="input-field mt-1" type="number" [(ngModel)]="form.max_sites" />
            </div>
            <div>
              <label class="text-xs text-ink-500">Max endpoints</label>
              <input class="input-field mt-1" type="number" [(ngModel)]="form.max_endpoints" />
            </div>
            <div>
              <label class="text-xs text-ink-500">Anchors/mo</label>
              <input class="input-field mt-1" type="number" [(ngModel)]="form.max_anchors_monthly" />
            </div>
          </div>
          <p class="text-xs text-ink-500">Use -1 for unlimited limits.</p>
          <div class="form-actions !border-0 !pt-2 !mt-0">
            <app-button (click)="save()" [loading]="saving">Save changes</app-button>
            <button type="button" class="btn-secondary" (click)="editing = null">Cancel</button>
          </div>
        </div>
      }
    </app-modal>
  `,
})
export class PlatformPlansPageComponent implements OnInit {
  plans: Plan[] = [];
  editing: Plan | null = null;
  saving = false;
  form = { name: '', price_monthly: 0, max_sites: 0, max_endpoints: 0, max_anchors_monthly: 0 };

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() { this.reload(); }

  reload() {
    this.api.get<Plan[]>('/api/v1/platform/plans').subscribe(p => this.plans = p);
  }

  openEdit(p: Plan) {
    this.editing = p;
    this.form = {
      name: p.name,
      price_monthly: p.price_monthly,
      max_sites: p.max_sites,
      max_endpoints: p.max_endpoints,
      max_anchors_monthly: p.max_anchors_monthly,
    };
  }

  save() {
    if (!this.editing) return;
    this.saving = true;
    this.api.patch<Plan>(`/api/v1/platform/plans/${this.editing.id}`, this.form).subscribe({
      next: updated => {
        const idx = this.plans.findIndex(p => p.id === updated.id);
        if (idx >= 0) this.plans[idx] = updated;
        this.toast.success('Plan updated');
        this.editing = null;
        this.saving = false;
      },
      error: e => { this.toast.error(e.error?.error || 'Failed'); this.saving = false; },
    });
  }
}
