import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MachineService } from '../../core/services/machine.service';
import { AuthService } from '../../core/services/auth.service';
import { Machine, MachineData, MachineStatus } from '../../models/machine.model';

@Component({
  selector: 'app-machines',
  templateUrl: './machines.component.html',
  styleUrls: ['./machines.component.scss']
})
export class MachinesComponent implements OnInit {
  machines: Machine[] = [];
  loading = false;
  showModal = false;
  showDataModal = false;
  editingMachine: Machine | null = null;
  selectedMachine: Machine | null = null;
  machineData: MachineData[] = [];
  machineForm!: FormGroup;
  dataForm!: FormGroup;
  editDataForm!: FormGroup;
  editingTelemetry: MachineData | null = null;
  saving = false;
  error = '';
  success = '';
  telemetrySuccess = '';
  searchTerm = '';
  filterStatus = '';

  statuses: MachineStatus[] = ['OPERATIONAL', 'MAINTENANCE', 'BROKEN', 'IDLE'];
  locations: string[] = ['Atelier A', 'Atelier B', 'Atelier C'];
  todayString: string = '';

  constructor(
    private machineService: MachineService,
    public authService: AuthService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.loadMachines();
    this.setTodayString();
  }

  setTodayString(): void {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    this.todayString = `${yyyy}-${mm}-${dd}`;
  }

  initForms(machine?: Machine): void {
    this.machineForm = this.fb.group({
      name: [machine?.name || '', Validators.required],
      model: [machine?.model || '', Validators.required],
      location: [machine?.location || '', Validators.required],
      status: [machine?.status || 'OPERATIONAL', Validators.required],
      maintenanceDate: [machine?.maintenanceDate || '']
    });

    this.dataForm = this.fb.group({
      temperature: ['', [Validators.required, Validators.min(0), Validators.max(500)]],
      vibration: ['', [Validators.required, Validators.min(0)]],
      runtime: ['', [Validators.required, Validators.min(0)]],
      tension: ['', [Validators.min(0)]]
    });

    this.editDataForm = this.fb.group({
      temperature: ['', [Validators.required, Validators.min(0), Validators.max(500)]],
      vibration: ['', [Validators.required, Validators.min(0)]],
      runtime: ['', [Validators.required, Validators.min(0)]],
      tension: ['', [Validators.min(0)]]
    });
  }

