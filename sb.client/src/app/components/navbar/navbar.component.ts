import { Component, ElementRef, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../auth/auth.service';
import { SignalRService } from '../../../services/signalr.service';
import { CommonService } from '../../../services/common.service';
import { ThongBaoItem, ThongBaoLichTrinhItem } from '../../../type';

@Component({
  selector: 'app-navbar',
  standalone: false,
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit, OnDestroy {
  currentUser: any = null;
  chiNhanhId: number = 0;

  // 2-tier notifications
  activeTab: 'basic' | 'schedule' = 'schedule';
  notifications: ThongBaoItem[] = [];
  scheduleNotifications: ThongBaoLichTrinhItem[] = [];
  unreadIdsToUpdate: number[] = [];

  unreadBasicCount = 0;
  unreadScheduleCount = 0;

  isDropdownOpen = false;
  isLoading = false;
  showLogoutModal = false;
  showChangePasswordModal = false;

  private signalRSub?: Subscription;
  private scheduleSignalRSub?: Subscription;
  private authSubscription: Subscription = new Subscription();

  constructor(
    public authService: AuthService,
    private elementRef: ElementRef,
    private commonService: CommonService,
    private signalRService: SignalRService,
    private router: Router
  ) {}

  get totalUnreadCount(): number {
    return this.unreadBasicCount + this.unreadScheduleCount;
  }

  ngOnInit(): void {
    // 1. Lắng nghe ThongBao cơ bản real-time
    this.signalRSub = this.signalRService.notificationReceived$.subscribe({
      next: (newNotification: any) => {
        if (!this.currentUser) return;
        if (
          newNotification.nguoiNhanId !== null &&
          newNotification.nguoiNhanId !== undefined &&
          Number(newNotification.nguoiNhanId) !== Number(this.currentUser.userId)
        ) {
          return;
        }
        const normalized: ThongBaoItem = {
          id: newNotification.id ?? newNotification.thongBaoId,
          thongBaoId: newNotification.thongBaoId ?? newNotification.id,
          noiDung: newNotification.noiDung ?? newNotification.noiDungTB ?? '',
          noiDungTB: newNotification.noiDungTB ?? newNotification.noiDung ?? '',
          createdAt: newNotification.createdAt || new Date().toISOString(),
          chiNhanhId: newNotification.chiNhanhId,
          nguoiNhanId: newNotification.nguoiNhanId ?? null,
          isRead: false
        };
        if (!this.notifications.some(n => n.thongBaoId === normalized.thongBaoId)) {
          this.notifications.unshift(normalized);
          this.recalcCounts();
        }
      }
    });

    // 2. Lắng nghe ThongBaoLichTrinh real-time
    this.scheduleSignalRSub = this.signalRService.scheduleNotificationReceived$.subscribe({
      next: (item: ThongBaoLichTrinhItem) => {
        if (!this.currentUser) return;
        if (Number(item.nguoiNhanId) !== Number(this.currentUser.userId)) return;
        if (!this.scheduleNotifications.some(s => s.id === item.id)) {
          this.scheduleNotifications.unshift(item);
          this.recalcCounts();
        }
      }
    });

    // 3. Lắng nghe sự thay đổi User từ AuthService
    this.authSubscription = this.authService.currentUser.subscribe(user => {
      if (user) {
        this.currentUser = user;
        this.chiNhanhId = user.chiNhanhId;
        this.loadAllNotifications();

        if (this.chiNhanhId !== null && this.chiNhanhId !== undefined) {
          this.signalRService.startConnection(this.chiNhanhId);
        }
      } else {
        this.currentUser = null;
        this.notifications = [];
        this.scheduleNotifications = [];
        this.recalcCounts();
        this.signalRService.stopConnection();
      }
    });
  }

  openProfile(): void {
    this.router.navigate(['/ho-so']);
  }

  openChangePassword(): void {
    this.showChangePasswordModal = true;
  }

  onLogout(): void {
    this.showLogoutModal = true;
  }

  confirmLogout(): void {
    this.showLogoutModal = false;
    this.authService.logout();
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
    this.signalRSub?.unsubscribe();
    this.scheduleSignalRSub?.unsubscribe();
  }

  loadAllNotifications(): void {
    if (!this.currentUser?.userId) return;
    this.isLoading = true;
    this.commonService.getThongBao().subscribe({
      next: (res: any[]) => {
        this.notifications = (res || []).map(x => ({
          ...x,
          thongBaoId: x.thongBaoId ?? x.id,
          noiDung: x.noiDung ?? x.noiDungTB ?? '',
          noiDungTB: x.noiDungTB ?? x.noiDung ?? ''
        }));
        this.recalcCounts();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });

    this.commonService.getThongBaoLichTrinh().subscribe({
      next: (res: ThongBaoLichTrinhItem[]) => {
        this.scheduleNotifications = res || [];
        this.recalcCounts();
      },
      error: () => {}
    });
  }

  private recalcCounts(): void {
    this.unreadBasicCount = this.notifications.filter(n => !n.isRead).length;
    this.unreadScheduleCount = this.scheduleNotifications.filter(s => !s.daDoc).length;
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;

    if (this.isDropdownOpen) {
      // Nếu có lịch trình chưa đọc thì mở tab lịch trình trước, ngược lại ưu tiên tab có chưa đọc
      if (this.unreadScheduleCount > 0) {
        this.activeTab = 'schedule';
      } else if (this.unreadBasicCount > 0) {
        this.activeTab = 'basic';
      }
      if (this.activeTab === 'basic') {
        this.captureUnreadBasicIds();
      }
    } else {
      this.executeMarkBasicAsRead();
    }
  }

  switchTab(tab: 'basic' | 'schedule', event: Event): void {
    event.stopPropagation();
    if (this.activeTab === 'basic' && tab !== 'basic') {
      this.executeMarkBasicAsRead();
    }
    this.activeTab = tab;
    if (tab === 'basic') {
      this.captureUnreadBasicIds();
    }
  }

  private captureUnreadBasicIds(): void {
    this.unreadIdsToUpdate = this.notifications
      .filter(n => !n.isRead)
      .map(n => n.thongBaoId);
  }

  private executeMarkBasicAsRead(): void {
    if (this.unreadIdsToUpdate.length > 0) {
      const idsToSend = [...this.unreadIdsToUpdate];
      this.notifications.forEach(n => {
        if (idsToSend.includes(n.thongBaoId)) {
          n.isRead = true;
        }
      });
      this.recalcCounts();
      this.unreadIdsToUpdate = [];

      this.commonService.markAsReadBulk(idsToSend).subscribe({
        error: (err) => console.error('Lỗi đồng bộ đã đọc ThongBao:', err)
      });
    }
  }

  @HostListener('document:click', ['$event'])
  clickout(event: Event): void {
    if (this.isDropdownOpen && !this.elementRef.nativeElement.contains(event.target)) {
      this.isDropdownOpen = false;
      this.executeMarkBasicAsRead();
    }
  }

  onBasicNotificationClick(notification: ThongBaoItem): void {
    if (!notification.isRead) {
      notification.isRead = true;
      this.recalcCounts();
      this.commonService.markAsReadBulk([notification.thongBaoId]).subscribe({
        error: () => {}
      });
    }
  }

  onScheduleNotificationClick(item: ThongBaoLichTrinhItem): void {
    if (!item.daDoc) {
      item.daDoc = true;
      this.recalcCounts();
      this.commonService.markThongBaoLichTrinhRead(item.id).subscribe({
        error: () => {}
      });
    }
    this.isDropdownOpen = false;
    this.executeMarkBasicAsRead();

    if (item.routeUrl) {
      this.router.navigateByUrl(item.routeUrl);
    } else if (item.yeuCauId) {
      this.router.navigate(['/nhan-vien/detail-request', item.yeuCauId]);
    }
  }

  markAllScheduleRead(event: Event): void {
    event.stopPropagation();
    if (this.unreadScheduleCount === 0) return;
    this.scheduleNotifications.forEach(s => (s.daDoc = true));
    this.recalcCounts();
    this.commonService.markAllThongBaoLichTrinhRead().subscribe({
      error: () => {}
    });
  }

  getScheduleIcon(loaiSuKien: string): { icon: string; css: string } {
    switch (loaiSuKien) {
      case 'PHAN_HOI_LANH_DAO':
        return { icon: 'fa-solid fa-comment-dots', css: 'text-success bg-success-subtle' };
      case 'DA_DUYET':
      case 'LICH_MOI':
      case 'LICH_HOM_NAY':
        return { icon: 'fa-regular fa-calendar-check', css: 'text-primary bg-primary-subtle' };
      case 'DE_XUAT_DOI_LICH':
      case 'CAN_BO_SUNG':
        return { icon: 'fa-solid fa-triangle-exclamation', css: 'text-warning bg-warning-subtle' };
      case 'TU_CHOI':
      case 'DA_HUY':
        return { icon: 'fa-solid fa-ban', css: 'text-danger bg-danger-subtle' };
      default:
        return { icon: 'fa-solid fa-bell', css: 'text-info bg-info-subtle' };
    }
  }
}
