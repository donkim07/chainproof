import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { PublicNavComponent } from '../../shared/components/public-nav/public-nav.component';
import { AppFooterComponent } from '../../shared/components/app-footer/app-footer.component';
import { IconComponent } from '../../shared/components/icon/icon.component';

interface Plan {
  name: string;
  slug: string;
  price_monthly: number;
  max_sites: number;
  max_endpoints: number;
  max_anchors_monthly: number;
  features: string[];
}

@Component({
  selector: 'app-pricing-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonComponent, PublicNavComponent, AppFooterComponent, IconComponent],
  template: `
    <app-public-nav />

    <section class="relative pt-28 pb-12 text-center px-6">
      <div class="badge-info mb-4 inline-flex animate-fade-in">For website &amp; API owners</div>
      <h1 class="font-display text-4xl sm:text-5xl font-bold text-white animate-slide-up">Simple pricing. <span class="text-signal-500">Serious integrity.</span></h1>
      <p class="mx-auto mt-4 max-w-2xl text-ink-500 leading-relaxed animate-slide-up">
        Register your backend, anchor hashes on Hyperledger Fabric, detect tampering — your end users never sign up here.
      </p>
    </section>

    <div class="mx-auto max-w-6xl px-6 pb-8 grid gap-8 lg:grid-cols-3 pt-4 overflow-visible">
      @for (plan of plans; track plan.slug) {
        <button type="button"
          class="pricing-card text-left animate-slide-up hover:-translate-y-1 transition-all duration-300 cursor-pointer"
          [class.ring-2]="selected()?.slug === plan.slug"
          [class.ring-signal-500]="selected()?.slug === plan.slug"
          [ngClass]="plan.slug === 'pro' ? 'border-signal-500/50 shadow-lg shadow-signal-500/15' : ''"
          (click)="select(plan)">
          @if (plan.slug === 'pro') {
            <div class="absolute -top-3 left-1/2 -translate-x-1/2 badge-info z-10 whitespace-nowrap">Most popular</div>
          }
          <h3 class="text-xl font-bold text-white">{{ plan.name }}</h3>
          <p class="mt-1 text-xs text-ink-500">{{ planBlurb(plan.slug) }}</p>
          <div class="mt-5">
            <span class="text-4xl font-extrabold text-white">{{ plan.price_monthly === 0 ? 'Free' : '$' + plan.price_monthly }}</span>
            @if (plan.price_monthly > 0) { <span class="text-ink-500">/mo</span> }
          </div>
          <ul class="mt-6 space-y-2 text-sm text-slate-300 border-t border-ink-800 pt-6">
            <li class="flex gap-2"><app-icon name="check" size="sm" extraClass="text-signal-400 shrink-0" /> {{ fmtLimit(plan.max_sites) }} site(s)</li>
            <li class="flex gap-2"><app-icon name="check" size="sm" extraClass="text-signal-400 shrink-0" /> {{ fmtLimit(plan.max_endpoints) }} endpoints</li>
            <li class="flex gap-2"><app-icon name="check" size="sm" extraClass="text-signal-400 shrink-0" /> {{ fmtLimit(plan.max_anchors_monthly) }} anchors/mo</li>
          </ul>
          <p class="mt-4 text-xs text-signal-400">Click for full details →</p>
        </button>
      }
    </div>

    @if (selected(); as plan) {
      <div class="mx-auto max-w-3xl px-6 pb-12 animate-scale-in">
        <div class="card border-signal-500/30 overflow-hidden">
          <div class="flex items-start justify-between gap-4 border-b border-ink-800 pb-4 mb-4">
            <div>
              <h2 class="text-2xl font-bold text-white">{{ plan.name }} plan</h2>
              <p class="text-ink-500 mt-1">{{ planBlurb(plan.slug) }}</p>
            </div>
            <button type="button" class="btn-ghost text-ink-500" (click)="selected.set(null)">✕</button>
          </div>
          <div class="grid gap-6 md:grid-cols-2">
            <div>
              <h3 class="text-sm font-semibold text-slate-300 mb-3">Limits</h3>
              <ul class="space-y-2 text-sm text-ink-500">
                <li>Sites: <strong class="text-white">{{ fmtLimit(plan.max_sites) }}</strong></li>
                <li>Protected endpoints: <strong class="text-white">{{ fmtLimit(plan.max_endpoints) }}</strong></li>
                <li>Monthly anchors: <strong class="text-white">{{ fmtLimit(plan.max_anchors_monthly) }}</strong></li>
              </ul>
            </div>
            <div>
              <h3 class="text-sm font-semibold text-slate-300 mb-3">Features</h3>
              <ul class="space-y-2 text-sm">
                @for (f of plan.features; track f) {
                  <li class="flex gap-2 text-slate-300"><app-icon name="check" size="sm" extraClass="text-signal-400 shrink-0" />{{ f }}</li>
                }
              </ul>
            </div>
          </div>
          <a routerLink="/register" class="mt-6 block">
            <app-button [fullWidth]="true">{{ plan.price_monthly === 0 ? 'Start free' : 'Get ' + plan.name }}</app-button>
          </a>
        </div>
      </div>
    }

    <section class="mx-auto max-w-4xl px-6 pb-20">
      <h2 class="font-display text-2xl font-bold text-white text-center mb-8">What's included</h2>
      <div class="grid gap-4 sm:grid-cols-2 text-sm">
        @for (row of comparison; track row.title) {
          <div class="card hover:border-signal-500/20 transition-colors">
            <div class="font-medium text-white">{{ row.title }}</div>
            <p class="mt-2 text-ink-500">{{ row.desc }}</p>
          </div>
        }
      </div>
    </section>

    <app-footer />
  `,
})
export class PricingPageComponent implements OnInit {
  plans: Plan[] = [];
  selected = signal<Plan | null>(null);
  comparison = [
    { title: 'Developer API', desc: 'Anchor hashes from your backend after each save — one HTTP call.' },
    { title: 'Smart discovery', desc: 'OpenAPI, Swagger, ffuf, gobuster, and kiterunner route scanning.' },
    { title: 'Team & RBAC', desc: 'Roles and permissions for developers, viewers, and security analysts.' },
    { title: 'Tamper alerts', desc: 'Webhooks and dashboard when live data diverges from blockchain proofs.' },
  ];
  constructor(private api: ApiService) {}
  ngOnInit() {
    this.api.getPublic<Plan[]>('/api/v1/plans').subscribe(p => {
      this.plans = p;
      const pro = p.find(x => x.slug === 'pro');
      if (pro) this.selected.set(pro);
    });
  }
  select(plan: Plan) { this.selected.set(plan); }
  planBlurb(slug: string) {
    return ({ free: 'Try on staging or one production site', pro: 'Growing apps with multiple APIs', enterprise: 'High volume & compliance' } as Record<string, string>)[slug] || '';
  }
  fmtLimit(n: number) { return n < 0 ? 'Unlimited' : String(n); }
}
