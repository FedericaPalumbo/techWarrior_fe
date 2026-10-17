import { HttpClient, HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, map, Observable, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { ApiResponse } from '../entities';
import { AuthService } from '../services/auth.service';
import { JwtService } from '../services/jwt.service';

// Il proxy.conf.json inoltra /api verso il back (togliendo il prefisso /api)
const API_PREFIX = '/api/';
// login, register, refresh e logout non hanno bisogno del token e un loro 401 non va "riparato"
const AUTH_PREFIX = '/api/auth/';

type Tokens = { accessToken: string, refreshToken: string };

// Rinnovo del token in corso, condiviso da tutte le richieste che ricevono 401 nello stesso momento.
// Serve perché il backend usa il refresh token una volta sola: due rinnovi con lo stesso token
// farebbero fallire il secondo e butterebbero fuori l'utente.
let refresh$: Observable<string> | null = null;

function conToken(req: HttpRequest<unknown>, token: string | null) {
    // niente Content-Type a mano: con FormData il browser aggiunge il boundary da solo
    return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}

// Il backend risponde agli errori con { success: false, error: 'messaggio' }.
// I componenti leggono response.error.message: qui copio il testo nel campo che si aspettano.
function normalizzaErrore(err: unknown): unknown {
    if (
        err instanceof HttpErrorResponse
        && err.error
        && typeof err.error === 'object'
        && typeof err.error.error === 'string'
        && err.error.message === undefined
    ) {
        return new HttpErrorResponse({
            error: { ...err.error, message: err.error.error },
            headers: err.headers,
            status: err.status,
            statusText: err.statusText,
            url: err.url ?? undefined,
        });
    }
    return err;
}

function rinnovaToken(http: HttpClient, jwtSrv: JwtService): Observable<string> {
    if (!refresh$) {
        refresh$ = http.post<ApiResponse<Tokens>>('/api/auth/refresh', { refreshToken: jwtSrv.getRefreshToken() })
            .pipe(
                map(res => res.data),
                tap(tokens => jwtSrv.setTokens(tokens.accessToken, tokens.refreshToken)),
                map(tokens => tokens.accessToken),
                finalize(() => refresh$ = null),
                shareReplay(1)
            );
    }
    return refresh$;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    // Le chiamate verso altri siti (non /api) non devono ricevere il nostro token
    if (!req.url.startsWith(API_PREFIX)) {
        return next(req);
    }

    const jwtSrv = inject(JwtService);
    const http = inject(HttpClient);
    const router = inject(Router);
    // AuthService lo prendo solo quando serve: iniettarlo qui creerebbe un giro
    // (AuthService usa HttpClient, che passa dall'interceptor)
    const injector = inject(Injector);

    const isAuthCall = req.url.startsWith(AUTH_PREFIX);
    const tokenUsato = isAuthCall ? null : jwtSrv.getToken();

    return next(conToken(req, tokenUsato)).pipe(
        catchError((err: unknown) => {
            const nonAutorizzato = err instanceof HttpErrorResponse && err.status === 401;
            if (!nonAutorizzato || isAuthCall || !jwtSrv.getRefreshToken()) {
                return throwError(() => normalizzaErrore(err));
            }

            // Un'altra richiesta ha già rinnovato il token mentre questa era in volo: la ripeto con quello nuovo
            const tokenAttuale = jwtSrv.getToken();
            if (tokenAttuale && tokenAttuale !== tokenUsato) {
                return next(conToken(req, tokenAttuale)).pipe(
                    catchError(e => throwError(() => normalizzaErrore(e)))
                );
            }

            // Access token scaduto: ne chiedo uno nuovo e ripeto la richiesta una volta sola
            return rinnovaToken(http, jwtSrv).pipe(
                catchError(refreshErr => {
                    // anche il refresh token è scaduto o revocato: l'utente deve rifare il login
                    injector.get(AuthService).clearSession();
                    if (!router.url.startsWith('/login')) {
                        router.navigate(['/login'], { queryParams: { dest: router.url } });
                    }
                    return throwError(() => normalizzaErrore(refreshErr));
                }),
                switchMap(token => next(conToken(req, token))),
                catchError(e => throwError(() => normalizzaErrore(e)))
            );
        })
    );
};