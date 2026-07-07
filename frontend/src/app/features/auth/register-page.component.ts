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
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ButtonComponent, PublicNavComponent, SecureInputComponent],
  template: `
    <app-public-nav />
    <div class="relative flex min-h-screen items-center justify-center px-4 pt-20 pb-12">
      <div class="hero-glow absolute inset-0 -z-10 opacity-60"></div>
      <div class="w-full max-w-md">
        <div class="card glow-border">
          <div class="mb-6 text-center">
            <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-500 text-xl font-bold shadow-lg">CP</div>
            <h1 class="text-2xl font-bold text-white">Create your account</h1>
            <p class="text-sm text-slate-400">Free tier — 500 anchors/month, no card required</p>
          </div>
          <form (ngSubmit)="register()" class="space-y-4" autocomplete="on">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-300">Full Name</label>
              <input class="input-field" [(ngModel)]="form.full_name" name="name" required autocomplete="name" />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-300">Organization</label>
              <input class="input-field" [(ngModel)]="form.org_name" name="org" required placeholder="Acme Corp" autocomplete="organization" />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-300">Email</label>
              <input class="input-field" type="email" [(ngModel)]="form.email" name="email" required autocomplete="email" />
            </div>
            <app-secure-input label="Password" [(value)]="form.password" [showStrength]="true"
              autocomplete="new-password" hint="Minimum 8 characters with mixed case recommended." />
            <div class="pt-3">
              <app-button type="submit" [fullWidth]="true" [loading]="loading" [disabled]="form.password.length < 8">Create Account</app-button>
            </div>
          </form>
          <p class="mt-6 text-center text-sm text-slate-400">
            Already have an account? <a routerLink="/login" class="text-brand-400 hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class RegisterPageComponent {
  form = { full_name: '', org_name: '', email: '', password: '' };
  loading = false;
  constructor(private auth: AuthService, private toast: ToastService, private router: Router) {
    effect(() => {
      if (!this.auth.sessionChecked()) return;
      if (this.auth.isLoggedIn()) {
        void this.router.navigateByUrl(this.auth.postLoginPath());
      }
    });
  }

  register() {
    if (this.form.password.length < 8) {
      this.toast.error('Password must be at least 8 characters');
      return;
    }
    this.loading = true;
    this.auth.register({ ...this.form, email: this.form.email.trim() }).subscribe({
      next: () => this.router.navigateByUrl(this.auth.postLoginPath()),
      error: e => { this.toast.error(e.error?.error || 'Registration failed'); this.loading = false; },
    });
  }
}
