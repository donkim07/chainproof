import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LiveNetworkVisualizerComponent } from '../../shared/components/live-network-visualizer/live-network-visualizer.component';

interface Site {
  id: string;
  name: string;
  base_url: string;
  status: string;
}

interface RecordItem {
  id: string;
  site_id?: string;
  entity_type: string;
  entity_id: string;
  record_hash: string;
  blockchain_status: string;
  created_at: string;
}

interface IncidentItem {
  id: string;
  site_id?: string;
  entity_type: string;
  entity_id: string;
  severity: string;
  detected_at: string;
}

interface NetworkStatus {
  gateway_reachable: boolean;
  dev_mock: boolean;
  channel: string;
  chaincode: string;
  orderer_nodes: string[];
  peer_nodes: string[];
  checked_at: string;
}

interface DashboardStats {
  total_sites: number;
  protected_endpoints: number;
  anchored_records: number;
  open_incidents: number;
  tampered_records: number;
}

const POLL_MS = 5000;

@Component({
  selector: 'app-network-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, StatCardComponent, ButtonComponent, EmptyStateComponent, LiveNetworkVisualizerComponent],
  template: `
    <app-page-header title="Live Network" subtitle="Real-time view of the Hyperledger Fabric ledger anchoring your site's data." badge="Blockchain">
      <div actions class="flex items-center gap-2">
        @if (sites.length > 1) {
          <select class="input-field w-48 text-sm" [(ngModel)]="selectedSiteId" (ngModelChange)="onSiteChange()">
            <option value="">All connected sites</option>
            @for (s of sites; track s.id) {
              <option [value]="s.id">{{ s.name }}</option>
            }
          </select>
        }
        <app-button variant="secondary" [loading]="checking" (click)="runIntegrityCheck()">Run integrity check</app-button>
      </div>
    </app-page-header>

    @if (!loaded) {
      <div class="text-ink-500 text-sm">Loading network…</div>
    } @else if (!sites.length) {
      <app-empty-state title="No sites connected yet" description="Connect a backend (like eardhi-backend) to see its anchors flow through the live Fabric network here." icon="globe" />
    } @else {
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <app-stat-card label="Connected sites" [value]="stats?.total_sites ?? 0" icon="globe" />
        <app-stat-card label="Anchored records" [value]="stats?.anchored_records ?? 0" icon="database" />
        <app-stat-card label="Open incidents" [value]="stats?.open_incidents ?? 0" icon="alert"
          [color]="(stats?.open_incidents ?? 0) > 0 ? 'text-alert-400' : 'text-white'" />
        <app-stat-card label="Tampered records" [value]="stats?.tampered_records ?? 0" icon="shield"
          [color]="(stats?.tampered_records ?? 0) > 0 ? 'text-alert-400' : 'text-white'" />
        <app-stat-card label="Gateway" [value]="gatewayLabel" icon="radar"
          [color]="networkStatus?.gateway_reachable ? 'text-signal-400' : 'text-alert-400'"
          [hint]="networkStatus?.dev_mock ? 'dev mock mode' : ''" />
      </div>

      <app-live-network-visualizer
        [siteName]="selectedSiteName"
        [channel]="networkStatus?.channel || ''"
        [chaincode]="networkStatus?.chaincode || ''"
        [peerNodes]="networkStatus?.peer_nodes || []" />

      <p class="mt-3 text-xs text-ink-500">
        Orderer: {{ (networkStatus?.orderer_nodes || []).join(', ') || '—' }} ·
        Peer: {{ (networkStatus?.peer_nodes || []).join(', ') || '—' }}
      </p>
    }
  `,
})
export class NetworkPageComponent implements OnInit, OnDestroy {
  @ViewChild(LiveNetworkVisualizerComponent) visualizer?: LiveNetworkVisualizerComponent;

  sites: Site[] = [];
  selectedSiteId = '';
  stats: DashboardStats | null = null;
  networkStatus: NetworkStatus | null = null;
  loaded = false;
  checking = false;

