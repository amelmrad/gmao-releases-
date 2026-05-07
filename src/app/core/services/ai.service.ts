import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AiService {
  private apiUrl = `${environment.apiUrl}/ai`;

  constructor(private http: HttpClient) {}

  getAllPredictions(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/predictions`);
  }

  getPrediction(machineId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/predictions/${machineId}`);
  }

  chat(message: string, machineId?: number, responseMode?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/chat`, { message, machineId, responseMode });
  }
}
