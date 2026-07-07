import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { PublicNavComponent } from '../../shared/components/public-nav/public-nav.component';

@Component({
  selector: 'app-verify-email-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonComponent, PublicNavComponent],
  template: `
    <app-public-nav />
    <div class="flex min-h-screen items-center justify-center px-4 pt-20 pb-12">
      <div class="w-full max-w-md card text-center">
        @if (verifying) {
          <p class="text-ink-500">Verifying your email…</p>
        } @else if (success) {
          <div class="text-signal-400 text-4xl mb-4">✓</div>
          <h1 class="text-xl font-bold text-white mb-2">Email verified</h1>
          <a routerLink="/dashboard"><app-button [fullWidth]="true">Go to dashboard</app-button></a>
        } @else {
          <h1 class="text-xl font-bold text-white mb-2">Verification failed</h1>
          <p class="text-sm text-ink-500 mb-4">{{ error }}</p>
          <a routerLink="/login" class="text-signal-400 hover:underline text-sm">Sign in</a>
        }
      </div>
    </div>
  `,
})
export class VerifyEmailPageComponent implements OnInit {
  verifying = true;
  success = false;
  error = '';
  constructor(private route: ActivatedRoute, private api: ApiService, private toast: ToastService, private auth: AuthService) {}
  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!token) { this.verifying = false; this.error = 'Missing token'; return; }
    this.api.post('/api/v1/auth/verify-email', { token }).subscribe({
      next: () => { this.verifying = false; this.success = true; this.auth.refreshMe(); },
      error: e => { this.verifying = false; this.error = e.error?.error || 'Invalid link'; },
    });
  }
}
