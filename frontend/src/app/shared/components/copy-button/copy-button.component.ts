import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-copy-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button type="button" (click)="copy()" [title]="label"
      class="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
      [class.text-emerald-400]="copied">
      @if (copied) {
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
      } @else {
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
      }
    </button>
  `,
})
export class CopyButtonComponent {
  @Input() value = '';
  @Input() label = 'Copy';
  copied = false;

  constructor(private toast: ToastService) {}

  async copy() {
    if (!this.value) return;
    try {
      await navigator.clipboard.writeText(this.value);
      this.copied = true;
      this.toast.success('Copied to clipboard');
      setTimeout(() => (this.copied = false), 2000);
    } catch {
      this.toast.error('Could not copy');
    }
  }
}
