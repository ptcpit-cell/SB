import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { ToastrService } from 'ngx-toastr';
import { CommonService } from '../../../services/common.service';

@Component({
  selector: 'app-chuc-vu',
  standalone: false,
  templateUrl: './chuc-vu.component.html',
  styleUrl: './chuc-vu.component.css',
})
export class ChucVuComponent implements OnInit {
  listChucVu: any[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = 10;
  pageSizeOptions = [10, 20, 50, 100];

  get pagedChucVu(): any[] {
    const start = this.pageIndex * this.pageSize;
    return this.listChucVu.slice(start, start + this.pageSize);
  }

  constructor(
    private toastr: ToastrService,
    private commonService: CommonService
  ) { }

  ngOnInit(): void {
    this.loadChucVu();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  loadChucVu(): void {
    this.commonService.getChucVu().subscribe({
      next: (data) => {
        this.listChucVu = data;
        this.total = data.length;
        this.pageIndex = 0;
      },
      error: (error) => {
        console.error('Error fetching Chuc Vu:', error);
        this.toastr.error('Lỗi khi tải danh sách chức vụ', 'Lỗi');
      }
    });
  }
}
