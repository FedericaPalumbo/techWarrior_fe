import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { JwtService } from '../services/jwt.service';

export const authGuard: CanActivateFn = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
) => {
    const authSrv = inject(AuthService);
    const jwtSrv = inject(JwtService);
    const router = inject(Router);

    const loginUrl = router.createUrlTree(['/login'], { queryParams: { dest: state.url } });

    if (authSrv.isAuthenticated()) {
        return true;
    }

    // Refresh della pagina: il token c'è ma l'utente non è ancora stato caricato
    if (jwtSrv.hasToken()) {
        return authSrv.fetchUser().pipe(
            map(user => user ? true : loginUrl)
        );
    }

    return loginUrl;
};