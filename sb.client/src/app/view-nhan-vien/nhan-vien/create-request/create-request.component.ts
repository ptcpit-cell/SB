import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { RequestService } from '../../../../services/request.service';
import { LanhDaoChon, LoaiYeuCauChon, TepDinhKemInput, LichBanResult, KhoangBan, TaoYeuCauRequest } from '../../../../type';

interface ThamDu { hoTenNgoai: string; donViNgoai: string; vaiTro: string; }

const MAX_FILES = 10;
const MAX_FILE_MB = 20;

@Component({
  selector: 'app-create-request',
  standalone: false,
  templateUrl: './create-request.component.html',
  styleUrl: './create-request.component.css',
})
export class CreateRequestComponent implements OnInit, OnDestroy {
  nguoiTao = { hoTen: '', chiNhanh: '', phongBan: '', chucVu: '' };

  // Dữ liệu chọn
  lanhDaos: LanhDaoChon[] = [];
  loaiList: LoaiYeuCauChon[] = [];
  keywordLanhDao = '';
  lanhDaoId: number | null = null;                                 

  readonly maxHanChot = this.toYmd(this.addDays(new Date(), 30));
  readonly quickDays = [1, 3, 5, 7];
  // Form
  loaiId: number | null = null;
  tieuDe = '';
  tomTat = '';
  mucKhan = 1;
  lyDoKhan = '';
  thoiLuongPhut = 30;
  hanChot = '';                 // datetime-local
  laBaoMat = false;

  thamDus: ThamDu[] = [];
  teps: TepDinhKemInput[] = [];

  // Trạng thái giao diện
  loadingInit = true;
  uploading = false;
  submitting: 'draft' | 'send' | null = null;
  showLeaveModal = false;

  readonly today = this.toYmd(new Date());

  private destroy$ = new Subject<void>();

  constructor(
    private toastrService: ToastrService,
    private router: Router,
    private requestService: RequestService
  ) {}

