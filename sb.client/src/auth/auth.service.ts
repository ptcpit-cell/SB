import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, finalize, map, shareReplay, tap } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  public get currentUserValue() {
    return this.currentUserSubject.value;
  }

  login(credentials: any): Observable<any> {
    return this.http.post<any>(`api/Account/login`, credentials).pipe(
      map((user) => {
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSubject.next(user);
        this.router.navigateByUrl(this.getDefaultRouteByPermission());
        return user;
        
      })
    );
  }

  checkAutoLogin(): Observable<any> {
    return this.http
      .post<any>('api/Account/refresh-token', {}, { withCredentials: true })
      .pipe(
        tap((user) => {
        this.setUser(user);   // gán user TRƯỚC khi tính route
        this.router.navigateByUrl(
          this.getDefaultRouteByPermission(this.getCurrentHashUrl())
        );
      }),
        catchError(() => {
          this.clearUser();
          return of(null);
        })
      );
  }

  logout() {
    this.http
      .post('api/Account/logout', {}, { withCredentials: true })
      .subscribe({ error: () => {} });
    sessionStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }
  hasPermission(permissionName: string): boolean {
    const user = this.currentUserValue;
    if (!user || !user.permissions) return false;

    const normalize = (str: string) => {
      return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Loại bỏ các dấu tiếng Việt
        .replace(/đ/g, 'd')
        .trim();
    };

    const target = normalize(permissionName);
    return user.permissions.some((p: string) => normalize(p) === target);
  }

  getDefaultRouteByPermission(returnUrl?: string): string {
  const routeByPermission = [
    { permission: 'View admin', route: '/home' },
    { permission: 'View nhân viên', route: '/nhan-vien' },
    { permission: 'View trợ lý', route: '/tro-ly' },
    { permission: 'View lãnh đạo', route: '/lanh-dao' }
  ];

  // returnUrl hợp lệ thì ưu tiên giữ nguyên
  if (this.isUsableReturnUrl(returnUrl)) {
    return returnUrl!;
  }

  const matchedRoute = routeByPermission.find(({ permission }) =>
    this.hasPermission(permission)
  );
  return matchedRoute?.route ?? '/';
}

private isUsableReturnUrl(url?: string | null): boolean {
  if (!url) return false;
  const path = url.split('?')[0];
  return !['/', '', '/auth/login'].includes(path) && !path.startsWith('/auth/');
}

// Đọc URL hiện tại khi dùng hash routing (an toàn lúc app vừa khởi động)
private getCurrentHashUrl(): string {
  return window.location.hash.replace(/^#/, '') || '/';
}

  private setUser(user: any) {
    sessionStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private clearUser() {
    sessionStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }
}
