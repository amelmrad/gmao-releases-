import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { User, Role } from '../../models/user.model';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  loading = false;
  showModal = false;
  editingUser: User | null = null;
  userForm!: FormGroup;
  saving = false;
  error = '';
  success = '';
  searchTerm = '';
  filterRole = '';
  isEditingRole = false;
  private originalRole: Role | null = null;

  roles: Role[] = ['RESPONSABLE', 'TECHNICIAN'];

  roleLabels: Record<string, string> = {
    RESPONSABLE: 'RESPONSABLE',
    TECHNICIAN: 'TECHNICIEN'
  };

  constructor(private userService: UserService, private authService: AuthService, private fb: FormBuilder) {}

  isSelf(user: User): boolean {
    return user.id === this.authService.currentUser?.id;
  }

  ngOnInit(): void {
    this.initForm();
    this.loadUsers();
  }

  cinFormatValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;
    const regex = /^\d{8}$/;
    return regex.test(value) ? null : { invalidCin: true };
  }

  uniqueCinValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;
    if (this.editingUser && this.editingUser.cin === value) {
      return null;
    }
    const exists = this.users.some(user =>
      user.cin === value && user.id !== this.editingUser?.id
    );
    return exists ? { duplicateCin: true } : null;
  }

  preventNonNumeric(event: KeyboardEvent) {
    const allowed = /[0-9]/;
    if (!allowed.test(event.key)) {
      event.preventDefault();
    }
  }

  passwordValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;
    const hasLetter = /[A-Za-z]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    return hasLetter && hasNumber ? null : { passwordInvalid: true };
  }

  postalCodeValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;
    return /^\d{4,5}$/.test(value) ? null : { invalidPostalCode: true };
  }

  initForm(user?: User): void {
    this.originalRole = user?.role || null;
    this.isEditingRole = false;
    this.userForm = this.fb.group({
      name: [user?.name || '', Validators.required],
      email: [user?.email || '', [Validators.required, Validators.email]],
      password: [user ? '' : '', user ? [] : [Validators.required, Validators.minLength(6), this.passwordValidator.bind(this)]],
      role: [user?.role || 'TECHNICIAN', Validators.required],
      cin: [user?.cin || '', [
        Validators.required,
        this.cinFormatValidator.bind(this),
        this.uniqueCinValidator.bind(this)
      ]]
    });

    this.userForm.get('role')?.valueChanges.subscribe(newRole => {
      this.isEditingRole = !!this.editingUser && newRole !== this.originalRole;
    });
  }

  loadUsers(): void {
    this.loading = true;
    this.userService.getAll().subscribe({
      next: (res) => {
        this.users = res.data || [];
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  get filteredUsers(): User[] {
    return this.users.filter(u => {
      const matchSearch = !this.searchTerm ||
        u.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchRole = !this.filterRole || u.role === this.filterRole;
      return matchSearch && matchRole;
    });
  }

  openCreate(): void {
    this.editingUser = null;
    this.initForm();
    this.showModal = true;
    this.error = '';
    this.success = '';
  }

  openEdit(user: User): void {
    this.editingUser = user;
    this.initForm(user);
    this.showModal = true;
    this.error = '';
    this.success = '';
  }

  closeModal(): void {
    this.showModal = false;
    this.editingUser = null;
    this.error = '';
  }

  save(): void {
    if (this.userForm.invalid) return;
    this.saving = true;
    this.error = '';
    const data = this.userForm.getRawValue();

    const obs = this.editingUser
      ? this.userService.update(this.editingUser.id!, data)
      : this.userService.create(data);

    obs.subscribe({
      next: () => {
        this.success = this.editingUser ? 'Utilisateur modifié !' : 'Utilisateur créé !';
        this.saving = false;
        this.closeModal();
        this.loadUsers();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Une erreur est survenue';
        this.saving = false;
      }
    });
  }

  delete(user: User): void {
    if (!confirm(`Supprimer l'utilisateur "${user.name}" ?`)) return;
    this.userService.delete(user.id!).subscribe({
      next: () => { this.success = 'Utilisateur supprimé'; this.loadUsers(); },
      error: (err) => { this.error = err?.error?.message || 'Suppression échouée'; }
    });
  }

  getRoleBadge(role: string): string {
    const map: any = { RESPONSABLE: 'resp-badge', TECHNICIAN: 'tech-badge' };
    return map[role] || '';
  }

  getRoleLabel(role: string): string {
    return this.roleLabels[role] || role;
  }

  getRoleIcon(role: string): string {
    const map: any = { RESPONSABLE: 'bi-person-badge-fill', TECHNICIAN: 'bi-tools' };
    return map[role] || 'bi-person';
  }

  getFullAddress(user: User): string {
    const parts = [user.address, user.postalCode, user.city].filter(p => p);
    return parts.length > 0 ? parts.join(', ') : '—';
  }
}
