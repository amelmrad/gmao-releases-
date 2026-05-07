import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  twoFACodeForm!: FormGroup;
  saving = false;
  success = '';
  error = '';
  activeTab = 'profile';
  showCurrentPass = false;
  showNewPass = false;
  showConfirmPass = false;

  // 2FA state
  twoFASecret = '';
  twoFAQrUri = '';
  twoFAEnabled = false;
  twoFAStep: 'idle' | 'setup' | 'verify' | 'disable' = 'idle';

  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUser;

    this.profileForm = this.fb.group({
      name: [user?.name || '', this.isAdmin || this.isResponsable ? Validators.required : []],
      address: [''],
      city: [''],
      postalCode: [''],
      cin: [''],
      email: [{ value: user?.email || '', disabled: true }]
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6), Validators.pattern(/^(?=.*[a-zA-Z])(?=.*\d).+$/)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });

    this.twoFACodeForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });

    // Load full profile from server
    if (user?.id) {
      this.userService.getById(user.id).subscribe({
        next: (res) => {
          const u = res.data;
          this.profileForm.patchValue({
            name: u.name,
            address: u.address || '',
            city: u.city || '',
            postalCode: u.postalCode || '',
            cin: u.cin || ''
          });
          this.twoFAEnabled = u.twoFactorEnabled || false;
        }
      });
    }
  }

  passwordMatchValidator(group: AbstractControl): { [key: string]: boolean } | null {
    const newPass = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return newPass === confirm ? null : { passwordMismatch: true };
  }

  saveProfile(): void {
    if (this.profileForm.invalid) return;
    this.saving = true;
    this.error = '';
    this.success = '';

    const userId = this.authService.currentUser?.id!;
    const formVal = this.profileForm.value;

    // Build payload based on role
    const payload: any = {};
    if (this.isAdmin || this.isResponsable) {
      payload.name = formVal.name;
    }
    if (this.isAdmin) {
      payload.cin = formVal.cin;
    }
    // Address fields available for all roles
    payload.address = formVal.address;
    payload.city = formVal.city;
    payload.postalCode = formVal.postalCode;

    this.userService.updateProfile(userId, payload).subscribe({
      next: (res) => {
        this.success = 'Profil mis à jour avec succès !';
        this.saving = false;
        this.authService.updateCurrentUser({
          name: res.data?.name || this.authService.currentUser?.name
        });
      },
      error: (err) => {
        this.error = err?.error?.message || 'Échec de la mise à jour';
        this.saving = false;
      }
    });
  }

  savePassword(): void {
    this.error = '';
    this.success = '';

    if (this.passwordForm.errors?.['passwordMismatch']) {
      this.error = 'Les mots de passe ne correspondent pas.';
      return;
    }
    if (this.passwordForm.invalid) {
      this.error = 'Veuillez remplir correctement tous les champs.';
      return;
    }

    this.saving = true;

    const payload = {
      currentPassword: this.passwordForm.value.currentPassword,
      newPassword: this.passwordForm.value.newPassword,
      confirmPassword: this.passwordForm.value.confirmPassword
    };

    this.authService.changePassword(payload).subscribe({
      next: () => {
        this.success = 'Votre mot de passe a été mis à jour avec succès.';
        this.saving = false;
        this.passwordForm.reset();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Une erreur est survenue lors du changement de mot de passe.';
        this.saving = false;
      }
    });
  }

  // --- 2FA Methods ---

  setup2FA(): void {
    this.error = '';
    this.saving = true;
    this.userService.setup2FA().subscribe({
      next: (res) => {
        this.twoFASecret = res.data?.secret;
        this.twoFAQrUri = res.data?.qrUri;
        this.twoFAStep = 'verify';
        this.twoFACodeForm.reset();
        this.saving = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Échec de la configuration 2FA';
        this.saving = false;
      }
    });
  }

  verify2FA(): void {
    if (this.twoFACodeForm.invalid) return;
    this.error = '';
    this.saving = true;
    const code = this.twoFACodeForm.value.code;

    this.userService.verify2FA(code).subscribe({
      next: () => {
        this.twoFAEnabled = true;
        this.twoFAStep = 'idle';
        this.success = '2FA activée avec succès ! Votre compte est maintenant plus sécurisé.';
        this.saving = false;
        this.twoFACodeForm.reset();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Code invalide. Veuillez réessayer.';
        this.saving = false;
      }
    });
  }

  startDisable2FA(): void {
    this.twoFAStep = 'disable';
    this.twoFACodeForm.reset();
    this.error = '';
  }

  disable2FA(): void {
    if (this.twoFACodeForm.invalid) return;
    this.error = '';
    this.saving = true;
    const code = this.twoFACodeForm.value.code;

    this.userService.disable2FA(code).subscribe({
      next: () => {
        this.twoFAEnabled = false;
        this.twoFAStep = 'idle';
        this.success = '2FA a été désactivée.';
        this.saving = false;
        this.twoFACodeForm.reset();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Code invalide.';
        this.saving = false;
      }
    });
  }

  cancelTwoFA(): void {
    this.twoFAStep = 'idle';
    this.twoFACodeForm.reset();
    this.error = '';
  }

  get currentUser() { return this.authService.currentUser; }

  get isAdmin(): boolean { return this.authService.hasRole('ADMIN'); }
  get isResponsable(): boolean { return this.authService.hasRole('RESPONSABLE'); }
  get isTechnician(): boolean { return this.authService.hasRole('TECHNICIAN'); }

  getRoleLabel(): string {
    const map: any = { ADMIN: 'Administrateur', RESPONSABLE: 'Responsable', TECHNICIAN: 'Technicien' };
    return map[this.currentUser?.role || ''] || '';
  }

  get avatarInitial(): string {
    return this.currentUser?.name?.charAt(0).toUpperCase() || 'U';
  }

  get qrCodeImageUrl(): string {
    if (!this.twoFAQrUri) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(this.twoFAQrUri)}`;
  }
}
