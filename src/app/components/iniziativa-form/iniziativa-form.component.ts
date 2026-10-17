import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { CreateIniziativaPayload } from '../../services/iniziativa.service';

// Cosa restituisce il modal quando viene chiuso con "Pubblica invito"
export type IniziativaFormEvent = CreateIniziativaPayload;

// dataFine non può precedere dataInizio (se le date sono entrambe compilate)
function dateValidator(group: AbstractControl): ValidationErrors | null {
    const inizio = group.get('dataInizio')?.value;
    const fine = group.get('dataFine')?.value;
    if (inizio && fine && new Date(fine) < new Date(inizio)) {
        return { dateInvertite: true };
    }
    return null;
}

/* IniziativaFormComponent è il contenuto del modal di creazione invito (solo ente).
Non sta nel template di nessuna pagina: lo apre IniziativaAddPulsanteComponent tramite NgbModal.
Non chiama il backend: chiude il modal restituendo i dati, poi se ne occupa la pagina. */
@Component({
    selector: 'app-iniziativa-form',
    imports: [ReactiveFormsModule],
    templateUrl: './iniziativa-form.component.html',
    // styleUrl: './iniziativa-form.component.css',  // lo aggiungi quando farai il css
})
export class IniziativaFormComponent {
    protected fb = inject(FormBuilder);
    activeModal = inject(NgbActiveModal);

    // Controlli solo per l'utente (UX): la validazione vera (formato reale, peso) spetta al back,
    // che accetta file fino a 5 MB
    private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    protected readonly TIPI_ACCETTATI = ['image/png', 'image/jpeg', 'image/webp'];

    // Il backend vuole titolo (3-150 caratteri) e descrizione (1-2000); date, luogo (max 255) e immagine sono facoltativi.
    // Gli <input type="datetime-local"> danno stringhe tipo "2026-10-20T18:00"
    iniziativaForm = this.fb.nonNullable.group({
        titolo: ['', [Validators.required, Validators.pattern(/\S/), Validators.minLength(3), Validators.maxLength(100)]],
        descrizione: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(2000)]],
        luogo: ['', [Validators.maxLength(255)]],
        dataInizio: [''],
        dataFine: [''],
    }, { validators: dateValidator });

    immagine = signal<File | null>(null);
    immagineErrore = signal<string | null>(null);

    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0] ?? null;
        this.immagineErrore.set(null);

        if (!file) {
            this.immagine.set(null);
            return;
        }
        if (!this.TIPI_ACCETTATI.includes(file.type)) {
            this.immagine.set(null);
            this.immagineErrore.set('Formato non valido: usa PNG, JPEG o WEBP.');
            input.value = '';
            return;
        }
        if (file.size > this.MAX_FILE_SIZE) {
            this.immagine.set(null);
            this.immagineErrore.set('L\'immagine è troppo pesante (massimo 5 MB).');
            input.value = '';
            return;
        }
        this.immagine.set(file);
    }

    submit() {
        // il pulsante è disabilitato se il form non è valido, ma controllo anche qui
        if (this.iniziativaForm.invalid) return;

        const { titolo, descrizione, luogo, dataInizio, dataFine } = this.iniziativaForm.getRawValue();
        const result: IniziativaFormEvent = {
            titolo: titolo.trim(),
            descrizione: descrizione.trim(),
            luogo: luogo.trim() || undefined,
            // il back si aspetta date ISO (TIMESTAMP): converto dal valore locale del datetime-local
            dataInizio: dataInizio ? new Date(dataInizio).toISOString() : undefined,
            dataFine: dataFine ? new Date(dataFine).toISOString() : undefined,
            immagine: this.immagine() ?? undefined,
        };
        this.activeModal.close(result);
    }
}