import { Routes } from '@angular/router';
import { LandingPageComponent } from './features/landing/landing-page.component';
import { PricingPageComponent } from './features/landing/pricing-page.component';
import { DocsPageComponent } from './features/docs/docs-page.component';
import { LoginPageComponent } from './features/auth/login-page.component';
import { RegisterPageComponent } from './features/auth/register-page.component';
import { DashboardLayoutComponent } from './features/dashboard/dashboard-layout.component';
import { DashboardHomeComponent } from './features/dashboard/dashboard-home.component';
import { SitesPageComponent } from './features/dashboard/sites-page.component';
import { IncidentsPageComponent } from './features/dashboard/incidents-page.component';
import { ApiKeysPageComponent } from './features/dashboard/api-keys-page.component';
import { TeamPageComponent } from './features/dashboard/team-page.component';
import { SettingsPageComponent } from './features/dashboard/settings-page.component';
import { RecordsPageComponent } from './features/dashboard/records-page.component';
import { AnalyticsPageComponent } from './features/dashboard/analytics-page.component';
import { PlatformOverviewPageComponent } from './features/dashboard/platform-overview-page.component';
import { PlatformOrganizationsPageComponent } from './features/dashboard/platform-organizations-page.component';
import { PlatformUsersPageComponent } from './features/dashboard/platform-users-page.component';
import { PlatformPlansPageComponent } from './features/dashboard/platform-plans-page.component';
import { PlatformAuditPageComponent } from './features/dashboard/platform-audit-page.component';
import { PlatformScannerPageComponent } from './features/dashboard/platform-scanner-page.component';
import { PlatformEndpointsPageComponent } from './features/dashboard/platform-endpoints-page.component';
import { PlatformIncidentsPageComponent } from './features/dashboard/platform-incidents-page.component';
import { PlatformWordlistsPageComponent } from './features/dashboard/platform-wordlists-page.component';
import { PlatformBillingPageComponent } from './features/dashboard/platform-billing-page.component';
import { PlatformSettingsPageComponent } from './features/dashboard/platform-settings-page.component';
import { authGuard, orgGuard, superAdminGuard } from './core/guards/auth.guard';
import { ForgotPasswordPageComponent } from './features/auth/forgot-password-page.component';
import { ResetPasswordPageComponent } from './features/auth/reset-password-page.component';
import { VerifyEmailPageComponent } from './features/auth/verify-email-page.component';
import { BillingPageComponent } from './features/dashboard/billing-page.component';
import { NotificationsPageComponent } from './features/dashboard/notifications-page.component';

export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'pricing', component: PricingPageComponent },
  { path: 'docs', component: DocsPageComponent },
  { path: 'login', component: LoginPageComponent },
  { path: 'register', component: RegisterPageComponent },
  { path: 'forgot-password', component: ForgotPasswordPageComponent },
  { path: 'reset-password', component: ResetPasswordPageComponent },
  { path: 'verify-email', component: VerifyEmailPageComponent },
  {
    path: 'dashboard',
    component: DashboardLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: DashboardHomeComponent, canActivate: [orgGuard] },
      { path: 'analytics', component: AnalyticsPageComponent, canActivate: [orgGuard] },
      { path: 'sites', component: SitesPageComponent, canActivate: [orgGuard] },
      { path: 'incidents', component: IncidentsPageComponent, canActivate: [orgGuard] },
      { path: 'records', component: RecordsPageComponent, canActivate: [orgGuard] },
      { path: 'api-keys', component: ApiKeysPageComponent, canActivate: [orgGuard] },
      { path: 'billing', component: BillingPageComponent, canActivate: [orgGuard] },
      { path: 'notifications', component: NotificationsPageComponent, canActivate: [orgGuard] },
      { path: 'team', component: TeamPageComponent, canActivate: [orgGuard] },
      { path: 'settings', component: SettingsPageComponent, canActivate: [orgGuard] },
      { path: 'platform', component: PlatformOverviewPageComponent, canActivate: [superAdminGuard] },
      { path: 'platform/organizations', component: PlatformOrganizationsPageComponent, canActivate: [superAdminGuard] },
      { path: 'platform/endpoints', component: PlatformEndpointsPageComponent, canActivate: [superAdminGuard] },
      { path: 'platform/incidents', component: PlatformIncidentsPageComponent, canActivate: [superAdminGuard] },
      { path: 'platform/scanner', component: PlatformScannerPageComponent, canActivate: [superAdminGuard] },
      { path: 'platform/users', component: PlatformUsersPageComponent, canActivate: [superAdminGuard] },
      { path: 'platform/plans', component: PlatformPlansPageComponent, canActivate: [superAdminGuard] },
      { path: 'platform/billing', component: PlatformBillingPageComponent, canActivate: [superAdminGuard] },
      { path: 'platform/settings', component: PlatformSettingsPageComponent, canActivate: [superAdminGuard] },
      { path: 'platform/wordlists', component: PlatformWordlistsPageComponent, canActivate: [superAdminGuard] },
      { path: 'platform/audit-logs', component: PlatformAuditPageComponent, canActivate: [superAdminGuard] },
    ],
  },
  { path: '**', redirectTo: '' },
];
