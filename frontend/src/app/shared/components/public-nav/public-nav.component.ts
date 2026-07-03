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
    <nav class="fixed top-0 z-50 w-full border-b border-slate-800/60 bg-slate-950/90 backdrop-blur-xl">
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <a routerLink="/" class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-emerald-500 text-sm font-bold shadow-lg shadow-brand-600/30">CP</div>
          <span class="text-lg font-bold text-white">ChainProof</span>
        </a>
        <div class="hidden items-center gap-8 md:flex">
          <a routerLink="/" class="text-sm text-slate-400 hover:text-white transition-colors">Product</a>
          <a routerLink="/pricing" class="text-sm text-slate-400 hover:text-white transition-colors">Pricing</a>
          <a routerLink="/docs" class="text-sm text-slate-400 hover:text-white transition-colors">Docs</a>
        </div>
        <div class="flex items-center gap-3">
          @if (auth.isLoggedIn()) {
            <span class="hidden sm:inline text-xs text-slate-500 truncate max-w-[140px]">{{ auth.user()?.email }}</span>
            <a [routerLink]="auth.postLoginPath()"><app-button variant="secondary">Dashboard</app-button></a>
          } @else {
            <a routerLink="/login" class="btn-ghost">Sign in</a>
            <a routerLink="/register"><app-button>Start Free</app-button></a>
          }
        </div>
      </div>
    </nav>
  `,
})
export class PublicNavComponent {
  constructor(public auth: AuthService) {}
}
