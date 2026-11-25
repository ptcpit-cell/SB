import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { RequestService } from '../../../../services/request.service';
import { AuthService } from '../../../../auth/auth.service';
import { TepDinhKemInput, YeuCauChiTiet } from '../../../../type';
import {
  AttachmentLike,
  buildFileUrl,
  buildOpenFileUrl,
  getFileIconClass,
  isDocxFile,
} from '../../../shared/file-preview.util';

interface StepView {
  label: string;
  state: 'done' | 'current' | 'warn' | 'error' | 'todo';
}

const STATUS_META: Record<number, { label: string; css: string }> = {
  0: { label: 'Nháp', css: 'secondary' },
  1: { label: 'Chờ tiếp nhận', css: 'info' },
  2: { label: 'Đang xem xét', css: 'primary' },
  3: { label: 'Chờ phản hồi đổi lịch', css: 'warning' },
  4: { label: 'Cần bổ sung', css: 'warning' },
  5: { label: 'Đã xếp lịch', css: 'primary' },
  6: { label: 'Đã trình', css: 'success' },
  7: { label: 'Hoàn thành', css: 'success' },
  8: { label: 'Từ chối', css: 'danger' },
  9: { label: 'Đã hủy', css: 'secondary' },
  10: { label: 'Tạm hoãn', css: 'warning' },
  11: { label: 'Vắng', css: 'danger' }
};

@Component({
  selector: 'app-detail-request',
  standalone: false,
  templateUrl: './detail-request.component.html',
  styleUrl: './detail-request.component.css',
})
export class DetailRequestComponent implements OnInit, OnDestroy {
  yeuCauId = 0;
  loading = true;
  errorMsg = '';
  data: YeuCauChiTiet | null = null;
  steps: StepView[] = [];
  currentUserId = 0;

  // Form bổ sung thông tin (trangThai === 4)
  boSungNoiDung = '';
  boSungTomTat = '';
  boSungTeps: TepDinhKemInput[] = [];
  uploadingBoSung = false;
  submittingBoSung = false;

  // Form phản hồi đề xuất đổi lịch (trangThai === 3)
  phanHoiGhiChu = '';
  submittingPhanHoi = false;

  // Modal hủy yêu cầu
  showHuyModal = false;
  lyDoHuy = '';
  dangHuy = false;

  private routeSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private requestService: RequestService,
    private authService: AuthService,
    private toastr: ToastrService,
    @Inject('BASE_URL') public baseUrl: string
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUserValue;
    this.currentUserId = Number(user?.userId || 0);

