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
import { PlatformPageComponent } from './features/dashboard/platform-page.component';
import { TeamPageComponent } from './features/dashboard/team-page.component';
import { SettingsPageComponent } from './features/dashboard/settings-page.component';
import { RecordsPageComponent } from './features/dashboard/records-page.component';

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
      { path: 'sites', component: SitesPageComponent },
      { path: 'incidents', component: IncidentsPageComponent },
      { path: 'records', component: RecordsPageComponent },
      { path: 'api-keys', component: ApiKeysPageComponent },
      { path: 'platform', component: PlatformPageComponent },
      { path: 'team', component: TeamPageComponent },
      { path: 'settings', component: SettingsPageComponent },
    ],
  },
  { path: '**', redirectTo: '' },
];
