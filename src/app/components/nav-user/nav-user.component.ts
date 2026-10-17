import { Component, computed, input, output } from '@angular/core';
import { User } from '../../services/auth.service';
import { USER_ROLE_LABELS } from '../../entities';

// Parte della navbar che mostra l'utente loggato e il pulsante di uscita
@Component({
    selector: 'app-nav-user',
    templateUrl: './nav-user.component.html',
    // styleUrl: './nav-user.component.css',  // lo aggiungi quando farai il css
})
export class NavUserComponent {
    user = input.required<User>();

    logoutEvent = output({ alias: 'logout' });

    // "Cittadino" / "Ente comunale"
    ruolo = computed(() => USER_ROLE_LABELS[this.user().role]);

    logout() {
        this.logoutEvent.emit();
    }
}
