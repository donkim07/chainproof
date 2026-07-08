import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { LoadingBarService } from '../../../core/services/loading-bar.service';

@Component({
  selector: 'app-loading-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (loading.active()) {
      <div class="loading-bar-track" aria-hidden="true">
        <div class="loading-bar-fill" [style.width.%]="loading.progress()"></div>
      </div>
    }
  `,
  styles: [`
    .loading-bar-track {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      z-index: 9999;
      pointer-events: none;
      background: rgba(23, 184, 166, 0.12);
    }
    .loading-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #17B8A6, #3DD9C6);
      box-shadow: 0 0 12px rgba(61, 217, 198, 0.55);
      transition: width 0.25s ease-out;
    }
  `],
})
export class LoadingBarComponent {
  loading = inject(LoadingBarService);

  constructor() {
    const router = inject(Router);
    router.events.pipe(
      filter(e =>
        e instanceof NavigationStart
        || e instanceof NavigationEnd
        || e instanceof NavigationCancel
        || e instanceof NavigationError,
      ),
    ).subscribe(e => {
      if (e instanceof NavigationStart) this.loading.start();
      else this.loading.complete();
    });
  }
}
