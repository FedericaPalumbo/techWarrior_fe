import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SegnalazioneMappa } from '../entities';
import { Proposta, Segnalazione } from '../entities';
import { BehaviorSubject, catchError, map, of, switchMap, tap } from 'rxjs';

// autoreId non si manda: il back lo ricava dal token JWT (come createdBy in EsameJavaScript).
// "foto" è il File originale scelto dall'utente (PNG, JPEG...), senza nessuna conversione.
// descrizione e foto sono facoltative: se mancano non vengono inviate.
// Latitudine e longitudine non si mandano: le ricava il back dall'indirizzo (geocodifica).
export type CreateSegnalazionePayload = {
    titolo: string,
    descrizione?: string,
    indirizzo: string,
    foto?: File | null
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

    // Lista per la mappa (id, titolo, stato, coordinate, voti).
    // Usa lo stesso endpoint del feed (GET /api/segnalazioni, che funziona già) e tiene solo le segnalazioni
    // con coordinate: un endpoint dedicato /api/segnalazioni/mappa potrà sostituirlo quando il back lo avrà.
    findPerMappa(): Observable<SegnalazioneMappa[]> {
        return this.find().pipe(
            // come nel feed: la risposta può essere l'array diretto oppure { data: [...] }
            map((res: unknown) => {
                const lista = Array.isArray(res) ? res : ((res as { data?: unknown })?.data ?? []);
                return lista as Segnalazione[];
            }),
            map(lista => lista.flatMap((s): SegnalazioneMappa[] =>
                s.latitudine === null || s.longitudine === null
                    ? []
                    : [{
                        id: s.id,
                        titolo: s.titolo,
                        stato: s.stato,
                        latitudine: Number(s.latitudine),
                        longitudine: Number(s.longitudine),
                        voti: s.voti,
                    }]
            ))
        );
    }

    // CONTRATTO CON IL BACK (da concordare col team): multipart/form-data con i campi
    // titolo, indirizzo (obbligatori) e descrizione, foto (file) (facoltativi).
    // Il back ricava latitudine/longitudine dall'indirizzo, valida il file, lo salva e scrive l'url in segnalazione_immagini.
    // Non impostare Content-Type a mano: il browser aggiunge il boundary da solo.
    create(payload: CreateSegnalazionePayload) {
        const body = new FormData();
        body.append('titolo', payload.titolo);
        if (payload.descrizione) {
            body.append('descrizione', payload.descrizione);
        }
        body.append('indirizzo', payload.indirizzo);
        if (payload.foto) {
            body.append('foto', payload.foto, payload.foto.name);
        }

        return this.http.post<Segnalazione>(this.baseUrl, body);
    }

    // La "soluzione" dell'utente è una riga di proposte_segnalazione
    addProposta(segnalazioneId: number, payload: CreatePropostaPayload) {
        return this.http.post<Proposta>(`${this.baseUrl}/${segnalazioneId}/proposte`, payload);
    }
}