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
  features: string[];
}

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonComponent, PublicNavComponent],
  template: `
    <app-public-nav />

    <!-- Hero -->
    <section class="relative overflow-hidden pt-28 pb-20 lg:pt-32">
      <div class="hero-glow absolute inset-0 -z-10"></div>
      <!-- decorative SVG blobs -->
      <svg class="absolute top-20 right-10 w-64 h-64 opacity-20 animate-float text-brand-500 -z-10" viewBox="0 0 200 200"><defs><linearGradient id="g1"><stop offset="0%" stop-color="#3388fc"/><stop offset="100%" stop-color="#10b981"/></linearGradient></defs><path fill="url(#g1)" d="M45,-49.5C58.7,-35.8,70.5,-19.9,73.4,-1.9C76.3,16.1,70.3,36.2,57.1,49.8C43.9,63.4,23.5,70.5,2.1,68.4C-19.3,66.3,-38.6,55,-51.8,39.1C-65,23.2,-72.1,2.7,-69.5,-16.1C-66.9,-34.9,-54.7,-52,-38.5,-65.7C-22.3,-79.4,-2.1,-89.7,16.8,-86.8C35.7,-83.9,53.4,-67.8,45,-49.5Z" transform="translate(100 100)"/></svg>
      <svg class="absolute bottom-10 left-5 w-48 h-48 opacity-15 animate-float-delayed text-emerald-500 -z-10" viewBox="0 0 200 200"><path fill="currentColor" d="M39,-41.9C50.8,-29.8,60.7,-15.9,63.5,0.3C66.3,16.5,62,33.8,50.8,45.6C39.6,57.4,21.5,63.7,2.8,60.9C-15.9,58.1,-31.8,46.2,-43.3,31.1C-54.8,16,-61.9,-2.3,-59.1,-19.5C-56.3,-36.7,-43.6,-52.8,-28.1,-64.6C-12.6,-76.4,5.7,-83.9,39,-41.9Z" transform="translate(100 100)"/></svg>

      <div class="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-2">
        <div class="animate-fade-in">
          <div class="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-sm text-brand-300">
            For website owners &amp; backend teams
          </div>
          <h1 class="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl leading-[1.08]">
            Tamper-proof your
            <span class="gradient-text"> users' records</span>
            on blockchain
          </h1>
          <p class="mt-6 text-lg text-slate-400 leading-relaxed">
            Register your API, pick endpoints, anchor hashes when records change — your customers never sign up here.
            Detect tampering. Prove integrity in court or compliance audits.
          </p>
          <div class="mt-8 flex flex-wrap gap-4">
            <a routerLink="/register"><app-button>Register your site</app-button></a>
            <a routerLink="/docs"><app-button variant="secondary">Owner docs</app-button></a>
          </div>
        </div>

        <!-- Owner flow diagram -->
        <div class="relative animate-slide-up">
          <div class="card glow-border p-6">
            <svg class="w-full h-auto" viewBox="0 0 400 280" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="20" y="20" width="120" height="60" rx="8" fill="#1e293b" stroke="#334155"/>
              <text x="80" y="55" text-anchor="middle" fill="#94a3b8" font-size="11">Your user</text>
              <path d="M140 50 H180" stroke="#3388fc" stroke-width="2" marker-end="url(#arrow)"/>
              <rect x="180" y="20" width="120" height="60" rx="8" fill="#1e293b" stroke="#3388fc"/>
              <text x="240" y="45" text-anchor="middle" fill="#59abff" font-size="10">Your website</text>
              <text x="240" y="62" text-anchor="middle" fill="#64748b" font-size="9">auth + DB</text>
              <path d="M300 50 H340" stroke="#10b981" stroke-width="2"/>
              <rect x="340" y="20" width="50" height="60" rx="8" fill="#1e293b" stroke="#10b981"/>
              <text x="365" y="55" text-anchor="middle" fill="#10b981" font-size="9">Save</text>
              <path d="M240 80 V120" stroke="#3388fc" stroke-width="2" stroke-dasharray="4"/>
              <rect x="160" y="120" width="160" height="50" rx="8" fill="#152756" stroke="#3388fc"/>
              <text x="240" y="142" text-anchor="middle" fill="#fff" font-size="11" font-weight="600">ChainProof anchor</text>
              <text x="240" y="158" text-anchor="middle" fill="#94a3b8" font-size="9">hash → Hyperledger</text>
              <rect x="60" y="200" width="280" height="60" rx="8" fill="#1e293b" stroke="#334155"/>
              <text x="200" y="225" text-anchor="middle" fill="#f43f5e" font-size="11">Tamper detected?</text>
              <text x="200" y="245" text-anchor="middle" fill="#94a3b8" font-size="9">Alert owner · forensic proof</text>
              <defs><marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="#3388fc"/></marker></defs>
            </svg>
          </div>
        </div>
      </div>
    </section>

    <!-- Owner value props -->
    <section class="border-y border-slate-800/80 bg-slate-900/40 py-16">
      <div class="mx-auto max-w-7xl px-6 grid gap-8 md:grid-cols-3">
        @for (v of ownerValues; track v.title) {
          <div class="text-center animate-slide-up hover:scale-[1.02] transition-transform">
            <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600/15 text-2xl" [innerHTML]="v.icon"></div>
            <h3 class="font-semibold text-white">{{ v.title }}</h3>
            <p class="mt-2 text-sm text-slate-400">{{ v.desc }}</p>
          </div>
        }
      </div>
    </section>

    <!-- How it works -->
    <section class="py-24">
      <div class="mx-auto max-w-7xl px-6">
        <h2 class="text-center text-3xl font-bold text-white mb-4">Built for owners, not end users</h2>
        <p class="text-center text-slate-400 mb-12 max-w-2xl mx-auto">You control what gets protected. Your users keep using your site with your existing login.</p>
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          @for (step of steps; track step.n) {
            <div class="card hover:border-brand-500/40 transition-all group">
              <div class="badge-info font-mono mb-3">{{ step.n }}</div>
              <h3 class="font-semibold text-white">{{ step.title }}</h3>
              <p class="mt-2 text-sm text-slate-400">{{ step.desc }}</p>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- Simple pricing -->
    <section class="py-24 bg-slate-900/30 border-t border-slate-800">
      <div class="mx-auto max-w-7xl px-6">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold text-white">Simple pricing</h2>
          <p class="mt-2 text-slate-400">Per organization — protect as many user records as your plan allows</p>
        </div>
        <div class="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          @for (p of plans; track p.slug) {
            <div class="card text-center hover:-translate-y-1 transition-transform" [class.border-brand-500]="p.slug === 'pro'">
              <h3 class="font-bold text-white">{{ p.name }}</h3>
              <div class="mt-3 text-3xl font-extrabold text-brand-400">{{ p.price_monthly === 0 ? 'Free' : '$' + p.price_monthly }}</div>
              @if (p.price_monthly > 0) { <div class="text-xs text-slate-500">/month</div> }
              <ul class="mt-4 space-y-2 text-xs text-slate-400">
                @for (f of p.features.slice(0, 3); track f) {
                  <li>{{ f }}</li>
                }
              </ul>
              <a routerLink="/register" class="mt-6 inline-block"><app-button [variant]="p.slug === 'pro' ? 'primary' : 'secondary'" >Start</app-button></a>
            </div>
          }
        </div>
        <div class="text-center mt-8">
          <a routerLink="/pricing" class="text-brand-400 hover:underline text-sm">Compare all plans →</a>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-20 text-center px-6">
      <h2 class="text-3xl font-bold text-white">Your users' data deserves proof</h2>
      <p class="mt-4 text-slate-400">Register as a website owner. Integrate in one API call.</p>
      <div class="mt-8 flex flex-wrap justify-center gap-4">
        <a routerLink="/register"><app-button>Create owner account</app-button></a>
        <a routerLink="/docs" class="btn-secondary">Read developer guide</a>
      </div>
    </section>

    <footer class="border-t border-slate-800 py-10">
      <div class="mx-auto max-w-7xl px-6 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-500">
        <span>© 2026 ChainProof — Tamper-evident integrity for website owners</span>
        <div class="flex gap-6">
          <a routerLink="/docs" class="hover:text-white">Docs</a>
          <a routerLink="/pricing" class="hover:text-white">Pricing</a>
        </div>
      </div>
    </footer>
  `,
})
export class LandingPageComponent implements OnInit {
  plans: Plan[] = [
    { name: 'Free', slug: 'free', price_monthly: 0, features: ['1 site', '500 anchors/mo', 'Email alerts'] },
    { name: 'Pro', slug: 'pro', price_monthly: 49, features: ['10 sites', '50k anchors/mo', 'API + webhooks'] },
    { name: 'Enterprise', slug: 'enterprise', price_monthly: 199, features: ['Unlimited', 'SSO', 'Dedicated support'] },
  ];
  ownerValues = [
    { icon: '&#128100;', title: 'Your users stay on your site', desc: 'No ChainProof accounts for customers. You anchor their records from your backend.' },
    { icon: '&#128274;', title: 'Pick what to protect', desc: 'Choose endpoints and fields — chat messages, orders, medical notes, transactions.' },
    { icon: '&#9878;', title: 'Prove tampering', desc: 'Blockchain-backed hashes for audits, compliance, and incident response.' },
  ];
  steps = [
    { n: '01', title: 'Register your API', desc: 'Add your backend URL as a site in the owner dashboard.' },
    { n: '02', title: 'Select endpoints', desc: 'Discover routes or add manually — /api/ask, /orders, etc.' },
    { n: '03', title: 'Anchor on write', desc: 'Developer API: one call after each user record is saved.' },
    { n: '04', title: 'Get alerted', desc: 'Tampering incidents with hash proof and investigation tools.' },
  ];
  constructor(private api: ApiService) {}
  ngOnInit() {
    this.api.getPublic<Plan[]>('/api/v1/plans').subscribe({
      next: p => { if (p?.length) this.plans = p; },
    });
  }
}
