export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TaskStatus = 'EN_ATTENTE' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'COMPLETED' | 'APPROVED' | 'CANCELLED';

export interface Task {
  id?: number;
  title: string;
  description?: string;
  machineId?: number;
  machineName?: string;
  technicianId?: number;
  technicianName?: string;
  createdById?: number;
  createdByName?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  createdAt?: string;
}

export interface TaskHistory {
  id?: number;
  taskId: number;
  taskTitle?: string;
  technicianId?: number;
  technicianName?: string;
  notes?: string;
  completedAt?: string;
}