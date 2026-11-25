import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DangNhapComponent } from './dang-nhap/dang-nhap.component';
import { AuthGuard } from '../auth/auth.guard';
import { HomeComponent } from '../app/view-admin/home/home.component';
import { UserComponent } from '../app/view-admin/user/user.component';
import { RoleComponent } from '../app/view-admin/role/role.component';
import { TroLyComponent } from '../app/view-tro-ly/tro-ly/tro-ly.component';
import { LanhDaoComponent } from '../app/view-lanh-dao/lanh-dao/lanh-dao.component';
import { NhanVienComponent } from '../app/view-nhan-vien/nhan-vien/nhan-vien.component';
import { PhongBanComponent } from './view-admin/phong-ban/phong-ban.component';
import { ChucVuComponent } from './view-admin/chuc-vu/chuc-vu.component';
import { CreateRequestComponent } from './view-nhan-vien/nhan-vien/create-request/create-request.component';
import { EditRequestComponent } from './view-nhan-vien/nhan-vien/edit-request/edit-request.component';
import { DetailRequestComponent } from './view-nhan-vien/nhan-vien/detail-request/detail-request.component';
import { ProfileComponent } from './view-profile/profile.component';
import { DocxPreviewPageComponent } from './shared/docx-preview-page/docx-preview-page.component';

const routes: Routes = [
  { path: 'auth/login', component: DangNhapComponent },
  // Các route cần đăng nhập (được bảo vệ bởi AuthGuard)
  {
    path: '',
    canActivate: [AuthGuard],
    children: [
      {
        path: 'home', component: HomeComponent, data: { permission: 'View admin' }
      },
      {
        path : 'nhan-vien', component: NhanVienComponent, data: { permission: 'View nhân viên' }
      },
      {
        path: 'nhan-vien/create-request', component: CreateRequestComponent, data: { permission: 'Tạo yêu cầu' }
      },
      {
        path: 'nhan-vien/edit-request/:id', component: EditRequestComponent, data: { permission: 'Sửa yêu cầu' }
      },
      {
        path: 'nhan-vien/detail-request/:id', component: DetailRequestComponent, data: { permission: 'Xem chi tiết yêu cầu' }
      },
      {
        path: 'tro-ly', component: TroLyComponent, data: { permission: 'View trợ lý' }
      },
      {
        path: 'lanh-dao', component: LanhDaoComponent, data: { permission: 'View lãnh đạo' }
      },
      {
        path: 'user', component: UserComponent,
        data: { permission: 'Xem user' }
      },
      {
        path: 'role', component: RoleComponent,
        data: { permission: 'Xem role' }
      },
      {
        path: 'phong-ban', component: PhongBanComponent,
        data: { permission: 'Xem phòng ban' }
      },
      {
        path: 'chuc-vu', component: ChucVuComponent,
        data: { permission: 'Xem chức vụ' }
      },
      {
        path: 'ho-so', component: ProfileComponent
      },
      {
        path: 'xem-tai-lieu', component: DocxPreviewPageComponent
      }
      // { path: 'nhan-vien/create', component: NhanVienFormComponent, data: { permission: 'Thêm nhân viên' } },
      // { path: 'nhan-vien/edit/:nhanVienId', component: NhanVienFormComponent, data: { permission: 'Sửa nhân viên' } },
      // { path: 'nhan-vien/detail/:nhanVienId', component: NhanVienDetailComponent, data: { permission: 'Xem chi tiết nhân viên' } },
      // {
      //   path: 'ung-vien', component: UngVienComponent,
      //   data: { permission: 'Xem ứng viên' }
      // },
      
    ]
  },

  // Mặc định nếu không khớp route nào thì về login hoặc trang chính (Guard sẽ tự xử lý)
  { path: '**', redirectTo: 'home' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
