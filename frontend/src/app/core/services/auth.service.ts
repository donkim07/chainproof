import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { PermissionService } from './permission.service';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  org_slug?: string;
  org_name?: string;
  email_verified?: boolean;
  permissions?: string[];
}

export interface AuthResponse {
  token: string;
  expires_at: string;
  user: AuthUser;
  organization?: { id: string; name: string; slug: string; plan_slug: string };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  user = signal<AuthUser | null>(null);
  isLoggedIn = signal(false);
  private _sessionChecked = signal(false);
  readonly sessionChecked = this._sessionChecked.asReadonly();

  constructor(private api: ApiService, private router: Router, private perms: PermissionService) {
    if (localStorage.getItem('cp_token')) {
      this.isLoggedIn.set(true);
      this.refreshMe();
    } else {
      this._sessionChecked.set(true);
    }
  }

  private applyUser(u: AuthUser) {
    this.user.set(u);
    this.isLoggedIn.set(true);
    if (u.role === 'super_admin') {
      this.perms.setPermissions(['*']);
    } else if (u.role === 'owner') {
      this.perms.setPermissions(u.permissions?.length ? u.permissions : ['*']);
    } else {
      this.perms.setPermissions(u.permissions ?? []);
    }
    if (u.org_slug) localStorage.setItem('cp_org_slug', u.org_slug);
  }

  /** Update the in-memory user without a round-trip (e.g. after email verify). */
  patchUser(patch: Partial<AuthUser>) {
    const current = this.user();
    if (!current) return;
    this.applyUser({ ...current, ...patch });
  }

  markEmailVerified() {
    this.patchUser({ email_verified: true });
    sessionStorage.removeItem('cp_verify_nudge');
  }

  refreshMe() {
    this.api.get<AuthUser>('/api/v1/auth/me').subscribe({
      next: u => {
        this.applyUser(u);
        this._sessionChecked.set(true);
      },
      error: err => {
        if (err.status === 401) {
          this.clearSession(false);
          if (this.router.url.startsWith('/dashboard')) {
            this.router.navigate(['/login']);
          }
        }
        this._sessionChecked.set(true);
      },
    });
  }

  login(email: string, password: string) {
    return this.api.post<AuthResponse>('/api/v1/auth/login', { email, password }).pipe(
      tap(res => this.setSession(res))
    );
  }

  register(data: { email: string; password: string; full_name: string; org_name: string }) {
    return this.api.post<AuthResponse>('/api/v1/auth/register', data).pipe(
      tap(res => this.setSession(res))
    );
  }

  private setSession(res: AuthResponse) {
    localStorage.setItem('cp_token', res.token);
    if (res.organization?.slug) {
      localStorage.setItem('cp_org_slug', res.organization.slug);
    } else {
      localStorage.removeItem('cp_org_slug');
    }
    this.applyUser(res.user);
    this._sessionChecked.set(true);
    // Refresh profile in background; never wipe a fresh login on /me failure.
    this.api.get<AuthUser>('/api/v1/auth/me').subscribe({
      next: u => this.applyUser(u),
      error: () => {},
    });
  }

  hasOrganization(): boolean {
    const u = this.user();
    return !!(u?.org_slug || localStorage.getItem('cp_org_slug'));
  }

  isSuperAdmin(): boolean {
    return this.user()?.role === 'super_admin';
  }

  postLoginPath(): string {
    return this.hasOrganization() ? '/dashboard' : '/dashboard/platform';
  }

  logout() {
    this.clearSession(true);
  }

  handleUnauthorized() {
    this.clearSession(true);
  }

  private clearSession(navigateToLogin: boolean) {
    localStorage.removeItem('cp_token');
    localStorage.removeItem('cp_org_slug');
    this.user.set(null);
    this.isLoggedIn.set(false);
    this.perms.clear();
    if (navigateToLogin) {
      this.router.navigate(['/login']);
    }
  }
}
