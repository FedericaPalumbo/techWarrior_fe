import { Component, DestroyRef, ElementRef, effect, inject, input, output, signal, viewChild } from '@angular/core';
import * as L from 'leaflet';
import { MAPPA_CONFIG } from '../../config/mappa.config';
import { Coordinate } from '../../services/geocodifica.service';

// Componente "dumb" (come MappaViewComponent): non conosce servizi né API.
// Mostra un pin; l'utente lo sposta cliccando sulla mappa o trascinandolo,
// e il padre riceve le nuove coordinate dall'output.
@Component({
    selector: 'app-mappa-scelta',
    templateUrl: './mappa-scelta.component.html',
    styleUrl: './mappa-scelta.component.css',
})
export class MappaSceltaComponent {
    // --- Input ---
    posizione = input<Coordinate | null>(null);
    gpsInCorso = input(false);

    // --- Output ---
    posizioneScelta = output<Coordinate>();
    posizioneCorrenteRichiesta = output<void>();

    private destroyRef = inject(DestroyRef);
    private mappaEl = viewChild.required<ElementRef<HTMLDivElement>>('mappa');

    private mappaPronta = signal(false);
    private map?: L.Map;
    private pin?: L.Marker;

    // true quando la nuova posizione l'ha scelta l'utente sulla mappa: in quel caso non sposto la vista
    private sceltaDaMappa = false;

    constructor() {
        // Quando il padre cambia la posizione (GPS, ricerca indirizzo, o la nostra stessa scelta) aggiorno il pin
        effect(() => {
            const punto = this.posizione();
            if (this.mappaPronta() && punto) {
                this.mostraPin(punto);
            }
        });

        this.destroyRef.onDestroy(() => this.map?.remove());
    }

    ngAfterViewInit() {
        this.map = L.map(this.mappaEl().nativeElement, {
            center: MAPPA_CONFIG.centro,
            zoom: MAPPA_CONFIG.zoom,
            minZoom: MAPPA_CONFIG.zoomMin,
            maxZoom: MAPPA_CONFIG.zoomMax,
        });

        L.tileLayer(MAPPA_CONFIG.tileUrl, {
            attribution: MAPPA_CONFIG.attribution,
            maxZoom: MAPPA_CONFIG.zoomMax,
        }).addTo(this.map);

        // Clic sulla mappa = nuovo punto della segnalazione
        this.map.on('click', (e: L.LeafletMouseEvent) => {
            this.scegli({ latitudine: e.latlng.lat, longitudine: e.latlng.lng });
        });

        // Il contenitore può avere altezza definita solo dopo il primo render
        requestAnimationFrame(() => this.map?.invalidateSize());

        this.mappaPronta.set(true);
    }

    private scegli(punto: Coordinate) {
        this.sceltaDaMappa = true;
        this.posizioneScelta.emit(punto);
    }

    private mostraPin(punto: Coordinate) {
        if (!this.map) return;

        const latlng: L.LatLngTuple = [punto.latitudine, punto.longitudine];

        if (this.pin) {
            this.pin.setLatLng(latlng);
        } else {
            this.pin = L.marker(latlng, { icon: this.creaIcona(), draggable: true });
            this.pin.on('dragend', () => {
                const { lat, lng } = this.pin!.getLatLng();
                this.scegli({ latitudine: lat, longitudine: lng });
            });
            this.pin.addTo(this.map);
        }

        // Se il punto arriva dal GPS o dalla ricerca centro la mappa; se l'ha scelto l'utente la lascio dov'è
        if (this.sceltaDaMappa) {
            this.sceltaDaMappa = false;
        } else {
            this.map.flyTo(latlng, Math.max(this.map.getZoom(), 16));
        }
    }

    // Pin a goccia: solo CSS inline (l'HTML di Leaflet è fuori dallo stile del componente), nessuna immagine da caricare
    private creaIcona(): L.DivIcon {
        return L.divIcon({
            className: 'pin-segnalazione',
            html: '<span style="display:block;width:28px;height:28px;background:#6f42b0;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.45)"></span>',
            iconSize: [28, 28],
            iconAnchor: [14, 32],
        });
    }
}