import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { SegnalazioneComponent } from './pages/segnalazione/segnalazione.component';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'segnalazione', component: SegnalazioneComponent },
    // TODO: { path: 'home', component: ... } per il cittadino
];