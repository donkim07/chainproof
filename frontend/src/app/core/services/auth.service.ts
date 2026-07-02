import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  org_slug?: string;
  org_name?: string;
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

  constructor(private api: ApiService, private router: Router) {
    const token = localStorage.getItem('cp_token');
    if (token) {
      this.isLoggedIn.set(true);
      this.api.get<AuthUser>('/api/v1/auth/me').subscribe({
        next: u => {
          this.user.set(u);
          if (u.org_slug) localStorage.setItem('cp_org_slug', u.org_slug);
        },
        error: () => this.logout(),
      });
    }
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
    this.user.set(res.user);
    this.isLoggedIn.set(true);
    if (res.user.org_slug) {
      localStorage.setItem('cp_org_slug', res.user.org_slug);
    }
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
    localStorage.removeItem('cp_token');
    this.user.set(null);
    this.isLoggedIn.set(false);
    this.router.navigate(['/login']);
  }
}
