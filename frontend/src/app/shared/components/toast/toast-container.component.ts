import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    @keyframes toast-shrink { from { transform: scaleX(1); } to { transform: scaleX(0); } }
    .toast-bar { transform-origin: left center; animation: toast-shrink linear forwards; }
    .toast-bar-paused { animation-play-state: paused !important; }
  `],
  template: `
    <div class="fixed top-4 right-4 z-[200] flex flex-col gap-2 max-w-sm w-[min(100vw-2rem,24rem)]">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="animate-slide-up relative overflow-hidden rounded-lg border shadow-xl backdrop-blur-sm"
             [class]="toastClass(toast.type)"
             (mouseenter)="toastService.pause(toast.id)"
             (mouseleave)="toastService.resume(toast.id)"
             (click)="toastService.pause(toast.id)">
          <div class="px-4 py-3 pr-8">
            <span class="text-sm font-medium leading-snug">{{ toast.message }}</span>
          </div>
          <button type="button"
            class="absolute top-2 right-2 text-ink-500 hover:text-white text-xs leading-none"
            (click)="dismiss($event, toast.id)" aria-label="Dismiss">✕</button>
          <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-black/20 overflow-hidden">
            <div class="toast-bar h-full w-full"
              [class.toast-bar-paused]="toast.paused"
              [class]="barClass(toast.type)"
              [style.animationDuration.ms]="toast.duration"></div>
          </div>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  constructor(public toastService: ToastService) {}

  dismiss(event: MouseEvent, id: number) {
    event.stopPropagation();
    this.toastService.dismiss(id);
  }

  toastClass(type: string): string {
    const map: Record<string, string> = {
      success: 'border-signal-500/30 bg-emerald-950/95 text-emerald-200',
      error: 'border-alert-500/30 bg-rose-950/95 text-rose-200',
      warning: 'border-warn-500/30 bg-amber-950/95 text-amber-200',
      info: 'border-signal-500/30 bg-ink-900/95 text-slate-200',
    };
    return map[type] || map['info'];
  }

  barClass(type: string): string {
    const map: Record<string, string> = {
      success: 'bg-signal-400',
      error: 'bg-alert-400',
      warning: 'bg-warn-400',
      info: 'bg-signal-500',
    };
    return map[type] || map['info'];
  }
}
