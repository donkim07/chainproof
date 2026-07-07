import { Component, effect } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { PublicNavComponent } from '../../shared/components/public-nav/public-nav.component';
import { SecureInputComponent } from '../../shared/components/secure-input/secure-input.component';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ButtonComponent, PublicNavComponent, SecureInputComponent],
  template: `
    <app-public-nav />
    <div class="relative flex min-h-screen items-center justify-center px-4 pt-20 pb-12">
      <div class="hero-glow absolute inset-0 -z-10 opacity-60"></div>
      <div class="w-full max-w-md">
        <div class="card glow-border">
          <div class="mb-6 text-center">
            <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-signal-500 to-signal-500 text-xl font-bold shadow-lg shadow-signal-500/25">CP</div>
            <h1 class="text-2xl font-bold text-white">Welcome back</h1>
            <p class="text-sm text-ink-500">Secure sign-in to your dashboard</p>
          </div>
          <form (ngSubmit)="login()" class="space-y-4" autocomplete="on">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-300">Email</label>
              <input class="input-field" type="email" [(ngModel)]="email" name="email" required
                placeholder="you@company.com" autocomplete="email" inputmode="email" />
            </div>
            <app-secure-input label="Password" [(value)]="password" autocomplete="current-password" />
            <div class="pt-3">
              <app-button type="submit" [fullWidth]="true" [loading]="loading">Sign In</app-button>
            </div>
          </form>
          <p class="mt-6 text-center text-sm text-ink-500">
            No account? <a routerLink="/register" class="text-signal-400 hover:underline">Create one free</a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class LoginPageComponent {
  email = '';
  password = '';
  loading = false;
  constructor(private auth: AuthService, private toast: ToastService, private router: Router) {
    effect(() => {
      if (!this.auth.sessionChecked()) return;
      if (this.auth.isLoggedIn()) {
        void this.router.navigateByUrl(this.auth.postLoginPath());
      }
    });
  }

  login() {
    this.loading = true;
    this.auth.login(this.email.trim(), this.password).subscribe({
      next: () => this.router.navigateByUrl(this.auth.postLoginPath()),
      error: e => { this.toast.error(e.error?.error || 'Login failed'); this.loading = false; },
    });
  }
}
