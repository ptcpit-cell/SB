import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CommonService } from '../../../services/common.service';
import { ReportService } from '../../../services/report.service';
import { getTodayYmd, shiftYmd } from '../schedule-layout.util';

@Component({
  selector: 'app-excel-export-modal',
  standalone: false,
  templateUrl: './excel-export-modal.component.html',
  styleUrl: './excel-export-modal.component.css',
})
export class ExcelExportModalComponent implements OnChanges {
  @Input() visible = false;
  @Output() closeModal = new EventEmitter<void>();

  tuNgay = '';
  denNgay = '';
  chiNhanhId: number = 0;
  nhomTrangThai = 0; // 0: tất cả, 1: đang xử lý, 2: đã trình/hoàn thành
  chiNhanhs: any[] = [];
  loadingBranches = false;
  exporting = false;

  constructor(
    private commonService: CommonService,
    private reportService: ReportService,
    private toastr: ToastrService
  ) {}

  ngOnChanges(): void {
    if (this.visible) {
      this.initDefaults();
      if (this.chiNhanhs.length === 0) {
        this.loadBranches();
      }
    }
  }

  private initDefaults(): void {
    const today = getTodayYmd();
    this.denNgay = today;
    this.tuNgay = `${today.slice(0, 7)}-01`;
    this.nhomTrangThai = 0;

    // Lấy chi nhánh mặc định của user từ sessionStorage
    try {
      const raw = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
      const u = raw?.user ?? raw ?? {};
      const userBranchId = Number(u?.chiNhanhId ?? 0);
      this.chiNhanhId = userBranchId > 0 ? userBranchId : 0;
    } catch {
      this.chiNhanhId = 0;
    }
  }

  private loadBranches(): void {
    this.loadingBranches = true;
    this.commonService.getAllChiNhanh().subscribe({
      next: (res) => {
        this.chiNhanhs = Array.isArray(res) ? res : [];
        this.loadingBranches = false;
      },
      error: () => {
        this.loadingBranches = false;
      }
    });
  }

  chonNhanh(preset: 'today' | 'week' | 'month' | '30days'): void {
    const today = getTodayYmd();
    this.denNgay = today;
    if (preset === 'today') {
      this.tuNgay = today;
    } else if (preset === 'week') {
      const now = new Date();
      const day = now.getDay();
      const diffToMon = day === 0 ? -6 : 1 - day;
      this.tuNgay = shiftYmd(today, diffToMon);
      this.denNgay = shiftYmd(this.tuNgay, 6);
    } else if (preset === 'month') {
      this.tuNgay = `${today.slice(0, 7)}-01`;
    } else {
      this.tuNgay = shiftYmd(today, -30);
    }
  }

  exportExcel(): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(this.tuNgay) || !/^\d{4}-\d{2}-\d{2}$/.test(this.denNgay)) {
      this.toastr.warning('Vui lòng chọn đầy đủ Từ ngày và Đến ngày hợp lệ (dd/MM/yyyy).');
      return;
    }
    if (this.denNgay < this.tuNgay) {
      this.toastr.warning('Đến ngày phải lớn hơn hoặc bằng Từ ngày.');
      return;
    }

    this.exporting = true;
    this.reportService
      .getBaoCaoYeuCau({
        tuNgay: this.tuNgay,
        denNgay: this.denNgay,
        chiNhanhId: Number(this.chiNhanhId || 0),
        nhomTrangThai: this.nhomTrangThai
      })
      .subscribe({
        next: async (res) => {
          if (!res.rows || res.rows.length === 0) {
            this.exporting = false;
            this.toastr.info('Không có dữ liệu yêu cầu nào trong khoảng thời gian và chi nhánh đã chọn.');
            return;
          }
          try {
            await this.reportService.exportBaoCaoToExcel(res);
            this.exporting = false;
            this.toastr.success(`Đã xuất báo cáo Excel (${res.tongSo} yêu cầu).`);
            this.closeModal.emit();
          } catch {
            this.exporting = false;
            this.toastr.error('Không thể tạo tệp Excel. Vui lòng thử lại.');
          }
        },
        error: (err) => {
          this.exporting = false;
          this.toastr.error(err?.error?.message || 'Xuất báo cáo Excel thất bại.');
        }
      });
  }
}
