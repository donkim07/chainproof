import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

function whenSessionReady(auth: AuthService) {
  return toObservable(auth.sessionChecked).pipe(
    filter(ready => ready),
    take(1),
  );
}

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return whenSessionReady(auth).pipe(
    map(() => (auth.isLoggedIn() ? true : router.createUrlTree(['/login']))),
  );
};

export const superAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return whenSessionReady(auth).pipe(
    map(() => {
      if (!auth.isLoggedIn()) return router.createUrlTree(['/login']);
      if (auth.isSuperAdmin()) return true;
      return router.createUrlTree(['/dashboard']);
    }),
  );
};

export const orgGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return whenSessionReady(auth).pipe(
    map(() => {
      if (!auth.isLoggedIn()) return router.createUrlTree(['/login']);
      if (auth.hasOrganization() || auth.isSuperAdmin()) return true;
      return router.createUrlTree(['/dashboard/platform']);
    }),
  );
};
