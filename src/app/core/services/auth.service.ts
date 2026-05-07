import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthUser } from '../../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<AuthUser | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  // Temporary storage for 2FA pending login
  pending2FAUserId: number | null = null;

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/login`, { email, password }).pipe(
      tap(response => {
        if (response.success && response.data) {
          if (response.data.requires2FA) {
            // Store userId for 2FA step, do NOT store token/user
            this.pending2FAUserId = response.data.id;
          } else {
            this.storeUser(response.data);
          }
        }
      })
    );
  }

  verify2FALogin(userId: number, code: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/verify-2fa-login`, {
      userId: String(userId),
      code
    }).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.storeUser(response.data);
          this.pending2FAUserId = null;
        }
      })
    );
  }

  private storeUser(data: any): void {
    const user: AuthUser = {
      id: data.id,
      uuid: data.uuid,
      name: data.name,
      email: data.email,
      role: data.role,
      profilePicture: data.profilePicture,
      token: data.token,
      mustChangePassword: data.mustChangePassword
    };
    localStorage.setItem('gmao_user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  changeFirstPassword(newPassword: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/change-first-password`, { newPassword });
  }

  changePassword(payload: { currentPassword: string; newPassword: string; confirmPassword: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/users/change-password`, payload);
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/reset-password`, { token, newPassword });
  }

  logout(): void {
    localStorage.removeItem('gmao_user');
    this.currentUserSubject.next(null);
    this.pending2FAUserId = null;
  }

  get currentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  get token(): string | null {
    return this.currentUser?.token || null;
  }

  isLoggedIn(): boolean {
    return !!this.currentUser;
  }

  hasRole(role: string): boolean {
    return this.currentUser?.role === role;
  }

  hasAnyRole(...roles: string[]): boolean {
    return roles.includes(this.currentUser?.role || '');
  }

  private getUserFromStorage(): AuthUser | null {
    try {
      const data = localStorage.getItem('gmao_user');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  updateCurrentUser(updates: Partial<AuthUser>): void {
    const user = this.currentUser;
    if (user) {
      const updated = { ...user, ...updates };
      localStorage.setItem('gmao_user', JSON.stringify(updated));
      this.currentUserSubject.next(updated);
    }
  }
}
