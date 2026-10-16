import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Proposta, Segnalazione } from '../entities';

// autoreId non si manda: il back lo ricava dal token JWT (come createdBy in EsameJavaScript).
// "foto" è il File originale scelto dall'utente (PNG, JPEG...), senza nessuna conversione.
export type CreateSegnalazionePayload = {
    titolo: string,
    descrizione?: string,
    latitudine: number,
    longitudine: number,
    foto: File
};

export type CreatePropostaPayload = {
    descrizione: string
};

@Injectable({
    providedIn: 'root',
})
export class SegnalazioneService {
    private http = inject(HttpClient);

    // Il proxy.conf.json inoltra /api verso il back
    private baseUrl = '/api/segnalazioni';

    // Lista per il feed. CONTRATTO CON IL BACK (da concordare col team): GET /api/segnalazioni
    // restituisce Segnalazione[] già con le "immagini" dentro, ordinate dalla più recente.
    find() {
        return this.http.get<Segnalazione[]>(this.baseUrl);
    }

    // CONTRATTO CON IL BACK (da concordare col team): multipart/form-data con i campi
    // titolo, descrizione?, latitudine, longitudine, foto (file).
    // Il back valida il file, lo converte/salva e scrive l'url in segnalazione_immagini.
    // Non impostare Content-Type a mano: il browser aggiunge il boundary da solo.
    create(payload: CreateSegnalazionePayload) {
        const body = new FormData();
        body.append('titolo', payload.titolo);
        if (payload.descrizione) {
            body.append('descrizione', payload.descrizione);
        }
        // FormData manda solo stringhe: il back le riconverte in numeri
        body.append('latitudine', String(payload.latitudine));
        body.append('longitudine', String(payload.longitudine));
        body.append('foto', payload.foto, payload.foto.name);

        return this.http.post<Segnalazione>(this.baseUrl, body);
    }

    // La "soluzione" dell'utente è una riga di proposte_segnalazione
    addProposta(segnalazioneId: number, payload: CreatePropostaPayload) {
        return this.http.post<Proposta>(`${this.baseUrl}/${segnalazioneId}/proposte`, payload);
    }
}