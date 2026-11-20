import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { LanhDaoCauHinh, LanhDaoInfo } from '../../../../type';

@Component({
  selector: 'app-tro-ly-working-hours-modal',
  standalone: false,
  templateUrl: './working-hours-modal.component.html',
  styleUrl: './working-hours-modal.component.css',
})
export class WorkingHoursModalComponent implements OnChanges {
  @Input() visible = false;
  @Input() saving = false;
  @Input() lanhDao: LanhDaoInfo | null = null;
  @Input() cauHinh: LanhDaoCauHinh | null = null;

  @Output() closeModal = new EventEmitter<void>();
  @Output() saveConfig = new EventEmitter<Partial<LanhDaoCauHinh>>();

  gioBatDau = '08:00';
  gioKetThuc = '17:00';
  coNghiTrua = true;
  nghiTruaTu = '12:00';
  nghiTruaDen = '13:30';
  thoiGianDemPhut = 10;
  gioiHanPhutMoiNgay = 180;
  choNhanVienXemLichTrongBan = true;
  soNgayLamViecMask = 62;

  readonly days = [
    { bit: 2, label: 'Thứ 2' },
    { bit: 4, label: 'Thứ 3' },
    { bit: 8, label: 'Thứ 4' },
    { bit: 16, label: 'Thứ 5' },
    { bit: 32, label: 'Thứ 6' },
    { bit: 64, label: 'Thứ 7' },
    { bit: 1, label: 'CN' }
  ];

  ngOnChanges(): void {
    if (this.visible && this.cauHinh) {
      this.gioBatDau = (this.cauHinh.gioBatDau || '08:00:00').slice(0, 5);
      this.gioKetThuc = (this.cauHinh.gioKetThuc || '17:00:00').slice(0, 5);
      this.coNghiTrua = Boolean(this.cauHinh.nghiTruaTu && this.cauHinh.nghiTruaDen);
      this.nghiTruaTu = (this.cauHinh.nghiTruaTu || '12:00:00').slice(0, 5);
      this.nghiTruaDen = (this.cauHinh.nghiTruaDen || '13:30:00').slice(0, 5);
      this.thoiGianDemPhut = this.cauHinh.thoiGianDemPhut ?? 10;
      this.gioiHanPhutMoiNgay = this.cauHinh.gioiHanPhutMoiNgay ?? 180;
      this.soNgayLamViecMask = this.cauHinh.soNgayLamViecMask ?? 62;
      this.choNhanVienXemLichTrongBan = Boolean(this.cauHinh.choNhanVienXemLichTrongBan);
    }
  }

  hasDay(bit: number): boolean {
    return (this.soNgayLamViecMask & bit) !== 0;
  }

  toggleDay(bit: number): void {
    if (this.hasDay(bit)) {
      this.soNgayLamViecMask &= ~bit;
    } else {
      this.soNgayLamViecMask |= bit;
    }
  }

  submit(): void {
    this.saveConfig.emit({
      gioBatDau: this.gioBatDau,
      gioKetThuc: this.gioKetThuc,
      nghiTruaTu: this.coNghiTrua ? this.nghiTruaTu : null,
      nghiTruaDen: this.coNghiTrua ? this.nghiTruaDen : null,
      thoiGianDemPhut: Number(this.thoiGianDemPhut) || 0,
      gioiHanPhutMoiNgay: Number(this.gioiHanPhutMoiNgay) || 180,
      soNgayLamViecMask: this.soNgayLamViecMask,
      choNhanVienXemLichTrongBan: this.choNhanVienXemLichTrongBan
    });
  }
}
