import { Inject, Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { LanhDaoChon, LichBanResult, LoaiYeuCauChon, SuaYeuCauRequest, TaoYeuCauRequest, TepDinhKemInput, YeuCauChiTiet, YeuCauItem, YeuCauMoi, YeuCauQuery, YeuCauThongKe } from "../type";

@Injectable ({ providedIn: 'root' })

export class RequestService {
    constructor(
    private http: HttpClient,
    @Inject('BASE_URL') private baseUrl: string
  ) {}
  getDanhSach(q: YeuCauQuery): Observable<YeuCauItem[]> {
    let params = new HttpParams()
      .set('nhomTrangThai', q.nhomTrangThai)
      .set('page', q.page)
      .set('pageSize', q.pageSize);
    if (q.trangThai != null) params = params.set('trangThai', q.trangThai);
    if (q.tuKhoa?.trim()) params = params.set('tuKhoa', q.tuKhoa.trim());
    return this.http.get<YeuCauItem[]>(this.baseUrl + 'api/Request/GetYeuCau', { params });
  }

  getThongKe(): Observable<YeuCauThongKe> {
    return this.http.get<YeuCauThongKe>(this.baseUrl + 'api/Request/GetThongKe');
  }

  sendYeuCau(id: number): Observable<void> {
    return this.http.post<void>(this.baseUrl + `api/Request/SendYeuCau/${id}`, {});
  }

  cancelYeuCau(id: number, lyDo: string | null): Observable<void> {
    return this.http.post<void>(this.baseUrl + `api/Request/CancelYeuCau/${id}`, { lyDo });
  }
  getLanhDaoChon(): Observable<LanhDaoChon[]> {
  return this.http.get<LanhDaoChon[]>(this.baseUrl + 'api/Request/GetLanhDaoChon');
  }

  getLoaiYeuCau(): Observable<LoaiYeuCauChon[]> {
    return this.http.get<LoaiYeuCauChon[]>(this.baseUrl + 'api/Request/GetLoaiYeuCau');
  }

  getLichBan(lanhDaoId: number, tuNgay: string, denNgay: string): Observable<LichBanResult> {
    const params = new HttpParams().set('tuNgay', tuNgay).set('denNgay', denNgay);
    return this.http.get<LichBanResult>(this.baseUrl + `api/Request/GetLichBan/${lanhDaoId}`, { params });
  }

  tao(body: TaoYeuCauRequest): Observable<YeuCauMoi[]> {
    return this.http.post<YeuCauMoi[]>(this.baseUrl + 'api/Request/Tao', body);
  }
  getChiTiet(id: number): Observable<YeuCauChiTiet> {
  return this.http.get<YeuCauChiTiet>(this.baseUrl + `api/Request/GetChiTiet/${id}`);
}

sua(id: number, body: SuaYeuCauRequest): Observable<void> {
  return this.http.post<void>(this.baseUrl + `api/Request/Sua/${id}`, body);
}
  uploadTep(file: File): Observable<TepDinhKemInput> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<TepDinhKemInput>(this.baseUrl + 'api/Request/UploadTep', fd);
  }
}