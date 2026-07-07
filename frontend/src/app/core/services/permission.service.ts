import { Injectable, signal, computed } from '@angular/core';

/** Tenant permission codes — set by AuthService after login (no AuthService dependency). */
@Injectable({ providedIn: 'root' })
export class PermissionService {
  private permissions = signal<string[]>([]);

  readonly can = computed(() => {
    const perms = this.permissions();
    const set = new Set(perms);
    return (code: string) => set.has('*') || set.has(code);
  });

  setPermissions(perms: string[]) {
    this.permissions.set(perms);
  }

  clear() {
    this.permissions.set([]);
  }

  has(code: string): boolean {
    return this.can()(code);
  }

  hasAny(...codes: string[]): boolean {
    return codes.some(c => this.has(c));
  }
}
