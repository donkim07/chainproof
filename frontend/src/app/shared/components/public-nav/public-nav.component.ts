import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-public-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonComponent],
  template: `
    <nav class="fixed top-0 z-50 w-full border-b border-ink-800/60 bg-ink-950/90 backdrop-blur-xl">
      <div class="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <a routerLink="/" class="flex min-w-0 items-center gap-2 sm:gap-3" (click)="closeMobile()">
          <div class="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-signal-500 to-signal-500 text-xs sm:text-sm font-bold shadow-lg shadow-signal-500/30">CP</div>
          <span class="truncate text-base sm:text-lg font-bold text-white">ChainProof</span>
        </a>

        <!-- Desktop links -->
        <div class="hidden md:flex items-center gap-8">
          <a routerLink="/" class="text-sm text-ink-500 hover:text-white transition-colors">Product</a>
          <a routerLink="/pricing" class="text-sm text-ink-500 hover:text-white transition-colors">Pricing</a>
          <a routerLink="/docs" class="text-sm text-ink-500 hover:text-white transition-colors">Docs</a>
        </div>

        <!-- Desktop auth -->
        <div class="hidden md:flex items-center gap-3 shrink-0">
          @if (auth.isLoggedIn()) {
            <span class="hidden lg:inline text-xs text-ink-500 truncate max-w-[140px]">{{ auth.user()?.email }}</span>
            <a [routerLink]="auth.postLoginPath()"><app-button variant="secondary">Dashboard</app-button></a>
          } @else {
            <a routerLink="/login" class="btn-ghost whitespace-nowrap">Sign in</a>
            <a routerLink="/register"><app-button>Start Free</app-button></a>
          }
        </div>

        <!-- Mobile menu toggle -->
        <button type="button" class="md:hidden inline-flex items-center justify-center rounded-lg p-2 text-slate-300 hover:bg-ink-800 hover:text-white"
          (click)="toggleMobile()" [attr.aria-expanded]="mobileOpen" aria-label="Toggle menu">
          @if (mobileOpen) {
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
          } @else {
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16"/></svg>
          }
        </button>
      </div>

      <!-- Mobile menu panel -->
      @if (mobileOpen) {
        <div class="md:hidden border-t border-ink-800/80 bg-ink-950/98 px-4 py-4 space-y-1">
          <a routerLink="/" class="block rounded-lg px-3 py-3 text-base font-medium text-slate-300 hover:bg-ink-800/60 hover:text-white transition-colors" (click)="closeMobile()">Product</a>
          <a routerLink="/pricing" class="block rounded-lg px-3 py-3 text-base font-medium text-slate-300 hover:bg-ink-800/60 hover:text-white transition-colors" (click)="closeMobile()">Pricing</a>
          <a routerLink="/docs" class="block rounded-lg px-3 py-3 text-base font-medium text-slate-300 hover:bg-ink-800/60 hover:text-white transition-colors" (click)="closeMobile()">Docs</a>
          <div class="my-3 border-t border-ink-800"></div>
          @if (auth.isLoggedIn()) {
            <p class="px-3 py-2 text-xs text-ink-500 truncate">{{ auth.user()?.email }}</p>
            <a [routerLink]="auth.postLoginPath()" (click)="closeMobile()" class="block mt-2">
              <app-button [fullWidth]="true" variant="secondary">Dashboard</app-button>
            </a>
          } @else {
            <a routerLink="/login" (click)="closeMobile()" class="block mt-2">
              <app-button [fullWidth]="true" variant="secondary">Sign in</app-button>
            </a>
            <a routerLink="/register" (click)="closeMobile()" class="block mt-2">
              <app-button [fullWidth]="true">Start Free</app-button>
            </a>
          }
        </div>
      }
    </nav>
  `,
})
export class PublicNavComponent {
  mobileOpen = false;

  constructor(public auth: AuthService) {}

  toggleMobile() {
    this.mobileOpen = !this.mobileOpen;
  }

  closeMobile() {
    this.mobileOpen = false;
  }
}
