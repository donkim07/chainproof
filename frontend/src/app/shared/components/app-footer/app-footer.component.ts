import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <footer class="border-t border-ink-700 bg-ink-950">
      <div class="mx-auto max-w-7xl px-6 py-12 lg:py-16">
        <div class="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div class="lg:col-span-1">
            <div class="flex items-center gap-2.5">
              <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-signal-500 text-sm font-bold text-white">CP</div>
              <span class="font-display text-lg font-semibold text-white">ChainProof</span>
            </div>
            <p class="mt-4 text-sm text-ink-500 leading-relaxed max-w-xs">
              Tamper-proof records on Hyperledger Fabric. Anchor hashes when data saves — detect tampering automatically.
            </p>
          </div>

          <div>
            <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-4">Product</h4>
            <ul class="space-y-2.5 text-sm">
              @for (link of productLinks; track link.path) {
                <li><a [routerLink]="link.path" class="text-ink-500 hover:text-signal-400 transition-colors">{{ link.label }}</a></li>
              }
            </ul>
          </div>

          <div>
            <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-4">Company</h4>
            <ul class="space-y-2.5 text-sm">
              @for (link of companyLinks; track link.path) {
                <li><a [routerLink]="link.path" class="text-ink-500 hover:text-signal-400 transition-colors">{{ link.label }}</a></li>
              }
            </ul>
          </div>

          <div>
            <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-4">Legal</h4>
            <ul class="space-y-2.5 text-sm">
              @for (link of legalLinks; track link.label) {
                <li>
                  @if (link.path) {
                    <a [routerLink]="link.path" class="text-ink-500 hover:text-signal-400 transition-colors">{{ link.label }}</a>
                  } @else {
                    <span class="text-ink-500">{{ link.label }}</span>
                  }
                </li>
              }
            </ul>
          </div>
        </div>

        <div class="mt-12 pt-8 border-t border-ink-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p class="text-xs text-ink-500">© {{ year }} ChainProof. All rights reserved.</p>
          <p class="text-xs text-ink-500 flex items-center gap-2">
            <span class="h-1.5 w-1.5 rounded-full bg-signal-500"></span>
            All anchors secured on Hyperledger Fabric
          </p>
        </div>
      </div>
    </footer>
  `,
})
export class AppFooterComponent {
  @Input() minimal = false;
  year = new Date().getFullYear();

  productLinks = [
    { label: 'Sites & Endpoints', path: '/docs' },
    { label: 'Anchors', path: '/docs' },
    { label: 'Incidents', path: '/docs' },
    { label: 'Pricing', path: '/pricing' },
  ];

  companyLinks = [
    { label: 'Documentation', path: '/docs' },
    { label: 'Pricing', path: '/pricing' },
    { label: 'Sign in', path: '/login' },
    { label: 'Register', path: '/register' },
  ];

  legalLinks = [
    { label: 'Privacy Policy', path: null },
    { label: 'Terms of Service', path: null },
    { label: 'Security', path: '/docs' },
  ];
}
