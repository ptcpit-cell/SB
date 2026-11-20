import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MucUuTienItem, TroLyYeuCauItem } from '../../../../type';
import { getTrangThaiYeuCauBadge } from '../../../shared/schedule-layout.util';

@Component({
  selector: 'app-tro-ly-request-queue',
  standalone: false,
  templateUrl: './request-queue.component.html',
  styleUrl: './request-queue.component.css',
})
export class RequestQueueComponent {
  @Input() hangCho: TroLyYeuCauItem[] = [];
  @Input() mucUuTiens: MucUuTienItem[] = [];
  @Input() loading = false;

  @Output() tiepNhan = new EventEmitter<TroLyYeuCauItem>();
  @Output() changeUuTien = new EventEmitter<{ item: TroLyYeuCauItem; mucUuTienId: number | null }>();
  @Output() moXepLich = new EventEmitter<TroLyYeuCauItem>();
  @Output() moBoSung = new EventEmitter<TroLyYeuCauItem>();
  @Output() moTuChoi = new EventEmitter<TroLyYeuCauItem>();
  @Output() xemChiTiet = new EventEmitter<number>();
  @Output() dragStartQueue = new EventEmitter<TroLyYeuCauItem>();

  filterTab: 'all' | 'pending' | 'urgent' | 'waiting_nv' = 'all';
  keyword = '';

  get filteredItems(): TroLyYeuCauItem[] {
    const kw = this.keyword.trim().toLowerCase();
    return this.hangCho.filter((item) => {
      if (this.filterTab === 'pending' && ![1, 2, 10].includes(item.trangThai)) return false;
      if (this.filterTab === 'urgent' && item.mucKhan < 2) return false;
      if (this.filterTab === 'waiting_nv' && ![3, 4].includes(item.trangThai)) return false;

      if (kw) {
        const hay = `${item.maYeuCau} ${item.tieuDe} ${item.tenNguoiTrinh} ${item.phongBanNguoiTrinh}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }

  get countPending(): number {
    return this.hangCho.filter(i => [1, 2, 10].includes(i.trangThai)).length;
  }

  get countUrgent(): number {
    return this.hangCho.filter(i => i.mucKhan >= 2).length;
  }

  get countWaitingNv(): number {
    return this.hangCho.filter(i => [3, 4].includes(i.trangThai)).length;
  }

  statusBadge(st: number) {
    return getTrangThaiYeuCauBadge(st);
  }

  onDragStart(ev: DragEvent, item: TroLyYeuCauItem): void {
    if (ev.dataTransfer) {
      ev.dataTransfer.effectAllowed = 'move';
      ev.dataTransfer.setData('application/json', JSON.stringify({
        source: 'queue',
        yeuCauId: item.yeuCauId,
        thoiLuongPhut: item.thoiLuongPhut
      }));
    }
    this.dragStartQueue.emit(item);
  }

  onPriorityChange(item: TroLyYeuCauItem, val: string): void {
    const num = val ? Number(val) : null;
    this.changeUuTien.emit({ item, mucUuTienId: num });
  }

  isNearDeadline(hanChot?: string | null): boolean {
    if (!hanChot) return false;
    const diffMs = new Date(hanChot).getTime() - Date.now();
    return diffMs <= 2 * 86400000;
  }

  trackById(_: number, item: TroLyYeuCauItem): number {
    return item.yeuCauId;
  }
}
