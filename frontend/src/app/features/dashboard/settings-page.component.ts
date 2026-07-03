import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ButtonComponent } from '../../shared/components/button/button.component';

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
  imports: [CommonModule, FormsModule, ButtonComponent],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-white">Settings & Notifications</h1>
        <p class="text-slate-400">Configure alert channels and proxy behavior.</p>
      </div>

      <div class="grid gap-6 lg:grid-cols-2">
        <div class="card space-y-3">
          <h3 class="text-lg font-semibold">Add webhook channel</h3>
          <input class="input-field" placeholder="Name (e.g. Security Slack Hook)" [(ngModel)]="form.name" />
          <input class="input-field" placeholder="Webhook URL" [(ngModel)]="form.url" />
          <label class="inline-flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" [(ngModel)]="form.active" /> Active
          </label>
          <app-button (click)="saveChannel()">Save channel</app-button>
        </div>

        <div class="card">
          <h3 class="mb-3 text-lg font-semibold">Proxy usage tip</h3>
          <p class="text-sm text-slate-400 leading-relaxed">
            Use proxy mode by forwarding your traffic to:
            <code class="mx-1 rounded bg-slate-950 px-2 py-1 text-brand-300">/api/v1/proxy/&lt;siteId&gt;/...</code>.
            ChainProof captures request/response metadata (Burp-style passive logging) while forwarding to your origin.
          </p>
        </div>
      </div>

      <div class="card p-0 overflow-hidden">
        <div class="border-b border-slate-800 p-4 font-medium">Notification channels</div>
        <table class="w-full text-sm">
          <thead class="bg-slate-800/50 text-slate-400">
            <tr>
              <th class="px-4 py-3 text-left">Name</th>
              <th class="px-4 py-3 text-left">Type</th>
              <th class="px-4 py-3 text-left">Status</th>
              <th class="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (item of channels; track item.id) {
              <tr class="border-b border-slate-800">
                <td class="px-4 py-3 text-white">{{ item.name }}</td>
                <td class="px-4 py-3 text-slate-300">{{ item.channel_type }}</td>
                <td class="px-4 py-3"><span [class]="item.active ? 'badge-success' : 'badge-danger'">{{ item.active ? 'Active' : 'Disabled' }}</span></td>
                <td class="px-4 py-3 text-right">
                  <button class="btn-ghost text-xs text-rose-300" (click)="deleteChannel(item.id!)">Delete</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="4" class="px-4 py-8 text-center text-slate-500">No channels configured.</td></tr>
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

  constructor(private api: ApiService, private toast: ToastService) {}

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
}
