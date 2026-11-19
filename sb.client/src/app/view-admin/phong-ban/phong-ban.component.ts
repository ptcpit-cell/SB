import { Component, HostListener, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { ToastrService } from 'ngx-toastr';
import { CommonService } from '../../../services/common.service';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-phong-ban',
  standalone: false,
  templateUrl: './phong-ban.component.html',
  styleUrl: './phong-ban.component.css',
})
export class PhongBanComponent implements OnInit{
  private search$ = new Subject<string>();
  listChiNhanh: any[] = [];
  listPhongBan: any[] = [];
  showModal = false;
  editingId = 0;
  codeInput = '';
  nameInput = '';
  selectedChiNhanhId: number | null = null
  parenntIdInput: number | null = null;
  saving = false
  loading = false
  total = 0;
  pageIndex = 0;
  pageSize = 10;
  pageSizeOptions = [10, 20, 50, 100];
  keyword = '';

  get pagedPhongBan(): any[] {
    const start = this.pageIndex * this.pageSize;
    return this.listPhongBan.slice(start, start + this.pageSize);
  }

  constructor(private commonService: CommonService, private toastrService: ToastrService) {}

  ngOnInit(): void {
    this.loadPhongBan();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  loadPhongBan(): void{
    this.loading = true;
    this.commonService.getPhongBan().subscribe({
      next: (data) => {
        this.listPhongBan = data;
        this.total = data.length;
        this.pageIndex = 0;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error fetching Phong Ban:', error);
        this.toastrService.error('Lỗi khi tải danh sách phòng ban', 'Lỗi');
        this.loading = false;
      }
    });
  }
  loadChiNhanh(): void {
    this.commonService.getAllChiNhanh().subscribe({
      next: (data) => {
        this.listChiNhanh = data;
      },
      error: (error) => {
        console.error('Error fetching Chi Nhanh:', error);
        this.toastrService.error('Lỗi khi tải danh sách chi nhánh', 'Lỗi');
      }
    });
  }
  onSearch(value: string) {
    this.search$.next(value);
  }
  onAdd(): void {
    this.editingId = 0;
    this.codeInput = '';
    this.nameInput = '';
    this.selectedChiNhanhId = null;
    this.parenntIdInput = null;
    this.showModal = true;
    this.loadChiNhanh();
  }
  onEdit(phongBan: any): void {
    this.editingId = phongBan.id;
    this.codeInput = phongBan.maPhongBan;
    this.nameInput = phongBan.tenPhongBan;
    this.selectedChiNhanhId = phongBan.chiNhanhId;
    this.parenntIdInput = phongBan.parentId;
    this.showModal = true;
    this.loadChiNhanh();
  }
  closeModal(): void {
    if (this.saving) return;
    this.showModal = false;
  }
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showModal) this.closeModal();
  }

  onSave(): void {
    if (this.saving) return;
    if (!this.codeInput || !this.nameInput || this.selectedChiNhanhId === null) {
      this.toastrService.error('Vui lòng điền đầy đủ thông tin', 'Lỗi');
      return;
    }
    const phongBanData = {
      id: this.editingId,
      maPhongBan: this.codeInput,
      tenPhongBan: this.nameInput,
      chiNhanhId: this.selectedChiNhanhId,
      parentId: this.parenntIdInput
    };
    this.saving = true;
    const saveObservable = this.editingId === 0
      ? this.commonService.createPhongBan(phongBanData)
      : this.commonService.updatePhongBan(phongBanData);
    saveObservable.subscribe({
      next: () => {
        this.toastrService.success('Lưu phòng ban thành công', 'Thành công');
        this.saving = false;
        this.showModal = false;
        this.loadPhongBan();
      },
      error: (error) => {
        console.error('Error saving Phong Ban:', error);
        this.toastrService.error('Lỗi khi lưu phòng ban', 'Lỗi');
        this.saving = false;
      }
    });
  }
  onDelete(phongBanId: number): void {
    if (confirm('Bạn có chắc chắn muốn xóa phòng ban này?')) {
      this.commonService.deletePhongBan(phongBanId).subscribe({
        next: () => {
          this.toastrService.success('Xóa phòng ban thành công', 'Thành công');
          this.loadPhongBan();
        },
        error: (error) => {
          console.error('Error deleting Phong Ban:', error);
          this.toastrService.error('Lỗi khi xóa phòng ban', 'Lỗi');
        }
      });
    }
  }
}
