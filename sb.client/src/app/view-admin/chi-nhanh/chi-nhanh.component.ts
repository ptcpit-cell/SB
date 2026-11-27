import { Component, HostListener, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { ToastrService } from 'ngx-toastr';
import { CommonService } from '../../../services/common.service';

@Component({
  selector: 'app-chi-nhanh',
  standalone: false,
  templateUrl: './chi-nhanh.component.html',
  styleUrl: './chi-nhanh.component.css',
})
export class ChiNhanhComponent implements OnInit {
  listChiNhanh: any[] = [];
  showModal = false;
  editingId = 0;
  codeInput = '';
  nameInput = '';
  chiNhanhTypeInput: number | null = 3;
  parentIdInput: number | null = null;
  saving = false;
  loading = false;

  // Modal xác nhận xóa mềm
  showDeleteModal = false;
  deleteTarget: any | null = null;
  deleting = false;

  total = 0;
  pageIndex = 0;
  pageSize = 10;
  pageSizeOptions = [10, 20, 50, 100];

  readonly loaiChiNhanhOptions = [
    { value: 3, label: 'Cửa hàng' },
    { value: 2, label: 'Đại lý' },
  ];

  get pagedChiNhanh(): any[] {
    const start = this.pageIndex * this.pageSize;
    return this.listChiNhanh.slice(start, start + this.pageSize);
  }

  get parentOptions(): any[] {
    return this.listChiNhanh.filter((c) => c.chiNhanhId !== this.editingId);
  }

  constructor(
    private commonService: CommonService,
    private toastrService: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadChiNhanh();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  loadChiNhanh(): void {
    this.loading = true;
    this.commonService.getAllChiNhanh().subscribe({
      next: (data) => {
        this.listChiNhanh = data || [];
        this.total = this.listChiNhanh.length;
        if (this.pageIndex * this.pageSize >= this.total && this.pageIndex > 0) {
          this.pageIndex = Math.max(0, Math.ceil(this.total / this.pageSize) - 1);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error fetching Chi Nhanh:', error);
        this.toastrService.error('Lỗi khi tải danh sách chi nhánh', 'Lỗi');
        this.loading = false;
      },
    });
  }

  getTypeLabel(type: number | null | undefined): string {
    switch (Number(type)) {
      case 1:
        return 'Văn phòng';
      case 2:
        return 'Đại lý';
      case 3:
        return 'Cửa hàng';
      default:
        return '—';
    }
  }

  getParentName(parentId: number | null | undefined): string {
    if (!parentId) return '—';
    const parent = this.listChiNhanh.find((c) => c.chiNhanhId === parentId);
    return parent ? parent.tenChiNhanh : `#${parentId}`;
  }

  onAdd(): void {
    this.editingId = 0;
    this.codeInput = '';
    this.nameInput = '';
    this.chiNhanhTypeInput = 3;
    this.parentIdInput = null;
    this.showModal = true;
  }

  onEdit(chiNhanh: any): void {
    this.editingId = chiNhanh.chiNhanhId;
    this.codeInput = chiNhanh.maChiNhanh || '';
    this.nameInput = chiNhanh.tenChiNhanh || '';
    this.chiNhanhTypeInput = Number(chiNhanh.chiNhanhType || 3);
    this.parentIdInput = chiNhanh.parentId ?? null;
    this.showModal = true;
  }

  closeModal(): void {
    if (this.saving) return;
    this.showModal = false;
  }

  askDelete(chiNhanh: any): void {
    this.deleteTarget = chiNhanh;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    if (this.deleting) return;
    this.showDeleteModal = false;
    this.deleteTarget = null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showModal) this.closeModal();
    else if (this.showDeleteModal) this.closeDeleteModal();
  }

  onSave(): void {
    if (this.saving) return;
    if (!this.codeInput.trim() || !this.nameInput.trim() || this.chiNhanhTypeInput === null) {
      this.toastrService.error('Vui lòng điền đầy đủ mã, tên và loại chi nhánh', 'Lỗi');
      return;
    }

    const chiNhanhData = {
      chiNhanhId: this.editingId,
      maChiNhanh: this.codeInput.trim(),
      tenChiNhanh: this.nameInput.trim(),
      chiNhanhType: Number(this.chiNhanhTypeInput),
      parentId: this.parentIdInput ? Number(this.parentIdInput) : null,
      address: null,
      phone: null,
    };

    this.saving = true;
    const saveObservable =
      this.editingId === 0
        ? this.commonService.createChiNhanh(chiNhanhData)
        : this.commonService.updateChiNhanh(chiNhanhData);

    saveObservable.subscribe({
      next: () => {
        this.toastrService.success('Lưu chi nhánh thành công', 'Thành công');
        this.saving = false;
        this.showModal = false;
        this.loadChiNhanh();
      },
      error: (error) => {
        console.error('Error saving Chi Nhanh:', error);
        this.toastrService.error(error?.error?.message || 'Lỗi khi lưu chi nhánh', 'Lỗi');
        this.saving = false;
      },
    });
  }

  confirmDelete(): void {
    if (!this.deleteTarget || this.deleting) return;
    this.deleting = true;
    this.commonService.deleteChiNhanh(this.deleteTarget.chiNhanhId).subscribe({
      next: () => {
        this.toastrService.success('Xóa chi nhánh thành công', 'Thành công');
        this.deleting = false;
        this.showDeleteModal = false;
        this.deleteTarget = null;
        this.loadChiNhanh();
      },
      error: (error) => {
        console.error('Error deleting Chi Nhanh:', error);
        this.toastrService.error(error?.error?.message || 'Lỗi khi xóa chi nhánh', 'Lỗi');
        this.deleting = false;
      },
    });
  }
}