  loadMachines(): void {
    this.loading = true;
    this.machineService.getAll().subscribe({
      next: (res) => { this.machines = res.data || []; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  get filteredMachines(): Machine[] {
    return this.machines.filter(m => {
      const matchSearch = !this.searchTerm || m.name.toLowerCase().includes(this.searchTerm.toLowerCase()) || (m.location || '').toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchStatus = !this.filterStatus || m.status === this.filterStatus;
      return matchSearch && matchStatus;
    });
  }

  openCreate(): void {
    this.editingMachine = null;
    this.initForms();
    this.showModal = true;
    this.error = '';
  }

  openEdit(machine: Machine): void {
    this.editingMachine = machine;
    this.initForms(machine);
    this.showModal = true;
    this.error = '';
  }

  closeModal(): void {
    this.showModal = false;
    this.editingMachine = null;
    this.error = '';
  }

  save(): void {
    if (this.machineForm.invalid) return;

    this.error = '';
    const data: Machine = this.machineForm.value;

    // Le modèle est l'identifiant unique — deux machines peuvent partager le nom
    const duplicate = this.machines.find(m =>
      (!this.editingMachine || m.id !== this.editingMachine.id) &&
      data.model && m.model?.toLowerCase() === data.model.toLowerCase()
    );

    if (duplicate) {
      this.error = `Une machine avec le modèle « ${data.model} » existe déjà.`;
      return;
    }

    // Prevent past maintenance date
    if (data.maintenanceDate) {
      const maintenanceDate = new Date(data.maintenanceDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (maintenanceDate.getTime() < today.getTime()) {
        this.error = 'La date de maintenance ne peut pas être dans le passé !';
        return;
      }
    }

    this.saving = true;

    const obs = this.editingMachine
      ? this.machineService.update(this.editingMachine.id!, data)
      : this.machineService.create(data);

    obs.subscribe({
      next: () => {
        this.success = this.editingMachine ? 'Machine mise à jour !' : 'Machine ajoutée !';
        this.saving = false;
        this.closeModal();
        this.loadMachines();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Erreur lors de l\'enregistrement';
        this.saving = false;
      }
    });
  }

  delete(machine: Machine): void {
    if (!confirm(`Supprimer la machine "${machine.name}" ?`)) return;
    this.machineService.delete(machine.id!).subscribe({
      next: () => { this.success = 'Machine supprimée'; this.loadMachines(); },
      error: (err) => { this.error = err?.error?.message || 'Échec de la suppression'; }
    });
  }

  openDataModal(machine: Machine): void {
    this.selectedMachine = machine;
    this.machineData = [];
    this.showDataModal = true;
    this.telemetrySuccess = '';
    this.error = '';
    this.dataForm.reset();
    this.machineService.getTelemetry(machine.id!).subscribe({
      next: (res) => { this.machineData = (res.data || []).slice(0, 10); }
    });
  }

  closeDataModal(): void {
    this.showDataModal = false;
    this.selectedMachine = null;
    this.editingTelemetry = null;
    this.editDataForm.reset();
  }

  saveTelemetry(): void {
    if (!this.selectedMachine || this.dataForm.invalid) return;
    this.saving = true;
    this.telemetrySuccess = '';
    this.error = '';
    const data: MachineData = { ...this.dataForm.value, machineId: this.selectedMachine.id! };
    this.machineService.addTelemetry(this.selectedMachine.id!, data).subscribe({
      next: () => {
        this.telemetrySuccess = 'Données télémétriques enregistrées !';
        this.saving = false;
        this.dataForm.reset();
        this.machineService.getTelemetry(this.selectedMachine!.id!).subscribe(res => { this.machineData = (res.data || []).slice(0, 10); });
      },
      error: (err) => {
        this.error = err?.error?.message || 'Erreur lors de l\'enregistrement des données';
        this.saving = false;
      }
    });
  }

  getStatusLabel(status: MachineStatus): string {
    const labels: Record<MachineStatus, string> = {
      OPERATIONAL: 'Opérationnelle',
      MAINTENANCE: 'Maintenance',
      BROKEN: 'En panne',
      IDLE: 'Inactif'
    };
    return labels[status] || status;
  }

  getStatusClass(status: MachineStatus): string {
    const classes: Record<MachineStatus, string> = {
      OPERATIONAL: 'operational',
      MAINTENANCE: 'maintenance',
      BROKEN: 'broken',
      IDLE: 'idle'
    };
    return classes[status] || '';
  }

  updateStatus(machine: Machine, newStatus: MachineStatus): void {
    if (newStatus === machine.status) return;
    this.machineService.updateStatus(machine.id!, newStatus).subscribe({
      next: () => {
        machine.status = newStatus;
        this.success = `Statut de "${machine.name}" mis à jour !`;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Erreur lors de la mise à jour du statut';
      }
    });
  }

  openEditTelemetry(data: MachineData): void {
    this.editingTelemetry = data;
    this.editDataForm.patchValue({
      temperature: data.temperature,
      vibration: data.vibration,
      runtime: data.runtime,
      tension: data.tension
    });
  }

  cancelEditTelemetry(): void {
    this.editingTelemetry = null;
    this.editDataForm.reset();
  }

  saveEditTelemetry(): void {
    if (!this.selectedMachine || !this.editingTelemetry || this.editDataForm.invalid) return;
    this.saving = true;
    const updated = this.editDataForm.value;
    this.machineService.updateTelemetry(this.selectedMachine.id!, this.editingTelemetry.id!, updated).subscribe({
      next: () => {
        this.success = 'Données télémétriques mises à jour !';
        this.saving = false;
        this.editingTelemetry = null;
        this.editDataForm.reset();
        this.machineService.getTelemetry(this.selectedMachine!.id!).subscribe(res => {
          this.machineData = (res.data || []).slice(0, 10);
        });
      },
      error: () => {
        this.error = 'Erreur lors de la mise à jour des données';
        this.saving = false;
      }
    });
  }

  get canManageMachines(): boolean { return this.authService.hasRole('ADMIN'); }
  get isAdmin(): boolean { return this.authService.hasRole('ADMIN'); }
  get isTechnician(): boolean { return this.authService.hasRole('TECHNICIAN'); }
}