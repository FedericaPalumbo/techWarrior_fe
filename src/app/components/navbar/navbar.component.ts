import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NavUserComponent } from '../nav-user/nav-user.component';
import { IfAuthenticatedDirective } from '../../utils/if-authenticated.directive';

@Component({
    selector: 'app-navbar',
    imports: [
        RouterLink,
        RouterLinkActive,
        NavUserComponent,
        IfAuthenticatedDirective,
    ],
    templateUrl: './navbar.component.html',
    styleUrl: './navbar.component.css',
})
export class NavbarComponent {
    private authSrv = inject(AuthService);
    private router = inject(Router);

    currentUser = this.authSrv.currentUser;

    // Dal mockup del feed la città compare nell'header. Per ora è fissa
    protected readonly citta = 'Vicenza';

    // menu a tendina aperto dall'hamburger (solo su telefono)
    menuAperto = signal(false);

    toggleMenu() {
        this.menuAperto.update(valore => !valore);
    }

    chiudiMenu() {
        this.menuAperto.set(false);
    }

    logout() {
        this.chiudiMenu();
        this.authSrv.logout();
        // vado direttamente al login: restare sulla pagina corrente non rieseguirebbe la guard
        // (Angular riusa la rotta) e la pagina resterebbe visibile
        this.router.navigate(['/login']);
    }
}