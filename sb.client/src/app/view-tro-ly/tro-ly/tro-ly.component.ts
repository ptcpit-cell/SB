import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { RequestService } from '../../../services/request.service';
import {
  LanhDaoCauHinh,
  LichTrinhView,
  SuKienLanhDaoView,
  TroLyDashboard,
  TroLyYeuCauItem,
  WeekScheduleResponse,
  XepLichRequest
} from '../../../type';
import { getTodayYmd, shiftYmd } from '../../shared/schedule-layout.util';
import { ScheduleDropPayload } from './schedule-grid/schedule-grid.component';
import { XepLichModalContext } from './schedule-action-modal/schedule-action-modal.component';
import { WeekDropPayload } from '../../shared/week-schedule/week-schedule.component';

@Component({
  selector: 'app-tro-ly',
  standalone: false,
  templateUrl: './tro-ly.component.html',
  styleUrl: './tro-ly.component.css',
})
export class TroLyComponent implements OnInit {
  ngay = getTodayYmd();
  viewMode: 'day' | 'week' = 'day';
  weekStart = this.getMondayOf(getTodayYmd());
  weekData: WeekScheduleResponse | null = null;
  loadingWeek = false;

  loading = true;
  errorMsg = '';
  dashboard: TroLyDashboard | null = null;
  draggingYeuCauId: number | null = null;

  // Modals state
  showWorkingHoursModal = false;
  savingWorkingHours = false;

  showScheduleModal = false;
  savingSchedule = false;
  scheduleModalCtx: XepLichModalContext | null = null;

  showBusyEventModal = false;
  savingBusyEvent = false;

  showExportModal = false;

  // Modal yêu cầu bổ sung
  showBoSungModal = false;
  boSungTarget: TroLyYeuCauItem | null = null;
  boSungNoiDung = '';
  savingBoSung = false;

  // Modal từ chối
  showTuChoiModal = false;
  tuChoiTarget: TroLyYeuCauItem | null = null;
  tuChoiLyDo = '';
  savingTuChoi = false;

  // Modal xem & cập nhật trạng thái lịch trình
  showLichDetailModal = false;
  selectedLich: LichTrinhView | null = null;
  lichUpdateLyDo = '';
  savingLichStatus = false;

  constructor(
    private requestService: RequestService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
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

  loadDashboard(): void {
    this.loading = true;
    this.errorMsg = '';
    this.requestService.getTroLyDashboard(this.ngay).subscribe({
      next: (res) => {
        this.dashboard = res;
        this.loading = false;
        if (this.viewMode === 'week') {
          this.loadWeekData();
        }
      },
      error: (err) => {
        this.errorMsg = err?.error?.message || 'Không tải được dữ liệu điều phối của Trợ lý.';
        this.loading = false;
      }
    });
  }

  loadWeekData(): void {
    this.loadingWeek = true;
    this.requestService.getTroLyLichTuan(this.weekStart, this.weekEnd).subscribe({
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
      this.loadDashboard();
    }
  }

  chonHomNay(): void {
    this.ngay = getTodayYmd();
    this.weekStart = this.getMondayOf(this.ngay);
    this.loadDashboard();
  }

  doiNgay(delta: number): void {
    if (this.viewMode === 'week') {
      this.ngay = shiftYmd(this.ngay, delta * 7);
      this.weekStart = this.getMondayOf(this.ngay);
      this.loadWeekData();
    } else {
      this.ngay = shiftYmd(this.ngay, delta);
      this.weekStart = this.getMondayOf(this.ngay);
      this.loadDashboard();
    }
  }

  onDateInputChange(): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(this.ngay)) return;
    this.weekStart = this.getMondayOf(this.ngay);
    if (this.viewMode === 'week') {
      this.loadWeekData();
    } else {
      this.loadDashboard();
    }
  }

  onSelectDayFromWeek(ymd: string): void {
    this.ngay = ymd;
    this.weekStart = this.getMondayOf(ymd);
    this.viewMode = 'day';
    this.loadDashboard();
  }

