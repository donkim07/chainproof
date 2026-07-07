import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-secure-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="secure-input">
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
          @if (visible) {
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
          } @else {
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
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
  styles: [`:host { display: block; } .secure-input { margin-bottom: 0.25rem; }`],
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
