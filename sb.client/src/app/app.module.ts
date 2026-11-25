import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { DangNhapComponent } from './dang-nhap/dang-nhap.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthService } from '../auth/auth.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { HasPermissionDirective } from '../auth/has-permission.directive';
import { HomeComponent } from '../app/view-admin/home/home.component';
import { AgGridModule } from 'ag-grid-angular';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { LoadingComponent } from './components/loading/loading.component';
import { HttpLoadingInterceptor } from './interceptors/http-loading.interceptor';
import { UserComponent } from '../app/view-admin/user/user.component';
import { RoleComponent } from '../app/view-admin/role/role.component';
import { ChiNhanhInterceptor } from '../app/interceptors/chi-nhanh.interceptor';
import { firstValueFrom } from 'rxjs';
import { ToastrModule } from 'ngx-toastr';
import { AllCommunityModule, ModuleRegistry, _getGlobalGridOption } from 'ag-grid-community';
import { NgxPrintDirective } from 'ngx-print';
import { NavbarComponent } from './components/navbar/navbar.component';
import { MatPaginatorModule } from '@angular/material/paginator';
import { TroLyComponent } from '../app/view-tro-ly/tro-ly/tro-ly.component';
import { LanhDaoComponent } from '../app/view-lanh-dao/lanh-dao/lanh-dao.component';
import { NhanVienComponent } from '../app/view-nhan-vien/nhan-vien/nhan-vien.component';
import { PhongBanComponent } from './view-admin/phong-ban/phong-ban.component';
import { ChucVuComponent } from './view-admin/chuc-vu/chuc-vu.component';
import { CreateRequestComponent } from './view-nhan-vien/nhan-vien/create-request/create-request.component';
import { EditRequestComponent } from './view-nhan-vien/nhan-vien/edit-request/edit-request.component';
import { DetailRequestComponent } from './view-nhan-vien/nhan-vien/detail-request/detail-request.component';
import { RequestQueueComponent } from './view-tro-ly/tro-ly/request-queue/request-queue.component';
import { ScheduleGridComponent } from './view-tro-ly/tro-ly/schedule-grid/schedule-grid.component';
import { WorkingHoursModalComponent } from './view-tro-ly/tro-ly/working-hours-modal/working-hours-modal.component';
import { ScheduleActionModalComponent } from './view-tro-ly/tro-ly/schedule-action-modal/schedule-action-modal.component';
import { LeaderTimelineComponent } from './view-lanh-dao/lanh-dao/leader-timeline/leader-timeline.component';
import { TodayTasksComponent } from './view-lanh-dao/lanh-dao/today-tasks/today-tasks.component';
import { FeedbackModalComponent } from './view-lanh-dao/lanh-dao/feedback-modal/feedback-modal.component';
import { BusyEventModalComponent } from './shared/busy-event-modal/busy-event-modal.component';
import { WeekScheduleComponent } from './shared/week-schedule/week-schedule.component';
import { ExcelExportModalComponent } from './shared/excel-export-modal/excel-export-modal.component';
import { ChangePasswordModalComponent } from './components/change-password-modal/change-password-modal.component';
import { ProfileComponent } from './view-profile/profile.component';
import { AdminLeadersComponent } from './view-admin/home/admin-leaders/admin-leaders.component';
import { AdminCatalogComponent } from './view-admin/home/admin-catalog/admin-catalog.component';
import { VnDateInputComponent } from './shared/vn-date-input/vn-date-input.component';
import { DocxPreviewPageComponent } from './shared/docx-preview-page/docx-preview-page.component';
import { MatIconModule } from '@angular/material/icon';


ModuleRegistry.registerModules([AllCommunityModule]);
export function appInitializer(authService: AuthService) {
  return () => firstValueFrom(authService.checkAutoLogin());
}
@NgModule({
  declarations: [
    AppComponent,
    DangNhapComponent,
    HasPermissionDirective,
    HomeComponent,
    SidebarComponent,
    LoadingComponent,
    RoleComponent,
    UserComponent,
    NavbarComponent,
    NhanVienComponent,
    TroLyComponent,
    RequestQueueComponent,
    ScheduleGridComponent,
    WorkingHoursModalComponent,
    ScheduleActionModalComponent,
    LanhDaoComponent,
    LeaderTimelineComponent,
    TodayTasksComponent,
    FeedbackModalComponent,
    BusyEventModalComponent,
    WeekScheduleComponent,
    ExcelExportModalComponent,
    ChangePasswordModalComponent,
    ProfileComponent,
    AdminLeadersComponent,
    AdminCatalogComponent,
    PhongBanComponent,
    ChucVuComponent,
    CreateRequestComponent,
    EditRequestComponent,
    DetailRequestComponent,
    VnDateInputComponent,
    DocxPreviewPageComponent
  ],
  imports: [
    BrowserModule, HttpClientModule,
    BrowserAnimationsModule,
    CommonModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    NgOptimizedImage,
    AgGridModule,
    ToastrModule.forRoot({
      closeButton: true
    }),
    NgxPrintDirective,
    MatPaginatorModule,
    MatIconModule,
  ],
    providers: [
      { provide: HTTP_INTERCEPTORS, useClass: ChiNhanhInterceptor, multi: true },
      { provide: APP_INITIALIZER, useFactory: appInitializer, multi: true, deps: [AuthService] },
      { provide: HTTP_INTERCEPTORS, useClass: HttpLoadingInterceptor, multi: true },
      { provide: 'AnimationSync', useValue: { sync: true } },
      
  ],
  bootstrap: [AppComponent]
})

export class AppModule { }

