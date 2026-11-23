import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AdminService } from '../../../services/admin.service';
import { AdminDashboardData } from '../../../type';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  activeTab: 'overview' | 'leaders' | 'catalog' = 'overview';
  loading = true;
  data: AdminDashboardData | null = null;
  showExportModal = false;

  constructor(
    private adminService: AdminService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.adminService.getDashboard().subscribe({
      next: (res) => {
        this.data = res;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toastr.error(err?.error?.message || 'Không tải được dữ liệu tổng quan quản trị.');
      }
    });
  }

  switchTab(tab: 'overview' | 'leaders' | 'catalog'): void {
    this.activeTab = tab;
    if (tab === 'overview') {
      this.loadDashboard();
    }
  }

  getStatusPct(soLuong: number): number {
    const total = this.data?.tongQuan?.tongYeuCau || 0;
    if (total === 0) return 0;
    return Math.round((soLuong / total) * 100);
  }

  getStatusColor(trangThai: number): string {
    switch (trangThai) {
      case 1:
      case 2:
        return '#2563eb';
      case 3:
      case 4:
      case 10:
        return '#d97706';
      case 5:
      case 6:
      case 7:
        return '#16a34a';
      case 8:
      case 11:
        return '#dc2626';
      default:
        return '#64748b';
    }
  }

  openDetail(yeuCauId: number): void {
    this.router.navigate(['/nhan-vien/detail-request', yeuCauId]);
  }
}
