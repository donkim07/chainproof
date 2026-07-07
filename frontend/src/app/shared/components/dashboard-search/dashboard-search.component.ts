import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { IconComponent } from '../icon/icon.component';

export interface SearchHit {
  type: string;
  label: string;
  path: string;
  meta?: string;
}

const NAV_ITEMS: SearchHit[] = [
  { type: 'nav', label: 'Dashboard', path: '/dashboard' },
  { type: 'nav', label: 'Analytics', path: '/dashboard/analytics' },
  { type: 'nav', label: 'All Sites', path: '/dashboard/sites' },
  { type: 'nav', label: 'Incidents', path: '/dashboard/incidents' },
  { type: 'nav', label: 'Anchored Records', path: '/dashboard/records' },
  { type: 'nav', label: 'API Keys', path: '/dashboard/api-keys' },
  { type: 'nav', label: 'Team & Roles', path: '/dashboard/team' },
  { type: 'nav', label: 'Billing', path: '/dashboard/billing' },
  { type: 'nav', label: 'Notifications', path: '/dashboard/notifications' },
  { type: 'nav', label: 'Settings', path: '/dashboard/settings' },
];

@Component({
  selector: 'app-dashboard-search',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="relative flex-1 max-w-md" (mousedown)="onPanelMouseDown($event)">
      <app-icon name="search" size="sm" extraClass="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500 z-10" />
      <input class="input-field w-full py-2 pl-10 text-sm"
        placeholder="Search routes, sites, records..."
        [(ngModel)]="q"
        (ngModelChange)="onQueryChange($event)"
        (focus)="onFocus()"
        (blur)="onBlur()"
        (keydown)="onKey($event)" />
      @if (open && q.trim().length > 0) {
        <div class="absolute left-0 right-0 top-full z-[100] mt-1 max-h-80 overflow-y-auto rounded-xl border border-ink-700 bg-ink-900 shadow-xl animate-slide-up">
          @if (navHits.length) {
            <div class="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-500">Pages</div>
            @for (h of navHits; track h.path) {
              <button type="button" class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-ink-800"
                (mousedown)="$event.preventDefault(); go(h.path)">
                <app-icon name="home" size="sm" extraClass="text-signal-400 opacity-70" />
                <span class="text-white">{{ h.label }}</span>
              </button>
            }
          }
          @if (loading) {
            <div class="px-4 py-3 text-xs text-ink-500 border-t border-ink-800">Searching data…</div>
          }
          @if (hits.length) {
            <div class="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-500 border-t border-ink-800">Data</div>
            @for (h of hits; track h.type + h.label + h.path) {
              <button type="button" class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-ink-800"
                (mousedown)="$event.preventDefault(); go(h.path)">
                <span class="badge-info text-[10px] capitalize">{{ h.type }}</span>
                <div class="min-w-0 flex-1">
                  <div class="truncate text-white">{{ h.label }}</div>
                  @if (h.meta) { <div class="truncate text-xs text-ink-500">{{ h.meta }}</div> }
                </div>
              </button>
            }
          }
          @if (!loading && !navHits.length && !hits.length) {
            <div class="px-4 py-3 text-xs text-ink-500">No matches for "{{ q.trim() }}"</div>
          }
        </div>
      }
    </div>
  `,
})
export class DashboardSearchComponent {
  @Input() hasOrg = true;
  @Output() navigated = new EventEmitter<void>();

  q = '';
  open = false;
  loading = false;
  hits: SearchHit[] = [];
  navHits: SearchHit[] = [];
  private panelClick = false;
  private api = inject(ApiService);
  private router = inject(Router);
  private search$ = new Subject<string>();

  constructor() {
    this.search$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      switchMap(term => {
        const trimmed = term.trim();
        if (!this.hasOrg || trimmed.length < 2) {
          this.loading = false;
          return of({ results: [] as SearchHit[], nav: [] as SearchHit[] });
        }
        this.loading = true;
        return this.api.get<{ results: SearchHit[]; nav: SearchHit[] }>(
          `/api/v1/dashboard/search?q=${encodeURIComponent(trimmed)}`
        ).pipe(catchError(() => of({ results: [], nav: [] })));
      }),
    ).subscribe(res => {
      this.loading = false;
      this.hits = res.results ?? [];
      if ((res.nav?.length ?? 0) > 0) {
        this.navHits = this.mergeNav(this.navHits, res.nav);
      }
    });
  }

  private filterNav(q: string): SearchHit[] {
    const ql = q.trim().toLowerCase();
    if (!ql) return [];
    return NAV_ITEMS.filter(i => i.label.toLowerCase().includes(ql));
  }

  private mergeNav(local: SearchHit[], remote: SearchHit[]): SearchHit[] {
    const seen = new Set<string>();
    const out: SearchHit[] = [];
    for (const h of [...local, ...remote]) {
      if (seen.has(h.path)) continue;
      seen.add(h.path);
      out.push(h);
    }
    return out;
  }

  onQueryChange(term: string) {
    this.open = true;
    this.navHits = this.filterNav(term);
    this.search$.next(term);
  }

  onFocus() {
    this.open = true;
    if (this.q.trim()) this.navHits = this.filterNav(this.q);
  }

  onPanelMouseDown(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('.absolute')) {
      this.panelClick = true;
    }
  }

  onBlur() {
    setTimeout(() => {
      if (!this.panelClick) this.open = false;
      this.panelClick = false;
    }, 180);
  }

  onKey(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      const first = this.navHits[0] || this.hits[0];
      if (first) this.go(first.path);
    }
    if (e.key === 'Escape') this.open = false;
  }

  go(path: string) {
    this.router.navigate([path]);
    this.q = '';
    this.hits = [];
    this.navHits = [];
    this.open = false;
    this.navigated.emit();
  }
}
