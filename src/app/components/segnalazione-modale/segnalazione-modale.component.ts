import { Component, DestroyRef, ElementRef, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { SegnalazioneMappa } from '../../entities';
import { STATO_COLORE, STATO_LABEL } from '../../config/mappa.config';
import { Voto } from '../segnalazione-card/segnalazione-card.component';

// Quello che il modale restituisce quando si preme "Invia": entrambi i campi sono facoltativi
export type InvioConferma = {
    suggerimento: string,
    foto: File[]
};

type FotoConferma = {
    file: File,
    url: string // blob: URL solo per mostrare l'anteprima
};

// Componente "dumb" (come MappaViewComponent e SegnalazioneCardComponent): non conosce servizi né API,
// riceve la segnalazione toccata sulla mappa e restituisce eventi al padre.
@Component({
    selector: 'app-segnalazione-modale',
    templateUrl: './segnalazione-modale.component.html',
    styleUrl: './segnalazione-modale.component.css',
    // Esc chiude il modale
    host: { '(document:keydown.escape)': 'onChiudi.emit()' },
})
export class SegnalazioneModaleComponent {
    // --- Input ---
    segnalazione = input.required<SegnalazioneMappa>();
    // voto che l'utente aveva già dato (il padre se lo ricorda tra una apertura e l'altra)
    votoIniziale = input<Voto>(null);

    // --- Output ---
    onChiudi = output<void>();
    onVota = output<Voto>();
    onInvia = output<InvioConferma>();

    private destroyRef = inject(DestroyRef);
    private dialogo = viewChild.required<ElementRef<HTMLElement>>('dialogo');

    // Controlli solo per l'utente (UX), gli stessi della pagina "segnalazione": la validazione vera spetta al back
    protected readonly MAX_FOTO = 3;
    private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    private readonly TIPI_ACCETTATI = ['image/png', 'image/jpeg', 'image/webp'];

    voto = signal<Voto>(null);
    suggerimento = signal('');
    foto = signal<FotoConferma[]>([]);
    fotoErrore = signal<string | null>(null);

    protected colore = computed(() => STATO_COLORE[this.segnalazione().stato]);
    protected label = computed(() => STATO_LABEL[this.segnalazione().stato]);

    // totale voti del back + il mio voto (si assume che il totale del back non lo includa ancora, come nella card del feed)
    punteggio = computed(() => {
        const mio = this.voto() === 'su' ? 1 : this.voto() === 'giu' ? -1 : 0;
        return (this.segnalazione().voti ?? 0) + mio;
    });

    // "Invia" resta disattivato finché non c'è almeno un suggerimento o una foto (sono facoltativi, ma inviare il nulla non serve)
    puoInviare = computed(() => this.suggerimento().trim().length > 0 || this.foto().length > 0);

    // al ritorno il focus torna dov'era (il pin toccato)
    private elementoPrecedente = document.activeElement as HTMLElement | null;

    constructor() {
        this.destroyRef.onDestroy(() => {
            // gli URL delle anteprime occupano memoria finché non li rilascio
            this.foto().forEach(f => URL.revokeObjectURL(f.url));
            this.elementoPrecedente?.focus?.();
        });
    }

    ngOnInit() {
        this.voto.set(this.votoIniziale());
    }

    ngAfterViewInit() {
        // il focus entra nel modale: da tastiera / screen reader si parte da qui
        this.dialogo().nativeElement.focus();
    }

    vota(tipo: 'su' | 'giu') {
        // cliccando di nuovo lo stesso pollice il voto si toglie
        const nuovo: Voto = this.voto() === tipo ? null : tipo;
        this.voto.set(nuovo);
        this.onVota.emit(nuovo);
    }

    scrivi(event: Event) {
        this.suggerimento.set((event.target as HTMLTextAreaElement).value);
    }

    onFotoSelezionate(event: Event) {
        const input = event.target as HTMLInputElement;
        const nuove = Array.from(input.files ?? []);
        input.value = ''; // permette di riselezionare lo stesso file
        this.fotoErrore.set(null);

        for (const file of nuove) {
            if (this.foto().length >= this.MAX_FOTO) {
                this.fotoErrore.set(`Puoi aggiungere al massimo ${this.MAX_FOTO} foto.`);
                break;
            }
            if (!this.TIPI_ACCETTATI.includes(file.type)) {
                this.fotoErrore.set('Formato non supportato: usa una foto PNG, JPEG o WEBP.');
                continue;
            }
            if (file.size > this.MAX_FILE_SIZE) {
                this.fotoErrore.set('L\'immagine è troppo grande (massimo 5 MB).');
                continue;
            }
            this.foto.update(lista => [...lista, { file, url: URL.createObjectURL(file) }]);
        }
    }

    rimuoviFoto(daTogliere: FotoConferma) {
        URL.revokeObjectURL(daTogliere.url);
        this.foto.update(lista => lista.filter(f => f !== daTogliere));
        this.fotoErrore.set(null);
    }

    invia() {
        if (!this.puoInviare()) return;
        this.onInvia.emit({
            suggerimento: this.suggerimento().trim(),
            foto: this.foto().map(f => f.file),
        });
    }
}