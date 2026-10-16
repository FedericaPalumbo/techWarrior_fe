import { Component, inject, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, of, switchMap, tap } from 'rxjs';
import { SegnalazioneService } from '../../services/segnalazione.service';
import { SegnalazioneCardComponent } from '../../components/segnalazione-card/segnalazione-card.component';

@Component({
    selector: 'app-feed',
    imports: [
        SegnalazioneCardComponent,
        AsyncPipe,
        RouterLink,
    ],
    templateUrl: './feed.component.html',
    // styleUrl: './feed.component.css',  // lo aggiungi quando farai il css
})
export class FeedComponent {
    protected segnalazioneSrv = inject(SegnalazioneService);
    protected router = inject(Router);

    errorMessage = signal<string | null>(null);

    // emette ogni volta che il feed va ricaricato (la prima emissione è il caricamento iniziale)
    protected reload$ = new BehaviorSubject<void>(undefined);

    segnalazioni$ = this.reload$.pipe(
        tap(() => this.errorMessage.set(null)),
        switchMap(() => this.segnalazioneSrv.find().pipe(
            catchError(response => {
                // se manca il messaggio del BE (ad esempio server spento, status 0) uso un testo generico
                this.errorMessage.set(response.error?.message ?? 'Si è verificato un errore, riprova più tardi');
                return of([]);
            })
        ))
    );

    ricarica() {
        this.reload$.next();
    }

    navigateToDetail(id: number) {
        // TODO: la pagina di dettaglio non esiste ancora (la rotta 'segnalazione' è il form di creazione)
        this.router.navigate(['/segnalazioni', id]);
    }

    partecipi(id: number) {
        // TODO: da collegare al back quando ci sarà l'endpoint per i volontari
        console.log('Partecipi alla segnalazione', id);
    }
}