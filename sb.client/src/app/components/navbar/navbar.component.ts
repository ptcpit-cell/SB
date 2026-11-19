import { Component, ElementRef, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../auth/auth.service';
import { SignalRService } from '../../../services/signalr.service';
import { CommonService } from '../../../services/common.service';

@Component({
  selector: 'app-navbar',
  standalone: false,
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit, OnDestroy {
  // Biến chứa thông tin user và quyền
  currentUser: any = null;
  userPermissions: string[] = [];
  chiNhanhId: number = 0;
  unreadIdsToUpdate: number[] = [];
  notifications: any[] = [];
  unreadCount = 0;
  isDropdownOpen = false;
  isLoading = false;
  private signalRSub!: Subscription;
  // Dùng Subscription để theo dõi thay đổi trạng thái đăng nhập
  private authSubscription: Subscription = new Subscription();

  constructor(public authService: AuthService, private elementRef: ElementRef, private commonService: CommonService,
    private signalRService: SignalRService) { }

  ngOnInit(): void {
  // 1. Tải danh sách thông báo lịch sử từ database ra trước
  this.loadNotifications();

  // 2. Đăng ký lắng nghe luồng dữ liệu REAL-TIME từ SignalR gửi về (Đón đầu trước)
  this.signalRSub = this.signalRService.notificationReceived$.subscribe({
    next: (newNotification) => {
      // Đẩy thông báo mới tinh vừa nhận lên ĐẦU mảng hiển thị mà không cần load lại API
      this.notifications.unshift(newNotification);
      
      // Tăng số đếm thông báo chưa đọc lên 1 đơn vị
      this.unreadCount++;
    }
  });

  // 3. Đăng ký lắng nghe sự thay đổi của User từ AuthService
  this.authSubscription = this.authService.currentUser.subscribe(user => {
  if (user) {
    this.currentUser = user;
    this.chiNhanhId = user.chiNhanhId;

    // ĐIỀM THAY ĐỔI: Chấp nhận số 0, chỉ loại trừ null và undefined
    if (this.chiNhanhId !== null && this.chiNhanhId !== undefined) {
      this.signalRService.startConnection(this.chiNhanhId);
    } else {
      console.warn('Không thể kết nối SignalR vì ChiNhanhId bị null hoặc undefined.');
    }

  } else {
    this.currentUser = null;
    this.signalRService.stopConnection();
  }
});
}

  // Xử lý đăng xuất
  onLogout(): void {
    if (confirm('Bạn có chắc chắn muốn đăng xuất không?')) {
      this.authService.logout();
    }
  }

  // Giải phóng subscription khi component bị hủy để tránh rò rỉ bộ nhớ
  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    if (this.signalRSub) this.signalRSub.unsubscribe();
  }
  loadNotifications(): void {
    this.isLoading = true;
    this.commonService.getThongBao().subscribe({
      next: (res: any[]) => {
        this.notifications = res || [];
        // Đếm số lượng thông báo chưa đọc (isRead === false)
        this.unreadCount = this.notifications.filter(n => !n.isRead).length;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Lỗi khi tải thông báo:', err);
        this.isLoading = false;
      }
    });
  }
toggleDropdown(event: Event): void {
  event.stopPropagation();
  this.isDropdownOpen = !this.isDropdownOpen;

  if (this.isDropdownOpen) {
    this.unreadIdsToUpdate = this.notifications
      .filter(n => !n.isRead)
      .map(n => n.thongBaoId);
  } 
  else {
    this.executeMarkAsRead();
  }
}

private executeMarkAsRead(): void {
  if (this.unreadIdsToUpdate.length > 0) {
    
    this.notifications.forEach(n => {
      if (this.unreadIdsToUpdate.includes(n.thongBaoId)) {
        n.isRead = true;
      }
    });
    
    this.unreadCount = 0; 
    const idsToSend = [...this.unreadIdsToUpdate];
    this.commonService.markAsReadBulk(idsToSend).subscribe({
      next: (res) => {
        console.log('User đã đóng chuông. Đã đồng bộ trạng thái đã đọc lên DB cho:', idsToSend);
      },
      error: (err) => {
        console.error('Lỗi khi đồng bộ trạng thái đọc lên DB:', err);
      }
    });

    // 3. Xóa sạch mảng tạm để không bị gửi trùng lặp ở lần bấm sau
    this.unreadIdsToUpdate = [];
  }
}

  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    // Nếu dropdown đang mở mà người dùng click ra bất kỳ đâu bên ngoài cụm nút chuông
    if (this.isDropdownOpen) {
      this.isDropdownOpen = false; // Đóng dropdown trên giao diện

      this.executeMarkAsRead();
    }
  }

  // Xử lý khi người dùng bấm vào một thông báo cụ thể
  onNotificationClick(notification: any): void {
    if (!notification.isRead) {
      notification.isRead = true;
      this.unreadCount = Math.max(0, this.unreadCount - 1);
    }
    // Thực hiện hành động tiếp theo, ví dụ: Chuyển hướng xem chi tiết nhân viên
    this.isDropdownOpen = false;
  }
}
