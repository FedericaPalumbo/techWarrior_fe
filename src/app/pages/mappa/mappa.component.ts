import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, of, switchMap, tap } from 'rxjs';
import { SegnalazioneMappa, StatoSegnalazione } from '../../entities';
import { MappaViewComponent } from '../../components/mappa-view/mappa-view.component';
import { MAPPA_CONFIG, STATI_ORDINE } from '../../config/mappa.config';
import { MOCK_SEGNALAZIONI_MAPPA } from '../../config/mappa.mock';
import { PosizioneCorrente, PosizioneService } from '../../services/posizione.service';
import { SegnalazioneService } from '../../services/segnalazione.service';

// Componente "smart": parla con i servizi e passa i dati a MappaViewComponent
@Component({
    selector: 'app-mappa',
    imports: [MappaViewComponent],
    templateUrl: './mappa.component.html',
    styleUrl: './mappa.component.css',
})
export class MappaComponent {
    private segnalazioneSrv = inject(SegnalazioneService);
    private posizioneSrv = inject(PosizioneService);
    private destroyRef = inject(DestroyRef);
    private router = inject(Router);

    segnalazioni: SegnalazioneMappa[] = [];
    statiAttivi: StatoSegnalazione[] = [...STATI_ORDINE];
    posizione: PosizioneCorrente | null = null;

    caricamento = true;
    errore: string | null = null;
    erroreGps: string | null = null;

    // Ogni next() rilancia il caricamento (primo load e pulsante "Riprova")
    private ricarica$ = new BehaviorSubject<void>(undefined);

    ngOnInit() {
        this.ricarica$
            .pipe(
                tap(() => {
                    this.caricamento = true;
                    this.errore = null;
                }),
                switchMap(() => {
                    const fonte$ = MAPPA_CONFIG.usaDatiFinti
                        ? of(MOCK_SEGNALAZIONI_MAPPA)
                        : this.segnalazioneSrv.findPerMappa();

                    // catchError dentro lo switchMap: se la chiamata fallisce lo stream resta vivo
                    return fonte$.pipe(
                        catchError(() => {
                            this.errore = 'Non riesco a caricare le segnalazioni. Riprova.';
                            return of([] as SegnalazioneMappa[]);
                        })
                    );
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(lista => {
                this.segnalazioni = lista;
                this.caricamento = false;
            });
    }

    riprova() {
        this.ricarica$.next();
    }

    // Filtri: creo sempre un nuovo array così l'input del figlio cambia
    toggleStato(stato: StatoSegnalazione) {
        this.statiAttivi = this.statiAttivi.includes(stato)
            ? this.statiAttivi.filter(s => s !== stato)
            : [...this.statiAttivi, stato];
    }

    vaiAllaMiaPosizione() {
        this.erroreGps = null;
        this.posizioneSrv.getPosizioneCorrente()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: pos => (this.posizione = pos),
                error: (err: Error) => (this.erroreGps = err.message),
            });
    }

    // Adatta la rotta a quella del dettaglio segnalazione del tuo progetto
    apriSegnalazione(s: SegnalazioneMappa) {
        this.router.navigate(['/segnalazioni', s.id]);
    }
}