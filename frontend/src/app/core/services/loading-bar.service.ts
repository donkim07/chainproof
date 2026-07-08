import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingBarService {
  active = signal(false);
  progress = signal(0);

  private pending = 0;
  private timer?: ReturnType<typeof setInterval>;

  start() {
    this.pending++;
    if (this.pending !== 1) return;
    this.active.set(true);
    this.progress.set(8);
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      const current = this.progress();
      if (current < 88) this.progress.set(current + 4 + Math.random() * 8);
    }, 280);
  }

  complete() {
    this.pending = Math.max(0, this.pending - 1);
    if (this.pending > 0) return;
    clearInterval(this.timer);
    this.progress.set(100);
    setTimeout(() => {
      this.active.set(false);
      this.progress.set(0);
    }, 220);
  }
}
