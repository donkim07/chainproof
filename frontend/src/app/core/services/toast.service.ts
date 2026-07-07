import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration: number;
  paused: boolean;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);
  private nextId = 0;
  private timers = new Map<number, ReturnType<typeof setTimeout>>();
  private started = new Map<number, number>();

  show(message: string, type: Toast['type'] = 'info', duration = 4000) {
    const id = ++this.nextId;
    const toast: Toast = { id, message, type, duration, paused: false };
    this.toasts.update(t => [...t, toast]);
    this.scheduleDismiss(id, duration);
  }

  success(msg: string) { this.show(msg, 'success'); }
  error(msg: string) { this.show(msg, 'error', 6000); }
  warning(msg: string) { this.show(msg, 'warning', 5000); }

  pause(id: number) {
    const t = this.toasts().find(x => x.id === id);
    if (!t || t.paused) return;
    const elapsed = Date.now() - (this.started.get(id) ?? 0);
    const remaining = Math.max(0, t.duration - elapsed);
    this.clearTimer(id);
    this.toasts.update(list => list.map(x => x.id === id ? { ...x, paused: true, duration: remaining } : x));
  }

  resume(id: number) {
    const t = this.toasts().find(x => x.id === id);
    if (!t || !t.paused) return;
    this.toasts.update(list => list.map(x => x.id === id ? { ...x, paused: false } : x));
    this.scheduleDismiss(id, t.duration);
  }

  dismiss(id: number) {
    this.clearTimer(id);
    this.started.delete(id);
    this.toasts.update(t => t.filter(x => x.id !== id));
  }

  private scheduleDismiss(id: number, ms: number) {
    this.clearTimer(id);
    this.started.set(id, Date.now());
    const timer = setTimeout(() => this.dismiss(id), ms);
    this.timers.set(id, timer);
  }

  private clearTimer(id: number) {
    const t = this.timers.get(id);
    if (t) clearTimeout(t);
    this.timers.delete(id);
  }
}
