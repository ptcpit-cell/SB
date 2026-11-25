import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { LanhDaoCauHinh, LichTrinhView, SuKienLanhDaoView } from '../../../../type';
import {
  buildTimeSlots,
  formatSuKienTimeLabel,
  getSuKienMeta,
  isLeaveEvent,
  layoutOverlappingLichTrinhs,
  layoutSuKiens,
  minutesToHm,
  PIXELS_PER_HOUR,
  PositionedLichTrinh,
  PositionedSuKien,
  SuKienMeta,
  TimeSlotRow
} from '../../../shared/schedule-layout.util';

export interface ScheduleDropPayload {
  source: 'queue' | 'scheduled';
  yeuCauId: number;
  lichTrinhId?: number;
  thoiLuongPhut: number;
  dropStartMinute: number;
  dropStartHm: string;
}

@Component({
  selector: 'app-tro-ly-schedule-grid',
  standalone: false,
  templateUrl: './schedule-grid.component.html',
  styleUrl: './schedule-grid.component.css',
})
export class ScheduleGridComponent implements OnChanges {
  @Input() ngay = '';
  @Input() cauHinh: LanhDaoCauHinh | null = null;
  @Input() lichNgay: LichTrinhView[] = [];
  @Input() suKienNgay: SuKienLanhDaoView[] = [];
  @Input() draggingYeuCauId: number | null = null;

  @Output() slotDropped = new EventEmitter<ScheduleDropPayload>();
  @Output() selectLich = new EventEmitter<LichTrinhView>();
  @Output() deleteSuKien = new EventEmitter<SuKienLanhDaoView>();
  @Output() dragStartScheduled = new EventEmitter<LichTrinhView>();

  readonly slotHeightPx = PIXELS_PER_HOUR / 2;
  startMin = 8 * 60;
  endMin = 17 * 60;
  totalHeightPx = 9 * PIXELS_PER_HOUR;
  slots: TimeSlotRow[] = [];
  positionedLichs: PositionedLichTrinh[] = [];
  positionedSuKiens: PositionedSuKien[] = [];
  leaveSuKiens: SuKienLanhDaoView[] = [];
  allDayOtherSuKiens: SuKienLanhDaoView[] = [];
  hasFullDayLeave = false;
  hoveredSlotMinute: number | null = null;

  ngOnChanges(): void {
    const built = buildTimeSlots(this.cauHinh);
    this.startMin = built.startMin;
    this.endMin = built.endMin;
    this.slots = built.slots;
    this.totalHeightPx = built.totalHeightPx;
    this.positionedLichs = layoutOverlappingLichTrinhs(this.lichNgay, this.startMin, this.endMin);
    this.leaveSuKiens = (this.suKienNgay || []).filter((x) => isLeaveEvent(x));
    this.hasFullDayLeave = this.leaveSuKiens.some((x) => x.caNgay);
    this.allDayOtherSuKiens = (this.suKienNgay || []).filter((x) => !isLeaveEvent(x) && x.caNgay);
    this.positionedSuKiens = layoutSuKiens(this.suKienNgay, this.startMin, this.endMin, this.ngay);
  }

  onDragOverSlot(ev: DragEvent, slot: TimeSlotRow): void {
    ev.preventDefault();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';
    this.hoveredSlotMinute = slot.startMinute;
  }

  onDragLeaveSlot(slot: TimeSlotRow): void {
    if (this.hoveredSlotMinute === slot.startMinute) {
      this.hoveredSlotMinute = null;
    }
  }

  onDropOnSlot(ev: DragEvent, slot: TimeSlotRow): void {
    ev.preventDefault();
    this.hoveredSlotMinute = null;
    const raw = ev.dataTransfer?.getData('application/json');
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (!parsed?.yeuCauId) return;
      this.slotDropped.emit({
        source: parsed.source === 'scheduled' ? 'scheduled' : 'queue',
        yeuCauId: Number(parsed.yeuCauId),
        lichTrinhId: parsed.lichTrinhId ? Number(parsed.lichTrinhId) : undefined,
        thoiLuongPhut: Number(parsed.thoiLuongPhut || 30),
        dropStartMinute: slot.startMinute,
        dropStartHm: minutesToHm(slot.startMinute)
      });
    } catch {
      // ignore invalid drag payload
    }
  }

  onDragStartAppointment(ev: DragEvent, item: LichTrinhView): void {
    ev.stopPropagation();
    if (ev.dataTransfer) {
      ev.dataTransfer.effectAllowed = 'move';
      ev.dataTransfer.setData('application/json', JSON.stringify({
        source: 'scheduled',
        yeuCauId: item.yeuCauId,
        lichTrinhId: item.lichTrinhId,
        thoiLuongPhut: item.thoiLuongPhut
      }));
    }
    this.dragStartScheduled.emit(item);
  }

  getBlockStyle(p: PositionedLichTrinh): Record<string, string> {
    const widthPct = 100 / p.colCount;
    const leftPct = p.colIndex * widthPct;
    return {
      top: `${p.topPx + 2}px`,
      height: `${Math.max(38, p.heightPx - 4)}px`,
      left: `calc(${leftPct}% + 3px)`,
      width: `calc(${widthPct}% - 6px)`,
      borderLeftColor: p.item.mauMucUuTien || (p.item.mucKhan >= 2 ? '#dc3545' : '#0d6efd')
    };
  }

  getSuKienStyle(sk: PositionedSuKien): Record<string, string> {
    return {
      top: `${sk.topPx + 2}px`,
      height: `${Math.max(30, sk.heightPx - 4)}px`
    };
  }

  lichStateClass(st: number): string {
    switch (st) {
      case 2: return 'appt-done';
      case 4: return 'appt-postponed';
      case 5: return 'appt-absent';
      default: return 'appt-scheduled';
    }
  }

  lichStateLabel(st: number): string {
    switch (st) {
      case 1: return 'Chờ trình';
      case 2: return 'Đã trình';
      case 4: return 'Hoãn';
      case 5: return 'Vắng';
      default: return '';
    }
  }

  getSuKienMeta(loai: number): SuKienMeta {
    return getSuKienMeta(loai);
  }

  formatSkTime(sk: SuKienLanhDaoView): string {
    return formatSuKienTimeLabel(sk);
  }

  onDeleteSuKien(ev: Event, sk: SuKienLanhDaoView): void {
    ev.stopPropagation();
    this.deleteSuKien.emit(sk);
  }
}
