import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Task } from '../../models/task.model';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private apiUrl = `${environment.apiUrl}/tasks`;
  private machinesUrl = `${environment.apiUrl}/machines`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  create(task: Task): Observable<any> {
    return this.http.post<any>(this.apiUrl, task);
  }

  update(id: number, task: Partial<Task>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, task);
  }

  approveTask(id: number, notes: string = ''): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/approve`, { notes });
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  getHistory(taskId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${taskId}/history`);
  }

  addHistory(taskId: number, notes: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${taskId}/history`, { notes });
  }

  getTechnicianHistory(technicianId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/history/technician/${technicianId}`);
  }

  getMaintenanceAlerts(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/machines/maintenance-alerts`);
  }
}