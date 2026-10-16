import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterModule } from '@angular/router';

// messaggio mostrato sotto il campo quando è vuoto
const REQUIRED_MESSAGES: Record<string, string> = {
    firstName: 'Inserisci il tuo nome.',
    lastName: 'Inserisci il tuo cognome.',
    email: 'Inserisci la tua email.',
    password: 'Inserisci una password.',
    confirmPassword: 'Conferma la tua password.'
};

@Component({
    selector: 'app-register',
    imports: [ReactiveFormsModule, RouterModule],
    templateUrl: './register.component.html',
    styleUrl: './register.component.css',
})
export class RegisterComponent {
    protected fb = inject(FormBuilder);
    protected authSrv = inject(AuthService);
    private destroyRef = inject(DestroyRef);
    private router = inject(Router);

    // Nessun campo 'role': il backend registra ogni nuovo utente come 'cittadino'.
    // Nessun controllo password === confirmPassword: lo fa il backend.
    registerForm = this.fb.group({
        firstName: ['', { validators: [Validators.required] }],
        lastName: ['', { validators: [Validators.required] }],
        // il pattern richiede anche il punto dopo la @ (Validators.email accetterebbe "mario@comune")
        email: ['', { validators: [Validators.required, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)] }],
        password: ['', { validators: [Validators.required] }],
        confirmPassword: ['', { validators: [Validators.required] }]
    });

    errorMessage = signal<string | null>(null);
    // errori di un campo specifico restituiti dal backend (es. { email: 'Esiste già un account...' })
    serverErrors = signal<Record<string, string>>({});

    ngOnInit() {
        this.registerForm.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                this.errorMessage.set(null);
                this.serverErrors.set({});
            })
    }

    // messaggio di errore da mostrare sotto il campo (null = nessun errore).
    // Gli errori di validazione compaiono solo dopo che l'utente ha toccato il campo o ha premuto "Crea account"
    fieldError(name: string): string | null {
        const serverError = this.serverErrors()[name];
        if (serverError) {
            return serverError;
        }

        const control = this.registerForm.get(name)!;
        if (!control.touched || !control.errors) {
            return null;
        }
        if (control.errors['required']) {
            return REQUIRED_MESSAGES[name];
        }
        return 'Inserisci un\'email valida (es. nome@email.it).';
    }

    register() {
        if (this.registerForm.valid) {
            const { firstName, lastName, email, password, confirmPassword } = this.registerForm.value;
            this.authSrv.register({
                firstName: firstName!,
                lastName: lastName!,
                email: email!,
                password: password!,
                confirmPassword: confirmPassword!
            })
                .pipe(
                    // registrazione riuscita: faccio subito il login con le stesse credenziali,
                    // così l'utente entra senza passare dalla pagina di login
                    switchMap(() => this.authSrv.login(email!, password!)),
                    catchError(response => {
                        // 'UserExists' è l'errore previsto dal backend (400) quando l'email è già registrata
                        if (response.error?.error === 'UserExists') {
                            this.serverErrors.set({ email: 'Esiste già un account con questa email.' });
                        } else {
                            // include anche l'errore di "conferma password diversa" restituito dal backend
                            this.errorMessage.set(response.error?.message ?? 'Impossibile contattare il server, riprova più tardi.');
                        }
                        return throwError(() => response);
                    })
                )
                .subscribe(() => this.router.navigate(['/home']));
        } else {
            // mostra subito gli errori di tutti i campi non validi
            this.registerForm.markAllAsTouched();
        }
    }
}