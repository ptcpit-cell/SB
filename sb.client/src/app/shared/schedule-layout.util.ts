import { LanhDaoCauHinh, LichTrinhView, SuKienLanhDaoView } from '../../type';

export const PIXELS_PER_HOUR = 88; // 44px per 30-minute slot

export interface TimeSlotRow {
  label: string;        // "08:00"
  startMinute: number;  // minutes from 00:00
  isHour: boolean;
  isLunch: boolean;
}

export interface PositionedLichTrinh {
  item: LichTrinhView;
  topPx: number;
  heightPx: number;
  colIndex: number;
  colCount: number;
  hasOverlap: boolean;
  startMinute: number;
  endMinute: number;
}

export interface PositionedSuKien {
  item: SuKienLanhDaoView;
  topPx: number;
  heightPx: number;
}

export function timeStringToMinutes(t?: string | null, fallback = 480): number {
  if (!t) return fallback;
  const parts = String(t).split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1] || 0);
  if (Number.isNaN(h) || Number.isNaN(m)) return fallback;
  return h * 60 + m;
}

export function isoToMinutes(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

export function minutesToHm(mins: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(mins)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function getTodayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function shiftYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, (d || 1) + deltaDays);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export function buildLocalIso(ymd: string, hm: string): string {
  const normalizedHm = hm.length === 5 ? `${hm}:00` : hm;
  return `${ymd}T${normalizedHm}`;
}

export function buildTimeSlots(cauHinh?: LanhDaoCauHinh | null): {
  startMin: number;
  endMin: number;
  slots: TimeSlotRow[];
  totalHeightPx: number;
} {
  const rawStart = timeStringToMinutes(cauHinh?.gioBatDau, 8 * 60);
  const rawEnd = timeStringToMinutes(cauHinh?.gioKetThuc, 17 * 60);
  const startMin = Math.floor(rawStart / 30) * 30;
  const endMin = Math.max(startMin + 60, Math.ceil(rawEnd / 30) * 30);

  const lunchStart = cauHinh?.nghiTruaTu ? timeStringToMinutes(cauHinh.nghiTruaTu, -1) : -1;
  const lunchEnd = cauHinh?.nghiTruaDen ? timeStringToMinutes(cauHinh.nghiTruaDen, -1) : -1;

  const slots: TimeSlotRow[] = [];
  for (let m = startMin; m < endMin; m += 30) {
    const isLunch = lunchStart >= 0 && lunchEnd > lunchStart && m >= lunchStart && m < lunchEnd;
    slots.push({
      label: minutesToHm(m),
      startMinute: m,
      isHour: m % 60 === 0,
      isLunch
    });
  }

  const totalHeightPx = ((endMin - startMin) / 60) * PIXELS_PER_HOUR;
  return { startMin, endMin, slots, totalHeightPx };
}

/**
 * Computes side-by-side layout columns for overlapping appointments
 * so overlapping bookings in the same time window are displayed cleanly without hiding each other.
 */
export function layoutOverlappingLichTrinhs(
  items: LichTrinhView[],
  gridStartMin: number,
  gridEndMin: number
): PositionedLichTrinh[] {
  if (!items || items.length === 0) return [];

  const prepared = items
    .map((item) => {
      const s = isoToMinutes(item.batDau);
      const e = Math.max(s + 15, isoToMinutes(item.ketThuc));
      return { item, startMinute: s, endMinute: e };
    })
    .sort((a, b) => a.startMinute - b.startMinute || b.endMinute - a.endMinute);

  // Build connected overlap clusters
  const clusters: typeof prepared[] = [];
  let currentCluster: typeof prepared = [];
  let clusterMaxEnd = -1;

  for (const entry of prepared) {
    if (currentCluster.length === 0 || entry.startMinute < clusterMaxEnd) {
      currentCluster.push(entry);
      clusterMaxEnd = Math.max(clusterMaxEnd, entry.endMinute);
    } else {
      clusters.push(currentCluster);
      currentCluster = [entry];
      clusterMaxEnd = entry.endMinute;
    }
  }
  if (currentCluster.length > 0) clusters.push(currentCluster);

  const result: PositionedLichTrinh[] = [];

  for (const cluster of clusters) {
    // Greedy interval coloring within each cluster
    const colEndTimes: number[] = [];
    const assigned: { entry: (typeof prepared)[0]; colIndex: number }[] = [];

    for (const entry of cluster) {
      let colIndex = colEndTimes.findIndex((endTime) => endTime <= entry.startMinute);
      if (colIndex === -1) {
        colIndex = colEndTimes.length;
        colEndTimes.push(entry.endMinute);
      } else {
        colEndTimes[colIndex] = entry.endMinute;
      }
      assigned.push({ entry, colIndex });
    }

    const colCount = Math.max(1, colEndTimes.length);
    for (const { entry, colIndex } of assigned) {
      const clampedStart = Math.max(gridStartMin, Math.min(gridEndMin - 15, entry.startMinute));
      const clampedEnd = Math.max(clampedStart + 15, Math.min(gridEndMin, entry.endMinute));
      const topPx = ((clampedStart - gridStartMin) / 60) * PIXELS_PER_HOUR;
      const heightPx = Math.max(38, ((clampedEnd - clampedStart) / 60) * PIXELS_PER_HOUR);

      result.push({
        item: entry.item,
        topPx,
        heightPx,
        colIndex,
        colCount,
        hasOverlap: colCount > 1 || entry.item.daGhiDeXungDot,
        startMinute: entry.startMinute,
        endMinute: entry.endMinute
      });
    }
  }

  return result;
}

export interface SuKienMeta {
  label: string;
  icon: string;
  blockClass: string;
  chipClass: string;
  badgeClass: string;
}

export function getSuKienMeta(loai: number): SuKienMeta {
  switch (Number(loai)) {
    case 1:
      return {
        label: 'Họp',
        icon: 'fa-solid fa-users',
        blockClass: 'ev-meeting',
        chipClass: 'ev-meeting',
        badgeClass: 'bg-primary-subtle text-primary-emphasis border-primary-subtle'
      };
    case 2:
      return {
        label: 'Công tác',
        icon: 'fa-solid fa-briefcase',
        blockClass: 'ev-trip',
        chipClass: 'ev-trip',
        badgeClass: 'bg-warning-subtle text-warning-emphasis border-warning-subtle'
      };
    case 3:
      return {
        label: 'Nghỉ phép',
        icon: 'fa-solid fa-calendar-xmark',
        blockClass: 'ev-leave',
        chipClass: 'ev-leave',
        badgeClass: 'bg-danger-subtle text-danger-emphasis border-danger-subtle'
      };
    default:
      return {
        label: 'Lịch riêng',
        icon: 'fa-solid fa-calendar-minus',
        blockClass: 'ev-other',
        chipClass: 'ev-other',
        badgeClass: 'bg-secondary-subtle text-secondary-emphasis border-secondary-subtle'
      };
  }
}

export function isLeaveEvent(sk: SuKienLanhDaoView): boolean {
  return Number(sk.loai) === 3;
}

export function isSuKienOnDate(sk: SuKienLanhDaoView, ymd: string): boolean {
  if (!sk || !ymd) return false;
  const startYmd = (sk.batDau || '').slice(0, 10);
  const endYmd = (sk.ketThuc || sk.batDau || '').slice(0, 10);
  if (!startYmd) return false;
  return startYmd <= ymd && endYmd >= ymd;
}

function formatYmdShort(ymd: string): string {
  const parts = ymd.split('-');
  if (parts.length !== 3) return ymd;
  return `${parts[2]}/${parts[1]}`;
}

export function formatSuKienTimeLabel(sk: SuKienLanhDaoView): string {
  const startYmd = (sk.batDau || '').slice(0, 10);
  const endYmd = (sk.ketThuc || sk.batDau || '').slice(0, 10);
  if (sk.caNgay) {
    if (startYmd && endYmd && endYmd > startYmd) {
      return `Cả ngày (${formatYmdShort(startYmd)} – ${formatYmdShort(endYmd)})`;
    }
    return 'Cả ngày';
  }
  const sHm = minutesToHm(isoToMinutes(sk.batDau));
  const eHm = minutesToHm(isoToMinutes(sk.ketThuc));
  if (startYmd && endYmd && endYmd > startYmd) {
    return `${formatYmdShort(startYmd)} ${sHm} – ${formatYmdShort(endYmd)} ${eHm}`;
  }
  return `${sHm} – ${eHm}`;
}

export function layoutSuKiens(
  items: SuKienLanhDaoView[],
  gridStartMin: number,
  gridEndMin: number,
  currentYmd?: string
): PositionedSuKien[] {
  if (!items || items.length === 0) return [];
  return items
    .filter((item) => !item.caNgay)
    .map((item) => {
      const startYmd = (item.batDau || '').slice(0, 10);
      const endYmd = (item.ketThuc || item.batDau || '').slice(0, 10);
      const startMin = currentYmd && startYmd && startYmd < currentYmd
        ? gridStartMin
        : isoToMinutes(item.batDau);
      const rawEnd = currentYmd && endYmd && endYmd > currentYmd
        ? gridEndMin
        : isoToMinutes(item.ketThuc);
      const endMin = Math.max(startMin + 20, rawEnd);
      const clampedStart = Math.max(gridStartMin, Math.min(gridEndMin - 15, startMin));
      const clampedEnd = Math.max(clampedStart + 15, Math.min(gridEndMin, endMin));
      return {
        item,
        topPx: ((clampedStart - gridStartMin) / 60) * PIXELS_PER_HOUR,
        heightPx: Math.max(32, ((clampedEnd - clampedStart) / 60) * PIXELS_PER_HOUR)
      };
    });
}

export function getTrangThaiYeuCauBadge(st: number): { label: string; css: string } {
  switch (st) {
    case 1: return { label: 'Chờ tiếp nhận', css: 'bg-info-subtle text-info-emphasis border-info-subtle' };
    case 2: return { label: 'Đang xem xét', css: 'bg-primary-subtle text-primary-emphasis border-primary-subtle' };
    case 3: return { label: 'Chờ NV chốt giờ', css: 'bg-warning-subtle text-warning-emphasis border-warning-subtle' };
    case 4: return { label: 'Chờ NV bổ sung', css: 'bg-warning-subtle text-warning-emphasis border-warning-subtle' };
    case 5: return { label: 'Đã xếp lịch', css: 'bg-primary-subtle text-primary-emphasis border-primary-subtle' };
    case 6: return { label: 'Đã trình', css: 'bg-success-subtle text-success-emphasis border-success-subtle' };
    case 7: return { label: 'Hoàn thành', css: 'bg-success-subtle text-success-emphasis border-success-subtle' };
    case 8: return { label: 'Từ chối', css: 'bg-danger-subtle text-danger-emphasis border-danger-subtle' };
    case 9: return { label: 'Đã hủy', css: 'bg-secondary-subtle text-secondary-emphasis border-secondary-subtle' };
    case 10: return { label: 'Tạm hoãn', css: 'bg-warning-subtle text-warning-emphasis border-warning-subtle' };
    case 11: return { label: 'Vắng', css: 'bg-danger-subtle text-danger-emphasis border-danger-subtle' };
    default: return { label: 'Nháp', css: 'bg-secondary-subtle text-secondary-emphasis' };
  }
}