  private pollTimer?: ReturnType<typeof setInterval>;
  private seenRecordIds = new Set<string>();
  private seenIncidentIds = new Set<string>();
  private recordsSeeded = false;
  private incidentsSeeded = false;

  constructor(private api: ApiService, private toast: ToastService) {}

  get gatewayLabel(): string {
    if (!this.networkStatus) return '—';
    if (this.networkStatus.dev_mock) return 'Mock';
    return this.networkStatus.gateway_reachable ? 'Live' : 'Unreachable';
  }

  get selectedSiteName(): string {
    if (!this.selectedSiteId) return this.sites[0]?.name || 'Your Backend';
    return this.sites.find(s => s.id === this.selectedSiteId)?.name || 'Your Backend';
  }

  /** Resolves which connected site an anchor/incident actually came from — falls
   *  back to the currently selected site when the row predates site tracking. */
  private siteNameFor(siteId?: string): string {
    if (siteId) {
      const match = this.sites.find(s => s.id === siteId);
      if (match) return match.name;
    }
    return this.selectedSiteName;
  }

  ngOnInit(): void {
    this.api.get<Site[]>('/api/v1/sites').subscribe({
      next: sites => {
        this.sites = sites || [];
        this.loaded = true;
        if (this.sites.length) this.startPolling();
      },
      error: () => { this.loaded = true; },
    });
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  onSiteChange(): void {
    this.seenRecordIds.clear();
    this.seenIncidentIds.clear();
    this.recordsSeeded = false;
    this.incidentsSeeded = false;
    this.visualizer?.clearAlert();
    this.poll();
  }

  runIntegrityCheck(): void {
    this.checking = true;
    this.api.post<{ message: string; verified: number; tampered: number }>('/api/v1/integrity/scan-tamper', {}).subscribe({
      next: res => {
        this.toast.success(res.message || `Checked — ${res.verified} verified, ${res.tampered} tampered`);
        this.checking = false;
        this.poll();
      },
      error: e => { this.toast.error(e.error?.error || 'Check failed'); this.checking = false; },
    });
  }

  private startPolling(): void {
    this.poll();
    this.pollTimer = setInterval(() => this.poll(), POLL_MS);
  }

  private poll(): void {
    this.api.get<DashboardStats>('/api/v1/dashboard/stats').subscribe(s => (this.stats = s));
    this.api.get<NetworkStatus>('/api/v1/network/status').subscribe(s => (this.networkStatus = s));

    this.api.get<RecordItem[]>('/api/v1/integrity/records?limit=25').subscribe(records => {
      const scoped = this.scopeToSite(records || []);
      const wasSeeded = this.recordsSeeded;
      const fresh = scoped.filter(r => !this.seenRecordIds.has(r.id));
      scoped.forEach(r => this.seenRecordIds.add(r.id));
      this.recordsSeeded = true;
      if (wasSeeded) {
        [...fresh].reverse().forEach(r => {
          const site = this.siteNameFor(r.site_id);
          this.visualizer?.emit(`${site}: anchored ${r.entity_type} · ${r.record_hash.slice(0, 10)}…`, false, site);
        });
      }
    });

    this.api.get<IncidentItem[]>('/api/v1/tampering?limit=25').subscribe(incidents => {
      const scoped = this.scopeToSite(incidents || []);
      const wasSeeded = this.incidentsSeeded;
      const fresh = scoped.filter(i => !this.seenIncidentIds.has(i.id));
      scoped.forEach(i => this.seenIncidentIds.add(i.id));
      this.incidentsSeeded = true;
      if (wasSeeded) {
        [...fresh].reverse().forEach(i => {
          const site = this.siteNameFor(i.site_id);
          this.visualizer?.emit(`⚠ ${site}: tamper detected — ${i.entity_type} · ${i.entity_id}`, true, site);
        });
      }
    });
  }

  private scopeToSite<T extends { site_id?: string }>(items: T[]): T[] {
    if (!this.selectedSiteId) return items;
    return items.filter(i => i.site_id === this.selectedSiteId);
  }
}
