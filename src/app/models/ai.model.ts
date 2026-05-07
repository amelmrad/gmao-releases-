export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';
export type Severity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface AiPrediction {
  machineId: number;
  machineName: string;
  machineLocation?: string;
  riskScore: number;
  riskLevel: RiskLevel;
  alerts: string[];
  recommendations: string[];
  temperature?: number;
  vibration?: number;
  runtime?: number;
  analyzedAt?: string;
}

export interface AiChatMessage {
  role: 'user' | 'ai';
  content: string;
  severity?: Severity;
  timestamp: Date;
}

export interface DashboardStats {
  totalMachines: number;
  operationalMachines: number;
  maintenanceMachines: number;
  brokenMachines: number;
  idleMachines: number;
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  totalUsers: number;
  criticalAlerts: number;
}