  // ===== Queue actions =====
  onTiepNhan(item: TroLyYeuCauItem): void {
    this.requestService.tiepNhanYeuCau(item.yeuCauId, item.mucUuTienId).subscribe({
      next: () => {
        this.toastr.success(`Đã tiếp nhận ${item.maYeuCau}.`);
        this.loadDashboard();
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Tiếp nhận thất bại.')
    });
  }

  onChangeUuTien(ev: { item: TroLyYeuCauItem; mucUuTienId: number | null }): void {
    this.requestService.capNhatUuTien(ev.item.yeuCauId, ev.mucUuTienId).subscribe({
      next: () => {
        this.toastr.success('Đã cập nhật mức ưu tiên.');
        this.loadDashboard();
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Cập nhật ưu tiên thất bại.')
    });
  }

  onMoXepLich(item: TroLyYeuCauItem, defaultHm = '09:00', defaultNgay?: string): void {
    this.scheduleModalCtx = {
      yeuCauId: item.yeuCauId,
      maYeuCau: item.maYeuCau,
      tieuDe: item.tieuDe,
      tenNguoiTrinh: item.tenNguoiTrinh,
      thoiLuongPhut: item.thoiLuongPhut,
      mucKhan: item.mucKhan,
      mucUuTienId: item.mucUuTienId ?? null,
      hanChot: item.hanChot ?? null,
      defaultNgay: defaultNgay || this.ngay,
      defaultGioBatDau: defaultHm,
      isReschedule: false
    };
    this.showScheduleModal = true;
  }

  // ===== Drag & Drop handler (Day Grid) =====
  onSlotDropped(payload: ScheduleDropPayload): void {
    this.draggingYeuCauId = null;
    if (!this.dashboard) return;

    if (payload.source === 'queue') {
      const qItem = this.dashboard.hangCho.find(x => x.yeuCauId === payload.yeuCauId);
      if (qItem) {
        this.onMoXepLich(qItem, payload.dropStartHm);
      }
      return;
    }

    const scheduled = this.dashboard.lichNgay.find(x => x.yeuCauId === payload.yeuCauId);
    if (scheduled) {
      this.scheduleModalCtx = {
        yeuCauId: scheduled.yeuCauId,
        maYeuCau: scheduled.maYeuCau,
        tieuDe: scheduled.tieuDe,
        tenNguoiTrinh: scheduled.tenNguoiTrinh,
        thoiLuongPhut: scheduled.thoiLuongPhut,
        mucKhan: scheduled.mucKhan,
        mucUuTienId: scheduled.mucUuTienId ?? null,
        hanChot: scheduled.hanChot ?? null,
        defaultNgay: this.ngay,
        defaultGioBatDau: payload.dropStartHm,
        isReschedule: true
      };
      this.showScheduleModal = true;
    }
  }

  // ===== Drag & Drop handler (Week Grid) =====
  onWeekDayDropped(payload: WeekDropPayload): void {
    this.draggingYeuCauId = null;
    if (!this.dashboard) return;

    if (payload.source === 'queue') {
      const qItem = this.dashboard.hangCho.find(x => x.yeuCauId === payload.yeuCauId);
      if (qItem) {
        this.onMoXepLich(qItem, '09:00', payload.targetDate);
      }
      return;
    }

    const pool = this.weekData?.lichTrinhs || this.dashboard.lichNgay || [];
    const scheduled = pool.find(x => x.yeuCauId === payload.yeuCauId);
    if (scheduled) {
      const d = new Date(scheduled.batDau);
      const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      this.scheduleModalCtx = {
        yeuCauId: scheduled.yeuCauId,
        maYeuCau: scheduled.maYeuCau,
        tieuDe: scheduled.tieuDe,
        tenNguoiTrinh: scheduled.tenNguoiTrinh,
        thoiLuongPhut: scheduled.thoiLuongPhut,
        mucKhan: scheduled.mucKhan,
        mucUuTienId: scheduled.mucUuTienId ?? null,
        hanChot: scheduled.hanChot ?? null,
        defaultNgay: payload.targetDate,
        defaultGioBatDau: hm,
        isReschedule: true
      };
      this.showScheduleModal = true;
    }
  }

  onConfirmSchedule(ev: { yeuCauId: number; payload: XepLichRequest }): void {
    this.savingSchedule = true;
    this.requestService.xepLich(ev.yeuCauId, ev.payload).subscribe({
      next: (res) => {
        this.savingSchedule = false;
        this.showScheduleModal = false;
        this.toastr.success(res?.message || 'Đã xếp lịch thành công.');
        this.loadDashboard();
      },
      error: (err) => {
        this.savingSchedule = false;
        this.toastr.error(err?.error?.message || 'Xếp lịch thất bại.');
      }
    });
  }

  // ===== Bổ sung & Từ chối =====
  onMoBoSung(item: TroLyYeuCauItem): void {
    this.boSungTarget = item;
    this.boSungNoiDung = '';
    this.showBoSungModal = true;
  }

  xacNhanBoSung(): void {
    if (!this.boSungTarget || !this.boSungNoiDung.trim()) {
      this.toastr.warning('Vui lòng nhập nội dung yêu cầu bổ sung.');
      return;
    }
    this.savingBoSung = true;
    this.requestService.yeuCauBoSung(this.boSungTarget.yeuCauId, this.boSungNoiDung.trim()).subscribe({
      next: () => {
        this.savingBoSung = false;
        this.showBoSungModal = false;
        this.toastr.success('Đã gửi yêu cầu bổ sung tới nhân viên.');
        this.loadDashboard();
      },
      error: (err) => {
        this.savingBoSung = false;
        this.toastr.error(err?.error?.message || 'Gửi yêu cầu bổ sung thất bại.');
      }
    });
  }

  onMoTuChoi(item: TroLyYeuCauItem): void {
    this.tuChoiTarget = item;
    this.tuChoiLyDo = '';
    this.showTuChoiModal = true;
  }

  xacNhanTuChoi(): void {
    if (!this.tuChoiTarget || !this.tuChoiLyDo.trim()) {
      this.toastr.warning('Vui lòng nhập lý do từ chối.');
      return;
    }
    this.savingTuChoi = true;
    this.requestService.tuChoiYeuCau(this.tuChoiTarget.yeuCauId, this.tuChoiLyDo.trim()).subscribe({
      next: () => {
        this.savingTuChoi = false;
        this.showTuChoiModal = false;
        this.toastr.success('Đã từ chối yêu cầu.');
        this.loadDashboard();
      },
      error: (err) => {
        this.savingTuChoi = false;
        this.toastr.error(err?.error?.message || 'Từ chối yêu cầu thất bại.');
      }
    });
  }

  // ===== Chi tiết & Trạng thái lịch trình =====
  onSelectLich(lt: LichTrinhView): void {
    this.selectedLich = lt;
    this.lichUpdateLyDo = '';
    this.showLichDetailModal = true;
  }

  moDoiGioTuLich(): void {
    if (!this.selectedLich || !this.dashboard) return;
    const lt = this.selectedLich;
    const d = new Date(lt.batDau);
    const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const lichDate = lt.batDau ? lt.batDau.slice(0, 10) : this.ngay;
    this.showLichDetailModal = false;
    this.scheduleModalCtx = {
      yeuCauId: lt.yeuCauId,
      maYeuCau: lt.maYeuCau,
      tieuDe: lt.tieuDe,
      tenNguoiTrinh: lt.tenNguoiTrinh,
      thoiLuongPhut: lt.thoiLuongPhut,
      mucKhan: lt.mucKhan,
      mucUuTienId: lt.mucUuTienId ?? null,
      hanChot: lt.hanChot ?? null,
      defaultNgay: lichDate,
      defaultGioBatDau: hm,
      isReschedule: true
    };
    this.showScheduleModal = true;
  }

  capNhatTrangThaiLich(trangThaiYeuCau: number): void {
    if (!this.selectedLich) return;
    this.savingLichStatus = true;
    this.requestService.capNhatTrangThaiLich(this.selectedLich.lichTrinhId, trangThaiYeuCau, this.lichUpdateLyDo.trim() || null).subscribe({
      next: () => {
        this.savingLichStatus = false;
        this.showLichDetailModal = false;
        this.toastr.success('Đã cập nhật trạng thái buổi trình.');
        this.loadDashboard();
      },
      error: (err) => {
        this.savingLichStatus = false;
        this.toastr.error(err?.error?.message || 'Cập nhật thất bại.');
      }
    });
  }

  // ===== Cấu hình giờ làm việc & Sự kiện bận =====
  onSaveWorkingHours(payload: Partial<LanhDaoCauHinh>): void {
    this.savingWorkingHours = true;
    this.requestService.capNhatCauHinhLanhDao(payload).subscribe({
      next: () => {
        this.savingWorkingHours = false;
        this.showWorkingHoursModal = false;
        this.toastr.success('Đã lưu giờ làm việc của Lãnh đạo.');
        this.loadDashboard();
      },
      error: (err) => {
        this.savingWorkingHours = false;
        this.toastr.error(err?.error?.message || 'Lưu giờ làm việc thất bại.');
      }
    });
  }

  onSaveBusyEvent(payload: Partial<SuKienLanhDaoView>): void {
    this.savingBusyEvent = true;
    this.requestService.taoSuKienTroLy(payload).subscribe({
      next: () => {
        this.savingBusyEvent = false;
        this.showBusyEventModal = false;
        this.toastr.success('Đã thêm lịch bận của Lãnh đạo.');
        this.loadDashboard();
      },
      error: (err) => {
        this.savingBusyEvent = false;
        this.toastr.error(err?.error?.message || 'Thêm sự kiện thất bại.');
      }
    });
  }

  onDeleteSuKien(sk: SuKienLanhDaoView): void {
    this.requestService.xoaSuKienTroLy(sk.id).subscribe({
      next: () => {
        this.toastr.success('Đã xóa sự kiện bận.');
        this.loadDashboard();
      },
      error: () => this.toastr.error('Không thể xóa sự kiện.')
    });
  }

  onXemChiTiet(yeuCauId: number): void {
    this.showLichDetailModal = false;
    this.router.navigate(['/nhan-vien/detail-request', yeuCauId]);
  }
}
