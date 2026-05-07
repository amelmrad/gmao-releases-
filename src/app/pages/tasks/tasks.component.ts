import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TaskService } from '../../core/services/task.service';
import { MachineService } from '../../core/services/machine.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { Task, TaskHistory, TaskPriority, TaskStatus } from '../../models/task.model';
import { Machine } from '../../models/machine.model';
import { User } from '../../models/user.model';
import { timer } from 'rxjs';

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss']
})
export class TasksComponent implements OnInit {
  tasks: Task[] = [];
  machines: Machine[] = [];
  technicians: User[] = [];
  taskHistory: TaskHistory[] = [];
  loading = false;
  showModal = false;
  showHistoryModal = false;
  showDeleteModal = false;
  editingTask: Task | null = null;
  selectedTask: Task | null = null;
  taskToDelete: Task | null = null;
  taskForm!: FormGroup;
  historyForm!: FormGroup;
  saving = false;
  error = '';
  success = '';
  searchTerm = '';
  filterStatus = '';
  filterPriority = '';

  priorities: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  statuses: TaskStatus[] = ['EN_ATTENTE', 'IN_PROGRESS', 'PENDING_APPROVAL'];
  allStatuses: TaskStatus[] = ['EN_ATTENTE', 'IN_PROGRESS', 'PENDING_APPROVAL', 'APPROVED'];

  today: string = new Date().toISOString().split('T')[0];

  // --- Notification pour TECHNICIEN ---
  showNewTaskAlert = false;
  newTaskTitle = '';
  newTaskPriority: TaskPriority = 'MEDIUM';
  displayedTaskIds: Set<number> = new Set();

  constructor(
    private taskService: TaskService,
    private machineService: MachineService,
    private userService: UserService,
    public authService: AuthService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadAll();
  }

  // -------------------- FORMULAIRE --------------------
  initForm(task?: Task): void {
    this.taskForm = this.fb.group({
      title: [task?.title || '', Validators.required],
      description: [task?.description || ''],
      machineId: [task?.machineId || null, Validators.required],
      technicianId: [task?.technicianId || null, Validators.required],
      priority: [task?.priority || 'MEDIUM', Validators.required],
      status: [{ value: 'EN_ATTENTE', disabled: true }],
      dueDate: [task?.dueDate || null, Validators.required]
    });

    this.historyForm = this.fb.group({ notes: ['', Validators.required] });
  }

  // -------------------- CHARGEMENT --------------------
  loadAll(): void {
    this.loading = true;

    this.taskService.getAll().subscribe({
      next: (res) => {
        this.tasks = res.data || [];
        this.loading = false;
        this.detectNewTasksForTechnician();
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; }
    });

    this.machineService.getAll().subscribe({
      next: (res) => { this.machines = res.data || []; }
    });

    if (this.canCreateTask()) {
      this.userService.getTechnicians().subscribe({
        next: (res) => { this.technicians = res.data || []; },
        error: () => { this.technicians = []; }
      });
    }
  }

  // -------------------- TÂCHES FILTRÉES --------------------
  get filteredTasks(): Task[] {
    return this.tasks
      .filter(t => {
        const matchSearch = !this.searchTerm ||
          t.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          (t.machineName || '').toLowerCase().includes(this.searchTerm.toLowerCase());
        const matchStatus = !this.filterStatus || t.status === this.filterStatus;
        const matchPriority = !this.filterPriority || t.priority === this.filterPriority;
        return matchSearch && matchStatus && matchPriority;
      });
  }

  // -------------------- PRIORITY LABEL EN FRANÇAIS --------------------
  getPriorityLabel(priority: TaskPriority): string {
    const labels: Record<TaskPriority, string> = {
      LOW: 'Faible',
      MEDIUM: 'Moyenne',
      HIGH: 'Élevée',
      CRITICAL: 'Critique'
    };
    return labels[priority] || priority;
  }

