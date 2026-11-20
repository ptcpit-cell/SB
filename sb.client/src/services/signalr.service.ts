import { Inject, Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { HttpClient } from '@microsoft/signalr';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SignalRService {
  private hubConnection!: signalR.HubConnection;

  // Dùng Subject để các component khác có thể "lắng nghe" luồng dữ liệu thông báo mới đổ về
  public notificationReceived$ = new Subject<any>();
  public scheduleNotificationReceived$ = new Subject<any>();

  constructor(@Inject('BASE_URL') private baseUrl: string) {}

  // Khởi động kết nối SignalR
  public startConnection(chiNhanhId: number): void {
    if (chiNhanhId === null || chiNhanhId === undefined) {
      console.warn(
        'Không khởi động SignalR vì chiNhanhId bị null hoặc undefined.'
      );
      return;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.baseUrl + `hubs/thongbao`) // Điền đúng cổng port Backend của bạn
      .withAutomaticReconnect() // Tự động kết nối lại nếu mất mạng
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.hubConnection
      .start()
      .then(() => {
        console.log('Kết nối thành công tới Hub SignalR!');
        // Khi kết nối thành công, lập tức gửi lệnh xin gia nhập nhóm chi nhánh
        this.joinBranch(chiNhanhId);
      })
      .catch((err) =>
        console.error('LỖI SIGNALR CHI TIẾT:', JSON.stringify(err, null, 2))
      );
    // Lắng nghe sự kiện "ReceiveNewNotification" từ Server bắn xuống (ThongBao cơ bản)
    this.hubConnection.on('ReceiveNewNotification', (data) => {
      this.notificationReceived$.next(data); // Đẩy dữ liệu vào Luồng (Subject)
    });
    // Lắng nghe sự kiện "ReceiveScheduleNotification" từ Server bắn xuống (ThongBaoLichTrinh)
    this.hubConnection.on('ReceiveScheduleNotification', (data) => {
      this.scheduleNotificationReceived$.next(data);
    });
  }

  // Xin gia nhập nhóm theo chi nhánh
  private joinBranch(chiNhanhId: number): void {
    this.hubConnection
      .invoke('JoinBranchGroup', chiNhanhId.toString())
      .catch((err) => console.error('Lỗi gia nhập nhóm chi nhánh:', err));
  }

  // Ngắt kết nối khi logout
  public stopConnection(): void {
    if (this.hubConnection) {
      this.hubConnection.stop();
    }
  }
}
