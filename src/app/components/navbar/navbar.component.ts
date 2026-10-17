import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NavUserComponent } from '../nav-user/nav-user.component';
import { IfAuthenticatedDirective } from '../../utils/if-authenticated.directive';
import { IfRoleDirective } from '../../utils/if-role.directive';

@Component({
    selector: 'app-navbar',
    imports: [
        RouterLink,
        RouterLinkActive,
        NavUserComponent,
        IfAuthenticatedDirective,
        IfRoleDirective,
    ],
    templateUrl: './navbar.component.html',
    // styleUrl: './navbar.component.css',  // lo aggiungi quando farai il css
})
export class NavbarComponent {
    private authSrv = inject(AuthService);
    private router = inject(Router);

    currentUser = this.authSrv.currentUser;

    // Dal mockup del feed la città compare nell'header. Per ora è fissa
    protected readonly citta = 'Vicenza';

    // url corrente senza query string (es. /login?dest=/feed -> /login)
    private currentPath = toSignal(
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd),
            map(event => event.urlAfterRedirects.split('?')[0])
        ),
        { initialValue: this.router.url.split('?')[0] }
    );

    // nelle pagine di login e registrazione i pulsanti Accedi/Registrati in navbar sono superflui
    showAuthBtns = computed(() => !['/login', '/register'].includes(this.currentPath()));

    logout() {
        this.authSrv.logout();
        // vado direttamente al login: restare sulla pagina corrente non rieseguirebbe la guard
        // (Angular riusa la rotta) e la pagina resterebbe visibile
        this.router.navigate(['/login']);
    }
}
