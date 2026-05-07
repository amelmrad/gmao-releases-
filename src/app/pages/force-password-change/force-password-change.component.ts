import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-force-password-change',
  templateUrl: './force-password-change.component.html',
  styleUrls: ['./force-password-change.component.scss']
})
export class ForcePasswordChangeComponent {
  form: FormGroup;
  loading = false;
  error = '';
  showNewPass = false;
  showConfirmPass = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    if (!this.authService.isLoggedIn() || !this.authService.currentUser?.mustChangePassword) {
      this.router.navigate(['/dashboard']);
    }

    this.form = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6), Validators.pattern(/^(?=.*[a-zA-Z])(?=.*\d).+$/)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(group: AbstractControl): { [key: string]: boolean } | null {
    const newPass = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return newPass === confirm ? null : { passwordMismatch: true };
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';

    this.authService.changeFirstPassword(this.form.value.newPassword).subscribe({
      next: () => {
        this.authService.updateCurrentUser({ mustChangePassword: false });
        const role = this.authService.currentUser?.role?.toLowerCase();
        if (role === 'technician') {
          this.router.navigate(['/tasks']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.error = err?.error?.message || 'Password change failed';
        this.loading = false;
      }
    });
  }
}
