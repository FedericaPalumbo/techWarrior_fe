import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { SegnalazioneComponent } from './pages/segnalazione/segnalazione.component';
import { FeedComponent } from './pages/feed/feed.component';
import { InvitoVolontariComponent } from './pages/invitoVolontari/invitoVolontari.component';
import { authGuard } from './utils/auth.guard';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'segnalazione', component: SegnalazioneComponent, canActivate: [authGuard] },
    { path: 'feed', component: FeedComponent, canActivate: [authGuard] },
    { path: 'inviti', component: InvitoVolontariComponent, canActivate: [authGuard] },
];