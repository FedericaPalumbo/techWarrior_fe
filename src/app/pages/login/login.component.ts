import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { JwtService } from '../../services/jwt.service';
import { catchError, throwError } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

@Component({
    selector: 'app-login',
    imports: [ReactiveFormsModule, RouterModule],
    templateUrl: './login.component.html',
    styleUrl: './login.component.css',
})
export class LoginComponent {
    protected fb = inject(FormBuilder);
    protected authSrv = inject(AuthService);
    private jwtSrv = inject(JwtService);
    private destroyRef = inject(DestroyRef);
    private router = inject(Router);
    private activatedRoute = inject(ActivatedRoute);

    loginForm = this.fb.group({
        email: ['', { validators: [Validators.required] }],
        password: ['', { validators: [Validators.required] }]
    });

    errorMessage = signal<string | null>(null);

    ngOnInit() {
        // Se l'utente è già autenticato non ha senso mostrare il login
        if (this.authSrv.isAuthenticated()) {
            this.router.navigate(['/home']);
        } else if (this.jwtSrv.hasToken()) {
            // Refresh della pagina: aspetto che l'utente venga caricato
            this.authSrv.fetchUser()
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(user => {
                    if (user) {
                        this.router.navigate(['/home']);
                    }
                });
        }

        this.loginForm.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.errorMessage.set(null))
    }

    login() {
        if (this.loginForm.valid) {
            const { email, password } = this.loginForm.value;
            this.authSrv.login(email!, password!)
                .pipe(
                    catchError(response => {
                        const message = response.error?.message ?? 'Impossibile contattare il server, riprova più tardi.';
                        this.errorMessage.set(message);
                        return throwError(() => response);
                    })
                )
                .subscribe(() => {
                    const dest = this.activatedRoute.snapshot.queryParams['dest'] || '/home';
                    this.router.navigate([dest]);
                });
        }
    }
}