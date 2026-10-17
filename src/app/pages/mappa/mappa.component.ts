import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, Subject, catchError, of, switchMap, tap } from 'rxjs';
import { SegnalazioneMappa, StatoSegnalazione } from '../../entities';
import { MappaViewComponent } from '../../components/mappa-view/mappa-view.component';
import { Voto } from '../../components/segnalazione-card/segnalazione-card.component';
import { InvioConferma, SegnalazioneModaleComponent } from '../../components/segnalazione-modale/segnalazione-modale.component';
import { MAPPA_CONFIG, STATI_ORDINE } from '../../config/mappa.config';
import { MOCK_SEGNALAZIONI_MAPPA } from '../../config/mappa.mock';
import { Coordinate, GeocodificaService } from '../../services/geocodifica.service';
import { PosizioneCorrente, PosizioneService } from '../../services/posizione.service';
import { SegnalazioneService } from '../../services/segnalazione.service';

// Componente "smart": parla con i servizi e passa i dati a MappaViewComponent e al modale.
// Lo stato è in signal (l'app è zoneless: i signal avvisano Angular quando ridisegnare, i campi semplici no).
@Component({
    selector: 'app-mappa',
    imports: [MappaViewComponent, SegnalazioneModaleComponent],
    templateUrl: './mappa.component.html',
    styleUrl: './mappa.component.css',
})
export class MappaComponent {
    private segnalazioneSrv = inject(SegnalazioneService);
    private posizioneSrv = inject(PosizioneService);
    private geocodificaSrv = inject(GeocodificaService);
    private destroyRef = inject(DestroyRef);

    segnalazioni = signal<SegnalazioneMappa[]>([]);
    statiAttivi = signal<StatoSegnalazione[]>([...STATI_ORDINE]);
    posizione = signal<PosizioneCorrente | null>(null);

    caricamento = signal(true);
    errore = signal<string | null>(null);
    erroreGps = signal<string | null>(null);

    // --- Barra "Seleziona la zona" ---
    testoRicerca = signal('');
    ricercaInCorso = signal(false);
    avvisoZona = signal<string | null>(null);
    centraSu = signal<Coordinate | null>(null); // la mappa si sposta qui

    // --- Modale del pin toccato ---
    selezionata = signal<SegnalazioneMappa | null>(null);
    // esito dell'invio dal modale: verde se è andato bene, rosso se no (senza "Riprova": quello ricarica la mappa)
    esito = signal<{ ok: boolean, testo: string } | null>(null);
    // finché non c'è l'endpoint dei voti mi ricordo i voti dati in questa sessione (id segnalazione -> voto)
    private votiUtente = new Map<number, Voto>();

    // Ogni next() rilancia il caricamento (primo load e pulsante "Riprova")
    private ricarica$ = new BehaviorSubject<void>(undefined);
    // testo scritto nella barra -> coordinate
    private ricerca$ = new Subject<string>();

