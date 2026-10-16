import { Directive, effect, inject, input, TemplateRef, ViewContainerRef } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../entities';

@Directive({
    selector: '[ifRole]'
})
export class IfRoleDirective {
    private authSrv = inject(AuthService);
    private templateRef = inject(TemplateRef<unknown>);
    private viewContainer = inject(ViewContainerRef);

    // ruolo per cui mostrare il template: *ifRole="'teacher'" lo mostra solo ai docenti.
    // Se l'utente non è loggato non ha nessun ruolo, quindi il template non viene mostrato
    expected = input.required<UserRole>({ alias: 'ifRole' });

    // *ifRole="'teacher'; else studentView" -> binding su ifRoleElse
    elseTemplate = input<TemplateRef<unknown> | null>(null, { alias: 'ifRoleElse' });

    // tengo traccia di cosa sto mostrando per non ricreare la view inutilmente
    private currentTemplate: TemplateRef<unknown> | null = null;

    constructor() {
        effect(() => {
            // mostro e nascondo ogni volta che cambia l'utente corrente (login, logout) o il ruolo atteso
            const matches = this.authSrv.currentUser()?.role === this.expected();
            this.updateView(matches ? this.templateRef : this.elseTemplate());
        });
    }

    private updateView(template: TemplateRef<unknown> | null) {
        if (template === this.currentTemplate) return;

        this.viewContainer.clear();
        this.currentTemplate = template;

        if (template) {
            this.viewContainer.createEmbeddedView(template);
        }
    }
}