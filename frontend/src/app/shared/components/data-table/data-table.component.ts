import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaginationComponent } from '../pagination/pagination.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';

export interface TableColumn<T = unknown> {
  key: string;
  label: string;
  class?: string;
  format?: (row: T) => string;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, PaginationComponent, EmptyStateComponent],
  template: `
    <div class="table-shell animate-slide-up">
      <ng-content select="[toolbar]"></ng-content>
      <div class="overflow-x-auto">
        <table class="cp-table">
          <thead>
            <tr>
              @for (col of columns; track col.key) {
                <th [class]="col.class">{{ col.label }}</th>
              }
              @if (hasActions) { <th class="text-right">Actions</th> }
            </tr>
          </thead>
          <tbody>
            @for (row of pageRows; track trackBy(row)) {
              <tr class="border-t border-slate-800/80 hover:bg-slate-800/30 transition-colors">
                @for (col of columns; track col.key) {
                  <td [class]="col.class">{{ display(row, col) }}</td>
                }
                @if (hasActions) {
                  <td class="text-right"><ng-content select="[actions]"></ng-content></td>
                }
              </tr>
            } @empty {
              <tr>
                <td [attr.colspan]="columns.length + (hasActions ? 1 : 0)">
                  <app-empty-state [title]="emptyTitle" [description]="emptyDescription" [icon]="emptyIcon"></app-empty-state>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <app-pagination [page]="page" [pageSize]="pageSize" [total]="rows.length" (pageChange)="page = $event" />
    </div>
  `,
})
export class DataTableComponent<T extends Record<string, unknown>> {
  @Input() columns: TableColumn<T>[] = [];
  @Input() rows: T[] = [];
  @Input() pageSize = 10;
  @Input() hasActions = false;
  @Input() emptyTitle = 'No data';
  @Input() emptyDescription = '';
  @Input() emptyIcon = '&#128196;';
  @Input() trackByFn: (row: T) => string | number = (r) => JSON.stringify(r);

  page = 1;

  get pageRows() {
    const start = (this.page - 1) * this.pageSize;
    return this.rows.slice(start, start + this.pageSize);
  }

  trackBy(row: T) { return this.trackByFn(row); }

  display(row: T, col: TableColumn<T>): string {
    if (col.format) return col.format(row);
    const v = row[col.key];
    return v == null ? '—' : String(v);
  }
}
