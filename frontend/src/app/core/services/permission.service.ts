import { Injectable, signal, computed } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private permissions = signal<string[]>([]);

  readonly can = computed(() => {
    const perms = this.permissions();
    const set = new Set(perms);
    return (code: string) => set.has('*') || set.has(code);
  });

  constructor(private auth: AuthService) {
    this.syncFromUser();
  }

  syncFromUser() {
    const u = this.auth.user();
    if (u?.role === 'super_admin') {
      this.permissions.set(['*']);
    } else {
      this.permissions.set(u?.permissions ?? []);
    }
  }

  load() {
    return this.auth.user() ? Promise.resolve() : Promise.resolve();
  }

  has(code: string): boolean {
    return this.can()(code);
  }

  hasAny(...codes: string[]): boolean {
    return codes.some(c => this.has(c));
  }
}
