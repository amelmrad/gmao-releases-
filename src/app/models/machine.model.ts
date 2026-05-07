export type MachineStatus = 'OPERATIONAL' | 'MAINTENANCE' | 'BROKEN' | 'IDLE';

export interface Machine {
  id?: number;
  name: string;
  model?: string;
  location?: string;
  status: MachineStatus;
  maintenanceDate?: string;
  createdAt?: string;
}

export interface MachineData {
  id?: number;
  machineId: number;
  machineName?: string;
  temperature?: number;
  vibration?: number;
  runtime?: number;
  tension?: number;
  createdAt?: string;
}
