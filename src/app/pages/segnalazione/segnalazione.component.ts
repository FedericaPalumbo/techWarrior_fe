import { Component, DestroyRef, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Subject, catchError, of, switchMap, tap } from 'rxjs';
import { MappaSceltaComponent } from '../../components/mappa-scelta/mappa-scelta.component';
import { MAPPA_CONFIG } from '../../config/mappa.config';
import { Coordinate, GeocodificaService } from '../../services/geocodifica.service';
import { PosizioneService } from '../../services/posizione.service';
import { SegnalazioneService } from '../../services/segnalazione.service';

// Il testo viene inviato senza spazi ai lati, quindi la lunghezza minima la controllo sul testo ripulito
function testoMinimo(min: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null =>
        String(control.value ?? '').trim().length >= min ? null : { testoMinimo: { min } };
}

@Component({
    selector: 'app-segnalazione',
    imports: [ReactiveFormsModule, MappaSceltaComponent],
    templateUrl: './segnalazione.component.html',
    styleUrl: './segnalazione.component.css',
})
export class SegnalazioneComponent {
    private fb = inject(FormBuilder);
    private segnalazioneSrv = inject(SegnalazioneService);
    private posizioneSrv = inject(PosizioneService);
    private geocodificaSrv = inject(GeocodificaService);
    private destroyRef = inject(DestroyRef);

    // Riferimento all'<input type="file" #fileInput> del template
    private fotoInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

    // Controlli solo per l'utente (UX): la validazione vera (formato reale, peso) spetta al back,
    // che accetta file fino a 5 MB
    private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    protected readonly TIPI_ACCETTATI = ['image/png', 'image/jpeg', 'image/webp'];

    // Obbligatori: titolo (almeno 3 caratteri) e indirizzo (lo compila in automatico la mappa).
    // Facoltativi: descrizione, foto e "soluzione" (che diventa una proposta collegata alla segnalazione).
    form = this.fb.nonNullable.group({
        titolo: ['', [testoMinimo(3), Validators.maxLength(100)]],
        indirizzo: ['', [testoMinimo(1), Validators.maxLength(255)]],
        descrizione: ['', [Validators.maxLength(2000)]],
        soluzione: [''],
    });

    // Stato della pagina (signal, così il template si aggiorna anche dopo le callback async)
    foto = signal<File | null>(null); // il file originale: è quello che manda il service
    anteprima = signal<string | null>(null); // blob: URL solo per mostrare la foto nella pagina
    fotoErrore = signal<string | null>(null);
    inviando = signal(false);
    inviata = signal(false);
    errore = signal<string | null>(null);
    avviso = signal<string | null>(null);

    // --- Zona della segnalazione (mappa + indirizzo) ---
    posizione = signal<Coordinate | null>(null); // il punto scelto sulla mappa
    gpsInCorso = signal(false);
    indirizzoInCerca = signal(false);
    avvisoZona = signal<string | null>(null);

    // Fuori dal rettangolo del comune (MAPPA_CONFIG.maxBounds) la segnalazione non comparirebbe sulla mappa
    fuoriComune = computed(() => {
        const punto = this.posizione();
        if (!punto) {
            return false;
        }
        const [[sud, ovest], [nord, est]] = MAPPA_CONFIG.maxBounds;
        return punto.latitudine < sud || punto.latitudine > nord
            || punto.longitudine < ovest || punto.longitudine > est;
    });

    // Due flussi con switchMap: se l'utente clicca più volte in fretta conta solo l'ultima risposta
    private richiestaIndirizzo$ = new Subject<Coordinate>(); // pin spostato -> ricavo l'indirizzo
    private ricercaIndirizzo$ = new Subject<string>(); // testo scritto -> ricavo il punto

    constructor() {
        // l'URL dell'anteprima occupa memoria finché non lo rilascio
        this.destroyRef.onDestroy(() => this.rilasciaAnteprima());

        this.richiestaIndirizzo$
            .pipe(
                tap(() => this.indirizzoInCerca.set(true)),
                switchMap(punto => this.geocodificaSrv.indirizzoDa(punto).pipe(catchError(() => of(null)))),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(indirizzo => {
                this.indirizzoInCerca.set(false);
                if (indirizzo) {
                    this.form.controls.indirizzo.setValue(indirizzo);
                    this.avvisoZona.set(null);
                } else {
                    this.avvisoZona.set('Non riesco a ricavare l\'indirizzo di questo punto: scrivilo a mano.');
                }
            });

        this.ricercaIndirizzo$
            .pipe(
                tap(() => {
                    this.indirizzoInCerca.set(true);
                    this.avvisoZona.set(null);
                }),
                // undefined = errore di rete, null = indirizzo non trovato
                switchMap(testo => this.geocodificaSrv.coordinateDa(testo).pipe(catchError(() => of(undefined)))),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(punto => {
                this.indirizzoInCerca.set(false);
                if (punto === undefined) {
                    this.avvisoZona.set('Ricerca non riuscita. Riprova tra qualche istante.');
                } else if (punto === null) {
                    this.avvisoZona.set('Indirizzo non trovato: prova ad aggiungere il comune.');
                } else {
                    this.posizione.set(punto); // il pin si sposta, l'indirizzo resta quello scritto dall'utente
                }
            });
    }

    ngOnInit() {
        // All'apertura la pagina parte dalla posizione attuale dell'utente
        this.usaPosizioneCorrente();
    }

    // Pulsante "usa posizione corrente" (e apertura pagina)
    usaPosizioneCorrente() {
        this.gpsInCorso.set(true);
        this.avvisoZona.set(null);

        this.posizioneSrv
            .getPosizioneCorrente()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: pos => {
                    this.gpsInCorso.set(false);
                    this.impostaPosizione({ latitudine: pos.latitudine, longitudine: pos.longitudine });
                },
                // il service restituisce già un messaggio pronto da mostrare
                error: (err: Error) => {
                    this.gpsInCorso.set(false);
                    this.avvisoZona.set(err.message);
                },
            });
    }

