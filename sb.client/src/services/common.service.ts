import { Inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

@Injectable ({ providedIn: 'root' })
export class CommonService {
  constructor(
    private http: HttpClient,
    @Inject('BASE_URL') private baseUrl: string
  ) {}
  getAllChiNhanh(): Observable<any> {
    return this.http.get(this.baseUrl + 'api/Common/GetChiNhanh', {});
  }
  getPhongBan(): Observable<any> {
    return this.http.get(this.baseUrl + 'api/Common/GetPhongBan', {});
  }
  createPhongBan(data: any): Observable<any> {
    return this.http.post(this.baseUrl + 'api/Common/CreatePhongBan', data);
  }
  updatePhongBan(data: any): Observable<any> {
    return this.http.put(this.baseUrl + 'api/Common/UpdatePhongBan', data);
  }
  deletePhongBan(id: number): Observable<any> {
    return this.http.delete(this.baseUrl + `api/Common/DeletePhongBan/${id}`, {});
  }
  getChucVu(): Observable<any> {
    return this.http.get(this.baseUrl + 'api/Common/GetChucVu', {});
  }
  // Lấy thông báo của người dùng hiện tại
  getThongBao(): Observable<any> {
    const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    const userId = user.userId;
    return this.http.get<any>(
      this.baseUrl + `api/Common/GetMyNotifications?userId=${userId}`
    );
  }
  markAsReadBulk(ids: number[]): Observable<any> {
    const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    const userId = user.userId;
    return this.http.post(
      this.baseUrl + `api/Common/MarkAsReadBulk?userId=${userId}`,
      ids
    );
  }
}