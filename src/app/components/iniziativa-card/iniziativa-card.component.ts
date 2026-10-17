import { Component, computed, input, output } from '@angular/core';
import { Iniziativa } from '../../entities';

@Component({
    selector: 'app-iniziativa-card',
    imports: [],
    templateUrl: './iniziativa-card.component.html',
    styleUrl: './iniziativa-card.component.css',
})
export class IniziativaCardComponent {
    iniziativa = input.required<Iniziativa>();
    // il pulsante "Partecipo" lo vede solo il cittadino: lo decide la pagina
    mostraPartecipa = input(true);

    onPartecipa = output<void>();
    onAnnullaPartecipa = output<void>();

    // immagineUrl è facoltativa nel DB
    immagine = computed(() => this.iniziativa().immagineUrl);

    // "giovedì 17 ottobre" oppure "dal 17 ottobre al 20 ottobre" (se ci sono entrambe le date)
    periodo = computed(() => {
        const { dataInizio, dataFine } = this.iniziativa();
        const formatta = (iso: string) => new Date(iso).toLocaleDateString('it-IT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        });

        if (dataInizio && dataFine) {
            return `dal ${formatta(dataInizio)} al ${formatta(dataFine)}`;
        }
        if (dataInizio) {
            return formatta(dataInizio);
        }
        return null;
    });

    // data (e luogo se presente) in una riga sola, come nella card delle segnalazioni
    dettagli = computed(() => {
        const luogo = this.iniziativa().luogo;
        const periodo = this.periodo();
        return [periodo, luogo].filter(Boolean).join(', ');
    });

    partecipa() {
        if (this.iniziativa().partecipo) {
            this.onAnnullaPartecipa.emit();
        } else {
            this.onPartecipa.emit();
        }
    }
}