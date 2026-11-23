import { Inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaoCaoYeuCauResponse } from '../type';

@Injectable({ providedIn: 'root' })
export class ReportService {
  constructor(
    private http: HttpClient,
    @Inject('BASE_URL') private baseUrl: string
  ) {}

  getBaoCaoYeuCau(query: {
    tuNgay: string;
    denNgay: string;
    chiNhanhId: number;
    nhomTrangThai?: number;
  }): Observable<BaoCaoYeuCauResponse> {
    let params = new HttpParams()
      .set('tuNgay', query.tuNgay)
      .set('denNgay', query.denNgay)
      .set('chiNhanhId', String(query.chiNhanhId));
    if (query.nhomTrangThai !== undefined) {
      params = params.set('nhomTrangThai', String(query.nhomTrangThai));
    }
    return this.http.get<BaoCaoYeuCauResponse>(
      this.baseUrl + 'api/Report/GetBaoCaoYeuCau',
      { params }
    );
  }

  async exportBaoCaoToExcel(data: BaoCaoYeuCauResponse): Promise<void> {
    const xlsxModule: any = await import('xlsx-js-style');
    const XLSX = xlsxModule?.default ?? xlsxModule;
    const titleText = `BÁO CÁO YÊU CẦU TRÌNH LÃNH ĐẠO`;
    const subText = `Chi nhánh: ${data.tenChiNhanh}  |  Thời gian: ${this.formatDate(data.tuNgay)} - ${this.formatDate(data.denNgay)}  |  Tổng số: ${data.tongSo} yêu cầu`;

    const headers = [
      'STT',
      'Mã yêu cầu',
      'Tiêu đề',
      'Chi nhánh',
      'Người trình',
      'Phòng ban',
      'Lãnh đạo',
      'Loại yêu cầu',
      'Mức khẩn',
      'Mức ưu tiên',
      'Thời lượng (phút)',
      'Hạn chót',
      'Lịch trình',
      'Trạng thái',
      'Phản hồi lãnh đạo / Lý do'
    ];

    const bodyRows = data.rows.map((r, idx) => [
      idx + 1,
      r.maYeuCau,
      r.tieuDe,
      r.tenChiNhanh,
      r.tenNguoiTrinh,
      r.tenPhongBan || '',
      r.tenLanhDao,
      r.tenLoai,
      r.mucKhan,
      r.mucUuTien || '',
      r.thoiLuongPhut,
      r.hanChot ? this.formatDate(r.hanChot.slice(0, 10)) : '',
      r.lichBatDau
        ? `${this.formatDateTime(r.lichBatDau)} - ${this.formatTime(r.lichKetThuc)}`
        : 'Chưa xếp lịch',
      r.tenTrangThai,
      r.phanHoiLanhDao || r.lyDoTuChoiHuy || ''
    ]);

    const aoa: any[][] = [
      [titleText],
      [subText],
      [],
      headers,
      ...bodyRows
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } }
    ];

    ws['!cols'] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 36 },
      { wch: 20 },
      { wch: 20 },
      { wch: 18 },
      { wch: 20 },
      { wch: 18 },
      { wch: 12 },
      { wch: 16 },
      { wch: 14 },
      { wch: 13 },
      { wch: 24 },
      { wch: 18 },
      { wch: 34 }
    ];

    if (ws['A1']) {
      ws['A1'].s = {
        font: { name: 'Arial', sz: 14, bold: true, color: { rgb: '0F172A' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    }
    if (ws['A2']) {
      ws['A2'].s = {
        font: { name: 'Arial', sz: 10, italic: true, color: { rgb: '475569' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    }

    const borderThin = {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    };

    for (let c = 0; c < headers.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: 3, c });
      if (ws[addr]) {
        ws[addr].s = {
          font: { name: 'Arial', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '1D4ED8' } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border: borderThin
        };
      }
    }

    for (let r = 0; r < bodyRows.length; r++) {
      const rowIdx = 4 + r;
      const isAlt = r % 2 === 1;
      for (let c = 0; c < headers.length; c++) {
        const addr = XLSX.utils.encode_cell({ r: rowIdx, c });
        if (ws[addr]) {
          ws[addr].s = {
            font: { name: 'Arial', sz: 10, color: { rgb: '0F172A' } },
            fill: isAlt ? { fgColor: { rgb: 'F8FAFC' } } : undefined,
            alignment: {
              horizontal: c === 0 || c === 10 || c === 11 ? 'center' : 'left',
              vertical: 'center',
              wrapText: c === 2 || c === 14
            },
            border: borderThin
          };
        }
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BaoCaoYeuCau');
    const safeFrom = (data.tuNgay || '').replace(/-/g, '');
    const safeTo = (data.denNgay || '').replace(/-/g, '');
    XLSX.writeFile(wb, `BaoCao_YeuCauTrinh_${safeFrom}_${safeTo}.xlsx`);
  }

  private formatDate(ymd: string): string {
    if (!ymd || ymd.length < 10) return ymd || '';
    const [y, m, d] = ymd.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }

  private formatTime(iso: string | null): string {
    if (!iso) return '';
    const dt = new Date(iso);
    if (isNaN(dt.getTime())) return '';
    return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
  }

  private formatDateTime(iso: string | null): string {
    if (!iso) return '';
    const dt = new Date(iso);
    if (isNaN(dt.getTime())) return '';
    const d = String(dt.getDate()).padStart(2, '0');
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const y = dt.getFullYear();
    return `${d}/${m}/${y} ${this.formatTime(iso)}`;
  }
}
