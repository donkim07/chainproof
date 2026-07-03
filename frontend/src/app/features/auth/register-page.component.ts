import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { PublicNavComponent } from '../../shared/components/public-nav/public-nav.component';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ButtonComponent, PublicNavComponent],
  template: `
    <app-public-nav />
    <div class="flex min-h-screen items-center justify-center px-4 pt-20 pb-12">
      <div class="w-full max-w-md">
        <div class="card animate-slide-up glow-border">
          <div class="mb-6 text-center">
            <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-500 text-xl font-bold shadow-lg">CP</div>
            <h1 class="text-2xl font-bold text-white">Create your account</h1>
            <p class="text-sm text-slate-400">Free tier — 500 anchors/month, no card required</p>
          </div>
          <form (ngSubmit)="register()" class="space-y-4">
            <div>
              <label class="mb-1 block text-sm text-slate-400">Full Name</label>
              <input class="input-field" [(ngModel)]="form.full_name" name="name" required />
            </div>
            <div>
              <label class="mb-1 block text-sm text-slate-400">Organization</label>
              <input class="input-field" [(ngModel)]="form.org_name" name="org" required placeholder="Acme Corp" />
            </div>
            <div>
              <label class="mb-1 block text-sm text-slate-400">Email</label>
              <input class="input-field" type="email" [(ngModel)]="form.email" name="email" required />
            </div>
            <div>
              <label class="mb-1 block text-sm text-slate-400">Password</label>
              <input class="input-field" type="password" [(ngModel)]="form.password" name="password" required minlength="8" />
            </div>
            <app-button type="submit" [fullWidth]="true" [loading]="loading">Create Account</app-button>
          </form>
          <p class="mt-6 text-center text-sm text-slate-400">
            Already have an account? <a routerLink="/login" class="text-brand-400 hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class RegisterPageComponent implements OnInit {
  form = { full_name: '', org_name: '', email: '', password: '' };
  loading = false;
  constructor(private auth: AuthService, private toast: ToastService, private router: Router) {}

  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.router.navigateByUrl(this.auth.postLoginPath());
    }
  }

  register() {
    this.loading = true;
    this.auth.register(this.form).subscribe({
      next: () => { this.router.navigateByUrl(this.auth.postLoginPath()); },
      error: e => { this.toast.error(e.error?.error || 'Registration failed'); this.loading = false; },
    });
  }
}