  // -------------------- LOGIQUE DE NOTIFICATION --------------------
  private detectNewTasksForTechnician(): void {
    if (!this.isTechnician()) return;

    const newTasks: Task[] = this.tasks
      .filter((task: Task) =>
        task.technicianId === this.authService.currentUser?.id &&
        task.status !== 'COMPLETED' &&
        task.status !== 'APPROVED' &&
        task.status !== 'PENDING_APPROVAL' &&
        !this.displayedTaskIds.has(task.id!)
      )
      .sort((a: Task, b: Task): number => b.id! - a.id!);

    if (newTasks.length > 0) {
      const task: Task = newTasks[0];
      this.newTaskTitle = task.title;
      this.newTaskPriority = task.priority;
      this.showNewTaskAlert = true;
      this.displayedTaskIds.add(task.id!);

      timer(5000).subscribe(() => {
        this.showNewTaskAlert = false;
        this.cdr.detectChanges();
      });
    }
  }

  // -------------------- CRÉATION / MODIFICATION --------------------
  openCreate(): void {
    this.editingTask = null;
    this.initForm();
    this.showModal = true;
    this.error = '';
  }

  openEdit(task: Task): void {
    this.editingTask = task;
    this.initForm(task);
    this.showModal = true;
    this.error = '';
  }

  closeModal(): void {
    this.showModal = false;
    this.editingTask = null;
    this.error = '';
  }

  save(): void {
    this.error = '';

    const raw = this.taskForm.value as Task;

    // Validation explicite côté frontend
    if (!raw.technicianId) {
      this.error = 'Vous devez assigner un technicien à la tâche.';
      this.taskForm.markAllAsTouched();
      return;
    }
    if (!raw.machineId) {
      this.error = 'Vous devez sélectionner une machine pour cette tâche.';
      this.taskForm.markAllAsTouched();
      return;
    }
    if (!raw.title) {
      this.error = 'Le titre est obligatoire.';
      this.taskForm.markAllAsTouched();
      return;
    }
    if (!raw.dueDate) {
      this.error = 'La date d\'échéance est obligatoire.';
      this.taskForm.markAllAsTouched();
      return;
    }
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    const data = raw;

    const obs = this.editingTask
      ? this.taskService.update(this.editingTask.id!, data)
      : this.taskService.create(data);

    obs.subscribe({
      next: () => {
        this.success = this.editingTask ? 'Tâche mise à jour !' : 'Tâche créée !';
        this.saving = false;
        this.closeModal();
        this.loadAll();
      },
      error: (err) => {
        console.error('Task save failed:', err);
        const serverMsg = err?.error?.message;
        const fallback = err?.status === 0
          ? `Impossible de joindre le serveur (${err?.message || 'erreur réseau'})`
          : `Erreur ${err?.status || ''} lors de l'enregistrement de la tâche`;
        this.error = serverMsg || fallback;
        this.saving = false;
      }
    });
  }

  // -------------------- SUPPRESSION --------------------
  openDeleteModal(task: Task): void {
    this.taskToDelete = task;
    this.showDeleteModal = true;
    this.error = '';
    this.success = '';
  }

  closeDeleteModal(): void {
    this.taskToDelete = null;
    this.showDeleteModal = false;
  }

  confirmDelete(): void {
    if (!this.taskToDelete) return;

    this.taskService.delete(this.taskToDelete.id!).subscribe({
      next: () => {
        this.success = `Tâche "${this.taskToDelete!.title}" supprimée avec succès.`;
        this.loadAll();
        this.closeDeleteModal();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Échec de la suppression';
        this.closeDeleteModal();
      }
    });
  }

  // -------------------- HISTORIQUE --------------------
  openHistory(task: Task): void {
    this.selectedTask = task;
    this.historyForm.reset();
    this.taskHistory = [];
    this.showHistoryModal = true;
    this.taskService.getHistory(task.id!).subscribe({
      next: (res) => { this.taskHistory = res.data || []; }
    });
  }

  closeHistoryModal(): void {
    this.showHistoryModal = false;
    this.selectedTask = null;
    this.taskHistory = [];
  }

  addHistory(): void {
    if (!this.selectedTask || this.historyForm.invalid) return;
    this.saving = true;
    this.taskService.addHistory(this.selectedTask.id!, this.historyForm.value.notes).subscribe({
      next: (res) => {
        this.taskHistory = [res.data, ...this.taskHistory];
        this.historyForm.reset();
        this.saving = false;
      },
      error: () => { this.saving = false; }
    });
  }

