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

export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'pricing', component: PricingPageComponent },
  { path: 'docs', component: DocsPageComponent },
  { path: 'login', component: LoginPageComponent },
  { path: 'register', component: RegisterPageComponent },
  {
    path: 'dashboard',
    component: DashboardLayoutComponent,
    children: [
      { path: '', component: DashboardHomeComponent },
      { path: 'analytics', component: AnalyticsPageComponent },
      { path: 'sites', component: SitesPageComponent },
      { path: 'incidents', component: IncidentsPageComponent },
      { path: 'records', component: RecordsPageComponent },
      { path: 'api-keys', component: ApiKeysPageComponent },
      { path: 'team', component: TeamPageComponent },
      { path: 'settings', component: SettingsPageComponent },
      { path: 'platform', component: PlatformOverviewPageComponent },
      { path: 'platform/organizations', component: PlatformOrganizationsPageComponent },
      { path: 'platform/users', component: PlatformUsersPageComponent },
      { path: 'platform/plans', component: PlatformPlansPageComponent },
      { path: 'platform/audit-logs', component: PlatformAuditPageComponent },
    ],
  },
  { path: '**', redirectTo: '' },
];
