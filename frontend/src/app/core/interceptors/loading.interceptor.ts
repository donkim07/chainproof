import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingBarService } from '../services/loading-bar.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loading = inject(LoadingBarService);
  const skip = req.url.includes('/health') || req.url.includes('/inbox/unread-count');
  if (!skip) loading.start();
  return next(req).pipe(finalize(() => {
    if (!skip) loading.complete();
  }));
};