    this.routeSub = this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (id > 0) {
        this.yeuCauId = id;
        this.loadData();
      } else {
        this.loading = false;
        this.errorMsg = 'Mã yêu cầu không hợp lệ.';
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  loadData(): void {
    this.loading = true;
    this.errorMsg = '';
    this.requestService.getChiTiet(this.yeuCauId).subscribe({
      next: (res) => {
        this.data = res;
        this.steps = this.buildSteps(res.chung.trangThai);
        this.boSungTomTat = res.chung.tomTat || '';
        this.boSungNoiDung = '';
        this.boSungTeps = [];
        this.phanHoiGhiChu = '';
        this.loading = false;
      },
      error: (err) => {
        this.errorMsg = err?.error?.message || 'Không tải được chi tiết yêu cầu.';
        this.loading = false;
      }
    });
  }

  get isOwner(): boolean {
    return !!this.data && Number(this.data.chung.nguoiTaoId) === this.currentUserId;
  }

  get statusMeta(): { label: string; css: string } {
    const st = this.data?.chung.trangThai ?? 0;
    return STATUS_META[st] || { label: `Trạng thái ${st}`, css: 'secondary' };
  }

  get pendingDeXuats() {
    return (this.data?.gioDeXuats || []).filter(g => g.nguonDeXuat === 2 && g.nhanVienDongY == null);
  }

  get canEdit(): boolean {
    return this.isOwner && this.data?.chung.trangThai === 0;
  }

  get canSend(): boolean {
    return this.isOwner && this.data?.chung.trangThai === 0;
  }

  get canCancel(): boolean {
    const st = this.data?.chung.trangThai ?? -1;
    return this.isOwner && ![6, 7, 8, 9, 11].includes(st);
  }

  get huyCanLyDo(): boolean {
    const st = this.data?.chung.trangThai ?? -1;
    return st === 5 || st === 10;
  }

  statusLabel(st: number | null): string {
    if (st === null || st === undefined) return 'Khởi tạo';
    return STATUS_META[st]?.label || `Trạng thái ${st}`;
  }

  ketQuaLabel(code: number): { text: string; css: string } {
    switch (code) {
      case 1: return { text: 'Đã trình', css: 'bg-success-subtle text-success-emphasis border-success-subtle' };
      case 2: return { text: 'Không trình được / Vắng', css: 'bg-danger-subtle text-danger-emphasis border-danger-subtle' };
      case 3: return { text: 'Hoãn', css: 'bg-warning-subtle text-warning-emphasis border-warning-subtle' };
      default: return { text: 'Đã cập nhật', css: 'bg-secondary-subtle text-secondary-emphasis' };
    }
  }

  lichStatusLabel(st: number): { text: string; css: string } {
    switch (st) {
      case 1: return { text: 'Đã chốt lịch', css: 'bg-primary-subtle text-primary-emphasis' };
      case 2: return { text: 'Đã trình', css: 'bg-success-subtle text-success-emphasis' };
      case 3: return { text: 'Đã hủy', css: 'bg-secondary-subtle text-secondary-emphasis' };
      case 4: return { text: 'Tạm hoãn', css: 'bg-warning-subtle text-warning-emphasis' };
      case 5: return { text: 'Vắng', css: 'bg-danger-subtle text-danger-emphasis' };
      default: return { text: 'Khác', css: 'bg-light text-dark' };
    }
  }

  vaiTroLabel(v: string): string {
    switch ((v || '').trim().toUpperCase()) {
      case 'NHANVIEN': return 'Nhân viên';
      case 'TROLY': return 'Trợ lý';
      case 'LANHDAO': return 'Lãnh đạo';
      default: return v || 'Hệ thống';
    }
  }

  quayLai(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/nhan-vien']);
    }
  }

  suaYeuCau(): void {
    this.router.navigate(['/nhan-vien/edit-request', this.yeuCauId]);
  }

  guiYeuCau(): void {
    this.requestService.sendYeuCau(this.yeuCauId).subscribe({
      next: () => {
        this.toastr.success('Đã gửi yêu cầu tới trợ lý.');
        this.loadData();
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Gửi yêu cầu thất bại.')
    });
  }

  onFilesBoSung(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';
    if (!files.length) return;

    this.uploadingBoSung = true;
    let remaining = files.length;
    for (const file of files) {
      this.requestService.uploadTep(file).subscribe({
        next: (tep) => {
          this.boSungTeps.push(tep);
          if (--remaining === 0) this.uploadingBoSung = false;
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || `Không tải lên được tệp ${file.name}`);
          if (--remaining === 0) this.uploadingBoSung = false;
        }
      });
    }
  }

  removeBoSungTep(i: number): void {
    this.boSungTeps.splice(i, 1);
  }

  guiBoSung(): void {
    if (!this.boSungNoiDung.trim()) {
      this.toastr.warning('Vui lòng nhập nội dung bổ sung.');
      return;
    }
    this.submittingBoSung = true;
    this.requestService.boSung(this.yeuCauId, {
      noiDung: this.boSungNoiDung.trim(),
      tomTat: this.boSungTomTat.trim() || null,
      tepDinhKems: this.boSungTeps
    }).subscribe({
      next: () => {
        this.submittingBoSung = false;
        this.toastr.success('Đã gửi thông tin bổ sung cho trợ lý.');
        this.loadData();
      },
      error: (err) => {
        this.submittingBoSung = false;
        this.toastr.error(err?.error?.message || 'Không gửi được bổ sung.');
      }
    });
  }

