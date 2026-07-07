import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

interface NotificationChannel {
  id?: string;
  name: string;
  channel_type: string;
  config: Record<string, unknown>;
  events: string[];
  active: boolean;
}

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, PageHeaderComponent],
  template: `
    <app-page-header title="Settings & Notifications" subtitle="Configure alert channels and proxy behavior." badge="Organization"></app-page-header>

    @if (auth.user() && auth.user()!.email_verified === false) {
      <div class="card mb-6 border-warn-500/30 bg-warn-500/5">
        <h3 class="font-semibold text-warn-500 mb-1">Verify your email</h3>
        <p class="text-sm text-ink-500 mb-3">You have up to 4 days to verify. Unverified accounts may lose access.</p>
        <app-button (click)="resendVerification()" [loading]="resending">Resend verification email</app-button>
      </div>
    }

    <div class="grid gap-6 lg:grid-cols-2 items-start">
      <div class="card space-y-4">
        <h3 class="text-lg font-semibold text-white">Add webhook channel</h3>
        <input class="input-field" placeholder="Name (e.g. Security Slack Hook)" [(ngModel)]="form.name" />
        <input class="input-field" placeholder="Webhook URL" [(ngModel)]="form.url" />
        <label class="inline-flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" [(ngModel)]="form.active" /> Active
        </label>
        <div class="form-actions !border-0 !pt-2 !mt-0">
          <app-button (click)="saveChannel()">Save channel</app-button>
        </div>
      </div>

      <div class="card">
        <h3 class="mb-3 text-lg font-semibold text-white">Proxy usage tip</h3>
        <p class="text-sm text-ink-500 leading-relaxed">
          Use proxy mode by forwarding your traffic to:
          <code class="mx-1 rounded bg-ink-950 px-2 py-1 text-signal-400">/api/v1/proxy/&lt;siteId&gt;/...</code>.
          ChainProof captures request/response metadata (Burp-style passive logging) while forwarding to your origin.
        </p>
      </div>
    </div>

    <div class="table-shell mt-6">
      <div class="table-toolbar">
        <span class="text-sm font-medium text-white">Notification channels</span>
        <span class="text-xs text-ink-500">{{ channels.length }} configured</span>
      </div>
      <div class="overflow-x-auto">
        <table class="cp-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Status</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (item of channels; track item.id) {
              <tr class="border-t border-ink-800 hover:bg-ink-800/30">
                <td class="text-white">{{ item.name }}</td>
                <td class="text-ink-500">{{ item.channel_type }}</td>
                <td><span [class]="item.active ? 'badge-success' : 'badge-danger'">{{ item.active ? 'Active' : 'Disabled' }}</span></td>
                <td class="text-right">
                  <button class="btn-ghost text-xs text-alert-400" (click)="deleteChannel(item.id!)">Delete</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="4" class="py-8 text-center text-ink-500">No channels configured.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class SettingsPageComponent implements OnInit {
  channels: NotificationChannel[] = [];
  form = { name: '', url: '', active: true };
  resending = false;

  constructor(private api: ApiService, private toast: ToastService, public auth: AuthService) {}

  ngOnInit(): void {
    this.reload();
  }

  reload() {
    this.api.get<NotificationChannel[]>('/api/v1/notifications/channels').subscribe({
      next: x => (this.channels = x),
      error: () => (this.channels = []),
    });
  }

  saveChannel() {
    this.api.post('/api/v1/notifications/channels', {
      name: this.form.name,
      channel_type: 'webhook',
      config: { url: this.form.url },
      events: ['tamper_detected'],
      active: this.form.active,
    }).subscribe({
      next: () => {
        this.toast.success('Channel saved');
        this.form = { name: '', url: '', active: true };
        this.reload();
      },
      error: e => this.toast.error(e.error?.error || 'Failed to save channel'),
    });
  }

  deleteChannel(id: string) {
    this.api.delete(`/api/v1/notifications/channels/${id}`).subscribe({
      next: () => {
        this.toast.success('Channel deleted');
        this.reload();
      },
      error: () => this.toast.error('Failed to delete channel'),
    });
  }

  resendVerification() {
    this.resending = true;
    this.api.post('/api/v1/auth/resend-verification', {}).subscribe({
      next: () => { this.toast.success('Verification email sent'); this.resending = false; },
      error: e => { this.toast.error(e.error?.error || 'Failed'); this.resending = false; },
    });
  }
}
