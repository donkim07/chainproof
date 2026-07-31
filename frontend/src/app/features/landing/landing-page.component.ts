import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../shared/components/button/button.component';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonComponent],
  template: `
    <nav class="fixed top-0 z-50 w-full border-b border-slate-800/60 bg-slate-950/85 backdrop-blur-xl">
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-emerald-500 text-sm font-bold shadow-lg shadow-brand-600/30">CP</div>
          <span class="text-lg font-bold text-white">ChainProof</span>
        </div>
        <div class="hidden items-center gap-8 md:flex">
          <a routerLink="/" class="text-sm text-slate-400 hover:text-white transition-colors">Product</a>
          <a routerLink="/pricing" class="text-sm text-slate-400 hover:text-white transition-colors">Pricing</a>
          <a routerLink="/docs" class="text-sm text-slate-400 hover:text-white transition-colors">Docs</a>
        </div>
        <div class="flex items-center gap-3">
          <a routerLink="/login" class="btn-ghost">Sign in</a>
          <a routerLink="/register"><app-button>Start Free</app-button></a>
        </div>
      </div>
    </nav>

    <section class="relative overflow-hidden pt-28 pb-24 lg:pt-36">
      <div class="hero-glow absolute inset-0 -z-10"></div>
      <div class="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-2">
        <div class="animate-fade-in">
          <div class="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-300">
            <span class="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Blockchain-backed data integrity BaaS
          </div>
          <h1 class="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl leading-[1.1]">
            Know when your data was
            <span class="gradient-text"> tampered with — and prove it.</span>
          </h1>
          <p class="mt-6 text-lg text-slate-400 leading-relaxed">
            Point ChainProof at any backend. We discover endpoints, anchor cryptographic hashes on Hyperledger Fabric,
            and alert you the moment responses change. Developer API or zero-code proxy — your choice.
          </p>
          <div class="mt-8 flex flex-wrap gap-4">
            <a routerLink="/register"><app-button>Get Started Free</app-button></a>
            <a routerLink="/docs"><app-button variant="secondary">Explore Docs</app-button></a>
          </div>
          <div class="mt-10 flex flex-wrap gap-6 text-sm text-slate-500">
            @for (t of trust; track t) {
              <span class="flex items-center gap-2"><span class="text-emerald-400">&#10003;</span> {{ t }}</span>
            }
          </div>
        </div>

        <div class="relative animate-slide-up">
          <div class="card glow-border p-0 overflow-hidden">
            <div class="border-b border-slate-700/80 px-4 py-3 flex items-center gap-2 bg-slate-900/80">
              <span class="h-2.5 w-2.5 rounded-full bg-rose-400"></span>
              <span class="h-2.5 w-2.5 rounded-full bg-amber-400"></span>
              <span class="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
              <span class="ml-2 text-xs text-slate-500 font-mono">chainproof monitor</span>
            </div>
            <div class="p-5 space-y-4 font-mono text-xs">
              <div class="rounded-lg bg-slate-950/80 p-3 border border-slate-800">
                <div class="text-slate-500">POST /api/v1/integrity/anchor</div>
                <div class="mt-2 text-emerald-400">&#10003; hash anchored on Fabric</div>
              </div>
              <div class="rounded-lg bg-slate-950/80 p-3 border border-rose-500/30">
                <div class="text-slate-500">GET /api/users/42 — scheduled check</div>
                <div class="mt-2 text-rose-400">&#9888; hash mismatch detected</div>
                <div class="mt-1 text-amber-300">attribution: user admin&#64;acme.io · 14:32 UTC</div>
              </div>
              <div class="flex gap-2 flex-wrap">
                <span class="badge-info">OpenAPI discovery</span>
                <span class="badge-success">Proxy capture</span>
                <span class="badge-warning">Tamper alerts</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="border-y border-slate-800/80 bg-slate-900/40 py-12">
      <div class="mx-auto grid max-w-7xl gap-8 px-6 sm:grid-cols-2 lg:grid-cols-4">
        @for (m of metrics; track m.label) {
          <div class="text-center">
            <div class="text-3xl font-bold gradient-text">{{ m.value }}</div>
            <div class="mt-1 text-sm text-slate-400">{{ m.label }}</div>
          </div>
        }
      </div>
    </section>

    <section class="py-24">
      <div class="mx-auto max-w-7xl px-6">
        <div class="text-center mb-14">
          <h2 class="text-3xl font-bold text-white">How ChainProof works</h2>
          <p class="mt-3 text-slate-400">From URL to tamper-proof monitoring in four steps</p>
        </div>
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          @for (step of steps; track step.n; let i = $index) {
            <div class="card relative hover:border-brand-500/40 transition-all group">
              <div class="absolute -top-3 left-4 badge-info font-mono">{{ step.n }}</div>
              <div class="mt-4 text-2xl mb-3" [innerHTML]="step.icon"></div>
              <h3 class="font-semibold text-white">{{ step.title }}</h3>
              <p class="mt-2 text-sm text-slate-400 leading-relaxed">{{ step.desc }}</p>
            </div>
          }
        </div>
      </div>
    </section>

    <section class="py-24 bg-slate-900/30 border-t border-slate-800">
      <div class="mx-auto max-w-7xl px-6 grid gap-10 lg:grid-cols-2">
        <div class="card border-brand-500/25 hover:border-brand-500/50 transition-colors">
          <div class="badge-info mb-3">Developer API</div>
          <h3 class="text-2xl font-bold text-white">Full programmatic control</h3>
          <p class="mt-3 text-slate-400">REST endpoints, SDKs, API keys with scoped permissions. Anchor exactly what matters.</p>
          <pre class="mt-5 rounded-xl bg-slate-950 p-4 text-xs font-mono text-emerald-400 overflow-x-auto border border-slate-800">curl -X POST /api/v1/integrity/anchor \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '{{"{"}}"entity_type":"employee","entity_id":"123"{{"}"}}'</pre>
        </div>
        <div class="card border-emerald-500/25 hover:border-emerald-500/50 transition-colors">
          <div class="badge-success mb-3">Proxy Mode</div>
          <h3 class="text-2xl font-bold text-white">No code required</h3>
          <p class="mt-3 text-slate-400">Enter your backend URL. We scan OpenAPI, robots.txt, JS bundles & common paths — then you pick endpoints to protect.</p>
          <ul class="mt-5 space-y-2 text-sm text-slate-300">
            <li class="flex gap-2"><span class="text-brand-400">&#9679;</span> Swagger / OpenAPI auto-parse</li>
            <li class="flex gap-2"><span class="text-brand-400">&#9679;</span> LinkFinder-style JS route extraction</li>
            <li class="flex gap-2"><span class="text-brand-400">&#9679;</span> Manual endpoint add + traffic capture</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="py-24">
      <div class="mx-auto max-w-7xl px-6">
        <h2 class="text-center text-3xl font-bold text-white mb-12">Built for security teams & builders</h2>
        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          @for (f of features; track f.title) {
            <div class="card hover:-translate-y-1 transition-transform duration-300">
              <div class="mb-3 text-2xl" [innerHTML]="f.icon"></div>
              <h3 class="font-semibold text-white">{{ f.title }}</h3>
              <p class="mt-2 text-sm text-slate-400">{{ f.desc }}</p>
            </div>
          }
        </div>
      </div>
    </section>

    <section class="py-20 border-t border-slate-800">
      <div class="mx-auto max-w-3xl px-6 text-center">
        <h2 class="text-3xl font-bold text-white">Start protecting your backends today</h2>
        <p class="mt-4 text-slate-400">Free tier: 500 anchors/month. No credit card. Multi-tenant isolation built in.</p>
        <div class="mt-8 flex flex-wrap justify-center gap-4">
          <a routerLink="/register"><app-button>Create Free Account</app-button></a>
          <a routerLink="/pricing" class="btn-secondary">View Pricing</a>
        </div>
      </div>
    </section>

    <footer class="border-t border-slate-800 py-10">
      <div class="mx-auto max-w-7xl px-6 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-500">
        <span>&copy; 2026 ChainProof — Tamper-evident monitoring on Hyperledger Fabric</span>
        <div class="flex gap-6">
          <a routerLink="/docs" class="hover:text-white transition-colors">Docs</a>
          <a routerLink="/pricing" class="hover:text-white transition-colors">Pricing</a>
          <a routerLink="/login" class="hover:text-white transition-colors">Sign in</a>
        </div>
      </div>
    </footer>
  `,
})
export class LandingPageComponent {
  trust = ['Hyperledger Fabric anchoring', 'Per-tenant isolated DBs', 'SSRF-safe discovery', 'Role-based access'];
  metrics = [
    { value: '< 50ms', label: 'Avg anchor latency' },
    { value: '256-bit', label: 'SHA-256 integrity hashes' },
    { value: '2 modes', label: 'API + Proxy integration' },
    { value: '24/7', label: 'Continuous monitoring' },
  ];
  steps = [
    { n: '01', icon: '&#127760;', title: 'Connect', desc: 'Register your backend URL or integrate via API key.' },
    { n: '02', icon: '&#128269;', title: 'Discover', desc: 'OpenAPI, wordlists, JS crawl — or add endpoints manually.' },
    { n: '03', icon: '&#128274;', title: 'Protect', desc: 'Select endpoints. We hash payloads and anchor on-chain.' },
    { n: '04', icon: '&#9888;', title: 'Alert', desc: 'Tampering triggers webhooks, incidents, and forensic attribution.' },
  ];
  features = [
    { icon: '&#128274;', title: 'Blockchain Anchoring', desc: 'Immutable SHA-256 proofs on Hyperledger Fabric — verifiable by anyone.' },
    { icon: '&#9888;', title: 'Tamper Detection', desc: 'Scheduled re-fetch compares live responses against anchored hashes.' },
    { icon: '&#128270;', title: 'Forensic Attribution', desc: 'Trace who changed what using audit logs and proxy capture history.' },
    { icon: '&#127760;', title: 'Multi-Site Dashboard', desc: 'Manage many backends, endpoints, and integration modes in one place.' },
    { icon: '&#128101;', title: 'Team & RBAC', desc: 'Owners, admins, developers, analysts, viewers — granular permissions.' },
    { icon: '&#9889;', title: 'Real-time Alerts', desc: 'Webhook channels for Slack, custom URLs, and incident workflows.' },
  ];
}
