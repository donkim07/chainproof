import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="animate-slide-up flex items-center gap-3 rounded-lg border px-4 py-3 shadow-xl backdrop-blur-sm"
             [class]="toastClass(toast.type)" (click)="toastService.dismiss(toast.id)">
          <span class="text-sm font-medium">{{ toast.message }}</span>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  constructor(public toastService: ToastService) {}

  toastClass(type: string): string {
    const map: Record<string, string> = {
      success: 'border-emerald-500/30 bg-emerald-950/90 text-emerald-200',
      error: 'border-rose-500/30 bg-rose-950/90 text-rose-200',
      warning: 'border-amber-500/30 bg-amber-950/90 text-amber-200',
      info: 'border-brand-500/30 bg-slate-900/90 text-slate-200',
    };
    return map[type] || map['info'];
  }
}
