import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Iniziativa } from '../entities';

// creatoreId non si manda: il back lo ricava dal token JWT (come autoreId nelle segnalazioni).
// Le date sono stringhe ISO (new Date(...).toISOString()), "immagine" è il File originale scelto dall'ente.
export type CreateIniziativaPayload = {
    titolo: string,
    descrizione: string,
    luogo?: string,
    dataInizio?: string,
    dataFine?: string,
    immagine?: File
};

@Injectable({
    providedIn: 'root',
})
export class IniziativaService {
    private http = inject(HttpClient);

    // Il proxy.conf.json inoltra /api verso il back
    private baseUrl = '/api/iniziative';

    // Lista per la pagina inviti. CONTRATTO CON IL BACK (da concordare col team):
    // GET /api/iniziative restituisce Iniziativa[] ordinate dalla più recente.
    find() {
        return this.http.get<Iniziativa[]>(this.baseUrl);
    }

    // CONTRATTO CON IL BACK (da concordare col team): multipart/form-data con i campi
    // titolo, descrizione, luogo?, dataInizio?, dataFine?, immagine? (file).
    // Il back salva il file e scrive l'url in iniziative.immagineUrl.
    // Solo il ruolo 'ente' può crearle (controllo vero lato back).
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

        return this.http.post<Iniziativa>(this.baseUrl, body);
    }

    // Il cittadino dà la disponibilità: una riga in partecipazioni_iniziativa (utenteId dal token)
    partecipa(iniziativaId: number) {
        return this.http.post<void>(`${this.baseUrl}/${iniziativaId}/partecipazioni`, {});
    }

    // Toglie la propria partecipazione (DELETE sulla stessa risorsa)
    annullaPartecipazione(iniziativaId: number) {
        return this.http.delete<void>(`${this.baseUrl}/${iniziativaId}/partecipazioni`);
    }
}