  phanHoiDeXuat(thoiGianDeXuatId: number | undefined, dongY: boolean): void {
    if (!thoiGianDeXuatId) return;
    if (!dongY && !this.phanHoiGhiChu.trim()) {
      this.toastr.warning('Vui lòng nhập ghi chú / khung giờ mong muốn khi từ chối đề xuất.');
      return;
    }
    this.submittingPhanHoi = true;
    this.requestService.phanHoiDeXuat(this.yeuCauId, {
      thoiGianDeXuatId,
      dongY,
      ghiChu: this.phanHoiGhiChu.trim() || null
    }).subscribe({
      next: () => {
        this.submittingPhanHoi = false;
        this.toastr.success(dongY ? 'Đã đồng ý và chốt lịch trình.' : 'Đã phản hồi đề nghị khung giờ khác cho trợ lý.');
        this.loadData();
      },
      error: (err) => {
        this.submittingPhanHoi = false;
        this.toastr.error(err?.error?.message || 'Gửi phản hồi thất bại.');
      }
    });
  }

  moHopHuy(): void {
    this.lyDoHuy = '';
    this.showHuyModal = true;
  }

  xacNhanHuy(): void {
    if (this.huyCanLyDo && !this.lyDoHuy.trim()) {
      this.toastr.warning('Vui lòng nhập lý do hủy vì yêu cầu đã được xếp lịch.');
      return;
    }
    this.dangHuy = true;
    this.requestService.cancelYeuCau(this.yeuCauId, this.lyDoHuy.trim() || null).subscribe({
      next: () => {
        this.dangHuy = false;
        this.showHuyModal = false;
        this.toastr.success('Đã hủy yêu cầu.');
        this.loadData();
      },
      error: (err) => {
        this.dangHuy = false;
        this.toastr.error(err?.error?.message || 'Hủy yêu cầu thất bại.');
      }
    });
  }

  fileUrl(duongDan: string): string {
    return buildFileUrl(this.baseUrl, duongDan);
  }

  openFileUrl(t: AttachmentLike): string {
    return buildOpenFileUrl(this.baseUrl, t);
  }

  fileIcon(tenFile?: string | null): string {
    return getFileIconClass(tenFile);
  }

  isDocx(t: AttachmentLike): boolean {
    return isDocxFile(t.tenFile, t.duongDan, t.contentType);
  }

  formatSize(bytes: number): string {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private buildSteps(st: number): StepView[] {
    const labels = ['Gửi yêu cầu', 'Tiếp nhận', 'Xếp lịch', 'Trình lãnh đạo', 'Hoàn tất'];
    const states: StepView['state'][] = ['todo', 'todo', 'todo', 'todo', 'todo'];

    switch (st) {
      case 0:
        states[0] = 'current';
        break;
      case 1:
        states[0] = 'done'; states[1] = 'current';
        break;
      case 2:
        states[0] = 'done'; states[1] = 'done'; states[2] = 'current';
        break;
      case 3:
      case 4:
        states[0] = 'done'; states[1] = 'done'; states[2] = 'warn';
        break;
      case 5:
        states[0] = 'done'; states[1] = 'done'; states[2] = 'done'; states[3] = 'current';
        break;
      case 10:
        states[0] = 'done'; states[1] = 'done'; states[2] = 'done'; states[3] = 'warn';
        break;
      case 6:
        states[0] = 'done'; states[1] = 'done'; states[2] = 'done'; states[3] = 'done'; states[4] = 'current';
        break;
      case 7:
        states.fill('done');
        break;
      case 8:
      case 9:
        states[0] = 'done'; states[1] = 'error';
        break;
      case 11:
        states[0] = 'done'; states[1] = 'done'; states[2] = 'done'; states[3] = 'error';
        break;
    }

    return labels.map((label, i) => ({ label, state: states[i] }));
  }
}
