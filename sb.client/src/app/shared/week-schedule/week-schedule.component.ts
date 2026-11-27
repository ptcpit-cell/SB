import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { LanhDaoCauHinh, LichTrinhView, SuKienLanhDaoView } from '../../../type';
import {
  formatSuKienTimeLabel,
  getSuKienMeta,
  getTodayYmd,
  isLeaveEvent,
  isoToMinutes,
  isSuKienOnDate,
  shiftYmd,
  SuKienMeta
} from '../schedule-layout.util';

export type WeekDayEntry =
  | {
      kind: 'sukien';
      suKien: SuKienLanhDaoView;
      isAllDay: boolean;
      sortMinute: number;
      endMinute: number;
    }
  | {
      kind: 'lichtrinh';
      lichTrinh: LichTrinhView;
      isAllDay: false;
      sortMinute: number;
      endMinute: number;
    };

export interface WeekDayColumn {
  ymd: string;
  dayName: string;
  shortDate: string;
  isToday: boolean;
  isSelected: boolean;
  lichTrinhs: LichTrinhView[];
  suKiens: SuKienLanhDaoView[];
  entries: WeekDayEntry[];
  hasLeave: boolean;
  hasFullDayLeave: boolean;
  totalMinutes: number;
  capacityPct: number;
  isOverCapacity: boolean;
}

export interface WeekDropPayload {
  source: 'queue' | 'scheduled';
  yeuCauId: number;
  targetDate: string;
}

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

@Component({
  selector: 'app-week-schedule',
  standalone: false,
  templateUrl: './week-schedule.component.html',
  styleUrl: './week-schedule.component.css',
})
export class WeekScheduleComponent implements OnChanges {
  @Input() tuNgay = '';
  @Input() selectedNgay = '';
  @Input() cauHinh: LanhDaoCauHinh | null = null;
  @Input() lichTrinhs: LichTrinhView[] = [];
  @Input() suKiens: SuKienLanhDaoView[] = [];
  @Input() allowDrop = false;
  @Input() loading = false;

  @Output() selectDay = new EventEmitter<string>();
  @Output() selectLich = new EventEmitter<LichTrinhView>();
  @Output() dayDropped = new EventEmitter<WeekDropPayload>();
  @Output() deleteSuKien = new EventEmitter<SuKienLanhDaoView>();

  days: WeekDayColumn[] = [];
  hoveredYmd: string | null = null;

  ngOnChanges(): void {
    this.buildColumns();
  }

  private buildColumns(): void {
    if (!this.tuNgay) {
      this.days = [];
      return;
    }
    const today = getTodayYmd();
    const limit = this.cauHinh?.gioiHanPhutMoiNgay || 240;

    const cols: WeekDayColumn[] = [];
    for (let i = 0; i < 7; i++) {
      const ymd = shiftYmd(this.tuNgay, i);
      const dayLich = this.lichTrinhs
        .filter((x) => x.batDau.slice(0, 10) === ymd)
        .sort((a, b) => a.batDau.localeCompare(b.batDau));
      const daySk = this.suKiens
        .filter((x) => isSuKienOnDate(x, ymd));

      const entries: WeekDayEntry[] = [
        ...daySk.map((sk): WeekDayEntry => {
          const startYmd = (sk.batDau || '').slice(0, 10);
          const endYmd = (sk.ketThuc || sk.batDau || '').slice(0, 10);
          const isAllDay = !!sk.caNgay;
          const sortMinute = isAllDay
            ? -1
            : startYmd && startYmd < ymd
              ? 0
              : isoToMinutes(sk.batDau);
          const endMinute = isAllDay
            ? 24 * 60
            : endYmd && endYmd > ymd
              ? 24 * 60
              : Math.max(sortMinute, isoToMinutes(sk.ketThuc));
          return { kind: 'sukien', suKien: sk, isAllDay, sortMinute, endMinute };
        }),
        ...dayLich.map((lt): WeekDayEntry => {
          const sortMinute = isoToMinutes(lt.batDau);
          const endMinute = Math.max(sortMinute, isoToMinutes(lt.ketThuc));
          return { kind: 'lichtrinh', lichTrinh: lt, isAllDay: false, sortMinute, endMinute };
        })
      ].sort((a, b) => {
        if (a.isAllDay !== b.isAllDay) return a.isAllDay ? -1 : 1;
        if (a.isAllDay && b.isAllDay && a.kind === 'sukien' && b.kind === 'sukien') {
          const leaveDiff = Number(isLeaveEvent(b.suKien)) - Number(isLeaveEvent(a.suKien));
          if (leaveDiff !== 0) return leaveDiff;
          return a.suKien.batDau.localeCompare(b.suKien.batDau);
        }
        if (a.sortMinute !== b.sortMinute) return a.sortMinute - b.sortMinute;
        if (a.endMinute !== b.endMinute) return a.endMinute - b.endMinute;
        if (a.kind !== b.kind) return a.kind === 'sukien' ? -1 : 1;
        return 0;
      });

      const hasLeave = daySk.some((x) => isLeaveEvent(x));
      const hasFullDayLeave = daySk.some((x) => isLeaveEvent(x) && x.caNgay);
      const totalMinutes = dayLich.reduce((sum, x) => sum + (x.thoiLuongPhut || 0), 0);
      const capacityPct = Math.min(100, Math.round((totalMinutes / limit) * 100));
      const parts = ymd.split('-');

      cols.push({
        ymd,
        dayName: WEEKDAY_LABELS[i],
        shortDate: `${parts[2]}/${parts[1]}`,
        isToday: ymd === today,
        isSelected: ymd === this.selectedNgay,
        lichTrinhs: dayLich,
        suKiens: daySk,
        entries,
        hasLeave,
        hasFullDayLeave,
        totalMinutes,
        capacityPct,
        isOverCapacity: totalMinutes > limit
      });
    }
    this.days = cols;
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

  onDragOverDay(ev: DragEvent, ymd: string): void {
    if (!this.allowDrop) return;
    ev.preventDefault();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';
    this.hoveredYmd = ymd;
  }

  onDragLeaveDay(ymd: string): void {
    if (this.hoveredYmd === ymd) this.hoveredYmd = null;
  }

  onDropDay(ev: DragEvent, ymd: string): void {
    if (!this.allowDrop) return;
    ev.preventDefault();
    this.hoveredYmd = null;
    const raw = ev.dataTransfer?.getData('application/json') || ev.dataTransfer?.getData('text/plain');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.yeuCauId) {
        this.dayDropped.emit({
          source: parsed.source === 'scheduled' ? 'scheduled' : 'queue',
          yeuCauId: Number(parsed.yeuCauId),
          targetDate: ymd
        });
      }
    } catch {
      const id = Number(raw);
      if (!Number.isNaN(id) && id > 0) {
        this.dayDropped.emit({ source: 'queue', yeuCauId: id, targetDate: ymd });
      }
    }
  }

  onDragStartItem(ev: DragEvent, item: LichTrinhView): void {
    if (!this.allowDrop || !ev.dataTransfer) return;
    ev.dataTransfer.effectAllowed = 'move';
    ev.dataTransfer.setData(
      'application/json',
      JSON.stringify({ source: 'scheduled', yeuCauId: item.yeuCauId })
    );
  }

  lichStatusDot(trangThaiLich: number): string {
    switch (trangThaiLich) {
      case 2: return 'bg-success';
      case 4: return 'bg-warning';
      case 5: return 'bg-danger';
      default: return 'bg-primary';
    }
  }
}
