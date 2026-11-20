import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { LichTrinhView, MucUuTienItem, XepLichRequest } from '../../../../type';
import { buildLocalIso, isoToMinutes, minutesToHm } from '../../../shared/schedule-layout.util';

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
  defaultDiaDiem: string;
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

  @Output() closeModal = new EventEmitter<void>();
  @Output() confirmSchedule = new EventEmitter<{ yeuCauId: number; payload: XepLichRequest }>();

  ngay = '';
  gioBatDau = '09:00';
  gioKetThuc = '09:30';
  diaDiem = '';
  mucUuTienId: number | null = null;
  ghiChu = '';
  yeuCauXacNhanNV = false;

  ngOnChanges(): void {
    if (this.visible && this.context) {
      this.ngay = this.context.defaultNgay;
      this.gioBatDau = this.context.defaultGioBatDau || '09:00';
      const [h, m] = this.gioBatDau.split(':').map(Number);
      const startMin = (h || 9) * 60 + (m || 0);
      this.gioKetThuc = minutesToHm(startMin + (this.context.thoiLuongPhut || 30));
      this.diaDiem = this.context.defaultDiaDiem || 'Phòng Lãnh đạo';
      this.mucUuTienId = this.context.mucUuTienId ?? null;
      this.ghiChu = '';
      this.yeuCauXacNhanNV = false;
    }
  }

  onStartTimeChange(): void {
    if (!this.context || !this.gioBatDau) return;
    const [h, m] = this.gioBatDau.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return;
    this.gioKetThuc = minutesToHm(h * 60 + m + (this.context.thoiLuongPhut || 30));
  }

  get overlappingItems(): LichTrinhView[] {
    if (!this.context || !this.ngay || !this.gioBatDau || !this.gioKetThuc) return [];
    const [sh, sm] = this.gioBatDau.split(':').map(Number);
    const [eh, em] = this.gioKetThuc.split(':').map(Number);
    const sMin = sh * 60 + sm;
    const eMin = eh * 60 + em;
    if (eMin <= sMin) return [];

    return this.existingLichNgay.filter((lt) => {
      if (lt.yeuCauId === this.context?.yeuCauId) return false;
      if (lt.batDau.slice(0, 10) !== this.ngay) return false;
      const ls = isoToMinutes(lt.batDau);
      const le = isoToMinutes(lt.ketThuc);
      return ls < eMin && le > sMin;
    });
  }

  submit(): void {
    if (!this.context) return;
    this.confirmSchedule.emit({
      yeuCauId: this.context.yeuCauId,
      payload: {
        batDau: buildLocalIso(this.ngay, this.gioBatDau),
        ketThuc: buildLocalIso(this.ngay, this.gioKetThuc),
        diaDiem: this.diaDiem.trim() || null,
        mucUuTienId: this.mucUuTienId,
        ghiChu: this.ghiChu.trim() || null,
        yeuCauXacNhanNV: this.yeuCauXacNhanNV
      }
    });
  }
}
