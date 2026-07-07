import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { PublicNavComponent } from '../../shared/components/public-nav/public-nav.component';
import { ApiService } from '../../core/services/api.service';

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
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonComponent, PublicNavComponent],
  template: `
    <app-public-nav />

    <!-- Hero -->
    <section class="relative overflow-hidden pt-28 pb-24 lg:pt-36 lg:pb-32">
      <div class="hero-glow absolute inset-0 -z-10"></div>
      <div class="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(51,136,252,0.12),transparent_50%)]"></div>
      <div class="mx-auto max-w-7xl px-4 sm:px-6 text-center lg:text-left lg:grid lg:grid-cols-2 lg:items-center lg:gap-16">
        <div class="animate-fade-in">
          <div class="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-sm text-brand-300">
            <span class="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-soft"></span>
            Hyperledger Fabric · Developer-first API
          </div>
          <h1 class="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl leading-[1.08]">
            Blockchain integrity<br />
            <span class="gradient-text">for your API</span>
          </h1>
          <p class="mt-6 text-lg text-slate-400 leading-relaxed max-w-xl mx-auto lg:mx-0">
            Anchor hashes when records save. Detect tampering automatically. Your users never leave your app — one API call from your backend.
          </p>
          <div class="mt-10 grid grid-cols-1 xs:grid-cols-1 sm:flex sm:flex-wrap justify-center lg:justify-start gap-3 max-w-sm sm:max-w-none mx-auto lg:mx-0">
            <a routerLink="/register" class="block w-full sm:w-auto">
              <app-button [fullWidth]="true">Start free — 500 anchors/mo</app-button>
            </a>
            <a routerLink="/pricing" class="block w-full sm:w-auto">
              <app-button variant="secondary" [fullWidth]="true">View pricing</app-button>
            </a>
          </div>
          <div class="mt-10 flex flex-wrap justify-center lg:justify-start gap-8 text-sm text-slate-500">
            <span>&#10003; No end-user signup</span>
            <span>&#10003; OpenAPI discovery</span>
            <span>&#10003; Tamper alerts</span>
          </div>
        </div>
        <div class="mt-16 lg:mt-0 animate-slide-up">
          <div class="card glow-border p-1 bg-gradient-to-br from-brand-500/20 to-emerald-500/10">
            <div class="rounded-[10px] bg-slate-900/90 p-6 font-mono text-xs text-left overflow-x-auto">
              <div class="text-slate-500"># After each save in your backend</div>
              <div class="text-brand-300 mt-2">POST /api/v1/integrity/anchor</div>
              <pre class="text-slate-300 mt-3 leading-relaxed">{{ codeSample }}</pre>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Stats strip -->
    <section class="border-y border-slate-800/80 bg-slate-900/50 py-12">
      <div class="mx-auto max-w-7xl px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        @for (s of stats; track s.label) {
          <div class="animate-slide-up">
            <div class="text-3xl font-bold text-white">{{ s.value }}</div>
            <div class="mt-1 text-sm text-slate-500">{{ s.label }}</div>
          </div>
        }
      </div>
    </section>

    <!-- Features -->
    <section class="py-24">
      <div class="mx-auto max-w-7xl px-6">
        <div class="text-center mb-16">
          <h2 class="text-3xl font-bold text-white">Built for SaaS &amp; API owners</h2>
          <p class="mt-3 text-slate-400 max-w-2xl mx-auto">Not another auth provider — proof that your data wasn't altered after it was saved.</p>
        </div>
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          @for (f of features; track f.title) {
            <div class="card group hover:border-brand-500/40 hover:-translate-y-1 transition-all duration-300">
              <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600/15 text-2xl group-hover:scale-110 transition-transform" [innerHTML]="f.icon"></div>
              <h3 class="font-semibold text-white text-lg">{{ f.title }}</h3>
              <p class="mt-2 text-sm text-slate-400 leading-relaxed">{{ f.desc }}</p>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- Pricing cards (same style as pricing page) -->
    <section class="py-24 bg-slate-900/30 border-t border-slate-800">
      <div class="mx-auto max-w-7xl px-6">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold text-white">Simple, transparent pricing</h2>
          <p class="mt-2 text-slate-400">Per organization — scale as you grow</p>
        </div>
        <div class="grid gap-8 lg:grid-cols-3 max-w-5xl mx-auto">
          @for (plan of plans; track plan.slug) {
            <div class="card relative text-left hover:-translate-y-1 transition-all duration-300"
              [ngClass]="plan.slug === 'pro' ? 'border-brand-500 shadow-lg shadow-brand-600/15' : ''">
              @if (plan.slug === 'pro') {
                <div class="absolute -top-3 left-1/2 -translate-x-1/2 badge-info">Most popular</div>
              }
              <h3 class="text-xl font-bold text-white">{{ plan.name }}</h3>
              <div class="mt-4">
                <span class="text-4xl font-extrabold text-white">{{ plan.price_monthly === 0 ? 'Free' : '$' + plan.price_monthly }}</span>
                @if (plan.price_monthly > 0) { <span class="text-slate-400">/mo</span> }
              </div>
              <ul class="mt-6 space-y-3 text-sm text-slate-300 border-t border-slate-800 pt-6">
                <li class="flex gap-2"><span class="text-emerald-400">&#10003;</span> {{ fmt(plan.max_sites) }} sites</li>
                <li class="flex gap-2"><span class="text-emerald-400">&#10003;</span> {{ fmt(plan.max_endpoints) }} endpoints</li>
                <li class="flex gap-2"><span class="text-emerald-400">&#10003;</span> {{ fmt(plan.max_anchors_monthly) }} anchors/mo</li>
              </ul>
              <a routerLink="/register" class="mt-8 block">
                <app-button [fullWidth]="true" [variant]="plan.slug === 'pro' ? 'primary' : 'secondary'">
                  {{ plan.price_monthly === 0 ? 'Start free' : 'Get started' }}
                </app-button>
              </a>
            </div>
          }
        </div>
        <p class="text-center mt-8"><a routerLink="/pricing" class="text-brand-400 hover:underline text-sm">Compare plans in detail →</a></p>
      </div>
    </section>

    <!-- Comparison -->
    <section class="py-20 border-t border-slate-800">
      <div class="mx-auto max-w-5xl px-6">
        <h2 class="text-2xl font-bold text-white text-center mb-10">Why teams choose ChainProof</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          @for (row of comparison; track row.title) {
            <div class="card hover:border-brand-500/20 transition-colors">
              <div class="font-medium text-white">{{ row.title }}</div>
              <p class="mt-2 text-sm text-slate-400">{{ row.desc }}</p>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-24 text-center px-6 relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-t from-brand-600/10 to-transparent -z-10"></div>
      <h2 class="text-3xl sm:text-4xl font-bold text-white">Ready to prove integrity?</h2>
      <p class="mt-4 text-slate-400 max-w-lg mx-auto">Register, copy your Site ID, integrate in minutes.</p>
      <div class="mt-8 flex flex-wrap justify-center gap-4">
        <a routerLink="/register"><app-button>Create account</app-button></a>
        <a routerLink="/docs" class="btn-secondary">Developer docs</a>
      </div>
    </section>

    <footer class="border-t border-slate-800 py-10">
      <div class="mx-auto max-w-7xl px-6 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-500">
        <span>© 2026 ChainProof</span>
        <div class="flex gap-6">
          <a routerLink="/docs" class="hover:text-white transition-colors">Docs</a>
          <a routerLink="/pricing" class="hover:text-white transition-colors">Pricing</a>
          <a routerLink="/login" class="hover:text-white transition-colors">Login</a>
        </div>
      </div>
    </footer>
  `,
})
export class LandingPageComponent implements OnInit {
  plans: Plan[] = [
    { name: 'Free', slug: 'free', price_monthly: 0, max_sites: 1, max_endpoints: 10, max_anchors_monthly: 500, features: [] },
    { name: 'Pro', slug: 'pro', price_monthly: 49, max_sites: 10, max_endpoints: 100, max_anchors_monthly: 50000, features: [] },
    { name: 'Enterprise', slug: 'enterprise', price_monthly: 199, max_sites: -1, max_endpoints: -1, max_anchors_monthly: -1, features: [] },
  ];
  stats = [
    { value: '1 call', label: 'Per save integration' },
    { value: 'Fabric', label: 'Enterprise blockchain' },
    { value: 'RBAC', label: 'Team permissions' },
    { value: '24/7', label: 'Tamper monitoring' },
  ];
  features = [
    { icon: '&#128274;', title: 'Anchor on write', desc: 'POST /integrity/anchor after each database save with a verify block for automatic re-checks.' },
    { icon: '&#128269;', title: 'Smart discovery', desc: 'OpenAPI, Swagger, ffuf, gobuster, and kiterunner find your API routes automatically.' },
    { icon: '&#9888;', title: 'Tamper detection', desc: 'Background jobs compare live API data to blockchain anchors — incidents in your dashboard.' },
    { icon: '&#128101;', title: 'Team & roles', desc: 'Admin, developer, viewer, security analyst — Spatie-style permissions per tenant.' },
    { icon: '&#9939;', title: 'Hyperledger Fabric', desc: 'Enterprise-grade distributed ledger — not a toy chain.' },
    { icon: '&#128273;', title: 'API keys', desc: 'Service credentials for your backend — never store end-user passwords.' },
  ];
  comparison = [
    { title: 'Developer API', desc: 'Anchor hashes from your backend after each save — one HTTP call.' },
    { title: 'Smart discovery', desc: 'OpenAPI, Swagger, ffuf, gobuster, and kiterunner route scanning.' },
    { title: 'Team & RBAC', desc: 'Spatie-style roles and permissions for your organization.' },
    { title: 'Tamper alerts', desc: 'Webhooks and dashboard when live data diverges from blockchain proofs.' },
  ];
  codeSample = `{
  "site_id": "YOUR_SITE_UUID",
  "entity_id": "session-uuid",
  "payload": { "data": [...] },
  "verify": { "method": "GET", ... }
}`;
  constructor(private api: ApiService) {}
  ngOnInit() {
    this.api.getPublic<Plan[]>('/api/v1/plans').subscribe({ next: p => { if (p?.length) this.plans = p; } });
  }
  fmt(n: number) { return n < 0 ? 'Unlimited' : String(n); }
}
