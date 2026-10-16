import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
    CreatePropostaRequest,
    CreateSegnalazioneRequest,
    Proposta,
    Segnalazione,
} from '../models/segnalazione.model';

@Injectable({ providedIn: 'root' })
export class SegnalazioneService {
    private http = inject(HttpClient);

    // Il proxy.conf.json inoltra /api verso il back
    private baseUrl = '/api/segnalazioni';

    create(body: CreateSegnalazioneRequest): Observable<Segnalazione> {
        return this.http.post<Segnalazione>(this.baseUrl, body);
    }

    // La "soluzione" dell'utente è una riga di proposte_segnalazione
    addProposta(segnalazioneId: number, body: CreatePropostaRequest): Observable<Proposta> {
        return this.http.post<Proposta>(`${this.baseUrl}/${segnalazioneId}/proposte`, body);
    }
}