import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (totalPages > 1) {
      <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-800 text-sm">
        <span class="text-slate-500">{{ from }}–{{ to }} of {{ total }}</span>
        <div class="flex items-center gap-1">
          <button type="button" class="btn-ghost px-2 py-1" [disabled]="page <= 1" (click)="go(page - 1)">Prev</button>
          @for (p of pages; track p) {
            <button type="button" class="min-w-[2rem] rounded-lg px-2 py-1 text-sm transition-colors"
              [class]="p === page ? 'bg-brand-600/20 text-brand-300' : 'text-slate-400 hover:bg-slate-800'"
              (click)="go(p)">{{ p }}</button>
          }
          <button type="button" class="btn-ghost px-2 py-1" [disabled]="page >= totalPages" (click)="go(page + 1)">Next</button>
        </div>
      </div>
    }
  `,
})
export class PaginationComponent {
  @Input() page = 1;
  @Input() pageSize = 10;
  @Input() total = 0;
  @Output() pageChange = new EventEmitter<number>();

  get totalPages() { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  get from() { return this.total === 0 ? 0 : (this.page - 1) * this.pageSize + 1; }
  get to() { return Math.min(this.page * this.pageSize, this.total); }

  get pages(): number[] {
    const max = 5;
    let start = Math.max(1, this.page - 2);
    const end = Math.min(this.totalPages, start + max - 1);
    start = Math.max(1, end - max + 1);
    const out: number[] = [];
    for (let i = start; i <= end; i++) out.push(i);
    return out;
  }

  go(p: number) {
    if (p < 1 || p > this.totalPages || p === this.page) return;
    this.pageChange.emit(p);
  }
}
