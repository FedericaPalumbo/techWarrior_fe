import { Component, DestroyRef, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
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

const PASSWORD_MESSAGE = 'La password deve avere almeno 8 caratteri, una maiuscola, una minuscola, un numero e un carattere speciale (! @ # $ % ^ & *).';

// Stesse regole del backend (create-user.dto.ts). Il backend a una password debole risponde solo
// "Validation failed" senza dire perché: per questo le controllo anche qui, per spiegarlo all'utente.
function passwordForte(control: AbstractControl): ValidationErrors | null {
    const password: string = control.value ?? '';
    if (!password) {
        return null; // se è vuota se ne occupa Validators.required
    }
    const valida = password.length >= 8
        && /[A-Z]/.test(password)
        && /[a-z]/.test(password)
        && /[0-9]/.test(password)
        && /[!@#$%^&*]/.test(password);
    return valida ? null : { passwordDebole: true };
}

// password e conferma devono coincidere (il backend lo controlla di nuovo, ma risponde solo "Validation failed")
function passwordUguali(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const conferma = group.get('confirmPassword')?.value;
    return password && conferma && password !== conferma ? { passwordDiverse: true } : null;
}

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
    registerForm = this.fb.group({
        firstName: ['', { validators: [Validators.required] }],
        lastName: ['', { validators: [Validators.required] }],
        // il pattern richiede anche il punto dopo la @ (Validators.email accetterebbe "mario@comune")
        email: ['', { validators: [Validators.required, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)] }],
        password: ['', { validators: [Validators.required, passwordForte] }],
        confirmPassword: ['', { validators: [Validators.required] }]
    }, { validators: [passwordUguali] });

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
        if (!control.touched) {
            return null;
        }
        if (control.errors?.['required']) {
            return REQUIRED_MESSAGES[name];
        }
        if (name === 'email' && control.errors?.['pattern']) {
            return 'Inserisci un\'email valida (es. nome@email.it).';
        }
        if (name === 'password' && control.errors?.['passwordDebole']) {
            return PASSWORD_MESSAGE;
        }
        if (name === 'confirmPassword' && this.registerForm.errors?.['passwordDiverse']) {
            return 'Le due password non coincidono.';
        }
        return null;
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
                        if (response.status === 409) {
                            // il backend risponde 409 quando l'email è già registrata
                            this.serverErrors.set({ email: 'Esiste già un account con questa email.' });
                        } else if (response.status === 429) {
                            this.errorMessage.set('Troppi tentativi, riprova tra un minuto.');
                        } else {
                            this.errorMessage.set(response.error?.message ?? 'Impossibile contattare il server, riprova più tardi.');
                        }
                        return throwError(() => response);
                    })
                )
                .subscribe(() => this.router.navigate(['/feed']));
        } else {
            // mostra subito gli errori di tutti i campi non validi
            this.registerForm.markAllAsTouched();
        }
    }
}