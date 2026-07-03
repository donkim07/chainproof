import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { PublicNavComponent } from '../../shared/components/public-nav/public-nav.component';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ButtonComponent, PublicNavComponent],
  template: `
    <app-public-nav />
    <div class="flex min-h-screen items-center justify-center px-4 pt-20 pb-12">
      <div class="w-full max-w-md">
        <div class="card animate-slide-up glow-border">
          <div class="mb-6 text-center">
            <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-500 text-xl font-bold shadow-lg">CP</div>
            <h1 class="text-2xl font-bold text-white">Welcome back</h1>
            <p class="text-sm text-slate-400">Sign in to your ChainProof dashboard</p>
          </div>
          <form (ngSubmit)="login()" class="space-y-4">
            <div>
              <label class="mb-1 block text-sm text-slate-400">Email</label>
              <input class="input-field" type="email" [(ngModel)]="email" name="email" required placeholder="you@company.com" />
            </div>
            <div>
              <label class="mb-1 block text-sm text-slate-400">Password</label>
              <input class="input-field" type="password" [(ngModel)]="password" name="password" required />
            </div>
            <app-button type="submit" [fullWidth]="true" [loading]="loading">Sign In</app-button>
          </form>
          <p class="mt-6 text-center text-sm text-slate-400">
            No account? <a routerLink="/register" class="text-brand-400 hover:underline">Create one free</a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class LoginPageComponent implements OnInit {
  email = '';
  password = '';
  loading = false;
  constructor(private auth: AuthService, private toast: ToastService, private router: Router) {}

  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.router.navigateByUrl(this.auth.postLoginPath());
    }
  }

  login() {
    this.loading = true;
    this.auth.login(this.email, this.password).subscribe({
      next: () => { this.router.navigateByUrl(this.auth.postLoginPath()); },
      error: e => { this.toast.error(e.error?.error || 'Login failed'); this.loading = false; },
    });
  }
}