    // Evento della mappa: l'utente ha cliccato o trascinato il pin
    impostaPosizione(punto: Coordinate) {
        this.posizione.set(punto);
        this.richiestaIndirizzo$.next(punto);
    }

    // Lente di ricerca o Invio nella barra (l'Invio non deve inviare tutto il form)
    cercaIndirizzo(event?: Event) {
        event?.preventDefault();
        const testo = this.form.controls.indirizzo.value.trim();
        if (testo) {
            this.ricercaIndirizzo$.next(testo);
        }
    }

    onFotoSelezionata(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) {
            return;
        }

        this.fotoErrore.set(null);

        if (!this.TIPI_ACCETTATI.includes(file.type)) {
            this.fotoErrore.set('Formato non supportato: usa una foto PNG, JPEG o WEBP.');
            input.value = '';
            return;
        }
        if (file.size > this.MAX_FILE_SIZE) {
            this.fotoErrore.set('L\'immagine è troppo grande (massimo 5 MB).');
            input.value = '';
            return;
        }

        // Nessuna conversione: al back arriva il file così com'è
        this.impostaFoto(file);
    }

    rimuoviFoto() {
        this.svuotaInputFoto(); // permette di riselezionare lo stesso file
        this.impostaFoto(null);
        this.fotoErrore.set(null);
    }

    invia() {
        this.form.markAllAsTouched();

        if (this.form.invalid) {
            return;
        }

        // La foto è facoltativa: se manca, foto è null e il service non la invia
        const foto = this.foto();

        const { titolo, indirizzo, descrizione, soluzione } = this.form.getRawValue();
        const soluzioneTrim = soluzione.trim();

        this.inviando.set(true);
        this.inviata.set(false);
        this.errore.set(null);
        this.avviso.set(null);

        this.segnalazioneSrv
            .create({
                titolo: titolo.trim(),
                descrizione: descrizione.trim(),
                indirizzo: indirizzo.trim(),
                foto,
            })
            .pipe(
                // Se c'è una soluzione la salvo come proposta collegata alla segnalazione appena creata
                switchMap(segnalazione => {
                    if (!soluzioneTrim) {
                        return of(null);
                    }
                    return this.segnalazioneSrv
                        .addProposta(segnalazione.id, { descrizione: soluzioneTrim })
                        .pipe(
                            // La segnalazione esiste già: non devo farla reinviare all'utente
                            catchError(() => {
                                this.avviso.set(
                                    'La segnalazione è stata inviata, ma non è stato possibile salvare la soluzione proposta.'
                                );
                                return of(null);
                            })
                        );
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: () => {
                    this.inviando.set(false);
                    this.inviata.set(true);
                    this.resetForm();
                },
                error: response => {
                    this.inviando.set(false);
                    this.errore.set(this.messaggioErrore(response));
                },
            });
    }

    // Il back risponde con messaggi utili (es. "Indirizzo non trovato", "Servizio di geocodifica non raggiungibile")
    private messaggioErrore(response: { status?: number, error?: { message?: string } }): string {
        if (response.status === 403) {
            return 'Solo i cittadini possono inviare segnalazioni.';
        }
        const messaggio = response.error?.message;
        if (messaggio && messaggio !== 'Validation failed') {
            return messaggio;
        }
        return 'Invio non riuscito. Controlla i dati e riprova tra qualche istante.';
    }

    private svuotaInputFoto() {
        const el = this.fotoInput()?.nativeElement;
        if (el) {
            el.value = '';
        }
    }

    private resetForm() {
        this.form.reset();
        this.svuotaInputFoto();
        this.impostaFoto(null);
        this.fotoErrore.set(null);

        // Il reset ha svuotato anche l'indirizzo: il pin è ancora sulla mappa, quindi lo ricavo di nuovo
        const punto = this.posizione();
        if (punto) {
            this.richiestaIndirizzo$.next(punto);
        }
    }

    // Tiene allineati file e anteprima, rilasciando sempre il blob: URL precedente
    private impostaFoto(file: File | null) {
        this.rilasciaAnteprima();
        this.foto.set(file);
        this.anteprima.set(file ? URL.createObjectURL(file) : null);
    }

    private rilasciaAnteprima() {
        const url = this.anteprima();
        if (url) {
            URL.revokeObjectURL(url);
        }
    }
}