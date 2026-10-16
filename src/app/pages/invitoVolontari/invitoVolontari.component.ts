import { Component, inject, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { BehaviorSubject, catchError, EMPTY, of, switchMap, tap } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { IniziativaService } from '../../services/iniziativa.service';
import { IniziativaCardComponent } from '../../components/iniziativa-card/iniziativa-card.component';
import { IniziativaAddPulsanteComponent } from '../../components/iniziativa-addpulsante/iniziativa-addpulsante.component';
import { IniziativaFormEvent } from '../../components/iniziativa-form/iniziativa-form.component';
import { IfRoleDirective } from '../../utils/if-role.directive';

@Component({
    selector: 'app-invito-volontari',
    imports: [
        IniziativaCardComponent,
        IniziativaAddPulsanteComponent,
        AsyncPipe,
        IfRoleDirective,
    ],
    templateUrl: './invitoVolontari.component.html',
    // styleUrl: './invitoVolontari.component.css',  // lo aggiungi quando farai il css
})
export class InvitoVolontariComponent {
    protected authSrv = inject(AuthService);
    protected iniziativaSrv = inject(IniziativaService);

    errorMessage = signal<string | null>(null);

    // emette ogni volta che la lista va ricaricata (la prima emissione è il caricamento iniziale)
    protected reload$ = new BehaviorSubject<void>(undefined);

    iniziative$ = this.reload$.pipe(
        tap(() => this.errorMessage.set(null)),
        switchMap(() => this.iniziativaSrv.find().pipe(
            catchError(response => {
                this.mostraErrore(response);
                return of([]);
            })
        ))
    );

    ricarica() {
        this.reload$.next();
    }

    // l'ente crea l'invito dal modal, poi la lista viene ricaricata
    create(iniziativa: IniziativaFormEvent) {
        this.errorMessage.set(null);
        this.iniziativaSrv.create(iniziativa)
            .pipe(
                catchError(response => {
                    this.mostraErrore(response);
                    return EMPTY;
                })
            )
            .subscribe(() => {
                this.reload$.next();
            });
    }

    // il cittadino dà la disponibilità come volontario
    partecipa(id: number) {
        this.errorMessage.set(null);
        this.iniziativaSrv.partecipa(id)
            .pipe(
                catchError(response => {
                    this.mostraErrore(response);
                    return EMPTY;
                })
            )
            .subscribe(() => {
                this.reload$.next();
            });
    }

    annullaPartecipazione(id: number) {
        this.errorMessage.set(null);
        this.iniziativaSrv.annullaPartecipazione(id)
            .pipe(
                catchError(response => {
                    this.mostraErrore(response);
                    return EMPTY;
                })
            )
            .subscribe(() => {
                this.reload$.next();
            });
    }

    // se manca il messaggio del BE (ad esempio server spento, status 0) uso un testo generico
    private mostraErrore(response: { error?: { message?: string } }) {
        this.errorMessage.set(response.error?.message ?? 'Si è verificato un errore, riprova più tardi');
    }
}
