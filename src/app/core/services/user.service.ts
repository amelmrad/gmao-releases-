import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl = `${environment.apiUrl}/users`;
  private authUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  getTechnicians(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/technicians`);
  }

  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  create(user: User): Observable<any> {
    return this.http.post<any>(this.apiUrl, user);
  }

  update(id: number, user: User): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, user);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  updateProfile(id: number, data: Partial<User>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/profile/${id}`, data);
  }

  uploadProfilePicture(id: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.apiUrl}/${id}/profile-picture`, formData);
  }

  // --- 2FA ---
  setup2FA(): Observable<any> {
    return this.http.post<any>(`${this.authUrl}/2fa/setup`, {});
  }

  verify2FA(code: string): Observable<any> {
    return this.http.post<any>(`${this.authUrl}/2fa/verify`, { code });
  }

  disable2FA(code: string): Observable<any> {
    return this.http.post<any>(`${this.authUrl}/2fa/disable`, { code });
  }
}
