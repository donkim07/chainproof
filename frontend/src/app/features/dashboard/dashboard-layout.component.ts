import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { PermissionService } from '../../core/services/permission.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  needsOrg?: boolean;
  exact?: boolean;
  badge?: string;
  perm?: string;
}

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  template: `
    <div class="flex min-h-screen bg-slate-950">
      <aside class="sidebar-panel fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-800/80 bg-slate-900/95 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0"
        [class.-translate-x-full]="!sidebarOpen()" [class.translate-x-0]="sidebarOpen()">
        <div class="flex h-16 shrink-0 items-center gap-3 border-b border-slate-800/80 px-5">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-emerald-500 text-sm font-bold shadow-lg shadow-brand-600/20">CP</div>
          <div>
            <div class="font-semibold text-white leading-tight">ChainProof</div>
            <div class="text-[10px] uppercase tracking-wider text-slate-500">{{ shellLabel }}</div>
          </div>
        </div>

        <nav class="flex-1 overflow-y-auto p-3 space-y-1">
          @if (auth.isSuperAdmin()) {
            <div class="nav-section-label">Platform</div>
            @for (item of platformNav; track item.path) {
              <a [routerLink]="item.path" routerLinkActive="nav-active" [routerLinkActiveOptions]="{ exact: item.exact ?? false }" class="nav-link" (click)="closeMobile()">
                <span class="nav-icon" [innerHTML]="item.icon"></span>
                <span class="flex-1">{{ item.label }}</span>
              </a>
            }
            @if (auth.hasOrganization()) {
              <div class="my-3 border-t border-slate-800/80"></div>
              <div class="nav-section-label">Organization</div>
            }
          }
          @for (item of visibleNav; track item.path) {
            <a [routerLink]="item.path" routerLinkActive="nav-active" [routerLinkActiveOptions]="{ exact: item.exact ?? false }" class="nav-link" (click)="closeMobile()">
              <span class="nav-icon" [innerHTML]="item.icon"></span>
              <span class="flex-1">{{ item.label }}</span>
              @if (item.badge) { <span class="badge-info text-[10px]">{{ item.badge }}</span> }
            </a>
          }
        </nav>

        <div class="shrink-0 border-t border-slate-800/80 p-4">
          <div class="flex items-center gap-3 rounded-xl bg-slate-800/40 p-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600/25 text-sm font-bold text-brand-300 ring-2 ring-brand-500/20">{{ initials }}</div>
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-medium text-white">{{ auth.user()?.full_name || 'User' }}</div>
              <div class="truncate text-xs text-slate-500">{{ auth.user()?.email }}</div>
            </div>
          </div>
          <button type="button" (click)="auth.logout()" class="mt-3 w-full rounded-lg py-2 text-sm text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-400">Sign out</button>
        </div>
      </aside>

      @if (sidebarOpen()) {
        <button type="button" class="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden" (click)="closeMobile()" aria-label="Close menu"></button>
      }

      <div class="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header class="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-800/80 bg-slate-950/90 px-4 backdrop-blur-xl sm:gap-4 sm:px-6">
          <button type="button" class="rounded-lg p-2 text-slate-400 hover:bg-slate-800 lg:hidden" (click)="sidebarOpen.set(!sidebarOpen())" aria-label="Menu">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>

          <div class="relative hidden flex-1 max-w-md md:block">
            <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-width="2" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"/></svg>
            <input class="input-field py-2 pl-10 text-sm" placeholder="Search dashboard..." [(ngModel)]="searchQ" />
          </div>

          <div class="ml-auto flex items-center gap-2">
            @if (auth.user()?.role) {
              <span class="badge-info hidden capitalize sm:inline-flex">{{ auth.user()?.role?.replace('_', ' ') }}</span>
            }
            <span class="badge-success hidden md:inline-flex">{{ auth.user()?.org_name || 'Platform' }}</span>
            <a routerLink="/docs" class="btn-ghost hidden text-xs sm:inline-flex">Docs</a>
          </div>
        </header>

        <main class="flex-1 p-4 sm:p-6 lg:p-8 animate-fade-in">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    .nav-section-label { @apply px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500; }
    .nav-link { @apply flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-all duration-200 hover:bg-slate-800/80 hover:text-white; }
    .nav-active { @apply bg-brand-600/15 text-brand-300 shadow-inner ring-1 ring-brand-500/20; }
    .nav-icon { @apply w-5 text-center text-base opacity-80; }
    .sidebar-panel { box-shadow: 4px 0 24px rgba(0,0,0,0.25); }
  `],
})
export class DashboardLayoutComponent implements OnInit {
  sidebarOpen = signal(false);
  searchQ = '';

