import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { LanhDaoCauHinh, LichTrinhView, SuKienLanhDaoView } from '../../../../type';
import {
  buildTimeSlots,
  formatSuKienTimeLabel,
  getSuKienMeta,
  isLeaveEvent,
  layoutOverlappingLichTrinhs,
  layoutSuKiens,
  PIXELS_PER_HOUR,
  PositionedLichTrinh,
  PositionedSuKien,
  SuKienMeta,
  TimeSlotRow
} from '../../../shared/schedule-layout.util';

@Component({
  selector: 'app-lanh-dao-timeline',
  standalone: false,
  templateUrl: './leader-timeline.component.html',
  styleUrl: './leader-timeline.component.css',
})
export class LeaderTimelineComponent implements OnChanges {
  @Input() ngay = '';
  @Input() cauHinh: LanhDaoCauHinh | null = null;
  @Input() lichTrinhs: LichTrinhView[] = [];
  @Input() suKiens: SuKienLanhDaoView[] = [];

  @Output() selectLich = new EventEmitter<LichTrinhView>();
  @Output() deleteSuKien = new EventEmitter<SuKienLanhDaoView>();

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

  ngOnChanges(): void {
    const built = buildTimeSlots(this.cauHinh);
    this.startMin = built.startMin;
    this.endMin = built.endMin;
    this.slots = built.slots;
    this.totalHeightPx = built.totalHeightPx;
    this.positionedLichs = layoutOverlappingLichTrinhs(this.lichTrinhs, this.startMin, this.endMin);
    this.leaveSuKiens = (this.suKiens || []).filter((x) => isLeaveEvent(x));
    this.hasFullDayLeave = this.leaveSuKiens.some((x) => x.caNgay);
    this.allDayOtherSuKiens = (this.suKiens || []).filter((x) => !isLeaveEvent(x) && x.caNgay);
    this.positionedSuKiens = layoutSuKiens(this.suKiens, this.startMin, this.endMin, this.ngay);
  }

  getBlockStyle(p: PositionedLichTrinh): Record<string, string> {
    const widthPct = 100 / p.colCount;
    const leftPct = p.colIndex * widthPct;
    return {
      top: `${p.topPx + 2}px`,
      height: `${Math.max(40, p.heightPx - 4)}px`,
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
