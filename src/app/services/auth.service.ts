import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, map, Observable, of, shareReplay, tap } from 'rxjs';
import { JwtService } from './jwt.service';
import { ApiResponse, UserRole } from '../entities';

export interface User {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
}

// Il ruolo non viene inviato: il backend registra ogni nuovo utente come 'cittadino'.
// confirmPassword viene inviato così com'è: il backend lo controlla di nuovo.
export interface RegisterData {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
}

// L'utente come lo restituisce il backend (tabella "utenti", senza password)
interface UtenteApi {
    id: number;
    email: string;
    nome: string;
    cognome: string;
    ruolo: 'CITTADINO' | 'COMUNE';
}

interface LoginApi {
    user: UtenteApi;
    accessToken: string;
    refreshToken: string;
}

// Ruoli del backend -> ruoli usati nel front
const ROLE_FROM_API: Record<UtenteApi['ruolo'], UserRole> = {
    CITTADINO: 'cittadino',
    COMUNE: 'ente',
};

// Unico punto in cui i nomi del backend (nome, cognome, ruolo) diventano quelli del front
function toUser(utente: UtenteApi): User {
    return {
        id: utente.id,
        firstName: utente.nome,
        lastName: utente.cognome,
        email: utente.email,
        role: ROLE_FROM_API[utente.ruolo],
    };
}

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    protected http = inject(HttpClient);
    protected jwtSrv = inject(JwtService);

    // richiesta di fetchUser() in corso: condivisa tra chi la chiama (constructor e guard)
    protected pendingFetch$: Observable<User | null> | null = null;

    protected _currentUser = signal<User | null>(null);
    currentUser = this._currentUser.asReadonly();

    isAuthenticated = computed(() => {
        return !!this.currentUser();
    });

    isCittadino = computed(() => {
        return this.currentUser()?.role === 'cittadino';
    });

    isEnte = computed(() => {
        return this.currentUser()?.role === 'ente';
    });

    constructor() {
        // Senza token non c'è nessun utente da caricare (eviterebbe solo un 401 inutile)
        if (this.jwtSrv.hasToken()) {
            this.fetchUser().subscribe();
        }
    }

    // GET /users/profile restituisce direttamente l'utente (senza { success, data })
    fetchUser(): Observable<User | null> {
        if (!this.pendingFetch$) {
            this.pendingFetch$ = this.http.get<UtenteApi>('/api/users/profile')
                .pipe(
                    map(toUser),
                    catchError(() => {
                        this.jwtSrv.removeToken();
                        return of(null)
                    }),
                    tap(user => this._currentUser.set(user)),
                    finalize(() => this.pendingFetch$ = null),
                    shareReplay(1)
                );
        }
        return this.pendingFetch$;
    }

    login(email: string, password: string) {
        return this.http.post<ApiResponse<LoginApi>>('/api/auth/login', { email, password })
            .pipe(
                map(res => res.data),
                tap(data => this.jwtSrv.setTokens(data.accessToken, data.refreshToken)),
                map(data => toUser(data.user)),
                tap(user => this._currentUser.set(user))
            );
    }

    // Il form usa firstName/lastName, il backend vuole nome/cognome
    register(data: RegisterData) {
        return this.http.post<ApiResponse<{ message: string, user: UtenteApi }>>('/api/auth/register', {
            nome: data.firstName,
            cognome: data.lastName,
            email: data.email,
            password: data.password,
            confirmPassword: data.confirmPassword,
        }).pipe(
            map(res => toUser(res.data.user))
        );
    }

    // Esci: revoca il refresh token sul backend e pulisce la sessione nel browser
    logout() {
        const refreshToken = this.jwtSrv.getRefreshToken();
        this.clearSession();

        if (refreshToken) {
            // se la chiamata fallisce (es. token già scaduto) non cambia nulla: la sessione locale è già chiusa
            this.http.post('/api/auth/logout', { refreshToken })
                .pipe(catchError(() => of(null)))
                .subscribe();
        }
    }

    // Chiude la sessione solo in locale (usato anche dall'interceptor quando il refresh token è scaduto)
    clearSession() {
        this.jwtSrv.removeToken();
        this._currentUser.set(null);
    }

}