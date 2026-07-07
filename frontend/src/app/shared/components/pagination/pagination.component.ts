import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (total > 0) {
      <div class="flex flex-col gap-3 px-4 py-3 border-t border-ink-800 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-wrap items-center gap-3">
          <span class="text-ink-500 whitespace-nowrap">{{ from }}–{{ to }} of {{ total }}</span>
          @if (showPageSize) {
            <label class="flex items-center gap-2 text-ink-500">
              <span class="hidden sm:inline">Rows</span>
              <select class="input-field py-1 px-2 text-xs w-auto min-w-[4.5rem]" [ngModel]="pageSize" (ngModelChange)="onPageSizeChange($event)">
                @for (opt of pageSizeOptions; track opt) {
                  <option [value]="opt">{{ opt }}</option>
                }
              </select>
            </label>
          }
        </div>
        @if (totalPages > 1) {
          <div class="flex items-center gap-1 flex-wrap justify-end">
            <button type="button" class="btn-ghost px-2 py-1 text-xs" [disabled]="page <= 1" (click)="go(1)" title="First page" aria-label="First page">«</button>
            <button type="button" class="btn-ghost px-2 py-1 text-xs" [disabled]="page <= 1" (click)="go(page - 1)">Prev</button>
            @for (item of pageItems; track item.label + item.page) {
              @if (item.ellipsis) {
                <span class="px-1 text-ink-500 select-none">…</span>
              } @else {
                <button type="button" class="min-w-[2rem] rounded-lg px-2 py-1 text-xs transition-colors"
                  [class]="item.page === page ? 'bg-signal-500/20 text-signal-400' : 'text-ink-500 hover:bg-ink-800'"
                  (click)="go(item.page!)">{{ item.label }}</button>
              }
            }
            <button type="button" class="btn-ghost px-2 py-1 text-xs" [disabled]="page >= totalPages" (click)="go(page + 1)">Next</button>
            <button type="button" class="btn-ghost px-2 py-1 text-xs" [disabled]="page >= totalPages" (click)="go(totalPages)" title="Last page" aria-label="Last page">»</button>
          </div>
        }
      </div>
    }
  `,
})
export class PaginationComponent {
  @Input() page = 1;
  @Input() pageSize = 10;
  @Input() total = 0;
  @Input() showPageSize = true;
  @Input() pageSizeOptions: number[] = [10, 25, 50, 100, 200, 500];
  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  get totalPages() { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  get from() { return this.total === 0 ? 0 : (this.page - 1) * this.pageSize + 1; }
  get to() { return Math.min(this.page * this.pageSize, this.total); }

  get pageItems(): { label: string; page?: number; ellipsis?: boolean }[] {
    const tp = this.totalPages;
    const cur = this.page;
    if (tp <= 7) {
      return Array.from({ length: tp }, (_, i) => ({ label: String(i + 1), page: i + 1 }));
    }
    const items: { label: string; page?: number; ellipsis?: boolean }[] = [];
    const add = (p: number) => items.push({ label: String(p), page: p });
    const ellipsis = () => items.push({ label: '…', ellipsis: true });

    add(1);
    if (cur > 3) ellipsis();
    const start = Math.max(2, cur - 1);
    const end = Math.min(tp - 1, cur + 1);
    for (let p = start; p <= end; p++) add(p);
    if (cur < tp - 2) ellipsis();
    if (tp > 1) add(tp);
    return items;
  }

  go(p: number) {
    if (p < 1 || p > this.totalPages || p === this.page) return;
    this.pageChange.emit(p);
  }

  onPageSizeChange(size: number) {
    const n = Number(size);
    this.pageSizeChange.emit(n);
    this.pageChange.emit(1);
  }
}
