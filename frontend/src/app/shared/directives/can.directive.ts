import { Directive, Input, TemplateRef, ViewContainerRef, inject, effect } from '@angular/core';
import { PermissionService } from '../../core/services/permission.service';

/** Structural directive — show template only when user has permission. */
@Directive({ selector: '[appCan]', standalone: true })
export class CanDirective {
  private perm = inject(PermissionService);
  private tpl = inject(TemplateRef<unknown>);
  private vcr = inject(ViewContainerRef);
  private code = '';

  @Input() set appCan(code: string) {
    this.code = code;
    this.render();
  }

  constructor() {
    effect(() => {
      this.perm.can();
      this.render();
    });
  }

  private render() {
    this.vcr.clear();
    if (!this.code || this.perm.has(this.code) || this.perm.has('*')) {
      this.vcr.createEmbeddedView(this.tpl);
    }
  }
}
