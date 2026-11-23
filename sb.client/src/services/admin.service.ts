import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AdminDashboardData,
  AdminLanhDaoRow,
  AdminLoaiYeuCauRow,
  AdminMucUuTienRow,
  AdminUserOption,
  UserProfile
} from '../type';

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(
    private http: HttpClient,
    @Inject('BASE_URL') private baseUrl: string
  ) {}

  // ===== Admin Dashboard =====
  getDashboard(): Observable<AdminDashboardData> {
    return this.http.get<AdminDashboardData>(this.baseUrl + 'api/Admin/GetDashboard');
  }

  // ===== Leaders & Single Assistant Assignment =====
  getLanhDaos(): Observable<{ lanhDaos: AdminLanhDaoRow[]; users: AdminUserOption[] }> {
    return this.http.get<{ lanhDaos: AdminLanhDaoRow[]; users: AdminUserOption[] }>(
      this.baseUrl + 'api/Admin/GetLanhDaos'
    );
  }

  saveLanhDao(payload: any): Observable<any> {
    return this.http.post(this.baseUrl + 'api/Admin/SaveLanhDao', payload);
  }

  deleteLanhDao(id: number): Observable<any> {
    return this.http.delete(this.baseUrl + `api/Admin/DeleteLanhDao/${id}`);
  }

  // ===== LoaiYeuCau Catalog =====
  getLoaiYeuCaus(): Observable<AdminLoaiYeuCauRow[]> {
    return this.http.get<AdminLoaiYeuCauRow[]>(this.baseUrl + 'api/Admin/GetLoaiYeuCaus');
  }

  saveLoaiYeuCau(payload: any): Observable<any> {
    return this.http.post(this.baseUrl + 'api/Admin/SaveLoaiYeuCau', payload);
  }

  deleteLoaiYeuCau(id: number): Observable<any> {
    return this.http.delete(this.baseUrl + `api/Admin/DeleteLoaiYeuCau/${id}`);
  }

  // ===== MucUuTien Catalog =====
  getMucUuTiens(): Observable<AdminMucUuTienRow[]> {
    return this.http.get<AdminMucUuTienRow[]>(this.baseUrl + 'api/Admin/GetMucUuTiens');
  }

  saveMucUuTien(payload: any): Observable<any> {
    return this.http.post(this.baseUrl + 'api/Admin/SaveMucUuTien', payload);
  }

  deleteMucUuTien(id: number): Observable<any> {
    return this.http.delete(this.baseUrl + `api/Admin/DeleteMucUuTien/${id}`);
  }

  // ===== User Self-Service Profile =====
  getMyProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(this.baseUrl + 'api/Account/Profile');
  }

  updateMyProfile(payload: Partial<UserProfile>): Observable<{ message: string; profile: UserProfile }> {
    return this.http.put<{ message: string; profile: UserProfile }>(
      this.baseUrl + 'api/Account/Profile',
      payload
    );
  }
}
