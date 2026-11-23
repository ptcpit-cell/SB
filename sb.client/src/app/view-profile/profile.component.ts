import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { AdminService } from '../../services/admin.service';
import { CommonService } from '../../services/common.service';
import { AuthService } from '../../auth/auth.service';
import { UserProfile } from '../../type';

@Component({
  selector: 'app-profile',
  standalone: false,
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  profile: UserProfile | null = null;
  loading = true;
  saving = false;
  showChangePasswordModal = false;

  phongBans: Array<{ id: number; tenPhongBan: string; chiNhanhId?: number }> = [];
  chucVus: Array<{ id: number; tenChucVu: string }> = [];

  form = {
    tenNguoiDung: '',
    email: '',
    phone: '',
    zaloId: '',
    phongBanId: null as number | null,
    chucVuId: null as number | null
  };

  constructor(
    private adminService: AdminService,
    private commonService: CommonService,
    private authService: AuthService,
    private toastr: ToastrService,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.loadCatalogs();
    this.loadProfile();
  }

  private loadCatalogs(): void {
    this.commonService.getPhongBan().subscribe({
      next: (res: any[]) => {
        this.phongBans = (res || []).map((x) => ({
          id: Number(x.id ?? x.phongBanId),
          tenPhongBan: x.tenPhongBan ?? x.ten ?? '',
          chiNhanhId: x.chiNhanhId
        }));
      },
      error: () => {}
    });

    this.commonService.getChucVu().subscribe({
      next: (res: any[]) => {
        this.chucVus = (res || []).map((x) => ({
          id: Number(x.id ?? x.chucVuId),
          tenChucVu: x.tenChucVu ?? x.ten ?? ''
        }));
      },
      error: () => {}
    });
  }

  loadProfile(): void {
    this.loading = true;
    this.adminService.getMyProfile().subscribe({
      next: (res) => {
        this.profile = res;
        this.syncFormFromProfile(res);
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toastr.error(err?.error?.message || 'Không thể tải thông tin cá nhân.');
      }
    });
  }

  private syncFormFromProfile(p: UserProfile): void {
    this.form = {
      tenNguoiDung: p.tenNguoiDung || '',
      email: p.email || '',
      phone: p.phone || '',
      zaloId: p.zaloId || '',
      phongBanId: p.phongBanId ?? null,
      chucVuId: p.chucVuId ?? null
    };
  }

  get filteredPhongBans() {
    if (!this.profile?.chiNhanhId) return this.phongBans;
    const sameBranch = this.phongBans.filter(
      (pb) => !pb.chiNhanhId || Number(pb.chiNhanhId) === Number(this.profile?.chiNhanhId)
    );
    return sameBranch.length > 0 ? sameBranch : this.phongBans;
  }

  get initials(): string {
    const name = (this.form.tenNguoiDung || this.profile?.tenNguoiDung || 'U').trim();
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  get missingFieldsCount(): number {
    let count = 0;
    if (!this.form.email?.trim()) count++;
    if (!this.form.phone?.trim()) count++;
    if (!this.form.zaloId?.trim()) count++;
    if (!this.form.phongBanId) count++;
    if (!this.form.chucVuId) count++;
    return count;
  }

  resetForm(): void {
    if (this.profile) {
      this.syncFormFromProfile(this.profile);
    }
  }

  saveProfile(): void {
    if (!this.form.tenNguoiDung.trim()) {
      this.toastr.warning('Họ và tên không được để trống.');
      return;
    }
    this.saving = true;
    this.adminService
      .updateMyProfile({
        tenNguoiDung: this.form.tenNguoiDung.trim(),
        email: this.form.email.trim(),
        phone: this.form.phone.trim(),
        zaloId: this.form.zaloId.trim(),
        phongBanId: this.form.phongBanId ? Number(this.form.phongBanId) : null,
        chucVuId: this.form.chucVuId ? Number(this.form.chucVuId) : null
      })
      .subscribe({
        next: (res) => {
          this.saving = false;
          this.profile = res.profile;
          this.syncFormFromProfile(res.profile);
          this.authService.updateCurrentUserProfile({
            tenNguoiDung: res.profile.tenNguoiDung,
            email: res.profile.email,
            phone: res.profile.phone,
            zaloId: res.profile.zaloId,
            phongBanId: res.profile.phongBanId,
            tenPhongBan: res.profile.tenPhongBan,
            chucVuId: res.profile.chucVuId,
            tenChucVu: res.profile.tenChucVu
          });
          this.toastr.success(res.message || 'Cập nhật hồ sơ cá nhân thành công!');
        },
        error: (err) => {
          this.saving = false;
          this.toastr.error(err?.error?.message || 'Cập nhật hồ sơ thất bại.');
        }
      });
  }

  goBack(): void {
    this.location.back();
  }
}
