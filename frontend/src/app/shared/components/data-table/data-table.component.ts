import { Component, ContentChild, EventEmitter, Input, OnChanges, OnInit, Output, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaginationComponent } from '../pagination/pagination.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { TableToolbarComponent } from '../table-toolbar/table-toolbar.component';
import { exportToCsv } from '../../utils/csv-export';

export interface TableColumn<T = unknown> {
  key: string;
  label: string;
  class?: string;
  format?: (row: T) => string;
  exportFormat?: (row: T) => string;
  defaultVisible?: boolean;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, PaginationComponent, EmptyStateComponent, TableToolbarComponent],
  template: `
    <div class="table-shell animate-slide-up">
      @if (showToolbar) {
        <app-table-toolbar
          [columns]="columns"
          [visibleKeys]="visibleKeys"
          [showColumnToggle]="columnToggle"
          [showExport]="exportable"
          [countLabel]="countLabel"
          (visibleKeysChange)="onVisibleChange($event)"
          (exportClick)="doExport()">
          <ng-content select="[search]"></ng-content>
          <ng-content select="[toolbar]"></ng-content>
        </app-table-toolbar>
      } @else {
        <ng-content select="[toolbar]"></ng-content>
      }

      <div class="overflow-x-auto">
        <table class="cp-table">
          <thead>
            <tr>
              @for (col of activeColumns; track col.key) {
                <th [class]="col.class">{{ col.label }}</th>
              }
              @if (hasActions) { <th class="text-right">Actions</th> }
            </tr>
          </thead>
          <tbody>
            @for (row of pageRows; track trackBy(row)) {
              <tr class="border-t border-ink-800 hover:bg-ink-800/30 transition-colors">
                @for (col of activeColumns; track col.key) {
                  <td [class]="col.class">{{ display(row, col) }}</td>
                }
                @if (hasActions) {
                  <td class="text-right">
                    @if (rowTemplate) {
                      <ng-container *ngTemplateOutlet="rowTemplate; context: { $implicit: row }"></ng-container>
                    }
                  </td>
                }
              </tr>
            } @empty {
              <tr>
                <td [attr.colspan]="activeColumns.length + (hasActions ? 1 : 0)">
                  <app-empty-state [title]="emptyTitle" [description]="emptyDescription" [icon]="emptyIcon"></app-empty-state>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <app-pagination
        [page]="page"
        [pageSize]="pageSize"
        [total]="rows.length"
        [showPageSize]="pageSizeOptions.length > 1"
        [pageSizeOptions]="pageSizeOptions"
        (pageChange)="onPageChange($event)"
        (pageSizeChange)="onPageSizeChange($event)" />
    </div>
  `,
})
export class DataTableComponent<T extends object> implements OnChanges, OnInit {
  @Input() columns: TableColumn<T>[] = [];
  @Input() rows: T[] = [];
  @Input() pageSize = 10;
  @Input() pageSizeOptions: number[] = [10, 25, 50, 100, 200, 500];
  @Input() hasActions = false;
  @Input() showToolbar = true;
  @Input() columnToggle = true;
  @Input() exportable = true;
  @Input() exportFilename = 'export.csv';
  @Input() emptyTitle = 'No data';
  @Input() emptyDescription = '';
  @Input() emptyIcon = 'inbox';
  @Input() countLabel = '';
  @Input() trackByFn: (row: T) => string | number = (r) => JSON.stringify(r);
  @ContentChild('rowActions') rowTemplate?: TemplateRef<{ $implicit: T }>;

  @Output() pageChange = new EventEmitter<number>();

  page = 1;
  visibleKeys = new Set<string>();

  ngOnInit() {
    this.initVisibleKeys();
  }

  ngOnChanges() {
    this.initVisibleKeys();
  }

  private initVisibleKeys() {
    if (this.columns.length && this.visibleKeys.size === 0) {
      this.visibleKeys = new Set(
        this.columns.filter(c => c.defaultVisible !== false).map(c => c.key)
      );
    }
  }

  get activeColumns() {
    return this.columns.filter(c => this.visibleKeys.has(c.key));
  }

  get pageRows() {
    const start = (this.page - 1) * this.pageSize;
    return this.rows.slice(start, start + this.pageSize);
  }

  trackBy(row: T) { return this.trackByFn(row); }

  display(row: T, col: TableColumn<T>): string {
    if (col.format) return col.format(row);
    const v = (row as Record<string, unknown>)[col.key];
    return v == null ? '—' : String(v);
  }

  onVisibleChange(keys: Set<string>) {
    this.visibleKeys = keys;
  }

  onPageChange(p: number) {
    this.page = p;
    this.pageChange.emit(p);
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.page = 1;
  }

  doExport() {
    const cols = this.activeColumns;
    const headers = cols.map(c => c.label);
    const data = this.rows.map(row =>
      cols.map(c => {
        if (c.exportFormat) return c.exportFormat(row);
        if (c.format) return c.format(row);
        const v = (row as Record<string, unknown>)[c.key];
        return v == null ? '' : String(v);
      })
    );
    exportToCsv(this.exportFilename, headers, data);
  }
}
