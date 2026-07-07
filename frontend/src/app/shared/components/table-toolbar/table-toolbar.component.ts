import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-table-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="table-toolbar">
      <div class="flex flex-wrap items-center gap-3 flex-1 min-w-0">
        <ng-content select="[search]"></ng-content>
        <ng-content></ng-content>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        @if (showColumnToggle && columns.length) {
          <div class="relative">
            <button type="button" class="btn-ghost text-xs" (click)="showCols = !showCols">Columns</button>
            @if (showCols) {
              <div class="absolute right-0 top-full mt-1 z-20 min-w-[10rem] rounded-lg border border-ink-700 bg-ink-900 p-2 shadow-xl">
                @for (col of columns; track col.key) {
                  <label class="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-300 hover:bg-ink-800 rounded cursor-pointer">
                    <input type="checkbox" [checked]="visibleKeys.has(col.key)" (change)="toggleCol(col.key)" />
                    {{ col.label }}
                  </label>
                }
              </div>
            }
          </div>
        }
        @if (showExport) {
          <button type="button" class="btn-ghost text-xs" (click)="exportClick.emit()">Export CSV</button>
        }
        @if (countLabel) {
          <span class="text-sm text-ink-500 whitespace-nowrap">{{ countLabel }}</span>
        }
      </div>
    </div>
  `,
})
export class TableToolbarComponent {
  @Input() columns: { key: string; label: string }[] = [];
  @Input() visibleKeys = new Set<string>();
  @Input() showColumnToggle = true;
  @Input() showExport = true;
  @Input() countLabel = '';
  @Output() visibleKeysChange = new EventEmitter<Set<string>>();
  @Output() exportClick = new EventEmitter<void>();

  showCols = false;

  toggleCol(key: string) {
    const next = new Set(this.visibleKeys);
    if (next.has(key)) {
      if (next.size > 1) next.delete(key);
    } else {
      next.add(key);
    }
    this.visibleKeys = next;
    this.visibleKeysChange.emit(next);
  }
}
