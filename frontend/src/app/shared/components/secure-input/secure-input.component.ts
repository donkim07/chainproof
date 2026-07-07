import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-secure-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      @if (label) {
        <label class="mb-1.5 block text-sm font-medium text-slate-300">{{ label }}</label>
      }
      <div class="relative">
        <input
          class="input-field pr-11"
          [type]="visible ? 'text' : 'password'"
          [placeholder]="placeholder"
          [(ngModel)]="value"
          (ngModelChange)="onChange($event)"
          [attr.autocomplete]="autocomplete"
          [attr.minlength]="minLength"
          [attr.maxlength]="maxLength"
          [required]="required"
          [ngClass]="{
            'border-rose-500/50': strength === 'weak' && value.length > 0,
            'border-emerald-500/40': strength === 'strong'
          }" />
        <button type="button" class="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:text-white"
          (click)="visible = !visible" [attr.aria-label]="visible ? 'Hide password' : 'Show password'">
          {{ visible ? '&#128065;' : '&#128584;' }}
        </button>
      </div>
      @if (showStrength && value) {
        <div class="mt-2 flex gap-1">
          @for (i of [1,2,3,4]; track i) {
            <div class="h-1 flex-1 rounded-full transition-colors"
              [class]="i <= strengthBars ? strengthColor : 'bg-slate-700'"></div>
          }
        </div>
        <p class="mt-1 text-xs" [class]="strength === 'strong' ? 'text-emerald-400' : strength === 'medium' ? 'text-amber-400' : 'text-slate-500'">
          {{ strengthLabel }}
        </p>
      }
      @if (hint) {
        <p class="mt-1 text-xs text-slate-500">{{ hint }}</p>
      }
    </div>
  `,
})
export class SecureInputComponent {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() value = '';
  @Input() autocomplete = 'current-password';
  @Input() minLength = 8;
  @Input() maxLength = 128;
  @Input() required = false;
  @Input() showStrength = false;
  @Input() hint = '';
  @Output() valueChange = new EventEmitter<string>();

  visible = false;

  onChange(v: string) {
    this.value = v;
    this.valueChange.emit(v);
  }

  get strength(): 'weak' | 'medium' | 'strong' {
    const v = this.value;
    if (v.length < 8) return 'weak';
    let score = 0;
    if (/[a-z]/.test(v)) score++;
    if (/[A-Z]/.test(v)) score++;
    if (/[0-9]/.test(v)) score++;
    if (/[^a-zA-Z0-9]/.test(v)) score++;
    if (v.length >= 12) score++;
    if (score >= 4) return 'strong';
    if (score >= 2) return 'medium';
    return 'weak';
  }

  get strengthBars() {
    return { weak: 1, medium: 2, strong: 4 }[this.strength];
  }

  get strengthColor() {
    return { weak: 'bg-rose-500', medium: 'bg-amber-500', strong: 'bg-emerald-500' }[this.strength];
  }

  get strengthLabel() {
    return { weak: 'Weak — use 8+ chars with mixed case, numbers, symbols',
      medium: 'Fair — add symbols or length for stronger security',
      strong: 'Strong password' }[this.strength];
  }
}
