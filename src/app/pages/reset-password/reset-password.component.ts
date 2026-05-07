import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  form: FormGroup;
  forgotForm: FormGroup;
  loading = false;
  error = '';
  success = '';
  token: string | null = null;
  showNewPass = false;
  showConfirmPass = false;
  mode: 'forgot' | 'reset' = 'forgot';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.form = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6), Validators.pattern(/^(?=.*[a-zA-Z])(?=.*\d).+$/)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });

    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email, Validators.pattern(/^[a-zA-Z0-9._%+-]+@gmao\.com$/)]]
    });
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');
    if (this.token) {
      this.mode = 'reset';
    }
  }

  passwordMatchValidator(group: AbstractControl): { [key: string]: boolean } | null {
    const newPass = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return newPass === confirm ? null : { passwordMismatch: true };
  }

  sendResetEmail(): void {
    if (this.forgotForm.invalid) return;
    this.loading = true;
    this.error = '';
    this.success = '';

    this.authService.forgotPassword(this.forgotForm.value.email).subscribe({
      next: () => {
        this.success = 'Un email de réinitialisation a été envoyé. Vérifiez votre boîte de réception.';
        this.loading = false;
      },
      error: (err) => {
        const msg = err?.error?.message;
        if (msg && /no account/i.test(msg)) {
          this.error = 'Aucun compte associé à cet email.';
        } else {
          this.error = msg || 'Aucun compte associé à cet email.';
        }
        this.loading = false;
      }
    });
  }

  resetPassword(): void {
    if (this.form.invalid || !this.token) return;
    this.loading = true;
    this.error = '';

    this.authService.resetPassword(this.token, this.form.value.newPassword).subscribe({
      next: () => {
        this.success = 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.';
        this.loading = false;
        setTimeout(() => this.router.navigate(['/login']), 3000);
      },
      error: (err) => {
        this.error = err?.error?.message || 'Erreur lors de la réinitialisation';
        this.loading = false;
      }
    });
  }
}