  // -------------------- CHANGEMENT RAPIDE DE STATUT --------------------
  quickStatus(task: Task, status: string): void {
    this.taskService.update(task.id!, { ...task, status: status as TaskStatus }).subscribe({
      next: (res) => {
        const updatedTask = res.data;
        const idx = this.tasks.findIndex(t => t.id === task.id);
        if (idx !== -1) {
          this.tasks[idx] = { ...this.tasks[idx], ...updatedTask };
          this.tasks = [...this.tasks];
        }
        const actualStatus = updatedTask?.status || status;
        if (actualStatus === 'PENDING_APPROVAL') {
          this.success = 'Tâche soumise pour approbation au responsable';
        } else {
          this.success = `Statut de la tâche mis à jour : ${this.getStatusLabel(actualStatus)}`;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Échec de la mise à jour du statut';
      }
    });
  }

  // -------------------- APPROBATION --------------------
  approveTask(task: Task): void {
    if (!confirm(`Approuver la tâche "${task.title}" et remettre la machine en service ?`)) return;

    this.taskService.approveTask(task.id!).subscribe({
      next: (res) => {
        const updatedTask = res.data;
        const idx = this.tasks.findIndex(t => t.id === task.id);
        if (idx !== -1) {
          this.tasks[idx] = { ...this.tasks[idx], ...updatedTask };
          this.tasks = [...this.tasks];
        }
        this.success = `Tâche approuvée. Machine remise en service.`;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Échec de l\'approbation';
      }
    });
  }

  // -------------------- FONCTIONS D'AIDE --------------------
  getPriorityClass(p: string): string { return p?.toLowerCase() || ''; }
  getStatusClass(s: string): string { return s?.toLowerCase().replace(/_/g, '-') || ''; }

  canCreateTask(): boolean { return this.authService.hasRole('RESPONSABLE'); }
  canEditTask(task: Task): boolean {
    return this.authService.hasRole('RESPONSABLE')
      && task.createdById === this.authService.currentUser?.id;
  }
  canDeleteTask(task: Task): boolean {
    return this.authService.hasRole('RESPONSABLE')
      && task.createdById === this.authService.currentUser?.id;
  }
  canChangeStatus(task: Task): boolean {
    if (this.authService.hasRole('TECHNICIAN')) {
      return task.technicianId === this.authService.currentUser?.id && task.status !== 'APPROVED';
    }
    return this.authService.hasRole('RESPONSABLE');
  }
  canApprove(task: Task): boolean {
    return this.authService.hasRole('RESPONSABLE')
      && task.status === 'PENDING_APPROVAL'
      && task.createdById === this.authService.currentUser?.id;
  }
  canCompleteTask(task: Task): boolean {
    // Only the task creator (manager) or an admin can mark as completed
    if (this.authService.hasRole('ADMIN')) return true;
    if (!task.createdById) return true;
    return task.createdById === this.authService.currentUser?.id;
  }
  isAdmin(): boolean { return this.authService.hasRole('ADMIN'); }
  isResponsable(): boolean { return this.authService.hasRole('RESPONSABLE'); }
  isTechnician(): boolean { return this.authService.hasRole('TECHNICIAN'); }

  getStatusOptions(task: Task): TaskStatus[] {
    if (this.authService.hasRole('TECHNICIAN')) return ['EN_ATTENTE', 'IN_PROGRESS', 'PENDING_APPROVAL'];
    if (this.authService.hasRole('RESPONSABLE')) return ['EN_ATTENTE', 'IN_PROGRESS', 'PENDING_APPROVAL'];
    return this.statuses;
  }

  hasPendingApprovalForCurrentUser(): boolean {
    const currentUserId = this.authService.currentUser?.id;
    return this.tasks.some(t =>
      t.status === 'PENDING_APPROVAL' && t.createdById === currentUserId
    );
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      EN_ATTENTE: 'En attente',
      IN_PROGRESS: 'En cours',
      PENDING_APPROVAL: 'En attente d\'approbation',
      APPROVED: 'Approuvé',
    };
    return labels[status] || status;
  }
}