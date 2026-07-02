import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
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
          @for (item of navItems; track item.path) {
            <a [routerLink]="item.path" routerLinkActive="bg-brand-600/15 text-brand-400"
               class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">
              <span [innerHTML]="item.icon"></span>
              {{ item.label }}
            </a>
          }
        </nav>
        <div class="absolute bottom-0 left-0 right-0 border-t border-slate-800 p-4">
          <div class="text-xs text-slate-500">{{ auth.user()?.email }}</div>
          <button (click)="auth.logout()" class="mt-2 text-sm text-slate-400 hover:text-rose-400">Sign out</button>
        </div>
      </aside>

      <!-- Main -->
      <div class="flex flex-1 flex-col lg:pl-64">
        <header class="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-800 bg-slate-950/80 px-6 backdrop-blur-xl">
          <button class="lg:hidden text-slate-400" (click)="sidebarOpen = !sidebarOpen">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <div class="flex-1"></div>
          <span class="badge-info">{{ auth.user()?.org_name || 'Dashboard' }}</span>
        </header>
        <main class="flex-1 p-6 animate-fade-in">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class DashboardLayoutComponent {
  sidebarOpen = false;
  navItems = [
    { path: '/dashboard', label: 'Overview', icon: '&#9632;' },
    { path: '/dashboard/sites', label: 'Sites', icon: '&#127760;' },
    { path: '/dashboard/incidents', label: 'Tampering', icon: '&#9888;' },
    { path: '/dashboard/records', label: 'Records', icon: '&#128274;' },
    { path: '/dashboard/api-keys', label: 'API Keys', icon: '&#128273;' },
    { path: '/dashboard/team', label: 'Team', icon: '&#128101;' },
    { path: '/dashboard/settings', label: 'Settings', icon: '&#9881;' },
  ];
  constructor(public auth: AuthService) {}
}
