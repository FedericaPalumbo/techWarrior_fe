import { Component, computed, input, output } from '@angular/core';
import { Segnalazione } from '../../entities';

@Component({
    selector: 'app-segnalazione-card',
    imports: [],
    templateUrl: './segnalazione-card.component.html',
    // styleUrl: './segnalazione-card.component.css',  // lo aggiungi quando farai il css
})
export class SegnalazioneCardComponent {
    segnalazione = input.required<Segnalazione>();

    onDetail = output<void>();
    onPartecipi = output<void>();

    // Nel feed mostro solo la prima foto (il back le restituisce già dentro la segnalazione)
    immagine = computed(() => this.segnalazione().immagini[0]?.url ?? null);

    // "giovedì 17 ottobre, Via Cesare": data di creazione + indirizzo (se presente)
    dettagli = computed(() => {
        const { createdAt, indirizzo } = this.segnalazione();
        const data = new Date(createdAt).toLocaleDateString('it-IT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        });
        return indirizzo ? `${data}, ${indirizzo}` : data;
    });

    goToDetail() {
        this.onDetail.emit();
    }

    partecipi(event: Event) {
        // il click sul pulsante non deve aprire anche il dettaglio della card
        event.stopPropagation();
        this.onPartecipi.emit();
    }
}