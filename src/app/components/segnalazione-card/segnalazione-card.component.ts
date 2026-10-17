import { Component, computed, input, output, signal } from '@angular/core';
import { Segnalazione } from '../../entities';

// pollice in su, in giù, oppure nessun voto (cliccando di nuovo lo stesso pollice il voto si toglie)
export type Voto = 'su' | 'giu' | null;

@Component({
    selector: 'app-segnalazione-card',
    imports: [],
    templateUrl: './segnalazione-card.component.html',
    styleUrl: './segnalazione-card.component.css',
})
export class SegnalazioneCardComponent {
    segnalazione = input.required<Segnalazione>();

    onMappa = output<void>();
    onVota = output<Voto>();
    onSuggerimento = output<string>();

    espansa = signal(false);
    voto = signal<Voto>(null);
    suggerimento = signal('');

    // Nel feed mostro solo la prima foto (il back le restituisce già dentro la segnalazione)
    immagine = computed(() => this.segnalazione().immagini[0]?.url ?? null);

    // "29/10/2026"
    data = computed(() =>
        new Date(this.segnalazione().createdAt).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        })
    );

    // totale voti del back + il mio voto (si assume che il totale del back non lo includa ancora)
    punteggio = computed(() => {
        const mio = this.voto() === 'su' ? 1 : this.voto() === 'giu' ? -1 : 0;
        return (this.segnalazione().voti ?? 0) + mio;
    });

    // "Invia" resta disattivato finché il campo è vuoto
    puoInviare = computed(() => this.suggerimento().trim().length > 0);

    toggle() {
        this.espansa.update(valore => !valore);
    }

    // Invio da tastiera solo se il focus è sulla card stessa (non su pulsanti o textarea al suo interno)
    onEnter(event: Event) {
        if (event.target === event.currentTarget) {
            this.toggle();
        }
    }

    vaiAllaMappa(event: Event) {
        // il click sul pin non deve espandere la card
        event.stopPropagation();
        this.onMappa.emit();
    }

    vota(event: Event, tipo: 'su' | 'giu') {
        event.stopPropagation();
        const nuovo: Voto = this.voto() === tipo ? null : tipo;
        this.voto.set(nuovo);
        this.onVota.emit(nuovo);
    }

    scrivi(event: Event) {
        this.suggerimento.set((event.target as HTMLTextAreaElement).value);
    }

    invia() {
        if (!this.puoInviare()) return;
        this.onSuggerimento.emit(this.suggerimento().trim());
        this.suggerimento.set('');
        this.espansa.set(false);
    }
}