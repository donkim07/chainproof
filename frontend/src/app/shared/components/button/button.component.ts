import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button [type]="type" [disabled]="disabled || loading" [class]="classes" (click)="onClick($event)">
      @if (loading) {
        <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
      }
      <ng-content />
    </button>
  `,
})
export class ButtonComponent {
  @Input() variant: Variant = 'primary';
  @Input() type: 'button' | 'submit' = 'button';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() fullWidth = false;

  get classes(): string {
    const base = this.fullWidth ? 'w-full ' : '';
    const map: Record<Variant, string> = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      ghost: 'btn-ghost',
      danger: 'btn-primary !bg-rose-600 hover:!bg-rose-500',
    };
    return base + map[this.variant];
  }

  onClick(e: Event) {
    if (this.disabled || this.loading) e.preventDefault();
  }
}
