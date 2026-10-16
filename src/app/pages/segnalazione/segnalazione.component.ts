import { Component, DestroyRef, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, of, switchMap } from 'rxjs';
import { SegnalazioneService } from '../../services/segnalazione.service';
import { ImageService } from '../../services/image.service';

interface Posizione {
    latitudine: number;
    longitudine: number;
}

@Component({
    selector: 'app-segnalazione',
    imports: [ReactiveFormsModule],
    templateUrl: './segnalazione.component.html',
    // styleUrl: './segnalazione.component.css',  // lo aggiungi quando farai il css
})
export class SegnalazioneComponent implements OnInit {
    private fb = inject(FormBuilder);
    private segnalazioneSrv = inject(SegnalazioneService);
    private imageSrv = inject(ImageService);
    private destroyRef = inject(DestroyRef);

    // Riferimento all'<input type="file" #fileInput> del template
    private fotoInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

    private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB (prima della conversione)

    // Campi di testo. "descrizione" e "soluzione" sono facoltativi.
    form = this.fb.nonNullable.group({
        titolo: ['', [Validators.required, Validators.maxLength(100)]],
        descrizione: [''],
        soluzione: [''],
    });

    // Stato della pagina (signal, così il template si aggiorna anche dopo le callback async)
    foto = signal<string | null>(null); // data URL JPEG, usato sia per anteprima che per l'invio
    fotoErrore = signal<string | null>(null);
    posizione = signal<Posizione | null>(null);
    posizioneErrore = signal<string | null>(null);
    tentativoInvio = signal(false);
    inviando = signal(false);
    inviata = signal(false);
    errore = signal<string | null>(null);
    avviso = signal<string | null>(null);

    ngOnInit() {
        // latitudine e longitudine sono NOT NULL nel DB: le chiedo subito al dispositivo
        this.richiediPosizione();
    }

    richiediPosizione() {
        this.posizioneErrore.set(null);

        if (!navigator.geolocation) {
            this.posizioneErrore.set('Il tuo dispositivo non supporta la geolocalizzazione.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            pos => {
                this.posizione.set({
                    latitudine: pos.coords.latitude,
                    longitudine: pos.coords.longitude,
                });
            },
            () => {
                this.posizioneErrore.set(
                    'Non riesco a ottenere la posizione. Controlla i permessi di localizzazione e riprova.'
                );
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }

    onFotoSelezionata(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) {
            return;
        }

        this.fotoErrore.set(null);

        if (!file.type.startsWith('image/')) {
            this.fotoErrore.set('Il file selezionato non è un\'immagine.');
            input.value = '';
            return;
        }
        if (file.size > this.MAX_FILE_SIZE) {
            this.fotoErrore.set('L\'immagine è troppo grande (massimo 10 MB).');
            input.value = '';
            return;
        }

        // PNG (o altro) -> JPEG ridimensionato, in formato stringa come richiesto dal back
        this.imageSrv
            .toJpegDataUrl(file)
            .then(dataUrl => this.foto.set(dataUrl))
            .catch(() => {
                this.fotoErrore.set('Non è stato possibile leggere l\'immagine. Prova con un\'altra foto.');
                input.value = '';
            });
    }

    rimuoviFoto() {
        this.svuotaInputFoto(); // permette di riselezionare lo stesso file
        this.foto.set(null);
        this.fotoErrore.set(null);
    }

    invia() {
        this.tentativoInvio.set(true);
        this.form.markAllAsTouched();

        const foto = this.foto();
        const posizione = this.posizione();
        if (this.form.invalid || !foto || !posizione) {
            return;
        }

        const { titolo, descrizione, soluzione } = this.form.getRawValue();
        const soluzioneTrim = soluzione.trim();

        this.inviando.set(true);
        this.errore.set(null);
        this.avviso.set(null);

        this.segnalazioneSrv
            .create({
                titolo: titolo.trim(),
                descrizione: descrizione.trim() || undefined,
                latitudine: posizione.latitudine,
                longitudine: posizione.longitudine,
                immagini: [foto],
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
                error: () => {
                    this.inviando.set(false);
                    this.errore.set('Invio non riuscito. Riprova tra qualche istante.');
                },
            });
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
        this.foto.set(null);
        this.fotoErrore.set(null);
        this.tentativoInvio.set(false);
    }
}