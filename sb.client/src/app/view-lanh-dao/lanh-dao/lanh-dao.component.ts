import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { RequestService } from '../../../services/request.service';
import {
  LanhDaoDashboard,
  LichTrinhView,
  PhanHoiLanhDaoRequest,
  SuKienLanhDaoView,
  WeekScheduleResponse
} from '../../../type';
import { getTodayYmd, shiftYmd } from '../../shared/schedule-layout.util';

@Component({
  selector: 'app-lanh-dao',
  standalone: false,
  templateUrl: './lanh-dao.component.html',
  styleUrl: './lanh-dao.component.css',
})
export class LanhDaoComponent implements OnInit {
  ngay = getTodayYmd();
  viewMode: 'day' | 'week' = 'day';
  weekStart = this.getMondayOf(getTodayYmd());
  weekData: WeekScheduleResponse | null = null;
  loadingWeek = false;

  loading = true;
  errorMsg = '';
  dashboard: LanhDaoDashboard | null = null;

  // Modals
  showFeedbackModal = false;
  selectedLich: LichTrinhView | null = null;
  savingFeedback = false;

  showBusyEventModal = false;
  savingBusyEvent = false;

  showExportModal = false;

  constructor(
    private requestService: RequestService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadLichNgay();
  }

  get weekEnd(): string {
    return shiftYmd(this.weekStart, 6);
  }

  private getMondayOf(ymd: string): string {
    const [y, m, d] = ymd.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const dow = dt.getDay();
    const offset = dow === 0 ? -6 : 1 - dow;
    return shiftYmd(ymd, offset);
  }

  loadLichNgay(): void {
    this.loading = true;
    this.errorMsg = '';
    this.requestService.getLanhDaoLichNgay(this.ngay).subscribe({
      next: (res) => {
        this.dashboard = res;
        this.loading = false;
        if (this.viewMode === 'week') {
          this.loadWeekData();
        }
      },
      error: (err) => {
        this.errorMsg = err?.error?.message || 'Không tải được lịch trình của Lãnh đạo.';
        this.loading = false;
      }
    });
  }

  loadWeekData(): void {
    this.loadingWeek = true;
    this.requestService.getLanhDaoLichTuan(this.weekStart, this.weekEnd).subscribe({
      next: (res) => {
        this.weekData = res;
        this.loadingWeek = false;
      },
      error: () => {
        this.loadingWeek = false;
      }
    });
  }

  switchViewMode(mode: 'day' | 'week'): void {
    if (this.viewMode === mode) return;
    this.viewMode = mode;
    if (mode === 'week') {
      this.weekStart = this.getMondayOf(this.ngay);
      this.loadWeekData();
    } else {
      this.loadLichNgay();
    }
  }

  chonHomNay(): void {
    this.ngay = getTodayYmd();
    this.weekStart = this.getMondayOf(this.ngay);
    this.loadLichNgay();
  }

  doiNgay(delta: number): void {
    if (this.viewMode === 'week') {
      this.ngay = shiftYmd(this.ngay, delta * 7);
      this.weekStart = this.getMondayOf(this.ngay);
      this.loadWeekData();
    } else {
      this.ngay = shiftYmd(this.ngay, delta);
      this.weekStart = this.getMondayOf(this.ngay);
      this.loadLichNgay();
    }
  }

  onDateInputChange(): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(this.ngay)) return;
    this.weekStart = this.getMondayOf(this.ngay);
    if (this.viewMode === 'week') {
      this.loadWeekData();
    } else {
      this.loadLichNgay();
    }
  }

  onSelectDayFromWeek(ymd: string): void {
    this.ngay = ymd;
    this.weekStart = this.getMondayOf(ymd);
    this.viewMode = 'day';
    this.loadLichNgay();
  }

  onOpenFeedback(item: LichTrinhView): void {
    this.selectedLich = item;
    this.showFeedbackModal = true;
  }

  onSubmitFeedback(ev: { lichTrinhId: number; payload: PhanHoiLanhDaoRequest }): void {
    this.savingFeedback = true;
    this.requestService.capNhatPhanHoiLanhDao(ev.lichTrinhId, ev.payload).subscribe({
      next: (res) => {
        this.savingFeedback = false;
        this.showFeedbackModal = false;
        this.toastr.success(res?.message || 'Đã lưu phản hồi và gửi thông báo tới nhân viên.');
        this.loadLichNgay();
      },
      error: (err) => {
        this.savingFeedback = false;
        this.toastr.error(err?.error?.message || 'Lưu phản hồi thất bại.');
      }
    });
  }

  onSaveBusyEvent(payload: Partial<SuKienLanhDaoView>): void {
    this.savingBusyEvent = true;
    this.requestService.taoSuKienLanhDao(payload).subscribe({
      next: () => {
        this.savingBusyEvent = false;
        this.showBusyEventModal = false;
        this.toastr.success('Đã thêm lịch bận cá nhân.');
        this.loadLichNgay();
      },
      error: (err) => {
        this.savingBusyEvent = false;
        this.toastr.error(err?.error?.message || 'Thêm sự kiện thất bại.');
      }
    });
  }

  onDeleteSuKien(sk: SuKienLanhDaoView): void {
    this.requestService.xoaSuKienLanhDao(sk.id).subscribe({
      next: () => {
        this.toastr.success('Đã xóa sự kiện bận.');
        this.loadLichNgay();
      },
      error: () => this.toastr.error('Không thể xóa sự kiện.')
    });
  }

  onOpenFullDetail(yeuCauId: number): void {
    this.showFeedbackModal = false;
    this.router.navigate(['/nhan-vien/detail-request', yeuCauId]);
  }
}
