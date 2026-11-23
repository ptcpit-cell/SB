import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../auth/auth.service';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-change-password-modal',
  standalone: false,
  templateUrl: './change-password-modal.component.html',
  styleUrl: './change-password-modal.component.css'
})
export class ChangePasswordModalComponent implements OnChanges {
  @Input() visible = false;
  @Output() closeModal = new EventEmitter<void>();

  oldPassword = '';
  newPassword = '';
  confirmPassword = '';

  showOld = false;
  showNew = false;
  showConfirm = false;

  submitting = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private toastr: ToastrService
  ) {}

  ngOnChanges(): void {
    if (this.visible) {
      this.oldPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';
      this.showOld = false;
      this.showNew = false;
      this.showConfirm = false;
      this.errorMessage = '';
      this.submitting = false;
    }
  }

  onSubmit(): void {
    this.errorMessage = '';

    if (!this.oldPassword.trim()) {
      this.errorMessage = 'Vui lòng nhập mật khẩu hiện tại.';
      return;
    }
    if (!this.newPassword.trim() || this.newPassword.trim().length < 4) {
      this.errorMessage = 'Mật khẩu mới phải có ít nhất 4 ký tự.';
      return;
    }
    if (this.newPassword === this.oldPassword) {
      this.errorMessage = 'Mật khẩu mới không được trùng mật khẩu hiện tại.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Xác nhận mật khẩu mới không khớp.';
      return;
    }

    const currentUser = this.authService.currentUserValue;
    if (!currentUser?.userId || !currentUser?.userName) {
      this.errorMessage = 'Không xác định được phiên đăng nhập hiện tại.';
      return;
    }

    this.submitting = true;
    const newPasswordValue = this.newPassword;

    this.userService
      .changePassword(
        {
          oldPassword: this.oldPassword,
          newPassword: newPasswordValue
        },
        Number(currentUser.userId)
      )
      .subscribe({
        next: () => {
          // Đổi mật khẩu xong -> tự động đăng nhập lại bằng mật khẩu mới để làm mới JWT & refresh token
          this.authService
            .login(
              {
                userName: currentUser.userName,
                password: newPasswordValue
              },
              { skipRedirect: true }
            )
            .subscribe({
              next: () => {
                this.submitting = false;
                this.toastr.success('Đổi mật khẩu và làm mới phiên đăng nhập thành công!');
                this.closeModal.emit();
              },
              error: () => {
                this.submitting = false;
                this.toastr.warning(
                  'Đổi mật khẩu thành công nhưng không thể tự động đăng nhập lại. Vui lòng đăng nhập lại bằng mật khẩu mới.'
                );
                this.closeModal.emit();
                this.authService.logout();
              }
            });
        },
        error: (err) => {
          this.submitting = false;
          const msg =
            typeof err?.error === 'string' && err.error.trim()
              ? err.error.trim()
              : err?.error?.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại.';
          this.errorMessage = msg;
        }
      });
  }
}
