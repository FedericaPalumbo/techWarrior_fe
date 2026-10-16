import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface PosizioneCorrente {
    latitudine: number;
    longitudine: number;
    // precisione in metri
    accuratezza: number;
}

@Injectable({ providedIn: 'root' })
export class PosizioneService {

    // Restituisce la posizione GPS corrente e completa.
    // In caso di problemi va in error con un messaggio già pronto da mostrare.
    getPosizioneCorrente(): Observable<PosizioneCorrente> {
        return new Observable<PosizioneCorrente>(subscriber => {
            if (!('geolocation' in navigator)) {
                subscriber.error(new Error('Il tuo dispositivo non supporta la geolocalizzazione.'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                pos => {
                    subscriber.next({
                        latitudine: pos.coords.latitude,
                        longitudine: pos.coords.longitude,
                        accuratezza: pos.coords.accuracy,
                    });
                    subscriber.complete();
                },
                err => subscriber.error(new Error(this.messaggioErrore(err))),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
            );
        });
    }

    private messaggioErrore(err: GeolocationPositionError): string {
        switch (err.code) {
            case err.PERMISSION_DENIED:
                return 'Permesso di posizione negato. Abilitalo dalle impostazioni del browser.';
            case err.POSITION_UNAVAILABLE:
                return 'Posizione non disponibile al momento.';
            case err.TIMEOUT:
                return 'Tempo scaduto nel rilevare la posizione. Riprova.';
            default:
                return 'Impossibile rilevare la posizione.';
        }
    }
}