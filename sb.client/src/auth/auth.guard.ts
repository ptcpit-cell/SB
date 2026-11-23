import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private router: Router,
    private authService: AuthService,
    private toastr: ToastrService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const user = this.authService.currentUserValue;
    if (!user) {
      this.redirectToLogin(state.url);
      return false;
    }
    return this.checkPermission(route, state.url);
  }

  private checkPermission(route: ActivatedRouteSnapshot, attemptedUrl: string): boolean {
    const requiredPermission = route.data['permission'];
    if (requiredPermission) {
      const hasPerm = this.authService.hasPermission(requiredPermission);
      if (!hasPerm) {
        const fallback = this.authService.getDefaultRouteByPermission();
        if (attemptedUrl !== '/home' && attemptedUrl !== '/') {
          this.toastr.warning('Bạn không có quyền truy cập vào chức năng này.');
        }
        if (fallback && fallback !== attemptedUrl) {
          this.router.navigateByUrl(fallback);
        }
        return false;
      }
    }
    return true;
  }

  private redirectToLogin(returnUrl: string) {
    this.router.navigate(['/auth/login'], { queryParams: { returnUrl } });
  }
}