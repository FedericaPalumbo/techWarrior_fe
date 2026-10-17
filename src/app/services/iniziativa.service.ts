import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { ApiResponse, Iniziativa } from '../entities';
import { AuthService } from './auth.service';

// creatoreId non si manda: il back lo ricava dal token JWT (come autoreId nelle segnalazioni).
// Le date sono stringhe ISO (new Date(...).toISOString()), "immagine" è il File originale scelto dall'ente (max 5 MB).
export type CreateIniziativaPayload = {
    titolo: string,
    descrizione: string,
    luogo?: string,
    dataInizio?: string,
    dataFine?: string,
    immagine?: File
};

// L'iniziativa come arriva dal backend: dentro c'è l'elenco dei partecipanti (righe di partecipazioni_iniziativa)
type IniziativaApi = Omit<Iniziativa, 'partecipantiCount' | 'partecipo'> & {
    partecipanti?: { utenteId: number }[]
};

@Injectable({
    providedIn: 'root',
})
export class IniziativaService {
    private http = inject(HttpClient);
    private authSrv = inject(AuthService);

    // Il proxy.conf.json inoltra /api verso il back
    private baseUrl = '/api/iniziative';

    // Lista per la pagina inviti: GET /iniziative restituisce { success, data } con i "partecipanti" dentro ogni iniziativa.
    // Da quelli ricavo quanti volontari ci sono e se l'utente collegato partecipa già.
    // Il back non le ordina: le metto io dalla più recente.
    find() {
        return this.http.get<ApiResponse<IniziativaApi[]>>(this.baseUrl)
            .pipe(
                map(res => {
                    const utenteId = this.authSrv.currentUser()?.id;

                    return res.data
                        .map(({ partecipanti = [], ...iniziativa }): Iniziativa => ({
                            ...iniziativa,
                            partecipantiCount: partecipanti.length,
                            partecipo: partecipanti.some(p => p.utenteId === utenteId),
                        }))
                        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
                })
            );
    }

    // POST /iniziative (solo ruolo ente): multipart/form-data con i campi
    // titolo, descrizione, luogo?, dataInizio?, dataFine?, immagine? (file).
    // Il back salva il file su Cloudinary e scrive l'url in iniziative.immagineUrl.
    create(payload: CreateIniziativaPayload) {
        const body = new FormData();
        body.append('titolo', payload.titolo);
        body.append('descrizione', payload.descrizione);
        if (payload.luogo) {
            body.append('luogo', payload.luogo);
        }
        if (payload.dataInizio) {
            body.append('dataInizio', payload.dataInizio);
        }
        if (payload.dataFine) {
            body.append('dataFine', payload.dataFine);
        }
        if (payload.immagine) {
            body.append('immagine', payload.immagine, payload.immagine.name);
        }

        return this.http.post<ApiResponse<Iniziativa>>(this.baseUrl, body)
            .pipe(map(res => res.data));
    }

    // Il cittadino dà la disponibilità: una riga in partecipazioni_iniziativa (utenteId dal token)
    partecipa(iniziativaId: number) {
        return this.http.post<ApiResponse<unknown>>(`${this.baseUrl}/${iniziativaId}/partecipazioni`, {})
            .pipe(map(() => undefined));
    }

    // Toglie la propria partecipazione (DELETE sulla stessa risorsa).
    // ATTENZIONE: nel backend questa rotta va ancora aggiunta nel controller.
    annullaPartecipazione(iniziativaId: number) {
        return this.http.delete<ApiResponse<unknown>>(`${this.baseUrl}/${iniziativaId}/partecipazioni`)
            .pipe(map(() => undefined));
    }
}