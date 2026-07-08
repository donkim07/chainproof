import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const publicAuthPaths = ['/auth/login', '/auth/register', '/auth/verify-email', '/auth/forgot-password', '/auth/reset-password'];
  const isPublicAuth = publicAuthPaths.some(p => req.url.includes(p));
  return next(req).pipe(
    catchError(err => {
      if (err.status === 401 && !isPublicAuth) {
        auth.handleUnauthorized();
      }
      return throwError(() => err);
    }),
  );
};
