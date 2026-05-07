import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  error = '';
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email, Validators.pattern(/^[a-zA-Z0-9._%+-]+@gmao\.com$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    // Redirect already logged-in users
    if (this.authService.isLoggedIn()) {
      if (this.authService.currentUser?.mustChangePassword) {
        this.router.navigate(['/force-password-change']);
      } else {
        const role = this.authService.currentUser?.role?.toLowerCase();
        this.redirectByRole(role);
      }
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;
    this.loading = true;
    this.error = '';

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: (res: any) => {
        // Check if 2FA is required
        if (res.data?.requires2FA) {
          this.router.navigate(['/verify-2fa']);
          return;
        }
        const user = this.authService.currentUser;
        if (user?.mustChangePassword) {
          this.router.navigate(['/force-password-change']);
        } else {
          const role = user?.role?.toLowerCase();
          this.redirectByRole(role);
        }
      },
      error: (err) => {
        if (err.status === 0) {
          this.error = 'Impossible de joindre le serveur. Vérifiez votre connexion réseau.';
        } else {
          this.error = err?.error?.message || 'Identifiants incorrects. Veuillez réessayer.';
        }
        this.loading = false;
      }
    });
  }

  private redirectByRole(role: string | undefined): void {
    if (!role) {
      this.router.navigate(['/login']);
      return;
    }

    switch (role) {
      case 'technician':
        this.router.navigate(['/tasks']);
        break;
      case 'responsable':
      case 'admin':
        this.router.navigate(['/dashboard']);
        break;
      default:
        this.router.navigate(['/dashboard']);
        break;
    }
  }
}
