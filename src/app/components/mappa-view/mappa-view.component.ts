import { Component, DestroyRef, ElementRef, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import { SegnalazioneMappa, StatoSegnalazione } from '../../entities';
import { MAPPA_CONFIG, STATI_ORDINE, STATO_COLORE, STATO_LABEL } from '../../config/mappa.config';
import { Coordinate } from '../../services/geocodifica.service';
import { PosizioneCorrente } from '../../services/posizione.service';

// Componente "dumb": non conosce servizi né API, riceve dati e restituisce eventi.
@Component({
    selector: 'app-mappa-view',
    templateUrl: './mappa-view.component.html',
    styleUrl: './mappa-view.component.css',
})
export class MappaViewComponent {
    // --- Input ---
    segnalazioni = input<SegnalazioneMappa[]>([]);
    statiAttivi = input<StatoSegnalazione[]>([...STATI_ORDINE]);
    posizioneUtente = input<PosizioneCorrente | null>(null);
    // Zona cercata nella barra "Seleziona la zona": la mappa si sposta li'
    centraSu = input<Coordinate | null>(null);

    // --- Output ---
    segnalazioneSelezionata = output<SegnalazioneMappa>();
    statoToggled = output<StatoSegnalazione>();
    posizioneRichiesta = output<void>();

    protected readonly stati = STATI_ORDINE;
    protected fuoriComune = signal(false);

    // Quante segnalazioni sono visibili con i filtri attuali
    protected visibili = computed(() =>
        this.segnalazioni().filter(s => this.statiAttivi().includes(s.stato)).length
    );

    private destroyRef = inject(DestroyRef);
    private mappaEl = viewChild.required<ElementRef<HTMLDivElement>>('mappa');

    private mappaPronta = signal(false);
    private map?: L.Map;
    private cluster?: L.MarkerClusterGroup;
    private markerUtente?: L.CircleMarker;

    constructor() {
        // Ridisegna i pin quando cambiano segnalazioni o filtri
        effect(() => {
            const segnalazioni = this.segnalazioni();
            const attivi = this.statiAttivi();
            if (this.mappaPronta()) {
                this.disegnaPin(segnalazioni, attivi);
            }
        });

        // Mostra la posizione dell'utente quando arriva dal padre
        effect(() => {
            const posizione = this.posizioneUtente();
            if (this.mappaPronta() && posizione) {
                this.mostraPosizione(posizione);
            }
        });

        // Sposta la mappa sulla zona cercata (il padre manda un nuovo oggetto a ogni ricerca)
        effect(() => {
            const zona = this.centraSu();
            if (this.mappaPronta() && zona && this.map) {
                this.map.flyTo([zona.latitudine, zona.longitudine], Math.max(this.map.getZoom(), 16));
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
            maxBounds: MAPPA_CONFIG.maxBounds,
            maxBoundsViscosity: 1.0,
        });

        L.tileLayer(MAPPA_CONFIG.tileUrl, {
            attribution: MAPPA_CONFIG.attribution,
            maxZoom: MAPPA_CONFIG.zoomMax,
        }).addTo(this.map);

        // I pin vicini vengono raggruppati in un cluster
        this.cluster = L.markerClusterGroup({
            showCoverageOnHover: false,
            maxClusterRadius: 50,
        });
        this.map.addLayer(this.cluster);

        // Il contenitore può avere altezza definita solo dopo il primo render
        requestAnimationFrame(() => this.map?.invalidateSize());

        this.mappaPronta.set(true);
    }

    // --- Helper per il template ---
    protected isAttivo(stato: StatoSegnalazione): boolean {
        return this.statiAttivi().includes(stato);
    }

    protected colore(stato: StatoSegnalazione): string {
        return STATO_COLORE[stato];
    }

    protected label(stato: StatoSegnalazione): string {
        return STATO_LABEL[stato];
    }

    // --- Logica Leaflet ---
    private disegnaPin(segnalazioni: SegnalazioneMappa[], attivi: StatoSegnalazione[]) {
        if (!this.cluster) return;

        this.cluster.clearLayers();

        const markers = segnalazioni
            .filter(s => attivi.includes(s.stato))
            .map(s => {
                const marker = L.marker([s.latitudine, s.longitudine], {
                    icon: this.creaIcona(s.stato),
                    title: s.titolo,
                });
                // Il tocco sul pin apre il modale (lo gestisce la pagina), non un popup di Leaflet
                marker.on('click', () => this.segnalazioneSelezionata.emit(s));
                return marker;
            });

        this.cluster.addLayers(markers);
    }

    // Pin a goccia colorato: usa solo CSS inline, nessuna immagine da caricare
    private creaIcona(stato: StatoSegnalazione): L.DivIcon {
        const colore = STATO_COLORE[stato];
        return L.divIcon({
            className: 'pin-segnalazione',
            html: `<span style="display:block;width:30px;height:30px;background:${colore};border:2px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 1px 4px rgba(0,0,0,.45)"></span>`,
            iconSize: [30, 30],
            iconAnchor: [15, 35],
        });
    }

    private mostraPosizione(pos: PosizioneCorrente) {
        if (!this.map) return;

        const punto: [number, number] = [pos.latitudine, pos.longitudine];
        const dentro = L.latLngBounds(MAPPA_CONFIG.maxBounds).contains(punto);
        this.fuoriComune.set(!dentro);

        this.markerUtente?.remove();
        if (!dentro) return;

        this.markerUtente = L.circleMarker(punto, {
            radius: 9,
            color: '#fff',
            weight: 3,
            fillColor: '#2563eb',
            fillOpacity: 1,
        }).addTo(this.map);

        this.map.flyTo(punto, Math.max(this.map.getZoom(), 16));
    }
}