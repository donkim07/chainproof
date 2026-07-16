import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { PermissionService } from '../../core/services/permission.service';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ThemeService } from '../../core/services/theme.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { DashboardSearchComponent } from '../../shared/components/dashboard-search/dashboard-search.component';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  needsOrg?: boolean;
  exact?: boolean;
  badge?: string;
  perm?: string;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
  platformOnly?: boolean;
  orgOnly?: boolean;
}

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, IconComponent, DashboardSearchComponent],
  template: `
    <div class="flex min-h-screen bg-ink-950">
      <aside class="sidebar-panel fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-ink-800 bg-ink-900 transition-transform duration-300 lg:translate-x-0"
        [class.-translate-x-full]="!sidebarOpen()" [class.translate-x-0]="sidebarOpen()">
        <div class="flex h-16 shrink-0 items-center gap-3 border-b border-ink-800 px-5">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-signal-500 text-sm font-bold text-white">CP</div>
          <div>
            <div class="font-display font-semibold text-white leading-tight">ChainProof</div>
            <div class="text-[10px] uppercase tracking-wider text-ink-500">{{ shellLabel }}</div>
          </div>
        </div>

        <nav class="flex-1 overflow-y-auto p-3 space-y-1">
          @for (group of visibleGroups; track group.id) {
            <button type="button" class="nav-section-toggle" (click)="toggleGroup(group.id)" [attr.aria-expanded]="!collapsedGroups.has(group.id)">
              <span class="nav-section-label flex-1 text-left">{{ group.label }}</span>
              <app-icon [name]="collapsedGroups.has(group.id) ? 'plus' : 'check'" size="sm" extraClass="text-ink-500 opacity-60 rotate-45" />
            </button>
            @if (!collapsedGroups.has(group.id)) {
              <div class="space-y-0.5 mb-2 animate-slide-up">
                @for (item of group.items; track item.path) {
                  @if (isItemVisible(item)) {
                    <a [routerLink]="item.path" routerLinkActive="nav-active" [routerLinkActiveOptions]="{ exact: item.exact ?? false }" class="nav-link" (click)="onNavClick(group.id)">
                      <app-icon [name]="item.icon" size="sm" extraClass="opacity-80" />
                      <span class="flex-1 truncate">{{ item.label }}</span>
                      @if (item.badge) { <span class="badge-info text-[10px]">{{ item.badge }}</span> }
                    </a>
                  }
                }
              </div>
            }
          }
        </nav>

        <div class="shrink-0 border-t border-ink-800 p-4">
          <div class="flex items-center gap-2 mb-3">
            <a routerLink="/dashboard/notifications" class="relative flex h-10 w-10 items-center justify-center rounded-xl bg-ink-800/60 text-ink-500 hover:text-signal-400 transition-colors" (click)="closeMobile()">
              <app-icon name="bell" size="sm" />
              @if (unreadCount > 0) {
                <span class="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-alert-500 px-1 text-[10px] font-bold text-white">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
              }
            </a>
            <div class="flex flex-1 items-center gap-3 rounded-xl bg-ink-800/60 p-3 min-w-0">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-signal-500/20 text-sm font-bold text-signal-400 ring-2 ring-signal-500/20">{{ initials }}</div>
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-medium text-white">{{ auth.user()?.full_name || 'User' }}</div>
                <div class="truncate text-xs text-ink-500">{{ auth.user()?.email }}</div>
              </div>
            </div>
          </div>
          <button type="button" (click)="auth.logout()" class="w-full rounded-lg py-2 text-sm text-ink-500 transition-colors hover:bg-alert-500/10 hover:text-alert-400">Sign out</button>
        </div>
      </aside>

      @if (sidebarOpen()) {
        <button type="button" class="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden" (click)="closeMobile()" aria-label="Close menu"></button>
      }

      <div class="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header class="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-ink-800 bg-ink-950/90 px-4 backdrop-blur-xl sm:gap-4 sm:px-6">
          <button type="button" class="rounded-lg p-2 text-ink-500 hover:bg-ink-800 lg:hidden" (click)="sidebarOpen.set(!sidebarOpen())" aria-label="Menu">
            <app-icon name="inbox" size="md" />
          </button>

          @if (auth.hasOrganization()) {
            <app-dashboard-search class="hidden md:flex flex-1 max-w-md" [hasOrg]="true" (navigated)="closeMobile()" />
          }

          <div class="ml-auto flex items-center gap-2 min-w-0">
            @if (auth.hasOrganization()) {
              <app-dashboard-search class="flex md:hidden shrink-0 max-w-[140px] sm:max-w-[180px]" [hasOrg]="true" (navigated)="closeMobile()" />
            }
            @if (auth.user()?.role) {
              <span class="badge-info hidden capitalize sm:inline-flex">{{ auth.user()?.role?.replace('_', ' ') }}</span>
            }
            <span class="badge-success hidden md:inline-flex">{{ auth.user()?.org_name || 'Platform' }}</span>
            <a routerLink="/docs" class="btn-ghost hidden text-xs sm:inline-flex">Docs</a>
            <button type="button" class="rounded-lg p-2 text-ink-500 transition-colors hover:bg-ink-800 hover:text-white"
              (click)="theme.toggle()" [attr.aria-label]="theme.theme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'" title="Toggle theme">
              <app-icon [name]="theme.theme() === 'dark' ? 'sun' : 'moon'" size="md" />
            </button>
          </div>
        </header>

        <main class="flex-1 p-4 sm:p-6 lg:p-8">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    .nav-section-label { @apply text-[10px] font-semibold uppercase tracking-wider text-ink-500; }
    .nav-section-toggle { @apply flex w-full items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-ink-800/50; }
    .nav-link { @apply flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-500 transition-all duration-200 hover:bg-ink-800 hover:text-white border-l-2 border-transparent; }
    .nav-active { @apply bg-signal-500/15 text-signal-400 border-signal-500 shadow-inner; }
    .sidebar-panel { box-shadow: 4px 0 24px rgb(0 0 0 / var(--cp-shadow-elev)); }
  `],
})
export class DashboardLayoutComponent implements OnInit {
  sidebarOpen = signal(false);
  collapsedGroups = new Set<string>();
  unreadCount = 0;

