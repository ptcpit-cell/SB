import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { RequestService } from '../../../../services/request.service';
import { LichTrinhView, MucUuTienItem, SuKienLanhDaoView, XepLichRequest } from '../../../../type';
import {
  buildLocalIso,
  formatSuKienTimeLabel,
  getSuKienMeta,
  isLeaveEvent,
  isSuKienOnDate,
  isoToMinutes,
  minutesToHm,
  SuKienMeta
} from '../../../shared/schedule-layout.util';

export interface XepLichModalContext {
  yeuCauId: number;
  maYeuCau: string;
  tieuDe: string;
  tenNguoiTrinh: string;
  thoiLuongPhut: number;
  mucKhan: number;
  mucUuTienId?: number | null;
  hanChot?: string | null;
  defaultNgay: string;
  defaultGioBatDau: string; // HH:mm
  isReschedule?: boolean;
}

@Component({
  selector: 'app-tro-ly-schedule-action-modal',
  standalone: false,
  templateUrl: './schedule-action-modal.component.html',
  styleUrl: './schedule-action-modal.component.css',
})
export class ScheduleActionModalComponent implements OnChanges {
  @Input() visible = false;
  @Input() saving = false;
  @Input() context: XepLichModalContext | null = null;
  @Input() mucUuTiens: MucUuTienItem[] = [];
  @Input() existingLichNgay: LichTrinhView[] = [];
  @Input() existingSuKiens: SuKienLanhDaoView[] = [];

  @Output() closeModal = new EventEmitter<void>();
  @Output() confirmSchedule = new EventEmitter<{ yeuCauId: number; payload: XepLichRequest }>();

  ngay = '';
  gioBatDau = '09:00';
  gioKetThuc = '09:30';
  mucUuTienId: number | null = null;
  ghiChu = '';
  yeuCauXacNhanNV = false;

  private wasVisible = false;
  private fetchedDate = '';
  private fetchedLichTrinhs: LichTrinhView[] = [];
  private fetchedSuKiens: SuKienLanhDaoView[] = [];

  constructor(private requestService: RequestService) {}

  ngOnChanges(): void {
    if (this.visible && this.context && !this.wasVisible) {
      this.ngay = this.context.defaultNgay;
      this.gioBatDau = this.context.defaultGioBatDau || '09:00';
      const [h, m] = this.gioBatDau.split(':').map(Number);
      const startMin = (h || 9) * 60 + (m || 0);
      this.gioKetThuc = minutesToHm(startMin + (this.context.thoiLuongPhut || 30));
      this.mucUuTienId = this.context.mucUuTienId ?? null;
      this.ghiChu = '';
      this.yeuCauXacNhanNV = false;
      this.fetchedDate = '';
      this.fetchedLichTrinhs = [];
      this.fetchedSuKiens = [];
      this.loadTargetDateEvents(this.ngay);
    }
    this.wasVisible = this.visible;
  }

  onNgayChange(): void {
    if (/^\d{4}-\d{2}-\d{2}$/.test(this.ngay)) {
      this.loadTargetDateEvents(this.ngay);
    }
  }

  private loadTargetDateEvents(ymd: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return;
    this.requestService.getTroLyLichTuan(ymd, ymd).subscribe({
      next: (res) => {
        if (this.ngay !== ymd) return;
        this.fetchedDate = ymd;
        this.fetchedLichTrinhs = res?.lichTrinhs || [];
        this.fetchedSuKiens = res?.suKiens || [];
      },
      error: () => {
        // Fallback to parent inputs silently
      }
    });
  }

  onStartTimeChange(): void {
    if (!this.context || !this.gioBatDau) return;
    const [h, m] = this.gioBatDau.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return;
    this.gioKetThuc = minutesToHm(h * 60 + m + (this.context.thoiLuongPhut || 30));
  }

  private get activeLichTrinhs(): LichTrinhView[] {
    return this.fetchedDate === this.ngay ? this.fetchedLichTrinhs : (this.existingLichNgay || []);
  }

  private get activeSuKiens(): SuKienLanhDaoView[] {
    return this.fetchedDate === this.ngay ? this.fetchedSuKiens : (this.existingSuKiens || []);
  }

  get isTimeRangeInvalid(): boolean {
    if (!this.gioBatDau || !this.gioKetThuc) return false;
    return this.gioKetThuc <= this.gioBatDau;
  }

  get leaveEventsOnSelectedDate(): SuKienLanhDaoView[] {
    if (!this.ngay) return [];
    return this.activeSuKiens.filter((sk) => isLeaveEvent(sk) && isSuKienOnDate(sk, this.ngay));
  }

  get overlappingBusyEvents(): SuKienLanhDaoView[] {
    if (!this.ngay || !this.gioBatDau || !this.gioKetThuc) return [];
    const [sh, sm] = this.gioBatDau.split(':').map(Number);
    const [eh, em] = this.gioKetThuc.split(':').map(Number);
    const sMin = sh * 60 + sm;
    const eMin = eh * 60 + em;
    if (eMin <= sMin) return [];

    return this.activeSuKiens.filter((sk) => {
      if (isLeaveEvent(sk)) return false;
      if (!isSuKienOnDate(sk, this.ngay)) return false;
      if (sk.caNgay) return true;
      const startYmd = (sk.batDau || '').slice(0, 10);
      const endYmd = (sk.ketThuc || sk.batDau || '').slice(0, 10);
      const ls = startYmd < this.ngay ? 0 : isoToMinutes(sk.batDau);
      const le = endYmd > this.ngay ? 24 * 60 : isoToMinutes(sk.ketThuc);
      return ls < eMin && le > sMin;
    });
  }

  get overlappingItems(): LichTrinhView[] {
    if (!this.context || !this.ngay || !this.gioBatDau || !this.gioKetThuc) return [];
    const [sh, sm] = this.gioBatDau.split(':').map(Number);
    const [eh, em] = this.gioKetThuc.split(':').map(Number);
    const sMin = sh * 60 + sm;
    const eMin = eh * 60 + em;
    if (eMin <= sMin) return [];

    return this.activeLichTrinhs.filter((lt) => {
      if (lt.yeuCauId === this.context?.yeuCauId) return false;
      if (lt.batDau.slice(0, 10) !== this.ngay) return false;
      const ls = isoToMinutes(lt.batDau);
      const le = isoToMinutes(lt.ketThuc);
      return ls < eMin && le > sMin;
    });
  }

  getSuKienMeta(loai: number): SuKienMeta {
    return getSuKienMeta(loai);
  }

  formatSkTime(sk: SuKienLanhDaoView): string {
    return formatSuKienTimeLabel(sk);
  }

  submit(): void {
    if (!this.context) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(this.ngay) || !this.gioBatDau || !this.gioKetThuc || this.isTimeRangeInvalid) return;
    this.confirmSchedule.emit({
      yeuCauId: this.context.yeuCauId,
      payload: {
        batDau: buildLocalIso(this.ngay, this.gioBatDau),
        ketThuc: buildLocalIso(this.ngay, this.gioKetThuc),
        diaDiem: null,
        mucUuTienId: this.mucUuTienId,
        ghiChu: this.ghiChu.trim() || null,
        yeuCauXacNhanNV: this.yeuCauXacNhanNV
      }
    });
  }
}
