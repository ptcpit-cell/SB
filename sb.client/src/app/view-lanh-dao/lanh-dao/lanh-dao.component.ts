import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { RequestService } from '../../../services/request.service';
import {
  LanhDaoDashboard,
  LichTrinhView,
  PhanHoiLanhDaoRequest,
  SuKienLanhDaoView
} from '../../../type';
import { getTodayYmd, shiftYmd } from '../../shared/schedule-layout.util';

@Component({
  selector: 'app-lanh-dao',
  standalone: false,
  templateUrl: './lanh-dao.component.html',
  styleUrl: './lanh-dao.component.css',
})
export class LanhDaoComponent implements OnInit {
  ngay = getTodayYmd();
  loading = true;
  errorMsg = '';
  dashboard: LanhDaoDashboard | null = null;

  // Modals
  showFeedbackModal = false;
  selectedLich: LichTrinhView | null = null;
  savingFeedback = false;

  showBusyEventModal = false;
  savingBusyEvent = false;

  constructor(
    private requestService: RequestService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadLichNgay();
  }

  loadLichNgay(): void {
    this.loading = true;
    this.errorMsg = '';
    this.requestService.getLanhDaoLichNgay(this.ngay).subscribe({
      next: (res) => {
        this.dashboard = res;
        this.loading = false;
      },
      error: (err) => {
        this.errorMsg = err?.error?.message || 'Không tải được lịch trình của Lãnh đạo.';
        this.loading = false;
      }
    });
  }

  chonHomNay(): void {
    this.ngay = getTodayYmd();
    this.loadLichNgay();
  }

  doiNgay(delta: number): void {
    this.ngay = shiftYmd(this.ngay, delta);
    this.loadLichNgay();
  }

  onDateInputChange(): void {
    if (this.ngay) this.loadLichNgay();
  }

  onOpenFeedback(item: LichTrinhView): void {
    this.selectedLich = item;
    this.showFeedbackModal = true;
  }

  onSubmitFeedback(ev: { lichTrinhId: number; payload: PhanHoiLanhDaoRequest }): void {
    this.savingFeedback = true;
    this.requestService.capNhatPhanHoiLanhDao(ev.lichTrinhId, ev.payload).subscribe({
      next: (res) => {
        this.savingFeedback = false;
        this.showFeedbackModal = false;
        this.toastr.success(res?.message || 'Đã lưu phản hồi và gửi thông báo tới nhân viên.');
        this.loadLichNgay();
      },
      error: (err) => {
        this.savingFeedback = false;
        this.toastr.error(err?.error?.message || 'Lưu phản hồi thất bại.');
      }
    });
  }

  onSaveBusyEvent(payload: Partial<SuKienLanhDaoView>): void {
    this.savingBusyEvent = true;
    this.requestService.taoSuKienLanhDao(payload).subscribe({
      next: () => {
        this.savingBusyEvent = false;
        this.showBusyEventModal = false;
        this.toastr.success('Đã thêm lịch bận cá nhân.');
        this.loadLichNgay();
      },
      error: (err) => {
        this.savingBusyEvent = false;
        this.toastr.error(err?.error?.message || 'Thêm sự kiện thất bại.');
      }
    });
  }

  onDeleteSuKien(sk: SuKienLanhDaoView): void {
    this.requestService.xoaSuKienLanhDao(sk.id).subscribe({
      next: () => {
        this.toastr.success('Đã xóa sự kiện bận.');
        this.loadLichNgay();
      },
      error: () => this.toastr.error('Không thể xóa sự kiện.')
    });
  }

  onOpenFullDetail(yeuCauId: number): void {
    this.showFeedbackModal = false;
    this.router.navigate(['/nhan-vien/detail-request', yeuCauId]);
  }
}
