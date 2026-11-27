import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser = this.currentUserSubject.asObservable();

  private readonly routePermissionMap: { prefix: string; permission: string | null }[] = [
    { prefix: '/nhan-vien/create-request', permission: 'Tạo yêu cầu' },
    { prefix: '/nhan-vien/edit-request', permission: 'Sửa yêu cầu' },
    { prefix: '/nhan-vien/detail-request', permission: 'Xem chi tiết yêu cầu' },
    { prefix: '/nhan-vien', permission: 'View nhân viên' },
    { prefix: '/tro-ly', permission: 'View trợ lý' },
    { prefix: '/lanh-dao', permission: 'View lãnh đạo' },
    { prefix: '/home', permission: 'View admin' },
    { prefix: '/user', permission: 'Xem user' },
    { prefix: '/role', permission: 'Xem role' },
    { prefix: '/chi-nhanh', permission: 'View admin' },
    { prefix: '/phong-ban', permission: 'Xem phòng ban' },
    { prefix: '/chuc-vu', permission: 'Xem chức vụ' },
    { prefix: '/ho-so', permission: null },
    { prefix: '/xem-tai-lieu', permission: null },
  ];

  constructor(private http: HttpClient, private router: Router) {}

  public get currentUserValue() {
    return this.currentUserSubject.value;
  }

  login(
    credentials: any,
    options?: { returnUrl?: string; skipRedirect?: boolean }
  ): Observable<any> {
    return this.http
      .post<any>(`api/Account/login`, credentials, { withCredentials: true })
      .pipe(
        map((user) => {
          this.setUser(user);
          if (!options?.skipRedirect) {
            const target = this.getDefaultRouteByPermission(options?.returnUrl);
            this.router.navigateByUrl(target);
          }
          return user;
        })
      );
  }

  checkAutoLogin(): Observable<any> {
    return this.http
      .post<any>('api/Account/refresh-token', {}, { withCredentials: true })
      .pipe(
        tap((user) => {
          this.setUser(user);
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
    this.clearUser();
    this.router.navigate(['/auth/login']);
  }

  updateCurrentUserProfile(patch: Record<string, any>): void {
    const current = this.currentUserValue;
    if (!current) return;
    const updated = { ...current, ...patch };
    this.setUser(updated);
  }

  hasPermission(permissionName: string): boolean {
    const user = this.currentUserValue;
    if (!user || !user.permissions) return false;

    const normalize = (str: string) => {
      return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .trim();
    };

    const target = normalize(permissionName);
    return user.permissions.some((p: string) => normalize(p) === target);
  }

  canAccessUrl(url?: string | null): boolean {
    if (!url) return false;
    const cleanPath = url.replace(/^#/, '').split('?')[0].replace(/\/+$/, '') || '/';
    const matched = this.routePermissionMap.find(
      (r) => cleanPath === r.prefix || cleanPath.startsWith(`${r.prefix}/`)
    );
    if (!matched) return false;
    if (matched.permission === null) return true;
    return this.hasPermission(matched.permission);
  }

  getDefaultRouteByPermission(returnUrl?: string): string {
    const routeByPermission = [
      { permission: 'View admin', route: '/home' },
      { permission: 'View nhân viên', route: '/nhan-vien' },
      { permission: 'View trợ lý', route: '/tro-ly' },
      { permission: 'View lãnh đạo', route: '/lanh-dao' },
    ];

    // Chỉ giữ returnUrl khi hợp lệ VÀ user thực sự có quyền vào đường dẫn đó
    if (this.isUsableReturnUrl(returnUrl) && this.canAccessUrl(returnUrl)) {
      return returnUrl!;
    }

    const matchedRoute = routeByPermission.find(({ permission }) =>
      this.hasPermission(permission)
    );
    return matchedRoute?.route ?? '/ho-so';
  }

  private isUsableReturnUrl(url?: string | null): boolean {
    if (!url) return false;
    const path = url.replace(/^#/, '').split('?')[0];
    return !['/', '', '/auth/login'].includes(path) && !path.startsWith('/auth/');
  }

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
