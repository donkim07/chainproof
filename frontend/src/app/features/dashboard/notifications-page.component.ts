import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { IconComponent } from '../../shared/components/icon/icon.component';

interface InboxItem {
  id: string;
  title: string;
  body: string;
  category: string;
  link?: string;
  read_at?: string;
  created_at: string;
}

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent, IconComponent],
  template: `
    <app-page-header title="Notifications" subtitle="Alerts, billing reminders, and system updates." badge="Inbox" />

    <div class="space-y-3">
      @for (n of items; track n.id) {
        <div class="card flex gap-4 transition-colors"
          [ngClass]="!n.read_at ? 'border-signal-500/30 bg-signal-500/5' : ''">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            [class]="n.read_at ? 'bg-ink-800 text-ink-500' : 'bg-signal-500/20 text-signal-400'">
            <app-icon [name]="iconFor(n.category)" size="sm" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-2">
              <h3 class="font-medium text-white">{{ n.title }}</h3>
              <span class="text-xs text-ink-500 shrink-0">{{ n.created_at | date:'short' }}</span>
            </div>
            <p class="mt-1 text-sm text-ink-500">{{ n.body }}</p>
            <div class="mt-2 flex gap-3">
              @if (n.link) {
                <a [routerLink]="n.link" class="text-xs text-signal-400 hover:underline">View</a>
              }
              @if (!n.read_at) {
                <button type="button" class="text-xs text-ink-500 hover:text-white" (click)="markRead(n)">Mark read</button>
              }
            </div>
          </div>
        </div>
      } @empty {
        <div class="card py-16 text-center text-ink-500">No notifications yet.</div>
      }
    </div>
  `,
})
export class NotificationsPageComponent implements OnInit {
  items: InboxItem[] = [];
  constructor(private api: ApiService) {}
  ngOnInit() { this.reload(); }
  reload() { this.api.get<InboxItem[]>('/api/v1/inbox').subscribe(i => this.items = i); }
  markRead(n: InboxItem) {
    this.api.patch(`/api/v1/inbox/${n.id}/read`, {}).subscribe(() => { n.read_at = new Date().toISOString(); });
  }
  iconFor(cat: string) {
    if (cat === 'alert' || cat === 'security') return 'alert';
    if (cat === 'billing') return 'credit-card';
    return 'bell';
  }
}
