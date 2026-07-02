import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ButtonComponent } from '../../shared/components/button/button.component';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ButtonComponent],
  template: `
    <div class="flex min-h-screen items-center justify-center px-4">
      <div class="w-full max-w-md card animate-slide-up">
        <div class="mb-6 text-center">
          <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold">CP</div>
          <h1 class="text-2xl font-bold text-white">Welcome back</h1>
          <p class="text-sm text-slate-400">Sign in to your ChainProof dashboard</p>
        </div>
        <form (ngSubmit)="login()" class="space-y-4">
          <div>
            <label class="mb-1 block text-sm text-slate-400">Email</label>
            <input class="input-field" type="email" [(ngModel)]="email" name="email" required />
          </div>
          <div>
            <label class="mb-1 block text-sm text-slate-400">Password</label>
            <input class="input-field" type="password" [(ngModel)]="password" name="password" required />
          </div>
          <app-button type="submit" [fullWidth]="true" [loading]="loading">Sign In</app-button>
        </form>
        <p class="mt-6 text-center text-sm text-slate-400">
          No account? <a routerLink="/register" class="text-brand-400 hover:underline">Register</a>
        </p>
      </div>
    </div>
  `,
})
export class LoginPageComponent {
  email = '';
  password = '';
  loading = false;
  constructor(private auth: AuthService, private toast: ToastService) {}
  login() {
    this.loading = true;
    this.auth.login(this.email, this.password).subscribe({
      next: () => { window.location.href = '/dashboard'; },
      error: e => { this.toast.error(e.error?.error || 'Login failed'); this.loading = false; },
    });
  }
}
