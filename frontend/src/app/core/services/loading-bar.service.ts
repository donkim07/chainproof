import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingBarService {
  active = signal(false);
  progress = signal(0);

  private timer?: ReturnType<typeof setInterval>;
  private failsafe?: ReturnType<typeof setTimeout>;

  start() {
    this.active.set(true);
    this.progress.set(10);
    clearInterval(this.timer);
    clearTimeout(this.failsafe);
    this.timer = setInterval(() => {
      const current = this.progress();
      if (current < 90) {
        this.progress.set(current + (90 - current) * 0.15);
      }
    }, 200);
    // Never leave the bar stuck (e.g. hanging HTTP on production).
    this.failsafe = setTimeout(() => this.complete(), 8000);
  }

  complete() {
    clearInterval(this.timer);
    clearTimeout(this.failsafe);
    this.progress.set(100);
    setTimeout(() => {
      this.active.set(false);
      this.progress.set(0);
    }, 200);
  }
}
