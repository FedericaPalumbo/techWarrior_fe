import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { SegnalazioneComponent } from './pages/segnalazione/segnalazione.component';
import { FeedComponent } from './pages/feed/feed.component';
import { InvitoVolontariComponent } from './pages/invitoVolontari/invitoVolontari.component';
import { authGuard } from './utils/auth.guard';
import { MappaComponent } from './pages/mappa/mappa.component';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    //{ path: 'segnalazioni', component: SegnalazioneComponent },
    //{ path: 'feed', component: FeedComponent },
    //{ path: 'inviti', component: InvitoVolontariComponent },
    { path: 'mappa', component: MappaComponent },
    { path: 'segnalazione', component: SegnalazioneComponent, canActivate: [authGuard] },
    { path: 'feed', component: FeedComponent, canActivate: [authGuard] },
    { path: 'inviti', component: InvitoVolontariComponent, canActivate: [authGuard] },
];