import { Inject, Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import {
  BoSungRequest,
  LanhDaoCauHinh,
  LanhDaoChon,
  LanhDaoDashboard,
  LichBanResult,
  LoaiYeuCauChon,
  PhanHoiDeXuatRequest,
  PhanHoiLanhDaoRequest,
  SuaYeuCauRequest,
  SuKienLanhDaoView,
  TaoYeuCauRequest,
  TepDinhKemInput,
  TroLyDashboard,
  WeekScheduleResponse,
  XepLichRequest,
  YeuCauChiTiet,
  YeuCauItem,
  YeuCauMoi,
  YeuCauQuery,
  YeuCauThongKe
} from "../type";

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

  boSung(id: number, body: BoSungRequest): Observable<void> {
    return this.http.post<void>(this.baseUrl + `api/Request/BoSung/${id}`, body);
  }

  phanHoiDeXuat(id: number, body: PhanHoiDeXuatRequest): Observable<void> {
    return this.http.post<void>(this.baseUrl + `api/Request/PhanHoiDeXuat/${id}`, body);
  }

  uploadTep(file: File): Observable<TepDinhKemInput> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<TepDinhKemInput>(this.baseUrl + 'api/Request/UploadTep', fd);
  }

  // ===== TRỢ LÝ (/api/TroLy/*) =====
  getTroLyDashboard(ngay: string): Observable<TroLyDashboard> {
    const params = new HttpParams().set('ngay', ngay);
    return this.http.get<TroLyDashboard>(this.baseUrl + 'api/TroLy/GetDashboard', { params });
  }

  getTroLyLichTuan(tuNgay: string, denNgay: string): Observable<WeekScheduleResponse> {
    const params = new HttpParams().set('tuNgay', tuNgay).set('denNgay', denNgay);
    return this.http.get<WeekScheduleResponse>(this.baseUrl + 'api/TroLy/GetLichTuan', { params });
  }

  tiepNhanYeuCau(id: number, mucUuTienId?: number | null): Observable<any> {
    return this.http.post(this.baseUrl + `api/TroLy/TiepNhan/${id}`, { mucUuTienId });
  }

  capNhatUuTien(id: number, mucUuTienId: number | null): Observable<any> {
    return this.http.post(this.baseUrl + `api/TroLy/CapNhatUuTien/${id}`, { mucUuTienId });
  }

  xepLich(id: number, body: XepLichRequest): Observable<any> {
    return this.http.post(this.baseUrl + `api/TroLy/XepLich/${id}`, body);
  }

  yeuCauBoSung(id: number, noiDung: string): Observable<any> {
    return this.http.post(this.baseUrl + `api/TroLy/YeuCauBoSung/${id}`, { noiDung });
  }

  tuChoiYeuCau(id: number, lyDo: string): Observable<any> {
    return this.http.post(this.baseUrl + `api/TroLy/TuChoi/${id}`, { lyDo });
  }

  capNhatTrangThaiLich(lichTrinhId: number, trangThaiYeuCau: number, lyDo?: string | null): Observable<any> {
    return this.http.post(this.baseUrl + `api/TroLy/CapNhatTrangThaiLich/${lichTrinhId}`, {
      trangThaiYeuCau,
      lyDo: lyDo || null
    });
  }

  capNhatCauHinhLanhDao(body: Partial<LanhDaoCauHinh>): Observable<LanhDaoCauHinh> {
    return this.http.put<LanhDaoCauHinh>(this.baseUrl + 'api/TroLy/CapNhatCauHinhLanhDao', body);
  }

  taoSuKienTroLy(body: Partial<SuKienLanhDaoView>): Observable<SuKienLanhDaoView> {
    return this.http.post<SuKienLanhDaoView>(this.baseUrl + 'api/TroLy/TaoSuKienLanhDao', body);
  }

  xoaSuKienTroLy(id: number): Observable<boolean> {
    return this.http.delete<boolean>(this.baseUrl + `api/TroLy/XoaSuKienLanhDao/${id}`);
  }

  // ===== LÃNH ĐẠO (/api/LanhDao/*) =====
  getLanhDaoLichNgay(ngay: string): Observable<LanhDaoDashboard> {
    const params = new HttpParams().set('ngay', ngay);
    return this.http.get<LanhDaoDashboard>(this.baseUrl + 'api/LanhDao/GetLichNgay', { params });
  }

  getLanhDaoLichTuan(tuNgay: string, denNgay: string): Observable<WeekScheduleResponse> {
    const params = new HttpParams().set('tuNgay', tuNgay).set('denNgay', denNgay);
    return this.http.get<WeekScheduleResponse>(this.baseUrl + 'api/LanhDao/GetLichTuan', { params });
  }

  capNhatPhanHoiLanhDao(lichTrinhId: number, body: PhanHoiLanhDaoRequest): Observable<any> {
    return this.http.post(this.baseUrl + `api/LanhDao/CapNhatPhanHoi/${lichTrinhId}`, body);
  }

  taoSuKienLanhDao(body: Partial<SuKienLanhDaoView>): Observable<SuKienLanhDaoView> {
    return this.http.post<SuKienLanhDaoView>(this.baseUrl + 'api/LanhDao/TaoSuKien', body);
  }

  xoaSuKienLanhDao(id: number): Observable<boolean> {
    return this.http.delete<boolean>(this.baseUrl + `api/LanhDao/XoaSuKien/${id}`);
  }
}