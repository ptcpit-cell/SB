import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AdminService } from '../../../../services/admin.service';
import { AdminLoaiYeuCauRow, AdminMucUuTienRow } from '../../../../type';

@Component({
  selector: 'app-admin-catalog',
  standalone: false,
  templateUrl: './admin-catalog.component.html',
  styleUrl: './admin-catalog.component.css',
})
export class AdminCatalogComponent implements OnInit {
  loaiList: AdminLoaiYeuCauRow[] = [];
  mucList: AdminMucUuTienRow[] = [];
  loadingLoai = true;
  loadingMuc = true;

  // Modal Loại yêu cầu
  showLoaiModal = false;
  savingLoai = false;
  loaiForm = {
    id: null as number | null,
    maLoai: '',
    tenLoai: '',
    thoiLuongMacDinhPhut: 30,
    isActived: true,
  };

  // Modal Mức ưu tiên
  showMucModal = false;
  savingMuc = false;
  mucForm = {
    id: null as number | null,
    code: '',
    ten: '',
    trongSo: 1,
    mauHienThi: '#0d6efd',
    isActived: true,
  };

  // Modal xác nhận xóa chung
  deleteTarget: { type: 'loai' | 'muc'; id: number; name: string } | null = null;
  deleting = false;

  constructor(
    private adminService: AdminService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadLoai();
    this.loadMuc();
  }

  loadLoai(): void {
    this.loadingLoai = true;
    this.adminService.getLoaiYeuCaus().subscribe({
      next: (res) => {
        this.loaiList = res || [];
        this.loadingLoai = false;
      },
      error: () => {
        this.loadingLoai = false;
      }
    });
  }

  loadMuc(): void {
    this.loadingMuc = true;
    this.adminService.getMucUuTiens().subscribe({
      next: (res) => {
        this.mucList = res || [];
        this.loadingMuc = false;
      },
      error: () => {
        this.loadingMuc = false;
      }
    });
  }

  openLoaiModal(row?: AdminLoaiYeuCauRow): void {
    if (row) {
      this.loaiForm = {
        id: row.id,
        maLoai: row.maLoai,
        tenLoai: row.tenLoai,
        thoiLuongMacDinhPhut: row.thoiLuongMacDinhPhut || 30,
        isActived: row.isActived,
      };
    } else {
      this.loaiForm = {
        id: null,
        maLoai: '',
        tenLoai: '',
        thoiLuongMacDinhPhut: 30,
        isActived: true,
      };
    }
    this.showLoaiModal = true;
  }

  saveLoai(): void {
    if (!this.loaiForm.maLoai.trim() || !this.loaiForm.tenLoai.trim()) {
      this.toastr.warning('Vui lòng nhập Mã loại và Tên loại yêu cầu.');
      return;
    }
    this.savingLoai = true;
    this.adminService
      .saveLoaiYeuCau({
        ...this.loaiForm,
        maLoai: this.loaiForm.maLoai.trim().toUpperCase(),
        tenLoai: this.loaiForm.tenLoai.trim(),
        thoiLuongMacDinhPhut: Number(this.loaiForm.thoiLuongMacDinhPhut || 30),
      })
      .subscribe({
        next: (res) => {
          this.savingLoai = false;
          this.showLoaiModal = false;
          this.toastr.success(res?.message || 'Đã lưu loại yêu cầu.');
          this.loadLoai();
        },
        error: (err) => {
          this.savingLoai = false;
          this.toastr.error(err?.error?.message || 'Lưu loại yêu cầu thất bại.');
        }
      });
  }

  openMucModal(row?: AdminMucUuTienRow): void {
    if (row) {
      this.mucForm = {
        id: row.id,
        code: row.code,
        ten: row.ten,
        trongSo: row.trongSo,
        mauHienThi: row.mauHienThi || '#0d6efd',
        isActived: row.isActived,
      };
    } else {
      this.mucForm = {
        id: null,
        code: '',
        ten: '',
        trongSo: this.mucList.length + 1,
        mauHienThi: '#0d6efd',
        isActived: true,
      };
    }
    this.showMucModal = true;
  }

  saveMuc(): void {
    if (!this.mucForm.code.trim() || !this.mucForm.ten.trim()) {
      this.toastr.warning('Vui lòng nhập Mã mức và Tên mức ưu tiên.');
      return;
    }
    this.savingMuc = true;
    this.adminService
      .saveMucUuTien({
        ...this.mucForm,
        code: this.mucForm.code.trim().toUpperCase(),
        ten: this.mucForm.ten.trim(),
        trongSo: Number(this.mucForm.trongSo || 1),
      })
      .subscribe({
        next: (res) => {
          this.savingMuc = false;
          this.showMucModal = false;
          this.toastr.success(res?.message || 'Đã lưu mức ưu tiên.');
          this.loadMuc();
        },
        error: (err) => {
          this.savingMuc = false;
          this.toastr.error(err?.error?.message || 'Lưu mức ưu tiên thất bại.');
        }
      });
  }

  askDelete(type: 'loai' | 'muc', id: number, name: string): void {
    this.deleteTarget = { type, id, name };
  }

  confirmDelete(): void {
    if (!this.deleteTarget) return;
    this.deleting = true;
    const req$ =
      this.deleteTarget.type === 'loai'
        ? this.adminService.deleteLoaiYeuCau(this.deleteTarget.id)
        : this.adminService.deleteMucUuTien(this.deleteTarget.id);

    req$.subscribe({
      next: (res) => {
        const type = this.deleteTarget?.type;
        this.deleting = false;
        this.deleteTarget = null;
        this.toastr.success(res?.message || 'Đã xóa danh mục.');
        if (type === 'loai') this.loadLoai();
        else this.loadMuc();
      },
      error: (err) => {
        this.deleting = false;
        this.toastr.error(err?.error?.message || 'Không thể xóa mục này.');
      }
    });
  }
}
