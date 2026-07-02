import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../shared/components/button/button.component';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonComponent],
  template: `
    <!-- Nav -->
    <nav class="fixed top-0 z-50 w-full border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-xl">
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div class="flex items-center gap-2">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold">CP</div>
          <span class="text-lg font-bold text-white">ChainProof</span>
        </div>
        <div class="hidden items-center gap-8 md:flex">
          <a routerLink="/" class="text-sm text-slate-400 hover:text-white transition-colors">Home</a>
          <a routerLink="/pricing" class="text-sm text-slate-400 hover:text-white transition-colors">Pricing</a>
          <a routerLink="/docs" class="text-sm text-slate-400 hover:text-white transition-colors">Docs</a>
        </div>
        <div class="flex items-center gap-3">
          <a routerLink="/login" class="btn-ghost">Sign in</a>
          <a routerLink="/register"><app-button>Get Started</app-button></a>
        </div>
      </div>
    </nav>

    <!-- Hero -->
    <section class="relative overflow-hidden pt-32 pb-20">
      <div class="absolute inset-0 -z-10">
        <div class="absolute top-1/4 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-brand-600/10 blur-3xl animate-pulse-soft"></div>
      </div>
      <div class="mx-auto max-w-7xl px-6 text-center animate-fade-in">
        <div class="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-sm text-brand-300">
          <span class="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Blockchain-as-a-Service for Data Integrity
        </div>
        <h1 class="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
          Tamper-proof your database with
          <span class="bg-gradient-to-r from-brand-400 to-emerald-400 bg-clip-text text-transparent"> blockchain proof</span>
        </h1>
        <p class="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
          ChainProof anchors cryptographic hashes of your records on Hyperledger Fabric.
          Detect tampering instantly. Attribute changes to specific users. No blockchain expertise required.
        </p>
        <div class="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a routerLink="/register"><app-button>Start Free Trial</app-button></a>
          <a routerLink="/docs"><app-button variant="secondary">View Documentation</app-button></a>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="py-20 border-t border-slate-800">
      <div class="mx-auto max-w-7xl px-6">
        <h2 class="text-center text-3xl font-bold text-white mb-12">How it works</h2>
        <div class="grid gap-8 md:grid-cols-3">
          @for (f of features; track f.title) {
            <div class="card text-center animate-slide-up hover:border-brand-500/30 transition-colors">
              <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600/20 text-2xl">{{ f.icon }}</div>
              <h3 class="text-lg font-semibold text-white">{{ f.title }}</h3>
              <p class="mt-2 text-sm text-slate-400">{{ f.desc }}</p>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- Two modes -->
    <section class="py-20 bg-slate-900/30">
      <div class="mx-auto max-w-7xl px-6 grid gap-12 lg:grid-cols-2">
        <div class="card border-brand-500/20">
          <div class="badge-info mb-4">For Developers</div>
          <h3 class="text-2xl font-bold text-white">API-First Integration</h3>
          <p class="mt-3 text-slate-400">REST API, SDKs for Go, Python, Node.js, PHP, Java. Anchor hashes with a single call. Full control over what gets protected.</p>
          <pre class="mt-4 rounded-lg bg-slate-950 p-4 text-xs font-mono text-emerald-400 overflow-x-auto">curl -X POST /api/v1/integrity/anchor \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '{{"{"}}"entity_type":"employee","entity_id":"123","payload":{{"{"}}"salary":50000{{"}"}}{{"}"}}'</pre>
        </div>
        <div class="card border-emerald-500/20">
          <div class="badge-success mb-4">For Everyone Else</div>
          <h3 class="text-2xl font-bold text-white">Zero-Code Proxy Mode</h3>
          <p class="mt-3 text-slate-400">Just enter your backend URL. We discover endpoints, let you pick which to protect, and silently capture payloads — like Burp Suite, but for integrity.</p>
          <div class="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <span class="badge-success">No coding</span>
            <span class="badge-info">Auto-discover</span>
            <span class="badge-warning">Silent capture</span>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-20 text-center">
      <h2 class="text-3xl font-bold text-white">Ready to protect your data?</h2>
      <p class="mt-4 text-slate-400">Free tier includes 500 anchors/month. No credit card required.</p>
      <a routerLink="/register" class="mt-8 inline-block"><app-button>Get Started Free</app-button></a>
    </section>

  `,
})
export class LandingPageComponent {
  features = [
    { icon: '&#128274;', title: 'Anchor Hashes', desc: 'SHA-256 hashes of your records stored immutably on Hyperledger Fabric blockchain.' },
    { icon: '&#9888;', title: 'Detect Tampering', desc: 'Continuous monitoring compares live data against blockchain anchors. Instant alerts.' },
    { icon: '&#128270;', title: 'Forensic Attribution', desc: 'When tampering is found, query audit logs to identify who changed what, when, and from where.' },
    { icon: '&#127760;', title: 'Multi-Site', desc: 'Protect multiple websites and APIs from a single dashboard with per-site endpoint control.' },
    { icon: '&#128101;', title: 'Team & Roles', desc: 'Invite your team with granular permissions — admins, developers, security analysts, viewers.' },
    { icon: '&#9889;', title: 'Two Integration Modes', desc: 'Developer API for full control, or zero-code proxy mode for non-technical users.' },
  ];
}
