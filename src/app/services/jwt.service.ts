import { Injectable } from '@angular/core';

const ACCESS_TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

@Injectable({
    providedIn: 'root',
})
export class JwtService {
    // Il backend restituisce due token: l'access token (15 minuti) va in ogni richiesta,
    // il refresh token (7 giorni) serve solo per ottenerne uno nuovo quando l'access scade.
    // Il refresh token è monouso: a ogni rinnovo il backend ne restituisce uno nuovo, da salvare.
    setTokens(accessToken: string, refreshToken: string) {
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }

    getToken(): string | null {
        return localStorage.getItem(ACCESS_TOKEN_KEY);
    }

    getRefreshToken(): string | null {
        return localStorage.getItem(REFRESH_TOKEN_KEY);
    }

    hasToken(): boolean {
        return !!this.getToken();
    }

    // Chiude la sessione nel browser: toglie entrambi i token
    removeToken() {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
    }

}