import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private router: Router, private authService: AuthService) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
  const user = this.authService.currentUserValue;
  if (!user) {
    this.redirectToLogin(state.url);
    return false;
  }
  return this.checkPermission(route, user);
}

  private checkPermission(route: ActivatedRouteSnapshot, user: any): boolean {
    const requiredPermission = route.data['permission'];
    if (requiredPermission) {
      const hasPerm = this.authService.hasPermission(requiredPermission);
      if (!hasPerm) {
        alert('Bạn không có quyền truy cập vào chức năng này!');
        return false;
      }
    }
    return true;
  }

  private redirectToLogin(returnUrl: string) {
    this.router.navigate(['/auth/login'], { queryParams: { returnUrl } });
  }
}