  ngOnInit(): void {
    this.loadNguoiTao();

    forkJoin({
      lanhDao: this.requestService.getLanhDaoChon(),
      loai: this.requestService.getLoaiYeuCau(),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ lanhDao, loai }) => {
          this.lanhDaos = lanhDao;
          this.loaiList = loai;
          this.loadingInit = false;
        },
        error: (err) => {
          this.loadingInit = false;
          this.toastrService.error(this.errMsg(err));
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---------- Người tạo ----------
  private loadNguoiTao(): void {
    try {
      const raw = JSON.parse(sessionStorage.getItem('currentUser') ?? '{}');
      const u = raw?.user ?? raw ?? {};
      this.nguoiTao = {
        hoTen: u.tenNguoiDung,
        chiNhanh: u.tenChiNhanh,
        phongBan: u.tenPhongBan,
        chucVu: u.tenChucVu,
      };
    } catch {
      /* sessionStorage hỏng thì để trống */
    }
  }

  // ---------- Chọn lãnh đạo ----------
  get filteredLanhDaos(): LanhDaoChon[] {
    const k = this.norm(this.keywordLanhDao);
    if (!k) return this.lanhDaos;
    return this.lanhDaos.filter((x) =>
      this.norm(`${x.hoTen} ${x.tenChucVu ?? ''} ${x.tenChiNhanh}`).includes(k));
  }
  get selectedLanhDao(): LanhDaoChon | undefined {
  return this.lanhDaos.find((x) => x.lanhDaoId === this.lanhDaoId);
}

chonLanhDao(id: number): void { this.lanhDaoId = id; }

chonNhanh(days: number): void { this.hanChot = this.toYmd(this.addDays(new Date(), days)); }

hanChotHopLe(): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(this.hanChot) && this.hanChot >= this.today && this.hanChot <= this.maxHanChot;
}

private addDays(d: Date, n: number): Date { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

  // ---------- Loại yêu cầu ----------
  onLoaiChange(): void {
    const loai = this.loaiList.find((x) => x.id === this.loaiId);
    if (loai) this.thoiLuongPhut = loai.thoiLuongMacDinhPhut;
  }

  onThoiLuongChange(): void {
  }


  // ---------- Người tham dự ----------
  addThamDu(): void {
    this.thamDus.push({ hoTenNgoai: '', donViNgoai: '', vaiTro: '' });
  }

  removeThamDu(i: number): void {
    this.thamDus.splice(i, 1);
  }

  // ---------- Tệp đính kèm ----------
  onFilesSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length === 0) return;

    if (this.teps.length + files.length > MAX_FILES) {
      this.toastrService.warning(`Tối đa ${MAX_FILES} tệp đính kèm.`);
      return;
    }
    const tooBig = files.find((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    if (tooBig) {
      this.toastrService.warning(`"${tooBig.name}" vượt quá ${MAX_FILE_MB}MB.`);
      return;
    }

    this.uploading = true;
    forkJoin(
      files.map((f) =>
        this.requestService.uploadTep(f).pipe(
          catchError((err) => {
            this.toastrService.error(`${f.name}: ${this.errMsg(err)}`);
            return of(null);
          })
        )
      )
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        this.teps.push(...(res.filter(Boolean) as TepDinhKemInput[]));
        this.uploading = false;
      });
  }

  removeTep(i: number): void {
    this.teps.splice(i, 1);   // tệp đã upload sẽ không được gắn vào yêu cầu nào
  }

  formatSize(b: number): string {
    return b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
  }

  // ---------- Gửi / lưu nháp ----------
  submit(guiNgay: boolean): void {
    if (this.submitting || this.uploading) return;

    const err = this.validate(guiNgay);
    if (err) {
      this.toastrService.warning(err);
      return;
    }

    const body: TaoYeuCauRequest = {
  lanhDaoId: this.lanhDaoId!,
  loaiYeuCauId: this.loaiId!,
  tieuDe: this.tieuDe.trim(),
  tomTat: this.tomTat.trim() || null,
  mucKhan: this.mucKhan,
  lyDoKhan: this.mucKhan > 1 ? this.lyDoKhan.trim() : null,
  thoiLuongPhut: this.thoiLuongPhut,
  hanChot: this.hanChot ? `${this.hanChot}T00:00:00` : null,
  laBaoMat: this.laBaoMat,
  guiNgay,
  nguoiThamDus: this.thamDus.filter((t) => t.hoTenNgoai.trim()).map((t) => ({
    userId: null, hoTenNgoai: t.hoTenNgoai.trim(),
    donViNgoai: t.donViNgoai.trim() || undefined, vaiTro: t.vaiTro.trim() || undefined })),
  tepDinhKems: this.teps,
};

    this.submitting = guiNgay ? 'send' : 'draft';
    this.requestService.tao(body).subscribe({
      next: (res) => {
        this.submitting = null;
        this.toastrService.success(
          guiNgay
            ? `Đã gửi ${res.length} yêu cầu (${res.map((x) => x.maYeuCau).join(', ')}).`
            : 'Đã lưu bản nháp.'
        );
        this.router.navigate(['/nhan-vien']);
      },
      error: (e) => {
        this.submitting = null;
        this.toastrService.error(this.errMsg(e));
      },
    });
  }

  private validate(guiNgay: boolean): string | null {
  if (!this.lanhDaoId) return 'Vui lòng chọn lãnh đạo.';
  if (!this.loaiId) return 'Vui lòng chọn loại yêu cầu.';
  if (!this.tieuDe.trim()) return 'Tiêu đề không được để trống.';
  if (this.mucKhan > 1 && !this.lyDoKhan.trim()) return 'Vui lòng nhập lý do khi chọn mức Gấp hoặc Rất gấp.';
  if (!this.thoiLuongPhut || this.thoiLuongPhut < 5 || this.thoiLuongPhut > 480)
    return 'Thời lượng phải từ 5 đến 480 phút.';
  if (guiNgay && !this.hanChot) return 'Vui lòng chọn hạn chót.';
  if (this.hanChot && !this.hanChotHopLe()) return 'Hạn chót phải từ hôm nay đến tối đa 30 ngày tới.';
  if (this.thamDus.some((t) => !t.hoTenNgoai.trim() && (t.donViNgoai.trim() || t.vaiTro.trim())))
    return 'Người tham dự cần có họ tên.';
  return null;
}

  // ---------- Thoát ----------
  get hasData(): boolean {
    return !!(this.tieuDe.trim() || this.tomTat.trim() || this.teps.length);
  }

  quayLai(): void {
    if (this.submitting) return;
    if (this.hasData) this.showLeaveModal = true;
    else this.router.navigate(['/nhan-vien']);
  }

  roiTrang(): void {
    this.showLeaveModal = false;
    this.router.navigate(['/nhan-vien']);
  }

  // ---------- Tiện ích ----------
  trackByIdx = (i: number) => i;

  private toMin(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }

  private pad(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
  }

  private toYmd(d: Date): string {
    return `${d.getFullYear()}-${this.pad(d.getMonth() + 1)}-${this.pad(d.getDate())}`;
  }

  private norm(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  }

  private errMsg(err: any): string {
    return err?.error?.message ?? 'Có lỗi xảy ra, vui lòng thử lại.';
  }
}
