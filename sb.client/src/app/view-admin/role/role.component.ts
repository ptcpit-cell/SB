import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { forkJoin } from 'rxjs';
import { ToastrService } from "ngx-toastr";
import { UserService } from '../../../services/user.service';
import { RoleRow, PermissionRow, UserRow, UserRoleRow, RoleSaveRequest } from '../../../type';

type PanelMode = 'view' | 'form';
type MainTab = 'role' | 'permission';

@Component({
  selector: 'app-role',
  standalone: false,
  templateUrl: './role.component.html',
  styleUrl: './role.component.css',
})
export class RoleComponent implements OnInit {
  roles: RoleRow[] = [];
  permissions: PermissionRow[] = [];
  users: UserRow[] = [];
  userRoles: UserRoleRow[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = 10;
  pageSizeOptions = [10, 20, 50, 100];
  mode: PanelMode = 'view';
  activeMainTab: MainTab = 'role'; // tab chính
  activeTab = 0; // tab phụ trong main tab
  editingRoleId = 0; // 0 = đang thêm mới, khác 0 = đang sửa
  roleNameInput = '';
  duplicateError = false;
  selectedPermissionIds = new Set<number>();
  selectedUserIds = new Set<number>();
  saving = false;
  loadingDetail = false;
  openHelp = false;

  groupedPermissions: { component: string; items: PermissionRow[] }[] = [];

  get canGoNext(): boolean {
    return this.roleNameInput.trim().length > 0 && !this.duplicateError;
  }

  constructor(private userService: UserService, private toastr: ToastrService) {}

  get pagedRoles(): RoleRow[] {
    const start = this.pageIndex * this.pageSize;
    return this.roles.slice(start, start + this.pageSize);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  ngOnInit(): void {
    this.loadPermissions();
    this.loadRoles();
  }
  loadRoles(): void {
    this.userService.getRole().subscribe({
      next: (data) => {
        this.roles = data;
        this.total = data.length;
        this.pageIndex = 0;
      },
      error: () => alert('Không thể tải danh sách role.'),
    });
  }

  loadPermissions(): void {
    this.userService.getPermission().subscribe({
      next: (data) => {
        this.permissions = data;
        this.buildGroupedPermissions();

        if (this.mode === 'form' && this.editingRoleId === 0) {
          this.applyDefaultPermissionsForNewRole();
        }
      },
      error: () => alert('Không thể tải danh sách permission.'),
    });
  }

  private buildGroupedPermissions(): void {
    const map = new Map<string, PermissionRow[]>();
    for (const p of this.permissions) {
      if (!p.component) continue;
      const componentNames = p.component
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
      for (const name of componentNames) {
        if (name.toLowerCase() === 'Sidebar') continue;
        if (!map.has(name)) map.set(name, []);
        const group = map.get(name)!;
        if (!group.some((item) => item.permissionId === p.permissionId)) {
          group.push(p);
        }
      }
    }

    this.groupedPermissions = Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([component, items]) => ({ component, items }));
  }

  private normalizePermissionName(permissionName: string): string {
    return permissionName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .trim();
  }

  private isViewPermission(permissionName: string): boolean {
    return this.normalizePermissionName(permissionName).startsWith('view ');
  }

  private enforceSingleViewPermission(): void {
    const viewIds = Array.from(this.selectedPermissionIds).filter((id) => {
      const permission = this.permissions.find((p) => p.permissionId === id);
      return permission ? this.isViewPermission(permission.permissionName) : false;
    });

    if (viewIds.length <= 1) return;

    const keepId = viewIds[viewIds.length - 1];
    for (const id of viewIds) {
      if (id !== keepId) {
        this.selectedPermissionIds.delete(id);
      }
    }
  }

  private applyDefaultPermissionsForNewRole(): void {
    if (!this.permissions.length) return;

    const defaultPermissionNames = ['View nhân viên', 'Hiển thị sidebar'];
    const defaultIds = this.permissions
      .filter((permission) =>
        defaultPermissionNames.some(
          (name) => this.normalizePermissionName(permission.permissionName) === this.normalizePermissionName(name)
        )
      )
      .map((permission) => permission.permissionId);

    this.selectedPermissionIds = new Set(defaultIds);
  }

  private loadUsersAndUserRoles(onDone?: () => void): void {
    forkJoin({
      users: this.userService.getUser(),
      userRoles: this.userService.getUserRole()
    }).subscribe({
      next: ({ users, userRoles }) => {
        this.users = users;
        this.userRoles = userRoles;
        if (onDone) onDone();
      },
      error: () => alert('Không thể tải danh sách user hoặc phân quyền user.')
    });
  }
  // ===== Thêm role =====
  startAdd(): void {
    this.mode = 'form';
    this.editingRoleId = 0;
    this.roleNameInput = '';
    this.duplicateError = false;
    this.selectedPermissionIds.clear();
    this.selectedUserIds.clear();
    this.activeTab = 0;

    this.applyDefaultPermissionsForNewRole();
    this.loadUsersAndUserRoles();
  }

  // ===== Sửa role =====
  startEdit(role: RoleRow): void {
    this.mode = 'form';
    this.editingRoleId = role.roleId;
    this.roleNameInput = role.tenRole;
    this.duplicateError = false;
    this.activeTab = 0;
    this.loadingDetail = true;

    this.loadUsersAndUserRoles(() => {
      // Sau khi có đủ userRoles -> lọc ra các userId thuộc đúng role đang sửa
      const ids = this.userRoles
        .filter(ur => ur.roleId === this.editingRoleId)
        .map(ur => ur.userId);
      this.selectedUserIds = new Set(ids);
    });

    this.userService.getRolePermissions(role.roleId).subscribe({
      next: (data: any[]) => {
        const ids = data.map((d) =>
          typeof d === 'number' ? d : d.permissionId
        );
        this.selectedPermissionIds = new Set(ids);
        this.enforceSingleViewPermission();
        this.loadingDetail = false;
      },
      error: () => {
        alert('Không thể tải quyền của role.');
        this.loadingDetail = false;
      },
    });
  }

  cancelForm(): void {
    this.mode = 'view';
    this.activeTab = 0;
    this.editingRoleId = 0;
    this.roleNameInput = '';
    this.duplicateError = false;
    this.selectedPermissionIds.clear();
    this.selectedUserIds.clear();
  }
   getOtherRoleNamesOf(userId: number): string[] {
    const roleIds = this.userRoles.filter(ur => ur.userId === userId && ur.roleId !== this.editingRoleId).map(ur => ur.roleId);
    return this.roles.filter(r => roleIds.includes(r.roleId)).map(r => r.tenRole);
  }
  // ===== Check trùng tên role =====
  checkDuplicateRoleName(): void {
    const name = this.roleNameInput.trim().toLowerCase();
    if (!name) {
      this.duplicateError = false;
      return;
    }
    this.duplicateError = this.roles.some(
      (r) =>
        r.tenRole.trim().toLowerCase() === name &&
        r.roleId !== this.editingRoleId
    );
  }

  goToTab(index: number): void {
    if (this.activeTab === 0 && index !== 0 && !this.canGoNext) {
      return;
    }
    this.activeTab = index;
  }

  nextTab(): void {
    if (!this.canGoNext) return;
    this.activeTab = 1;
  }

  togglePermission(id: number): void {
    const permission = this.permissions.find((p) => p.permissionId === id);
    if (!permission) return;

    if (this.isViewPermission(permission.permissionName)) {
      if (this.selectedPermissionIds.has(id)) {
        this.selectedPermissionIds.delete(id);
        return;
      }

      const otherViewIds = Array.from(this.selectedPermissionIds).filter((selectedId) => {
        const selectedPermission = this.permissions.find((p) => p.permissionId === selectedId);
        return selectedPermission ? this.isViewPermission(selectedPermission.permissionName) : false;
      });

      for (const selectedId of otherViewIds) {
        this.selectedPermissionIds.delete(selectedId);
      }

      this.selectedPermissionIds.add(id);
      return;
    }

    this.selectedPermissionIds.has(id)
      ? this.selectedPermissionIds.delete(id)
      : this.selectedPermissionIds.add(id);
  }

  toggleUser(id: number): void {
    this.selectedUserIds.has(id)
      ? this.selectedUserIds.delete(id)
      : this.selectedUserIds.add(id);
  }

  save(): void {
    if (!this.canGoNext) {
      this.activeTab = 0;
      return;
    }

    const payload: RoleSaveRequest = {
      roleId: this.editingRoleId,
      tenRole: this.roleNameInput.trim(),
      permissionIds: Array.from(this.selectedPermissionIds),
      userIds: Array.from(this.selectedUserIds),
    };

    this.saving = true;
    this.userService.updatePermissions(payload).subscribe({
      next: () => {
        this.saving = false;
        this.loadRoles();
        this.cancelForm();
        this.toastr.success('Lưu role thành công.');
      },
      error: () => {
        this.saving = false;
        this.toastr.error('Lưu role thất bại.');
      },
    });
  }

  toggleRoleStatus(role: RoleRow): void {
    const newStatus = !role.isActived;
    this.userService.updateRoleStatus(role.roleId, newStatus).subscribe({
      next: () => (role.isActived = newStatus),
      error: () => this.toastr.error('Không thể cập nhật trạng thái.'),
    });
  }

  deleteRole(role: RoleRow): void {
    if (!confirm(`Xóa role "${role.tenRole}"?`)) return;
    this.userService.deleteRole(role.roleId).subscribe({
      next: () => {
        this.loadRoles();
        this.toastr.success('Xóa role thành công.');
      },
      error: () => this.toastr.error('Không thể xóa role.'),
    });
  }
  isGroupFullySelected(group: {
    component: string;
    items: PermissionRow[];
  }): boolean {
    return (
      group.items.length > 0 &&
      group.items.every((p) => this.selectedPermissionIds.has(p.permissionId))
    );
  }
  isGroupPartiallySelected(group: {
    component: string;
    items: PermissionRow[];
  }): boolean {
    const selectedCount = group.items.filter((p) =>
      this.selectedPermissionIds.has(p.permissionId)
    ).length;
    return selectedCount > 0 && selectedCount < group.items.length;
  }
  
  toggleGroup(group: { component: string; items: PermissionRow[] }): void {
    const shouldSelectAll = !this.isGroupFullySelected(group);
    for (const p of group.items) {
      if (shouldSelectAll) {
        this.selectedPermissionIds.add(p.permissionId);
      } else {
        this.selectedPermissionIds.delete(p.permissionId);
      }
    }
  }

  onGroupCheckboxClick(event: Event, group: { component: string; items: PermissionRow[] }): void {
    event.stopPropagation();
    this.toggleGroup(group);
  }
  trackByGroup(index: number, group: { component: string; items: PermissionRow[] }): string {
    return group.component || index.toString();
  }
  trackByPermission(index: number, p: PermissionRow): number {
    return p.permissionId;
  }
  trackByUserId(index: number, u: UserRow): number {
    return u.userId;
  }
}
