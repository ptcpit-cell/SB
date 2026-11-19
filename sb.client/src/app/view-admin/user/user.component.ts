import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { forkJoin } from 'rxjs';
import { CommonService } from '../../../services/common.service';
import { ToastrService } from "ngx-toastr";
import { UserService } from '../../../services/user.service';
import { UserRow, RoleRow, UserSaveRequest } from '../../../type';

type PanelMode = 'view' | 'form';

@Component({
  selector: 'app-user',
  standalone: false,
  templateUrl: './user.component.html',
  styleUrl: './user.component.css'
})
export class UserComponent implements OnInit {
  private readonly DEFAULT_PASSWORD = 'PT123456';

  users: UserRow[] = [];
  roles: RoleRow[] = [];
  listChiNhanh: any[] = [];
  listPhongBan: any[] = [];
  listChucVu: any[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = 10;
  pageSizeOptions = [10, 20, 50, 100];

  mode: PanelMode = 'view';
  activeTab = 0; // 0: Thông tin user, 1: Cấp role

  editingUserId = 0; // 0 = đang thêm mới
  userNameInput = '';
  tenNguoiDungInput = '';
  passwordInput = '';
  chiNhanhInput: number | null = null;
  phongBanInput: number | null = null;
  chucVuInput: number | null = null;
  emailInput = '';
  phoneInput = '';
  passwordReadonly = true;
  duplicateError = false;
  saving = false;
  serverError = '';
  selectedRoleIds = new Set<number>();

  get canGoNext(): boolean {
    return (
      !!this.userNameInput.trim() &&
      !!this.tenNguoiDungInput.trim() &&
      !this.duplicateError &&
      (this.editingUserId !== 0 || !!this.chiNhanhInput) // thêm mới bắt buộc chọn chi nhánh
    );
  }

  constructor(private userService: UserService, private commonService: CommonService, private toastrService: ToastrService) {}

  get pagedUsers(): UserRow[] {
    const start = this.pageIndex * this.pageSize;
    return this.users.slice(start, start + this.pageSize);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.userService.getUser().subscribe({
      next: (data) => {
        this.users = data;
        this.total = data.length;
        this.pageIndex = 0;
      },
      error: () => alert('Không thể tải danh sách user.')
    });
  }

  // ===== Mở form thêm / sửa =====
  startAdd(): void {
    this.openForm();
  }

  startEdit(user: UserRow): void {
    this.openForm(user);
  }

  private openForm(user?: UserRow): void {
    this.resetForm();
    this.mode = 'form';

    if (user) {
      this.editingUserId = user.userId;
      this.userNameInput = user.userName;
      this.tenNguoiDungInput = user.tenNguoiDung;
      this.emailInput = user.email || '';
      this.phoneInput = user.phone || '';
      this.chiNhanhInput = user.chiNhanhId || null;
      this.phongBanInput = user.phongBanId || null;
      this.chucVuInput = user.chucVuId || null;
    }

    forkJoin({
      roles: this.userService.getRole(),
      userRoles: this.userService.getUserRole(),
      chiNhanh: this.commonService.getAllChiNhanh(),
      phongBan: this.commonService.getPhongBan(),
      chucVu: this.commonService.getChucVu()
    }).subscribe({
      next: ({ roles, userRoles, chiNhanh, phongBan, chucVu }) => {
        this.roles = roles;
        this.listChiNhanh = chiNhanh;
        this.listPhongBan = phongBan;
        this.listChucVu = chucVu;
        if (user) {
          this.selectedRoleIds = new Set(
            userRoles.filter((ur: any) => ur.userId === user.userId).map((ur: any) => ur.roleId)
          );
        }
      },
      error: () => alert('Không thể tải danh sách role/chi nhánh.')
    });
  }

  private resetForm(): void {
    this.activeTab = 0;
    this.editingUserId = 0;
    this.userNameInput = '';
    this.tenNguoiDungInput = '';
    this.emailInput = '';
    this.phoneInput = '';
    this.passwordInput = '';
    this.chiNhanhInput = null;
    this.phongBanInput = null;
    this.chucVuInput = null;
    this.passwordReadonly = true; // reset trick chống autofill mỗi lần mở form
    this.duplicateError = false;
    this.serverError = '';
    this.selectedRoleIds.clear();
  }

  cancelForm(): void {
    this.resetForm();
    this.mode = 'view';
  }

  // Kiểm tra trùng username sơ bộ ở client (server vẫn kiểm tra lại khi lưu)
  checkDuplicateUserName(): void {
    const name = this.userNameInput.trim().toLowerCase();
    this.duplicateError =
      !!name &&
      this.users.some(u => u.userName.trim().toLowerCase() === name && u.userId !== this.editingUserId);
  }

  goToTab(index: number): void {
    if (index !== 0 && !this.canGoNext) return;
    this.activeTab = index;
  }

  nextTab(): void {
    this.goToTab(1);
  }

  toggleRole(id: number): void {
    if (!this.selectedRoleIds.delete(id)) this.selectedRoleIds.add(id);
  }

  // ===== Lưu =====
  save(): void {
    if (!this.canGoNext) {
      this.activeTab = 0;
      return;
    }

    const isCreate = this.editingUserId === 0;
    const payload: UserSaveRequest = {
      userId: this.editingUserId,
      userName: this.userNameInput,
      tenNguoiDung: this.tenNguoiDungInput,
      email: this.emailInput,
      phone: this.phoneInput,
      chiNhanhId: this.chiNhanhInput ?? 0,
      phongBanId: this.phongBanInput ?? null,
      chucVuId: this.chucVuInput ?? null,
      // Thêm mới: để trống -> mật khẩu mặc định. Sửa: để trống -> backend giữ mật khẩu cũ
      password: isCreate ? this.passwordInput || this.DEFAULT_PASSWORD : this.passwordInput,
      roleIds: [...this.selectedRoleIds]
    };

    this.serverError = '';
    this.saving = true;

    const request$ = isCreate ? this.userService.createUser(payload) : this.userService.updateUser(payload);

    request$.subscribe({
      next: (success: boolean) => {
        this.saving = false;
        // CreateUserAsync trả false khi server phát hiện trùng username
        if (isCreate && success === false) {
          this.serverError = 'Tên đăng nhập đã tồn tại, vui lòng chọn tên khác.';
          this.activeTab = 0;
          return;
        }
        this.loadUsers();
        this.toastrService.success(`Lưu user "${payload.tenNguoiDung}" thành công.`);
        this.cancelForm();
      },
      error: () => {
        this.saving = false;
        this.serverError = 'Lưu user thất bại, vui lòng thử lại.';
      }
    });
  }

  toggleUserStatus(user: UserRow): void {
    const newStatus = !user.isActived;
    this.userService.updateUserStatus(user.userId, newStatus).subscribe({
      next: () =>{ 
        (user.isActived = newStatus)
        this.loadUsers();
        this.toastrService.success(`Cập nhật trạng thái user "${user.tenNguoiDung}" thành công.`);
      },
      error: () => this.toastrService.error('Không thể cập nhật trạng thái.')
    });
  }

  deleteUser(user: UserRow): void {
    if (!confirm(`Xóa user "${user.tenNguoiDung}"?`)) return;
    this.userService.deleteUser(user.userId).subscribe({
      next: () => {
        this.loadUsers();
        this.toastrService.success(`Xóa user "${user.tenNguoiDung}" thành công.`);
      },
      error: () => this.toastrService.error('Không thể xóa user.')
    });
  }

  trackByUserId = (_: number, u: UserRow) => u.userId;
  trackByRoleId = (_: number, r: RoleRow) => r.roleId;
}