import { Component, OnDestroy, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { RequestService } from '../../../services/request.service';
import { YeuCauItem } from '../../../type';
import { PageEvent } from '@angular/material/paginator';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

type StepState = 'done' | 'current' | 'warn' | 'error' | 'todo';
interface StepView {
  label: string;
  state: StepState;
}

interface YeuCauView extends YeuCauItem {
  statusLabel: string;
  statusCss: string;
  steps: StepView[];
  canEdit: boolean;
  canSend: boolean;
  canCancel: boolean;
  needAction: boolean;
  actionLabel: string;
  huyCanLyDo: boolean;
  hanChotStatus: 'overdue' | 'soon' | 'normal' | null;
  hanChotHint: string;
}
const STEP_LABELS = [
  'Đã gửi',
  'Xem xét',
  'Duyệt lịch',
  'Buổi trình',
  'Hoàn thành',
];

// done = số bước đã xong; mode = trạng thái của bước kế tiếp
const STEP_CFG: Record<number, { done: number; mode: StepState }> = {
  0: { done: 0, mode: 'todo' }, // Nháp
  1: { done: 1, mode: 'current' }, // Chờ xử lý
  2: { done: 1, mode: 'current' }, // Đang xem xét
  3: { done: 1, mode: 'warn' }, // Đề xuất đổi lịch (chờ nhân viên)
  4: { done: 1, mode: 'warn' }, // Yêu cầu bổ sung (chờ nhân viên)
  5: { done: 3, mode: 'current' }, // Đã duyệt, chờ đến buổi trình
  6: { done: 4, mode: 'current' }, // Đã trình, chờ hoàn tất
  7: { done: 5, mode: 'todo' }, // Hoàn thành
  8: { done: 1, mode: 'error' }, // Từ chối
  9: { done: 1, mode: 'error' }, // Đã hủy (tính lại bên dưới)
  10: { done: 2, mode: 'warn' }, // Hoãn
  11: { done: 3, mode: 'error' }, // Vắng
};

const STATUS_INFO: Record<number, { label: string; css: string }> = {
  0: { label: 'Bản nháp', css: 'secondary' },
  1: { label: 'Chờ xử lý', css: 'primary' },
  2: { label: 'Đang xem xét', css: 'info' },
  3: { label: 'Đề xuất đổi lịch', css: 'warning' },
  4: { label: 'Cần bổ sung', css: 'warning' },
  5: { label: 'Đã duyệt lịch', css: 'success' },
  6: { label: 'Đã trình', css: 'success' },
  7: { label: 'Hoàn thành', css: 'success' },
  8: { label: 'Từ chối', css: 'danger' },
  9: { label: 'Đã hủy', css: 'secondary' },
  10: { label: 'Hoãn', css: 'warning' },
  11: { label: 'Vắng', css: 'danger' },
};

const DANG_XU_LY = [0, 1, 2, 3, 4, 5, 10];
const LICH_SU = [6, 7, 8, 9, 11];
@Component({
  selector: 'app-nhan-vien',
  standalone: false,
  templateUrl: './nhan-vien.component.html',
  styleUrl: './nhan-vien.component.css',
})
export class NhanVienComponent implements OnInit, OnDestroy {
  total = 0;
  pageIndex = 0;
  pageSize = 5;
  pageSizeOptions = [5, 10, 20, 50];
  keyword = '';
  showHuyModal = false;
  huyTarget: YeuCauView | null = null;
  lyDoHuy = '';
  dangHuy = false;
  items: YeuCauView[] = [];
  loading = false;

  tab = 1; // 0 tất cả, 1 đang xử lý, 2 lịch sử
  trangThaiLoc: number | null = null;
  chiCanHanhDong = false;
  tabCount = { all: 0, dangXuLy: 0, lichSu: 0, daDuyetLich: 0 };
  canHanhDong = 0;

  readonly skeletonRows = [1, 2, 3];
  readonly statusOptions = Object.entries(STATUS_INFO).map(([k, v]) => ({
    value: +k,
    label: v.label,
  }));

  private search$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private toastrService: ToastrService,
    private router: Router,
    private requestService: RequestService
  ) {}

  ngOnInit(): void {
    this.search$
      .pipe(debounceTime(450), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.pageIndex = 0;
        this.loadDanhSach();
      });

    this.loadThongKe();
    this.loadDanhSach();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get hasActiveFilter(): boolean {
    return (
      this.chiCanHanhDong ||
      this.trangThaiLoc !== null ||
      this.keyword.trim().length > 0
    );
  }

  // ---------- Tải dữ liệu ----------
  loadDanhSach(): void {
    this.loading = true;
    const isActionOnly = this.chiCanHanhDong;
    this.requestService
      .getDanhSach({
        nhomTrangThai: isActionOnly ? 1 : this.tab,
        trangThai: isActionOnly ? null : this.trangThaiLoc,
        tuKhoa: this.keyword,
        page: isActionOnly ? 1 : this.pageIndex + 1,
        pageSize: isActionOnly ? 50 : this.pageSize,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows) => {
          const mapped = rows.map((r) => this.toView(r));
          if (isActionOnly) {
            const filtered = mapped.filter((x) => x.needAction);
            this.items = filtered;
            this.total = filtered.length;
          } else {
            this.items = mapped;
            this.total = rows[0]?.tongSo ?? 0;
          }
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.toastrService.error(this.errMsg(err));
        },
      });
  }

  loadThongKe(): void {
    this.requestService
      .getThongKe()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tk) => {
          const sum = (ids?: number[]) =>
            tk.theoTrangThai
              .filter((x) => !ids || ids.includes(x.trangThai))
              .reduce((s, x) => s + x.soLuong, 0);
          this.tabCount = {
            all: sum(),
            dangXuLy: sum(DANG_XU_LY),
            lichSu: sum(LICH_SU),
            daDuyetLich: sum([5]),
          };
          this.canHanhDong = tk.canHanhDong;
        },
        error: () => {},
      });
  }

  // ---------- Sự kiện giao diện ----------
  onSearch(): void {
    this.search$.next(this.keyword);
  }

  clearSearch(): void {
    if (!this.keyword) return;
    this.keyword = '';
    this.pageIndex = 0;
    this.loadDanhSach();
  }

  chonTab(tab: number): void {
    if (this.tab === tab && !this.chiCanHanhDong && this.trangThaiLoc === null) {
      return;
    }
    this.tab = tab;
    this.chiCanHanhDong = false;
    this.trangThaiLoc = null;
    this.pageIndex = 0;
    this.loadDanhSach();
  }

  locCanHanhDong(): void {
    this.chiCanHanhDong = !this.chiCanHanhDong;
    if (this.chiCanHanhDong) {
      this.tab = 1;
      this.trangThaiLoc = null;
    }
    this.pageIndex = 0;
    this.loadDanhSach();
  }

  locDaDuyetLich(): void {
    this.chiCanHanhDong = false;
    this.tab = 1;
    this.trangThaiLoc = this.trangThaiLoc === 5 ? null : 5;
    this.pageIndex = 0;
    this.loadDanhSach();
  }

  onLocTrangThai(): void {
    this.chiCanHanhDong = false;
    this.pageIndex = 0;
    this.loadDanhSach();
  }

  datLaiBoLoc(): void {
    this.chiCanHanhDong = false;
    this.trangThaiLoc = null;
    this.keyword = '';
    this.pageIndex = 0;
    this.loadDanhSach();
  }

  onPage(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.loadDanhSach();
  }

  // ---------- Điều hướng ----------
  taoMoi(): void {
    this.router.navigate(['/nhan-vien/create-request']);
  }

  xemChiTiet(item: YeuCauView): void {
    this.router.navigate(['/nhan-vien/detail-request', item.yeuCauId]);
  }

  sua(item: YeuCauView): void {
    this.router.navigate(['/nhan-vien/edit-request', item.yeuCauId]);
  }

  // ---------- Hành động ----------
  gui(item: YeuCauView): void {
    this.requestService.sendYeuCau(item.yeuCauId).subscribe({
      next: () => {
        this.toastrService.success('Đã gửi yêu cầu cho trợ lý.');
        this.reload();
      },
      error: (err) => this.toastrService.error(this.errMsg(err)),
    });
  }

  moHopHuy(item: YeuCauView): void {
    this.huyTarget = item;
    this.lyDoHuy = '';
    this.showHuyModal = true;
  }

  dongHopHuy(): void {
    if (this.dangHuy) return;
    this.showHuyModal = false;
    this.huyTarget = null;
  }

  xacNhanHuy(): void {
    if (!this.huyTarget || this.dangHuy) return;
    if (this.huyTarget.huyCanLyDo && !this.lyDoHuy.trim()) {
      this.toastrService.warning(
        'Yêu cầu đã được xếp lịch, vui lòng nhập lý do hủy.'
      );
      return;
    }
    this.dangHuy = true;
    this.requestService
      .cancelYeuCau(this.huyTarget.yeuCauId, this.lyDoHuy.trim() || null)
      .subscribe({
        next: () => {
          this.dangHuy = false;
          this.showHuyModal = false;
          this.huyTarget = null;
          this.toastrService.success('Đã hủy yêu cầu.');
          this.reload();
        },
        error: (err) => {
          this.dangHuy = false;
          this.toastrService.error(this.errMsg(err));
        },
      });
  }

  trackById = (_: number, x: YeuCauView) => x.yeuCauId;

  // ---------- Nội bộ ----------
  private reload(): void {
    this.loadThongKe();
    this.loadDanhSach();
  }

  private getDeadlineMeta(
    hanChot: string | undefined,
    trangThai: number
  ): { status: 'overdue' | 'soon' | 'normal' | null; hint: string } {
    if (!hanChot) return { status: null, hint: '' };
    if (!DANG_XU_LY.includes(trangThai)) return { status: 'normal', hint: '' };

    const due = new Date(hanChot);
    if (isNaN(due.getTime())) return { status: null, hint: '' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.round(
      (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays < 0) {
      return { status: 'overdue', hint: `Quá hạn ${Math.abs(diffDays)} ngày` };
    }
    if (diffDays === 0) {
      return { status: 'soon', hint: 'Hạn hôm nay' };
    }
    if (diffDays <= 2) {
      return { status: 'soon', hint: `Còn ${diffDays} ngày` };
    }
    return { status: 'normal', hint: '' };
  }

  private toView(r: YeuCauItem): YeuCauView {
    const info = STATUS_INFO[r.trangThai] ?? { label: '—', css: 'secondary' };
    const cfg = STEP_CFG[r.trangThai] ?? { done: 0, mode: 'todo' as StepState };

    let done = cfg.done;
    if (r.trangThai === 9) {
      // Hủy: dừng ở bước đang có tại thời điểm hủy
      done = !r.ngayGui ? 0 : r.lichBatDau ? 3 : 1;
    }

    const steps: StepView[] = STEP_LABELS.map((label, i) => ({
      label,
      state: i < done ? 'done' : i === done ? cfg.mode : 'todo',
    }));

    const needAction = r.trangThai === 3 || r.trangThai === 4;
    const deadline = this.getDeadlineMeta(r.hanChot, r.trangThai);
    return {
      ...r,
      statusLabel: info.label,
      statusCss: info.css,
      steps,
      canEdit: r.trangThai === 0,
      canSend: r.trangThai === 0,
      canCancel: DANG_XU_LY.includes(r.trangThai),
      needAction,
      actionLabel: r.trangThai === 3 ? 'Phản hồi đề xuất' : 'Bổ sung thông tin',
      huyCanLyDo:
        !!r.lichBatDau && (r.trangThaiLich === 1 || r.trangThaiLich === 4),
      hanChotStatus: deadline.status,
      hanChotHint: deadline.hint,
    };
  }

  private errMsg(err: any): string {
    return err?.error?.message ?? 'Có lỗi xảy ra, vui lòng thử lại.';
  }
}
