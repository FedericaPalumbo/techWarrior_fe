import { Component, DestroyRef, inject, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, map, of, switchMap, tap } from 'rxjs';
import { SegnalazioneService } from '../../services/segnalazione.service';
import { SegnalazioneCardComponent, Voto } from '../../components/segnalazione-card/segnalazione-card.component';


@Component({
    selector: 'app-feed',
    imports: [
        SegnalazioneCardComponent,
        AsyncPipe,
        RouterLink,
    ],
    templateUrl: './feed.component.html',
    styleUrl: './feed.component.css',
})
export class FeedComponent {
    protected segnalazioneSrv = inject(SegnalazioneService);
    protected router = inject(Router);
    private destroyRef = inject(DestroyRef);

    errorMessage = signal<string | null>(null);

    // emette ogni volta che il feed va ricaricato (la prima emissione è il caricamento iniziale)
    protected reload$ = new BehaviorSubject<void>(undefined);

    segnalazioni$ = this.reload$.pipe(
        tap(() => this.errorMessage.set(null)),
        switchMap(() => this.segnalazioneSrv.find().pipe(
            tap(res => console.log('feed response', res)),   // <-- il log
            map((res: any) => Array.isArray(res) ? res : (res?.data ?? [])),
            catchError(response => {
                this.errorMessage.set(response.error?.message ?? 'Si è verificato un errore, riprova più tardi');
                return of([]);
            })
        ))
    );

    ricarica() {
        this.reload$.next();
    }

    // il pin della card apre la mappa; la mappa potrà leggere ?segnalazione=<id> per centrarsi sul pin
    vaiAllaMappa(id: number) {
        this.router.navigate(['/mappa'], { queryParams: { segnalazione: id } });
    }

    vota(id: number, voto: Voto) {
        // TODO: da collegare al back (tabella voti_segnalazione) quando ci sarà l'endpoint dei voti
        console.log('Voto alla segnalazione', id, voto);
    }

    // il suggerimento è una riga di proposte_segnalazione (addProposta esiste già nel service)
    inviaSuggerimento(id: number, descrizione: string) {
        this.segnalazioneSrv.addProposta(id, { descrizione })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                error: response => this.errorMessage.set(
                    response.error?.message ?? 'Non è stato possibile inviare il suggerimento'
                ),
            });
    }
}