  orgNavGroups: NavGroup[] = [
    {
      id: 'overview',
      label: 'Overview',
      orgOnly: true,
      items: [
        { path: '/dashboard', label: 'Dashboard', icon: 'home', needsOrg: true, exact: true },
        { path: '/dashboard/analytics', label: 'Analytics', icon: 'chart', needsOrg: true, perm: 'integrity:verify' },
      ],
    },
    {
      id: 'sites',
      label: 'Sites & Endpoints',
      orgOnly: true,
      items: [
        { path: '/dashboard/sites', label: 'All Sites', icon: 'globe', needsOrg: true, badge: 'Core', perm: 'sites:read' },
        { path: '/dashboard/network', label: 'Live Network', icon: 'radar', needsOrg: true, badge: 'New', perm: 'integrity:verify' },
        { path: '/dashboard/incidents', label: 'Incidents', icon: 'alert', needsOrg: true, perm: 'tampering:read' },
        { path: '/dashboard/records', label: 'Anchored Records', icon: 'database', needsOrg: true, perm: 'integrity:verify' },
      ],
    },
    {
      id: 'access',
      label: 'Access & Billing',
      orgOnly: true,
      items: [
        { path: '/dashboard/api-keys', label: 'API Keys', icon: 'key', needsOrg: true, perm: 'api_keys:read' },
        { path: '/dashboard/billing', label: 'Billing & Plans', icon: 'credit-card', needsOrg: true, perm: 'billing:read' },
        { path: '/dashboard/team', label: 'Team & Roles', icon: 'users', needsOrg: true, perm: 'team:read' },
        { path: '/dashboard/notifications', label: 'Notifications', icon: 'bell', needsOrg: true, perm: 'settings:read' },
        { path: '/dashboard/settings', label: 'Settings', icon: 'settings', needsOrg: true, perm: 'settings:read' },
      ],
    },
  ];

