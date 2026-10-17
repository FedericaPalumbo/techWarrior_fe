import { Directive, effect, inject, input, TemplateRef, ViewContainerRef } from '@angular/core';
import { AuthService } from '../services/auth.service';

@Directive({
  selector: '[ifAuthenticated]'
})
export class IfAuthenticatedDirective {
  private authSrv = inject(AuthService);
  private templateRef = inject(TemplateRef<unknown>);
  private viewContainer = inject(ViewContainerRef);

  // stato di login per cui mostrare il template: *ifAuthenticated="false" inverte la condizione.
  // *ifAuthenticated senza valore bind la stringa vuota, che qui vale true
  expected = input(true, {
    alias: 'ifAuthenticated',
    transform: (value: boolean | '') => value === '' || value,
  });

  // *ifAuthenticated="true; else notLogged" -> binding su ifAuthenticatedElse
  elseTemplate = input<TemplateRef<unknown> | null>(null, { alias: 'ifAuthenticatedElse' });

  // tengo traccia di cosa sto mostrando per non ricreare la view inutilmente
  private currentTemplate: TemplateRef<unknown> | null = null;

  constructor() {
    effect(() => {
      // mostro e nascondo ogni volta che isAuthenticated cambia
      const matches = this.authSrv.isAuthenticated() === this.expected();
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
