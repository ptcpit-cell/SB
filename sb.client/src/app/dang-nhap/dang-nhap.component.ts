import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { ToastrService } from "ngx-toastr";

@Component({
  selector: 'app-dang-nhap',
  standalone: false,
  templateUrl: './dang-nhap.component.html',
  styleUrl: './dang-nhap.component.css'
})
export class DangNhapComponent implements OnInit {
  loginData = { userName: '', password: '' };
  loading = false;
  error = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toastrService: ToastrService
  ) {
    // Nếu đã login rồi thì đẩy vào route phù hợp với quyền của người dùng
    if (this.authService.currentUserValue) {
      const redirectUrl = this.authService.getDefaultRouteByPermission();
      this.router.navigateByUrl(redirectUrl);
    }
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (!this.loginData.userName || !this.loginData.password) {
      this.error = 'Vui lòng nhập đầy đủ tài khoản và mật khẩu';
      return;
    }

    this.loading = true;
    this.error = '';

    const returnUrl = this.route.snapshot.queryParams['returnUrl'];
    this.authService.login(this.loginData, { returnUrl }).subscribe({
      next: () => {
        this.loading = false;
        this.toastrService.success('Đăng nhập thành công');
      },
      error: () => {
        this.error = 'Tên đăng nhập hoặc mật khẩu không chính xác';
        this.loading = false;
      }
    });
  }
}
