import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { SuKienLanhDaoView } from '../../../type';
import { buildLocalIso } from '../schedule-layout.util';

@Component({
  selector: 'app-busy-event-modal',
  standalone: false,
  templateUrl: './busy-event-modal.component.html',
  styleUrl: './busy-event-modal.component.css',
})
export class BusyEventModalComponent implements OnChanges {
  @Input() visible = false;
  @Input() saving = false;
  @Input() defaultNgay = '';
  @Input() title = 'Thêm lịch bận của Lãnh đạo';

  @Output() closeModal = new EventEmitter<void>();
  @Output() submitEvent = new EventEmitter<Partial<SuKienLanhDaoView>>();

  tieuDe = '';
  loai = 1;
  ngay = '';
  denNgay = '';
  gioBatDau = '10:30';
  gioKetThuc = '11:30';
  diaDiem = '';
  ghiChu = '';
  caNgay = false;
  laRiengTu = false;

  ngOnChanges(): void {
    if (this.visible) {
      this.tieuDe = '';
      this.loai = 1;
      this.ngay = this.defaultNgay;
      this.denNgay = this.defaultNgay;
      this.gioBatDau = '10:30';
      this.gioKetThuc = '11:30';
      this.diaDiem = '';
      this.ghiChu = '';
      this.caNgay = false;
      this.laRiengTu = false;
    }
  }

  onLoaiChange(): void {
    if (Number(this.loai) === 3) {
      this.caNgay = true;
      if (!this.denNgay || this.denNgay < this.ngay) {
        this.denNgay = this.ngay;
      }
    }
  }

  onNgayChange(): void {
    if (!this.denNgay || (this.ngay && this.denNgay < this.ngay)) {
      this.denNgay = this.ngay;
    }
  }

  get tieuDePlaceholder(): string {
    switch (Number(this.loai)) {
      case 1: return 'VD: Họp giao ban Ban Giám đốc';
      case 2: return 'VD: Công tác tại chi nhánh TP.HCM';
      case 3: return 'VD: Nghỉ phép năm / Nghỉ việc riêng';
      default: return 'VD: Tiếp khách đối tác';
    }
  }

  get isTimeRangeInvalid(): boolean {
    if (this.caNgay) {
      return Boolean(this.ngay && this.denNgay && this.denNgay < this.ngay);
    }
    return Boolean(this.gioBatDau && this.gioKetThuc && this.gioKetThuc <= this.gioBatDau);
  }

  submit(): void {
    if (!this.tieuDe.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(this.ngay) || this.isTimeRangeInvalid) return;
    const endYmd = this.caNgay && /^\d{4}-\d{2}-\d{2}$/.test(this.denNgay) ? this.denNgay : this.ngay;
    this.submitEvent.emit({
      loai: Number(this.loai),
      tieuDe: this.tieuDe.trim(),
      batDau: buildLocalIso(this.ngay, this.caNgay ? '08:00' : this.gioBatDau),
      ketThuc: buildLocalIso(endYmd, this.caNgay ? '17:00' : this.gioKetThuc),
      caNgay: this.caNgay,
      laCung: true,
      laRiengTu: this.laRiengTu,
      diaDiem: this.diaDiem.trim() || null,
      ghiChu: this.ghiChu.trim() || null
    });
  }
}
