import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { PublicNavComponent } from '../../shared/components/public-nav/public-nav.component';

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
  imports: [CommonModule, RouterLink, ButtonComponent, PublicNavComponent],
  template: `
    <app-public-nav />

    <section class="pt-28 pb-12 text-center px-6">
      <div class="badge-info mb-4 inline-flex">For website &amp; API owners</div>
      <h1 class="text-4xl sm:text-5xl font-bold text-white">Protect your users' data — not replace your auth</h1>
      <p class="mx-auto mt-4 max-w-2xl text-slate-400 leading-relaxed">
        You register your backend, pick endpoints, and choose which <strong class="text-white">user records</strong> get tamper-proof hashes.
        Your end users never create ChainProof accounts.
      </p>
    </section>

    <div class="mx-auto max-w-6xl px-6 pb-12 grid gap-8 lg:grid-cols-3">
      @for (plan of plans; track plan.slug) {
        <div class="card relative animate-slide-up hover:-translate-y-1 transition-transform duration-300"
             [ngClass]="plan.slug === 'pro' ? 'border-brand-500 shadow-lg shadow-brand-600/20' : ''">
          @if (plan.slug === 'pro') {
            <div class="absolute -top-3 left-1/2 -translate-x-1/2 badge-info">Most popular</div>
          }
          <h3 class="text-xl font-bold text-white">{{ plan.name }}</h3>
          <p class="mt-1 text-xs text-slate-500">{{ planBlurb(plan.slug) }}</p>
          <div class="mt-5">
            <span class="text-4xl font-extrabold text-white">{{ plan.price_monthly === 0 ? 'Free' : '$' + plan.price_monthly }}</span>
            @if (plan.price_monthly > 0) { <span class="text-slate-400">/mo</span> }
          </div>
          <ul class="mt-6 space-y-3 text-sm text-slate-300 border-t border-slate-800 pt-6">
            <li class="flex gap-2"><span class="text-emerald-400">&#10003;</span> {{ plan.max_sites < 0 ? 'Unlimited' : plan.max_sites }} site(s)</li>
            <li class="flex gap-2"><span class="text-emerald-400">&#10003;</span> {{ plan.max_endpoints < 0 ? 'Unlimited' : plan.max_endpoints }} protected endpoints</li>
            <li class="flex gap-2"><span class="text-emerald-400">&#10003;</span> {{ plan.max_anchors_monthly < 0 ? 'Unlimited' : plan.max_anchors_monthly }} anchors/month</li>
            @for (f of plan.features; track f) {
              <li class="flex gap-2"><span class="text-brand-400">&#10003;</span> {{ f }}</li>
            }
          </ul>
          <a routerLink="/register" class="mt-8 block">
            <app-button [fullWidth]="true" [variant]="plan.slug === 'pro' ? 'primary' : 'secondary'">
              {{ plan.price_monthly === 0 ? 'Start free' : 'Get ' + plan.name }}
            </app-button>
          </a>
        </div>
      }
    </div>

    <section class="mx-auto max-w-4xl px-6 pb-20">
      <h2 class="text-2xl font-bold text-white text-center mb-8">What's included for owners</h2>
      <div class="grid gap-4 sm:grid-cols-2 text-sm">
        @for (row of comparison; track row.title) {
          <div class="card">
            <div class="font-medium text-white">{{ row.title }}</div>
            <p class="mt-2 text-slate-400">{{ row.desc }}</p>
          </div>
        }
      </div>
    </section>
  `,
})
export class PricingPageComponent implements OnInit {
  plans: Plan[] = [];
  comparison = [
    { title: 'Developer API', desc: 'Your backend anchors hashes when user records are saved — one line after each write.' },
    { title: 'Endpoint discovery', desc: 'Scan your API for routes; you choose which user-facing endpoints to monitor.' },
    { title: 'Team & roles', desc: 'Invite developers and security staff — not your end customers.' },
    { title: 'Tamper alerts', desc: 'Webhooks when live data no longer matches blockchain proofs.' },
  ];
  constructor(private api: ApiService) {}
  ngOnInit() {
    this.api.getPublic<Plan[]>('/api/v1/plans').subscribe(p => this.plans = p);
  }
  planBlurb(slug: string) {
    const m: Record<string, string> = {
      free: 'Try on one production or staging site',
      pro: 'Growing apps with multiple APIs',
      enterprise: 'High volume & compliance needs',
    };
    return m[slug] || '';
  }
}