  platformNavGroups: NavGroup[] = [
    {
      id: 'platform-overview',
      label: 'Overview',
      platformOnly: true,
      items: [
        { path: '/dashboard/platform', label: 'Command Center', icon: 'star', exact: true },
      ],
    },
    {
      id: 'platform-orgs',
      label: 'Organizations',
      platformOnly: true,
      items: [
        { path: '/dashboard/platform/organizations', label: 'All Organizations', icon: 'building' },
        { path: '/dashboard/platform/users', label: 'Platform Users', icon: 'users' },
      ],
    },
    {
      id: 'platform-monitoring',
      label: 'Monitoring',
      platformOnly: true,
      items: [
        { path: '/dashboard/platform/endpoints', label: 'Protected Endpoints', icon: 'link' },
        { path: '/dashboard/platform/incidents', label: 'Alert Inbox', icon: 'bell' },
        { path: '/dashboard/platform/scanner', label: 'Scanner Status', icon: 'radar' },
      ],
    },
    {
      id: 'platform-billing',
      label: 'Billing & Usage',
      platformOnly: true,
      items: [
        { path: '/dashboard/platform/plans', label: 'Subscription Plans', icon: 'credit-card' },
        { path: '/dashboard/platform/billing', label: 'Revenue', icon: 'dollar' },
      ],
    },
    {
      id: 'platform-config',
      label: 'Platform Settings',
      platformOnly: true,
      items: [
        { path: '/dashboard/platform/settings', label: 'System Health', icon: 'settings' },
        { path: '/dashboard/platform/wordlists', label: 'Wordlists', icon: 'file' },
        { path: '/dashboard/platform/audit-logs', label: 'Audit Logs', icon: 'audit' },
      ],
    },
  ];

  constructor(
    public auth: AuthService,
    public theme: ThemeService,
    private perms: PermissionService,
    private router: Router,
    private api: ApiService,
    private toast: ToastService,
  ) {}

  get shellLabel() {
    return this.auth.isSuperAdmin() && !this.auth.hasOrganization() ? 'Super Admin' : 'Owner Dashboard';
  }

  get initials() {
    const name = this.auth.user()?.full_name || this.auth.user()?.email || '?';
    return name.split(/[\s@]+/).slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('');
  }

  get visibleGroups(): NavGroup[] {
    const groups: NavGroup[] = [];
    if (this.auth.isSuperAdmin()) {
      groups.push(...this.platformNavGroups);
      if (this.auth.hasOrganization()) {
        groups.push(...this.orgNavGroups);
      }
    } else {
      groups.push(...this.orgNavGroups);
    }
    return groups;
  }

  isItemVisible(item: NavItem): boolean {
    if (item.needsOrg && !this.auth.hasOrganization()) return false;
    if (item.perm && !this.perms.has(item.perm) && !this.perms.has('*')) return false;
    return true;
  }

  toggleGroup(id: string) {
    if (this.collapsedGroups.has(id)) this.collapsedGroups.delete(id);
    else this.collapsedGroups.add(id);
    this.collapsedGroups = new Set(this.collapsedGroups);
  }

  onNavClick(activeGroupId: string) {
    this.collapsedGroups = new Set(
      this.visibleGroups.map(g => g.id).filter(id => id !== activeGroupId)
    );
    this.closeMobile();
  }

  ngOnInit() {
    const orgPaths = this.orgNavGroups.flatMap(g => g.items).filter(i => i.needsOrg).map(i => i.path);
    const onTenantRoute = orgPaths.some(p => this.router.url === p || (p !== '/dashboard' && this.router.url.startsWith(p + '/')));
    if (onTenantRoute && !this.auth.hasOrganization()) {
      this.router.navigate(['/dashboard/platform']);
    }
    this.initCollapsedGroups();
    this.loadUnread();
    this.checkEmailVerification();
  }

  private initCollapsedGroups() {
    const url = this.router.url.split('?')[0];
    const activeId = this.visibleGroups.find(g =>
      g.items.some(item => this.isItemVisible(item) && (url === item.path || (item.path !== '/dashboard' && url.startsWith(item.path + '/'))))
    )?.id;
    this.collapsedGroups = new Set(
      this.visibleGroups.map(g => g.id).filter(id => id !== activeId)
    );
  }

  private loadUnread() {
    if (!this.auth.hasOrganization()) return;
    this.api.get<{ count: number }>('/api/v1/inbox/unread-count').subscribe({
      next: r => this.unreadCount = r.count,
      error: () => {},
    });
  }

  private checkEmailVerification() {
    const u = this.auth.user();
    if (!u || u.email_verified !== false) return;
    if (sessionStorage.getItem('cp_verify_nudge') === '1') return;
    sessionStorage.setItem('cp_verify_nudge', '1');
    this.toast.warning('Please verify your email within 4 days. Check your inbox or resend from Settings.');
  }

  closeMobile() { this.sidebarOpen.set(false); }
}
