import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { ButtonComponent } from '../../shared/components/button/button.component';

interface Plan {
  name: string;
  slug: string;
  price_monthly: number;
  max_sites: number;
  max_endpoints: number;
  features: string[];
}

@Component({
  selector: 'app-pricing-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonComponent],
  template: `
    <nav class="border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <a routerLink="/" class="flex items-center gap-2">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold">CP</div>
          <span class="font-bold text-white">ChainProof</span>
        </a>
        <a routerLink="/register"><app-button>Get Started</app-button></a>
      </div>
    </nav>

    <section class="py-20 text-center">
      <h1 class="text-4xl font-bold text-white">Simple, transparent pricing</h1>
      <p class="mt-4 text-slate-400">Start free. Scale as you grow. Enterprise when you need it.</p>
    </section>

    <div class="mx-auto max-w-6xl px-6 pb-20 grid gap-8 md:grid-cols-3">
      @for (plan of plans; track plan.slug) {
        <div class="card relative animate-slide-up"
             [ngClass]="{'border-brand-500 shadow-lg': plan.slug === 'pro'}">
          @if (plan.slug === 'pro') {
            <div class="absolute -top-3 left-1/2 -translate-x-1/2 badge-info">Most Popular</div>
          }
          <h3 class="text-xl font-bold text-white">{{ plan.name }}</h3>
          <div class="mt-4">
            <span class="text-4xl font-extrabold text-white">{{ plan.price_monthly === 0 ? 'Free' : '$' + plan.price_monthly }}</span>
            @if (plan.price_monthly > 0) { <span class="text-slate-400">/mo</span> }
          </div>
          <ul class="mt-6 space-y-3 text-sm text-slate-300">
            @for (f of plan.features; track f) {
              <li class="flex items-center gap-2"><span class="text-emerald-400">&#10003;</span> {{ f }}</li>
            }
          </ul>
          <a routerLink="/register" class="mt-8 block">
            <app-button [fullWidth]="true" [variant]="plan.slug === 'pro' ? 'primary' : 'secondary'">
              {{ plan.price_monthly === 0 ? 'Start Free' : 'Subscribe' }}
            </app-button>
          </a>
        </div>
      }
    </div>
  `,
})
export class PricingPageComponent implements OnInit {
  plans: Plan[] = [];
  constructor(private api: ApiService) {}
  ngOnInit() {
    this.api.getPublic<Plan[]>('/api/v1/plans').subscribe(p => this.plans = p);
  }
}
