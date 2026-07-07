import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { IconComponent } from '../icon/icon.component';

export interface SearchHit {
  type: string;
  label: string;
  path: string;
  meta?: string;
}

@Component({
  selector: 'app-dashboard-search',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="relative flex-1 max-w-md">
      <app-icon name="search" size="sm" extraClass="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500 z-10" />
      <input class="input-field w-full py-2 pl-10 text-sm"
        placeholder="Search routes, sites, records..."
        [(ngModel)]="q"
        (ngModelChange)="onQueryChange($event)"
        (focus)="open = true"
        (blur)="onBlur()"
        (keydown)="onKey($event)" />
      @if (open && (hits.length || navHits.length)) {
        <div class="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-xl border border-ink-700 bg-ink-900 shadow-xl animate-slide-up">
          @if (navHits.length) {
            <div class="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-500">Pages</div>
            @for (h of navHits; track h.path) {
              <button type="button" class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-ink-800"
                (mousedown)="go(h.path)">
                <app-icon name="home" size="sm" extraClass="text-signal-400 opacity-70" />
                <span class="text-white">{{ h.label }}</span>
              </button>
            }
          }
          @if (hits.length) {
            <div class="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-500 border-t border-ink-800">Data</div>
            @for (h of hits; track h.type + h.label) {
              <button type="button" class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-ink-800"
                (mousedown)="go(h.path)">
                <span class="badge-info text-[10px] capitalize">{{ h.type }}</span>
                <div class="min-w-0 flex-1">
                  <div class="truncate text-white">{{ h.label }}</div>
                  @if (h.meta) { <div class="truncate text-xs text-ink-500">{{ h.meta }}</div> }
                </div>
              </button>
            }
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
  hits: SearchHit[] = [];
  navHits: SearchHit[] = [];
  private api = inject(ApiService);
  private router = inject(Router);
  private search$ = new Subject<string>();

  constructor() {
    this.search$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(term => {
        if (!this.hasOrg || term.trim().length < 2) return of({ results: [], nav: [] });
        return this.api.get<{ results: SearchHit[]; nav: SearchHit[] }>(`/api/v1/dashboard/search?q=${encodeURIComponent(term)}`);
      }),
    ).subscribe(res => {
      this.hits = res.results ?? [];
      this.navHits = res.nav ?? [];
    });
  }

  onQueryChange(term: string) {
    this.open = true;
    this.search$.next(term);
  }

  onBlur() {
    setTimeout(() => this.open = false, 150);
  }

  onKey(e: KeyboardEvent) {
    this.open = true;
    this.search$.next(this.q);
    if (e.key === 'Enter' && (this.navHits[0] || this.hits[0])) {
      this.go((this.navHits[0] || this.hits[0]).path);
    }
    if (e.key === 'Escape') this.open = false;
  }

  go(path: string) {
    this.router.navigate([path]);
    this.q = '';
    this.open = false;
    this.navigated.emit();
  }
}
