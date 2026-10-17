import { Component, inject, output } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { IniziativaFormComponent, IniziativaFormEvent } from '../iniziativa-form/iniziativa-form.component';

/* IniziativaAddPulsanteComponent è il pulsante "Nuovo invito". Quando lo premi apre il modal con il form (NgbModal).
Non chiama il backend: quando il modal viene chiuso con "Pubblica invito" emette onAdd con i dati e la pagina si occupa del resto. */
@Component({
    selector: 'app-iniziativa-addpulsante',
    templateUrl: './iniziativa-addpulsante.component.html',
    styleUrl: './iniziativa-addpulsante.component.css',
})
export class IniziativaAddPulsanteComponent {
    private modalService = inject(NgbModal);

    onAdd = output<IniziativaFormEvent>();

    openModal() {
        const modalRef = this.modalService.open(IniziativaFormComponent);

        modalRef.result.then(
            (result: IniziativaFormEvent) => {
                this.onAdd.emit(result);
            },
            () => {
                // dismissed (chiudi o click fuori dal modal), non fare nulla
            }
        );
    }
}