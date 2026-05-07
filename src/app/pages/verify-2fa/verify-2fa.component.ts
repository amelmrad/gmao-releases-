import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-verify-2fa',
  templateUrl: './verify-2fa.component.html',
  styleUrls: ['../login/login.component.scss']
})
export class Verify2FAComponent implements OnInit {
  form: FormGroup;
  loading = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });
  }

  ngOnInit(): void {
    // If no pending 2FA userId, redirect to login
    if (!this.authService.pending2FAUserId) {
      this.router.navigate(['/login']);
    }
  }

  onSubmit(): void {
    if (this.form.invalid || !this.authService.pending2FAUserId) return;
    this.loading = true;
    this.error = '';

    const userId = this.authService.pending2FAUserId;
    const code = this.form.value.code;

    this.authService.verify2FALogin(userId, code).subscribe({
      next: () => {
        const user = this.authService.currentUser;
        if (user?.mustChangePassword) {
          this.router.navigate(['/force-password-change']);
        } else {
          const role = user?.role?.toLowerCase();
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
          }
        }
      },
      error: (err) => {
        this.error = err?.error?.message || 'Code 2FA invalide. Veuillez réessayer.';
        this.loading = false;
      }
    });
  }

  backToLogin(): void {
    this.authService.pending2FAUserId = null;
    this.router.navigate(['/login']);
  }
}
