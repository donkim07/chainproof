import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (open) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" (click)="closed.emit()"></div>
        <div class="relative w-full max-w-lg rounded-xl border border-ink-700 bg-ink-900 p-6 shadow-2xl animate-slide-up">
          @if (title) {
            <h3 class="mb-4 text-lg font-semibold text-white">{{ title }}</h3>
          }
          <ng-content />
        </div>
      </div>
    }
  `,
})
export class ModalComponent {
  @Input() open = false;
  @Input() title = '';
  @Output() closed = new EventEmitter<void>();
}