    constructor() {
        // switchMap: se l'utente cerca più volte in fretta conta solo l'ultima risposta
        this.ricerca$
            .pipe(
                tap(() => {
                    this.ricercaInCorso.set(true);
                    this.avvisoZona.set(null);
                }),
                // undefined = errore di rete, null = indirizzo non trovato
                switchMap(testo => this.geocodificaSrv.coordinateDa(testo).pipe(catchError(() => of(undefined)))),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(punto => {
                this.ricercaInCorso.set(false);
                if (punto === undefined) {
                    this.avvisoZona.set('Ricerca non riuscita. Riprova tra qualche istante.');
                } else if (punto === null) {
                    this.avvisoZona.set('Indirizzo non trovato: prova ad aggiungere il comune.');
                } else if (this.fuoriComune(punto)) {
                    this.avvisoZona.set('Questo indirizzo è fuori dal territorio del comune.');
                } else {
                    this.centraSu.set(punto);
                }
            });
    }

    ngOnInit() {
        this.ricarica$
            .pipe(
                tap(() => {
                    this.caricamento.set(true);
                    this.errore.set(null);
                }),
                switchMap(() => {
                    const fonte$ = MAPPA_CONFIG.usaDatiFinti
                        ? of(MOCK_SEGNALAZIONI_MAPPA)
                        : this.segnalazioneSrv.findPerMappa();

                    // catchError dentro lo switchMap: se la chiamata fallisce lo stream resta vivo
                    return fonte$.pipe(
                        catchError(() => {
                            this.errore.set('Non riesco a caricare le segnalazioni. Riprova.');
                            return of([] as SegnalazioneMappa[]);
                        })
                    );
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(lista => {
                this.segnalazioni.set(lista);
                this.caricamento.set(false);
            });
    }

    riprova() {
        this.ricarica$.next();
    }

    // Filtri: creo sempre un nuovo array così l'input del figlio cambia
    toggleStato(stato: StatoSegnalazione) {
        this.statiAttivi.update(attivi =>
            attivi.includes(stato) ? attivi.filter(s => s !== stato) : [...attivi, stato]
        );
    }

    vaiAllaMiaPosizione() {
        this.erroreGps.set(null);
        this.posizioneSrv.getPosizioneCorrente()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: pos => this.posizione.set(pos),
                error: (err: Error) => this.erroreGps.set(err.message),
            });
    }

    // --- Barra "Seleziona la zona" ---
    scriviRicerca(event: Event) {
        this.testoRicerca.set((event.target as HTMLInputElement).value);
    }

    // Lente di ricerca o Invio nella barra
    cercaIndirizzo() {
        const testo = this.testoRicerca().trim();
        if (testo) {
            this.ricerca$.next(testo);
        }
    }

    // Fuori dal rettangolo del comune (MAPPA_CONFIG.maxBounds) la mappa non può andare
    private fuoriComune(punto: Coordinate): boolean {
        const [[sud, ovest], [nord, est]] = MAPPA_CONFIG.maxBounds;
        return punto.latitudine < sud || punto.latitudine > nord
            || punto.longitudine < ovest || punto.longitudine > est;
    }

    // --- Modale ---
    // Il tocco su un pin apre il modale (prima navigava a una rotta di dettaglio che non esiste)
    apriSegnalazione(s: SegnalazioneMappa) {
        this.esito.set(null);
        this.selezionata.set(s);
    }

    chiudiModale() {
        this.selezionata.set(null);
    }

    votoDi(id: number): Voto {
        return this.votiUtente.get(id) ?? null;
    }

    vota(voto: Voto) {
        const s = this.selezionata();
        if (!s) return;

        this.votiUtente.set(s.id, voto);
        // TODO: da collegare al back (tabella voti_segnalazione) quando ci sarà l'endpoint dei voti, come nel feed
        console.log('Voto alla segnalazione', s.id, voto);
    }

    inviaConferma(dati: InvioConferma) {
        const s = this.selezionata();
        if (!s) return;

        // TODO: le foto di conferma aspettano l'endpoint del back (nel service c'è solo la foto della creazione)
        if (dati.foto.length) {
            console.log('Foto di conferma per la segnalazione', s.id, dati.foto);
        }

        this.chiudiModale();

        if (!dati.suggerimento) {
            this.mostraEsito(true, 'Grazie! Il tuo contributo è stato inviato.');
            return;
        }

        // il suggerimento è una riga di proposte_segnalazione (addProposta esiste già nel service)
        this.segnalazioneSrv.addProposta(s.id, { descrizione: dati.suggerimento })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => this.mostraEsito(true, 'Grazie! Il tuo contributo è stato inviato.'),
                error: response => this.mostraEsito(
                    false,
                    response.error?.message ?? 'Non è stato possibile inviare il suggerimento. Riprova più tardi.'
                ),
            });
    }

    private mostraEsito(ok: boolean, testo: string) {
        this.esito.set({ ok, testo });
        setTimeout(() => this.esito.set(null), 5000);
    }
}