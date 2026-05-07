import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Machine, MachineData } from '../../models/machine.model';

@Injectable({ providedIn: 'root' })
export class MachineService {
  private apiUrl = `${environment.apiUrl}/machines`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  create(machine: Machine): Observable<any> {
    return this.http.post<any>(this.apiUrl, machine);
  }

  update(id: number, machine: Machine): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, machine);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  updateStatus(id: number, status: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/status`, { status });
  }

  addTelemetry(machineId: number, data: MachineData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${machineId}/data`, data);
  }

  getTelemetry(machineId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${machineId}/data`);
  }

  updateTelemetry(machineId: number, dataId: number, data: Partial<MachineData>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${machineId}/data/${dataId}`, data);
  }
}
