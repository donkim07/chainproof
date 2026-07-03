import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex min-h-screen">
      <!-- Sidebar -->
      <aside class="fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-800 bg-slate-900/95 backdrop-blur-xl transition-transform lg:translate-x-0"
             [class.-translate-x-full]="!sidebarOpen" [class.translate-x-0]="sidebarOpen">
        <div class="flex h-16 items-center gap-2 border-b border-slate-800 px-6">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold">CP</div>
          <span class="font-semibold text-white">ChainProof</span>
        </div>
        <nav class="space-y-1 p-4 overflow-y-auto max-h-[calc(100vh-8rem)]">
          @if (auth.isSuperAdmin()) {
            <div class="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Platform</div>
            @for (item of platformNav; track item.path) {
              <a [routerLink]="item.path" routerLinkActive="nav-active" [routerLinkActiveOptions]="{ exact: item.exact ?? false }" class="nav-link">
                <span [innerHTML]="item.icon"></span> {{ item.label }}
              </a>
            }
            @if (auth.hasOrganization()) {
              <div class="my-3 border-t border-slate-800"></div>
              <div class="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Organization</div>
            }
          }
          @for (item of visibleNav; track item.path) {
            <a [routerLink]="item.path" routerLinkActive="nav-active" [routerLinkActiveOptions]="{ exact: item.exact ?? false }" class="nav-link">
              <span [innerHTML]="item.icon"></span>
              {{ item.label }}
              @if (item.badge) { <span class="ml-auto badge-info text-[10px]">{{ item.badge }}</span> }
            </a>
          }
        </nav>
        <div class="absolute bottom-0 left-0 right-0 border-t border-slate-800 p-4">
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600/30 text-sm font-bold text-brand-300">
              {{ initials }}
            </div>
            <div class="min-w-0">
              <div class="truncate text-sm font-medium text-white">{{ auth.user()?.full_name || 'User' }}</div>
              <div class="truncate text-xs text-slate-500">{{ auth.user()?.email }}</div>
            </div>
          </div>
          <button (click)="auth.logout()" class="mt-3 w-full rounded-lg py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition-colors">Sign out</button>
        </div>
      </aside>
      @if (sidebarOpen) {
        <button class="fixed inset-0 z-30 bg-black/40 lg:hidden" (click)="sidebarOpen = false" aria-label="Close menu"></button>
      }

      <!-- Main -->
      <div class="flex flex-1 flex-col lg:pl-64">
        <header class="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-800 bg-slate-950/95 px-4 sm:px-6 backdrop-blur-xl">
          <button class="lg:hidden text-slate-400" (click)="sidebarOpen = !sidebarOpen">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <div class="flex-1">
            <div class="hidden sm:block text-sm text-slate-500">ChainProof</div>
          </div>
          @if (auth.user()?.role) {
            <span class="badge-info capitalize">{{ auth.user()?.role?.replace('_', ' ') }}</span>
          }
          <span class="badge-success hidden md:inline-flex">{{ auth.user()?.org_name || 'Platform' }}</span>
        </header>
        <main class="flex-1 p-4 sm:p-6 animate-fade-in">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host ::ng-deep .nav-link {
      @apply flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-all hover:bg-slate-800 hover:text-white;
    }
    :host ::ng-deep .nav-active {
      @apply bg-brand-600/15 text-brand-400 shadow-inner;
    }
  `],
})
export class DashboardLayoutComponent implements OnInit {
  sidebarOpen = false;
  navItems = [
    { path: '/dashboard', label: 'Overview', icon: '&#9632;', needsOrg: true, exact: true },
    { path: '/dashboard/analytics', label: 'Analytics', icon: '&#128200;', needsOrg: true },
    { path: '/dashboard/sites', label: 'Sites', icon: '&#127760;', needsOrg: true, badge: 'Core' },
    { path: '/dashboard/incidents', label: 'Tampering', icon: '&#9888;', needsOrg: true },
    { path: '/dashboard/records', label: 'Records', icon: '&#128274;', needsOrg: true },
    { path: '/dashboard/api-keys', label: 'API Keys', icon: '&#128273;', needsOrg: true },
    { path: '/dashboard/team', label: 'Team', icon: '&#128101;', needsOrg: true },
    { path: '/dashboard/settings', label: 'Settings', icon: '&#9881;', needsOrg: true },
  ];
  platformNav = [
    { path: '/dashboard/platform', label: 'Overview', icon: '&#9733;', exact: true },
    { path: '/dashboard/platform/organizations', label: 'Organizations', icon: '&#127970;' },
    { path: '/dashboard/platform/users', label: 'Users', icon: '&#128101;' },
    { path: '/dashboard/platform/plans', label: 'Plans', icon: '&#128176;' },
    { path: '/dashboard/platform/audit-logs', label: 'Audit Logs', icon: '&#128221;' },
  ];

  get initials() {
    const name = this.auth.user()?.full_name || this.auth.user()?.email || '?';
    return name.split(/[\s@]+/).slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('');
  }

  get visibleNav() {
    return this.navItems.filter(item => {
      if (item.needsOrg && !this.auth.hasOrganization()) return false;
      return true;
    });
  }

  constructor(public auth: AuthService, private router: Router) {}

  ngOnInit() {
    const orgRoutes = this.navItems.filter(i => i.needsOrg).map(i => i.path);
    const onTenantRoute = orgRoutes.some(p => this.router.url === p || (p !== '/dashboard' && this.router.url.startsWith(p + '/')));
    if (onTenantRoute && !this.auth.hasOrganization()) {
      this.router.navigate(['/dashboard/platform']);
    }
  }
}
