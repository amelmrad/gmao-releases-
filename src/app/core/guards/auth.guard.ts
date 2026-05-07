import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return false;
    }

    // Force password change on first login
    const user = this.authService.currentUser;
    if (user?.mustChangePassword && route.routeConfig?.path !== 'force-password-change') {
      this.router.navigate(['/force-password-change']);
      return false;
    }

    const requiredRoles = route.data['roles'] as string[];
    if (requiredRoles && requiredRoles.length > 0) {
      if (!this.authService.hasAnyRole(...requiredRoles)) {
        this.router.navigate(['/dashboard']);
        return false;
      }
    }

    return true;
  }
}
