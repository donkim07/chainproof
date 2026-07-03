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
        <nav class="space-y-1 p-4">
          @if (auth.isSuperAdmin() && !auth.hasOrganization()) {
            <a routerLink="/dashboard/platform" routerLinkActive="nav-active"
               class="nav-link">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              Platform Admin
            </a>
          }
          @for (item of visibleNav; track item.path) {
            <a [routerLink]="item.path" routerLinkActive="nav-active" class="nav-link">
              <span [innerHTML]="item.icon"></span>
              {{ item.label }}
              @if (item.badge) {
                <span class="ml-auto badge-info text-[10px]">{{ item.badge }}</span>
              }
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
          <div class="flex-1"></div>
          <span class="badge-info">{{ auth.user()?.org_name || 'Dashboard' }}</span>
        </header>
        <main class="flex-1 p-4 sm:p-6 animate-fade-in">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class DashboardLayoutComponent implements OnInit {
  sidebarOpen = false;
  navItems = [
    { path: '/dashboard', label: 'Overview', icon: '&#9632;', needsOrg: true },
    { path: '/dashboard/sites', label: 'Sites', icon: '&#127760;', needsOrg: true },
    { path: '/dashboard/incidents', label: 'Tampering', icon: '&#9888;', needsOrg: true },
    { path: '/dashboard/records', label: 'Records', icon: '&#128274;', needsOrg: true },
    { path: '/dashboard/api-keys', label: 'API Keys', icon: '&#128273;', needsOrg: true },
    { path: '/dashboard/team', label: 'Team', icon: '&#128101;', needsOrg: true },
    { path: '/dashboard/settings', label: 'Settings', icon: '&#9881;', needsOrg: true },
    { path: '/dashboard/platform', label: 'Platform', icon: '&#9733;', needsOrg: false, superAdminOnly: true },
  ];

  get visibleNav() {
    return this.navItems.filter(item => {
      if (item.superAdminOnly && !this.auth.isSuperAdmin()) return false;
      if (item.needsOrg && !this.auth.hasOrganization()) return false;
      return true;
    });
  }

  constructor(public auth: AuthService, private router: Router) {}

  ngOnInit() {
    const onTenantRoute = this.navItems.some(i => i.needsOrg && this.router.url.startsWith(i.path) && i.path !== '/dashboard/platform');
    if (onTenantRoute && !this.auth.hasOrganization()) {
      this.router.navigate(['/dashboard/platform']);
    }
  }
}
