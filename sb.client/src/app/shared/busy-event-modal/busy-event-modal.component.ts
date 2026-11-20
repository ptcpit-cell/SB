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
      this.gioBatDau = '10:30';
      this.gioKetThuc = '11:30';
      this.diaDiem = '';
      this.ghiChu = '';
      this.caNgay = false;
      this.laRiengTu = false;
    }
  }

  submit(): void {
    if (!this.tieuDe.trim() || !this.ngay) return;
    this.submitEvent.emit({
      loai: Number(this.loai),
      tieuDe: this.tieuDe.trim(),
      batDau: buildLocalIso(this.ngay, this.caNgay ? '08:00' : this.gioBatDau),
      ketThuc: buildLocalIso(this.ngay, this.caNgay ? '17:00' : this.gioKetThuc),
      caNgay: this.caNgay,
      laCung: true,
      laRiengTu: this.laRiengTu,
      diaDiem: this.diaDiem.trim() || null,
      ghiChu: this.ghiChu.trim() || null
    });
  }
}