  navItems: NavItem[] = [
    { path: '/dashboard', label: 'Overview', icon: '&#9632;', needsOrg: true, exact: true },
    { path: '/dashboard/analytics', label: 'Analytics', icon: '&#128200;', needsOrg: true, perm: 'integrity:verify' },
    { path: '/dashboard/sites', label: 'Sites', icon: '&#127760;', needsOrg: true, badge: 'Core', perm: 'sites:read' },
    { path: '/dashboard/incidents', label: 'Tampering', icon: '&#9888;', needsOrg: true, perm: 'tampering:read' },
    { path: '/dashboard/records', label: 'Records', icon: '&#128274;', needsOrg: true, perm: 'integrity:verify' },
    { path: '/dashboard/api-keys', label: 'API Keys', icon: '&#128273;', needsOrg: true, perm: 'api_keys:read' },
    { path: '/dashboard/team', label: 'Team', icon: '&#128101;', needsOrg: true, perm: 'team:read' },
    { path: '/dashboard/settings', label: 'Settings', icon: '&#9881;', needsOrg: true, perm: 'settings:read' },
  ];

  platformNav: NavItem[] = [
    { path: '/dashboard/platform', label: 'Overview', icon: '&#9733;', exact: true },
    { path: '/dashboard/platform/organizations', label: 'Clients', icon: '&#127970;' },
    { path: '/dashboard/platform/endpoints', label: 'Endpoints', icon: '&#128279;' },
    { path: '/dashboard/platform/incidents', label: 'Alerts', icon: '&#128680;' },
    { path: '/dashboard/platform/scanner', label: 'Scanner', icon: '&#128269;' },
    { path: '/dashboard/platform/users', label: 'Users', icon: '&#128101;' },
    { path: '/dashboard/platform/plans', label: 'Billing', icon: '&#128176;' },
    { path: '/dashboard/platform/audit-logs', label: 'Audit', icon: '&#128221;' },
  ];

  constructor(public auth: AuthService, private perms: PermissionService, private router: Router) {}

  get shellLabel() {
    return this.auth.isSuperAdmin() && !this.auth.hasOrganization() ? 'Super Admin' : 'Owner Dashboard';
  }

  get initials() {
    const name = this.auth.user()?.full_name || this.auth.user()?.email || '?';
    return name.split(/[\s@]+/).slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('');
  }

  get visibleNav() {
    return this.navItems.filter(item => {
      if (item.needsOrg && !this.auth.hasOrganization()) return false;
      if (item.perm && !this.perms.has(item.perm) && !this.perms.has('*')) return false;
      return true;
    });
  }

  ngOnInit() {
    this.perms.syncFromUser();
    const orgRoutes = this.navItems.filter(i => i.needsOrg).map(i => i.path);
    const onTenantRoute = orgRoutes.some(p => this.router.url === p || (p !== '/dashboard' && this.router.url.startsWith(p + '/')));
    if (onTenantRoute && !this.auth.hasOrganization()) {
      this.router.navigate(['/dashboard/platform']);
    }
  }

  closeMobile() { this.sidebarOpen.set(false); }
}
