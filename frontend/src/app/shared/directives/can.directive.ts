import { Directive, Input, TemplateRef, ViewContainerRef, inject, effect, untracked } from '@angular/core';
import { PermissionService } from '../../core/services/permission.service';

/** Structural directive — show template only when user has permission. */
@Directive({ selector: '[appCan]', standalone: true })
export class CanDirective {
  private perm = inject(PermissionService);
  private tpl = inject(TemplateRef<unknown>);
  private vcr = inject(ViewContainerRef);
  private code = '';
  private showing = false;

  @Input() set appCan(code: string) {
    this.code = code;
    this.sync();
  }

  constructor() {
    effect(() => {
      this.perm.revision();
      untracked(() => this.sync());
    });
  }

  private sync() {
    const ok = !this.code || this.perm.has(this.code);
    if (ok && !this.showing) {
      this.vcr.createEmbeddedView(this.tpl);
      this.showing = true;
    } else if (!ok && this.showing) {
      this.vcr.clear();
      this.showing = false;
    }
  }
}
