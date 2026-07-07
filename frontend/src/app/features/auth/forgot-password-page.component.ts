import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { PublicNavComponent } from '../../shared/components/public-nav/public-nav.component';

@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ButtonComponent, PublicNavComponent],
  template: `
    <app-public-nav />
    <div class="flex min-h-screen items-center justify-center px-4 pt-20 pb-12">
      <div class="w-full max-w-md card">
        <h1 class="text-xl font-bold text-white mb-2">Forgot password</h1>
        <p class="text-sm text-ink-500 mb-6">We'll email you a reset link if the account exists.</p>
        <form (ngSubmit)="submit()" class="space-y-4">
          <input class="input-field" type="email" [(ngModel)]="email" name="email" required placeholder="you@company.com" />
          <app-button type="submit" [fullWidth]="true" [loading]="loading">Send reset link</app-button>
        </form>
        <p class="mt-4 text-center text-sm text-ink-500"><a routerLink="/login" class="text-signal-400 hover:underline">Back to sign in</a></p>
      </div>
    </div>
  `,
})
export class ForgotPasswordPageComponent {
  email = '';
  loading = false;
  constructor(private api: ApiService, private toast: ToastService) {}
  submit() {
    this.loading = true;
    this.api.post('/api/v1/auth/forgot-password', { email: this.email.trim() }).subscribe({
      next: () => { this.toast.success('Check your email for reset instructions'); this.loading = false; },
      error: e => { this.toast.error(e.error?.error || 'Failed'); this.loading = false; },
    });
  }
}
