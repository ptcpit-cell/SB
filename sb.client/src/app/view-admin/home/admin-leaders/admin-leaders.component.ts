import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AdminService } from '../../../../services/admin.service';
import { AdminLanhDaoRow, AdminUserOption } from '../../../../type';

@Component({
  selector: 'app-admin-leaders',
  standalone: false,
  templateUrl: './admin-leaders.component.html',
  styleUrl: './admin-leaders.component.css',
})
export class AdminLeadersComponent implements OnInit {
  lanhDaos: AdminLanhDaoRow[] = [];
  users: AdminUserOption[] = [];
  loading = true;
  keyword = '';

  showModal = false;
  saving = false;
  editingId: number | null = null;
  form = {
    userId: null as number | null,
    troLyUserId: null as number | null,
    capDo: 1,
    thuTuHienThi: 1,
    isActived: true,
  };

  showDeleteModal = false;
  deleting = false;
  deleteTarget: AdminLanhDaoRow | null = null;

  constructor(
    private adminService: AdminService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.adminService.getLanhDaos().subscribe({
      next: (res) => {
        this.lanhDaos = res.lanhDaos || [];
        this.users = res.users || [];
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toastr.error(err?.error?.message || 'Không tải được danh sách Lãnh đạo & Trợ lý.');
      }
    });
  }

  get filteredLanhDaos(): AdminLanhDaoRow[] {
    const q = this.keyword.trim().toLowerCase();
    if (!q) return this.lanhDaos;
    return this.lanhDaos.filter((x) =>
      `${x.hoTen} ${x.userName} ${x.tenTroLy} ${x.tenChiNhanh} ${x.tenChucVu}`
        .toLowerCase()
        .includes(q)
    );
  }

  get availableLeaderUsers(): AdminUserOption[] {
    const usedLeaderIds = new Set(
      this.lanhDaos.filter((x) => x.id !== this.editingId).map((x) => Number(x.userId))
    );
    return this.users.filter((u) => !usedLeaderIds.has(Number(u.userId)));
  }

  get availableAssistantUsers(): AdminUserOption[] {
    const usedAssistantIds = new Set(
      this.lanhDaos
        .filter((x) => x.id !== this.editingId && x.troLyUserId)
        .map((x) => Number(x.troLyUserId))
    );
    return this.users.filter(
      (u) => Number(u.userId) !== Number(this.form.userId) && !usedAssistantIds.has(Number(u.userId))
    );
  }

  openAdd(): void {
    this.editingId = null;
    this.form = {
      userId: null,
      troLyUserId: null,
      capDo: 1,
      thuTuHienThi: this.lanhDaos.length + 1,
      isActived: true,
    };
    this.showModal = true;
  }

  openEdit(row: AdminLanhDaoRow): void {
    this.editingId = row.id;
    this.form = {
      userId: row.userId,
      troLyUserId: row.troLyUserId ?? null,
      capDo: row.capDo || 1,
      thuTuHienThi: row.thuTuHienThi || 1,
      isActived: row.isActived,
    };
    this.showModal = true;
  }

  save(): void {
    if (!this.form.userId) {
      this.toastr.warning('Vui lòng chọn tài khoản Lãnh đạo.');
      return;
    }
    if (this.form.troLyUserId && Number(this.form.troLyUserId) === Number(this.form.userId)) {
      this.toastr.warning('Trợ lý không thể trùng với chính Lãnh đạo.');
      return;
    }

    this.saving = true;
    const leaderUser = this.users.find((u) => Number(u.userId) === Number(this.form.userId));
    this.adminService
      .saveLanhDao({
        id: this.editingId,
        userId: Number(this.form.userId),
        chiNhanhId: leaderUser?.chiNhanhId || 1,
        troLyUserId: this.form.troLyUserId ? Number(this.form.troLyUserId) : null,
        capDo: Number(this.form.capDo || 1),
        thuTuHienThi: Number(this.form.thuTuHienThi || 1),
        isActived: this.form.isActived,
      })
      .subscribe({
        next: (res) => {
          this.saving = false;
          this.showModal = false;
          this.toastr.success(res?.message || 'Đã lưu phân công Lãnh đạo & Trợ lý.');
          this.loadData();
        },
        error: (err) => {
          this.saving = false;
          this.toastr.error(err?.error?.message || 'Lưu phân công thất bại.');
        }
      });
  }

  openDelete(row: AdminLanhDaoRow): void {
    this.deleteTarget = row;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (!this.deleteTarget) return;
    this.deleting = true;
    this.adminService.deleteLanhDao(this.deleteTarget.id).subscribe({
      next: (res) => {
        this.deleting = false;
        this.showDeleteModal = false;
        this.deleteTarget = null;
        this.toastr.success(res?.message || 'Đã xóa Lãnh đạo.');
        this.loadData();
      },
      error: (err) => {
        this.deleting = false;
        this.toastr.error(err?.error?.message || 'Không thể xóa Lãnh đạo này.');
      }
    });
  }
}
