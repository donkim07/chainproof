import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { PublicNavComponent } from '../../shared/components/public-nav/public-nav.component';
import { SecureInputComponent } from '../../shared/components/secure-input/secure-input.component';

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, PublicNavComponent, SecureInputComponent],
  template: `
    <app-public-nav />
    <div class="flex min-h-screen items-center justify-center px-4 pt-20 pb-12">
      <div class="w-full max-w-md card">
        <h1 class="text-xl font-bold text-white mb-2">Reset password</h1>
        <form (ngSubmit)="submit()" class="space-y-4">
          <app-secure-input label="New password" [(value)]="password" autocomplete="new-password" />
          <app-button type="submit" [fullWidth]="true" [loading]="loading" [disabled]="!token">Update password</app-button>
        </form>
      </div>
    </div>
  `,
})
export class ResetPasswordPageComponent implements OnInit {
  token = '';
  password = '';
  loading = false;
  constructor(private route: ActivatedRoute, private api: ApiService, private toast: ToastService, private router: Router) {}
  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
  }
  submit() {
    if (!this.token || this.password.length < 8) return;
    this.loading = true;
    this.api.post('/api/v1/auth/reset-password', { token: this.token, new_password: this.password }).subscribe({
      next: () => { this.toast.success('Password updated'); void this.router.navigate(['/login']); },
      error: e => { this.toast.error(e.error?.error || 'Reset failed'); this.loading = false; },
    });
  }
}
