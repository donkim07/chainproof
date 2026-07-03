import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

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
  imports: [CommonModule, PageHeaderComponent],
  template: `
    <app-page-header title="Subscription Plans" subtitle="Pricing tiers and feature limits." badge="Super Admin"></app-page-header>
    <div class="grid gap-6 md:grid-cols-3">
      @for (p of plans; track p.id) {
        <div class="card hover:border-brand-500/30 transition-colors">
          <div class="badge-info mb-2">{{ p.slug }}</div>
          <h3 class="text-xl font-bold text-white">{{ p.name }}</h3>
          <div class="mt-2 text-3xl font-bold text-brand-400">{{ '$' + p.price_monthly }}<span class="text-sm text-slate-500">/mo</span></div>
          <ul class="mt-4 space-y-2 text-sm text-slate-400">
            <li>Sites: {{ p.max_sites < 0 ? 'Unlimited' : p.max_sites }}</li>
            <li>Endpoints: {{ p.max_endpoints < 0 ? 'Unlimited' : p.max_endpoints }}</li>
            <li>Anchors/mo: {{ p.max_anchors_monthly < 0 ? 'Unlimited' : p.max_anchors_monthly }}</li>
          </ul>
        </div>
      }
    </div>
  `,
})
export class PlatformPlansPageComponent implements OnInit {
  plans: Plan[] = [];
  constructor(private api: ApiService) {}
  ngOnInit() { this.api.get<Plan[]>('/api/v1/platform/plans').subscribe(p => this.plans = p); }
}
