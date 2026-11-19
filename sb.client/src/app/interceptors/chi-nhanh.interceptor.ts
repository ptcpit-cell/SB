import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class ChiNhanhInterceptor implements HttpInterceptor {
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const user = this.readUser();

    const headers: Record<string, string> = {};
    if (user?.accessToken) {
      headers['Authorization'] = `Bearer ${user.accessToken}`;
    }
    if (user?.chiNhanhId !== undefined && user?.chiNhanhId !== null) {
      headers['X-ChiNhanh-Id'] = String(user.chiNhanhId);
    }

    return next.handle(Object.keys(headers).length ? request.clone({ setHeaders: headers }) : request);
  }

  /** Đọc user từ storage; dữ liệu hỏng thì xóa và coi như chưa đăng nhập. */
  private readUser(): any | null {
    try {
      const raw = sessionStorage.getItem('currentUser');
      const user = raw ? JSON.parse(raw) : null;
      return user && typeof user === 'object' ? user : null;
    } catch {
      sessionStorage.removeItem('currentUser');
      return null;
    }
  }
}