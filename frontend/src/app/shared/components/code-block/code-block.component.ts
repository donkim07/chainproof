import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CopyButtonComponent } from '../copy-button/copy-button.component';

@Component({
  selector: 'app-code-block',
  standalone: true,
  imports: [CommonModule, CopyButtonComponent],
  template: `
    <div class="relative rounded-xl border border-slate-700/80 bg-slate-950 overflow-hidden">
      @if (title) {
        <div class="flex items-center justify-between border-b border-slate-800 px-4 py-2 text-xs text-slate-400">
          <span>{{ title }}</span>
          <app-copy-button [value]="code" label="Copy code" />
        </div>
      } @else {
        <div class="absolute right-2 top-2 z-10">
          <app-copy-button [value]="code" label="Copy code" />
        </div>
      }
      <pre class="overflow-x-auto p-4 text-sm font-mono text-emerald-400 whitespace-pre-wrap"><code>{{ code }}</code></pre>
    </div>
  `,
})
export class CodeBlockComponent {
  @Input() code = '';
  @Input() title = '';
}
