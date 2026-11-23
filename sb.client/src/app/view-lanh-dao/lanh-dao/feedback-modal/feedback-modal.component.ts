import { Component, EventEmitter, Inject, Input, OnChanges, Output } from '@angular/core';
import { LichTrinhView, PhanHoiLanhDaoRequest } from '../../../../type';

interface FollowUpDraft {
  noiDung: string;
  hanXuLy: string;
}

@Component({
  selector: 'app-lanh-dao-feedback-modal',
  standalone: false,
  templateUrl: './feedback-modal.component.html',
  styleUrl: './feedback-modal.component.css',
})
export class FeedbackModalComponent implements OnChanges {
  @Input() visible = false;
  @Input() saving = false;
  @Input() item: LichTrinhView | null = null;

  @Output() closeModal = new EventEmitter<void>();
  @Output() submitFeedback = new EventEmitter<{ lichTrinhId: number; payload: PhanHoiLanhDaoRequest }>();
  @Output() openFullDetail = new EventEmitter<number>();

  ketQua = 1; // 1 Đã trình, 2 Vắng/Không trình được, 3 Hoãn
  chiDaoCuaLanhDao = '';
  ghiChuLanhDao = '';
  congViecs: FollowUpDraft[] = [];

  constructor(@Inject('BASE_URL') public baseUrl: string) {}

  ngOnChanges(): void {
    if (this.visible && this.item) {
      this.ketQua = this.item.ketQua?.ketQua ?? 1;
      this.chiDaoCuaLanhDao = this.item.ketQua?.chiDaoCuaLanhDao || '';
      this.ghiChuLanhDao = this.item.ghiChuLanhDao || '';
      this.congViecs = (this.item.congViecs || []).map(cv => ({
        noiDung: cv.noiDung,
        hanXuLy: cv.hanXuLy ? cv.hanXuLy.slice(0, 10) : ''
      }));
    }
  }

  addTask(): void {
    this.congViecs.push({ noiDung: '', hanXuLy: '' });
  }

  removeTask(idx: number): void {
    this.congViecs.splice(idx, 1);
  }

  fileUrl(duongDan: string): string {
    return `${this.baseUrl}Files/${duongDan}`;
  }

  formatSize(bytes: number): string {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  submit(): void {
    if (!this.item) return;
    const tasks = this.congViecs
      .filter(t => t.noiDung.trim().length > 0)
      .map(t => ({
        noiDung: t.noiDung.trim(),
        hanXuLy: /^\d{4}-\d{2}-\d{2}$/.test(t.hanXuLy) ? `${t.hanXuLy}T17:00:00` : null,
        trangThai: 1
      }));

    const ketQuaNum = Number(this.ketQua);
    this.submitFeedback.emit({
      lichTrinhId: this.item.lichTrinhId,
      payload: {
        ketQua: ketQuaNum,
        hoanThanh: ketQuaNum === 1,
        chiDaoCuaLanhDao: this.chiDaoCuaLanhDao.trim() || null,
        ghiChuLanhDao: this.ghiChuLanhDao.trim() || null,
        congViecs: tasks
      }
    });
  }
}
