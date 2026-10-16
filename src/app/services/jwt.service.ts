import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class JwtService {
    setToken(token: string) {
        localStorage.setItem('authToken', token);
    }

    getToken(): string | null {
        return localStorage.getItem('authToken');
    }

    hasToken(): boolean {
        return !!this.getToken();
    }

    removeToken() {
        localStorage.removeItem('authToken');
    }

}