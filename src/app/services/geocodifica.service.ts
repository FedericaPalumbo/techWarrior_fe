import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { MAPPA_CONFIG } from '../config/mappa.config';

export type Coordinate = {
    latitudine: number,
    longitudine: number
};

type NominatimIndirizzo = {
    road?: string,
    pedestrian?: string,
    footway?: string,
    path?: string,
    house_number?: string,
    city?: string,
    town?: string,
    village?: string,
    municipality?: string,
    hamlet?: string
};

type NominatimReverse = {
    display_name?: string,
    address?: NominatimIndirizzo,
    error?: string
};

type NominatimRisultato = {
    lat: string,
    lon: string
};

// Servizio per la pagina "segnalazione": coordinate -> indirizzo (quando l'utente sposta il pin)
// e indirizzo -> coordinate (quando scrive nella barra di ricerca).
// Usa Nominatim (OpenStreetMap): gratuito, ma limitato a circa 1 richiesta al secondo.
// Le chiamate NON iniziano con /api/, quindi l'interceptor non allega il token JWT.
@Injectable({ providedIn: 'root' })
export class GeocodificaService {
    private http = inject(HttpClient);

    private readonly baseUrl = 'https://nominatim.openstreetmap.org';

    // Restituisce es. "Via Roma 10, Vicenza", oppure null se il punto non ha un indirizzo
    indirizzoDa(punto: Coordinate): Observable<string | null> {
        const params = new HttpParams()
            .set('format', 'jsonv2')
            .set('lat', String(punto.latitudine))
            .set('lon', String(punto.longitudine))
            .set('zoom', '18')
            .set('addressdetails', '1')
            .set('accept-language', 'it');

        return this.http
            .get<NominatimReverse>(`${this.baseUrl}/reverse`, { params })
            .pipe(map(risposta => this.formatta(risposta)));
    }

    // Restituisce il primo risultato, oppure null se l'indirizzo non esiste
    coordinateDa(indirizzo: string): Observable<Coordinate | null> {
        // viewbox = rettangolo del comune: Nominatim lo usa per preferire i risultati vicini
        const [[sud, ovest], [nord, est]] = MAPPA_CONFIG.maxBounds;

        const params = new HttpParams()
            .set('format', 'jsonv2')
            .set('q', indirizzo)
            .set('limit', '1')
            .set('countrycodes', 'it')
            .set('viewbox', `${ovest},${nord},${est},${sud}`)
            .set('accept-language', 'it');

        return this.http
            .get<NominatimRisultato[]>(`${this.baseUrl}/search`, { params })
            .pipe(
                map(risultati => {
                    const primo = risultati[0];
                    return primo
                        ? { latitudine: Number(primo.lat), longitudine: Number(primo.lon) }
                        : null;
                })
            );
    }

    private formatta(risposta: NominatimReverse): string | null {
        if (risposta.error) {
            return null;
        }

        const a = risposta.address ?? {};
        const via = a.road ?? a.pedestrian ?? a.footway ?? a.path;
        const comune = a.city ?? a.town ?? a.village ?? a.municipality ?? a.hamlet;

        if (via) {
            const civico = a.house_number ? ` ${a.house_number}` : '';
            return comune ? `${via}${civico}, ${comune}` : `${via}${civico}`;
        }
        return risposta.display_name ?? null;
    }
}